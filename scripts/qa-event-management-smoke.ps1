param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [Parameter(Mandatory = $true)]
  [string]$EventId
)

$ErrorActionPreference = "Stop"
$checks = New-Object System.Collections.ArrayList

function Add-Check {
  param(
    [string]$Name,
    [bool]$Pass,
    [string]$Detail = ""
  )

  [void]$script:checks.Add([pscustomobject]@{
    name = $Name
    pass = $Pass
    detail = $Detail
  })
}

function Read-ErrorResponse {
  param($ErrorRecord)

  $response = $ErrorRecord.Exception.Response
  if ($null -eq $response) {
    return @{
      Status = 0
      Content = $ErrorRecord.Exception.Message
    }
  }

  $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
  return @{
    Status = [int]$response.StatusCode
    Content = $reader.ReadToEnd()
  }
}

function Invoke-Raw {
  param(
    [string]$Path,
    $Session = $null,
    [string]$Method = "GET",
    $Body = $null,
    [int]$TimeoutSec = 40
  )

  $parameters = @{
    Uri = "$BaseUrl$Path"
    Method = $Method
    TimeoutSec = $TimeoutSec
    UseBasicParsing = $true
  }
  if ($Session) {
    $parameters.WebSession = $Session
  }
  if ($null -ne $Body) {
    $parameters.Body = ($Body | ConvertTo-Json -Depth 16)
    $parameters.ContentType = "application/json"
  }

  try {
    $response = Invoke-WebRequest @parameters
    return @{
      Status = [int]$response.StatusCode
      Content = $response.Content
    }
  } catch {
    return Read-ErrorResponse $_
  }
}

function Invoke-JsonApi {
  param(
    [string]$Path,
    $Session = $null,
    [string]$Method = "GET",
    $Body = $null
  )

  $raw = Invoke-Raw -Path $Path -Session $Session -Method $Method -Body $Body
  $data = $null
  if ($raw.Content) {
    try {
      $data = $raw.Content | ConvertFrom-Json
    } catch {
      $data = $raw.Content
    }
  }

  return @{
    Status = $raw.Status
    Data = $data
    Content = $raw.Content
  }
}

function Login {
  param(
    [string]$Email,
    [string]$Password
  )

  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $csrf = (Invoke-RestMethod -Uri "$BaseUrl/api/auth/csrf" -WebSession $session -TimeoutSec 20).csrfToken
  $body = @{
    csrfToken = $csrf
    email = $Email
    password = $Password
    json = "true"
  }

  Invoke-WebRequest `
    -Uri "$BaseUrl/api/auth/callback/credentials" `
    -Method Post `
    -WebSession $session `
    -Body $body `
    -ContentType "application/x-www-form-urlencoded" `
    -UseBasicParsing `
    -TimeoutSec 30 | Out-Null

  $authSession = Invoke-RestMethod -Uri "$BaseUrl/api/auth/session" -WebSession $session -TimeoutSec 15
  return @{
    Web = $session
    Session = $authSession
  }
}

$superAdmin = Login "qa-superadmin@egrantha.local" "password123"
$schoolAdmin = Login "qa-school@eventflow.local" "password123"

Add-Check "super admin login" ($superAdmin.Session.user.role -eq "SUPER_ADMIN") ""
Add-Check "school admin login" ($schoolAdmin.Session.user.role -eq "SCHOOL_ADMIN") ""

$manage = Invoke-JsonApi "/api/events/$EventId/manage" $superAdmin.Web
Add-Check "manage endpoint loads" ($manage.Status -eq 200) "status=$($manage.Status)"
Add-Check "manage endpoint has 2 approved requests" (@($manage.Data.requests.APPROVED).Count -eq 2) "approved=$(@($manage.Data.requests.APPROVED).Count)"

$requestIds = @($manage.Data.requests.APPROVED | ForEach-Object { $_._id })
$start = Invoke-JsonApi "/api/events/$EventId/start-competition" $superAdmin.Web "POST" @{
  requestIds = $requestIds
}
Add-Check "start competition succeeds" ($start.Status -eq 200) "status=$($start.Status)"

$rounds1 = Invoke-JsonApi "/api/events/$EventId/rounds" $superAdmin.Web
$roundOne = @($rounds1.Data.rounds | Where-Object { $_.roundNumber -eq 1 }) | Select-Object -First 1
Add-Check "round 1 exists" (($rounds1.Status -eq 200) -and ($null -ne $roundOne)) "status=$($rounds1.Status)"
Add-Check "round 1 has 2 selected participants by default" (@($roundOne.participants | Where-Object { $_.status -eq "SELECTED" }).Count -eq 2) ""

$notice = Invoke-JsonApi "/api/events/$EventId/rounds/$($roundOne._id)/notices" $superAdmin.Web "POST" @{
  title = "Audition timing"
  message = "Round 1 begins at 10 AM sharp."
  status = "PUBLISHED"
  type = "ROUND_INSTRUCTIONS"
  targetAudience = "REGISTERED_SCHOOLS"
}
Add-Check "round notice publish succeeds" ($notice.Status -eq 201) "status=$($notice.Status)"

$schoolRounds = Invoke-JsonApi "/api/events/$EventId/rounds/school" $schoolAdmin.Web
$schoolRoundOne = @($schoolRounds.Data.rounds | Where-Object { $_.roundNumber -eq 1 }) | Select-Object -First 1
Add-Check "school round view loads" ($schoolRounds.Status -eq 200) "status=$($schoolRounds.Status)"
Add-Check "school sees published notice" (@($schoolRoundOne.notices | Where-Object { $_.title -eq "Audition timing" }).Count -eq 1) ""

$participantRows = @($roundOne.participants)
$firstParticipant = $participantRows[0]
$secondParticipant = $participantRows[1]

$update1 = Invoke-JsonApi "/api/events/$EventId/rounds/$($roundOne._id)/participants" $superAdmin.Web "PATCH" @{
  participantId = $firstParticipant._id
  status = "PARTICIPATED"
}
$update2 = Invoke-JsonApi "/api/events/$EventId/rounds/$($roundOne._id)/participants" $superAdmin.Web "PATCH" @{
  participantId = $secondParticipant._id
  status = "DISQUALIFIED"
}
Add-Check "participant status update to participated works" ($update1.Status -eq 200) "status=$($update1.Status)"
Add-Check "participant status update to disqualified works" ($update2.Status -eq 200) "status=$($update2.Status)"

$round2Create = Invoke-JsonApi "/api/events/$EventId/rounds" $superAdmin.Web "POST" @{
  title = "Final Round"
  date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
  venue = "Main Hall"
  instructions = "Final performance round"
  status = "SCHEDULED"
}
Add-Check "round 2 creation succeeds" ($round2Create.Status -eq 201) "status=$($round2Create.Status)"

$rounds2 = Invoke-JsonApi "/api/events/$EventId/rounds" $superAdmin.Web
$roundOneNow = @($rounds2.Data.rounds | Where-Object { $_.roundNumber -eq 1 }) | Select-Object -First 1
$roundTwo = @($rounds2.Data.rounds | Where-Object { $_.roundNumber -eq 2 }) | Select-Object -First 1
$remainingSelected = @($roundOneNow.participants | Where-Object { $_.status -eq "SELECTED" })
if ($remainingSelected.Count -eq 0) {
  $promote = Invoke-JsonApi "/api/events/$EventId/rounds/$($roundOne._id)/participants" $superAdmin.Web "PATCH" @{
    participantId = $firstParticipant._id
    status = "SELECTED"
  }
  Add-Check "participant reselected for next round" ($promote.Status -eq 200) "status=$($promote.Status)"
  $rounds2 = Invoke-JsonApi "/api/events/$EventId/rounds" $superAdmin.Web
  $roundOneNow = @($rounds2.Data.rounds | Where-Object { $_.roundNumber -eq 1 }) | Select-Object -First 1
  $roundTwo = @($rounds2.Data.rounds | Where-Object { $_.roundNumber -eq 2 }) | Select-Object -First 1
  $remainingSelected = @($roundOneNow.participants | Where-Object { $_.status -eq "SELECTED" })
}

$advance = Invoke-JsonApi "/api/events/$EventId/rounds/$($roundOne._id)/advance" $superAdmin.Web "POST" @{
  participantIds = @($remainingSelected | ForEach-Object { $_._id })
}
Add-Check "move selected to next round succeeds" ($advance.Status -eq 200) "status=$($advance.Status)"

$rounds3 = Invoke-JsonApi "/api/events/$EventId/rounds" $superAdmin.Web
$roundTwoNow = @($rounds3.Data.rounds | Where-Object { $_.roundNumber -eq 2 }) | Select-Object -First 1
Add-Check "round 2 receives selected participant" (@($roundTwoNow.participants).Count -ge 1) "count=$(@($roundTwoNow.participants).Count)"
Add-Check "round 2 participant defaults to selected" (@($roundTwoNow.participants | Where-Object { $_.status -eq "SELECTED" }).Count -ge 1) ""

$finalParticipant = @($roundTwoNow.participants)[0]
$finalStatus = Invoke-JsonApi "/api/events/$EventId/rounds/$($roundTwoNow._id)/participants" $superAdmin.Web "PATCH" @{
  participantId = $finalParticipant._id
  status = "PARTICIPATED"
}
Add-Check "final round participant can be marked participated" ($finalStatus.Status -eq 200) "status=$($finalStatus.Status)"

$resultsSave = Invoke-JsonApi "/api/events/$EventId/results" $superAdmin.Web "PUT" @{
  resultsPublished = $false
  placements = @(
    @{
      studentId = $finalParticipant.student._id
      placement = "WINNER"
      note = "QA winner note"
    }
  )
}
Add-Check "result draft save succeeds" ($resultsSave.Status -eq 200) "status=$($resultsSave.Status)"

$resultsGet = Invoke-JsonApi "/api/events/$EventId/results" $superAdmin.Web
$winnerRecord = @($resultsGet.Data.data.results | Where-Object { $_.placement -eq "WINNER" }) | Select-Object -First 1
Add-Check "winner achievement draft exists" ($null -ne $winnerRecord) ""
Add-Check "winner certificate is draft before publish" ($null -eq $winnerRecord.certificateIssuedAt -or $winnerRecord.certificateIssuedAt -eq "") ""

$certPublish = Invoke-JsonApi "/api/events/$EventId/results/$($winnerRecord._id)" $superAdmin.Web "PATCH" @{
  action = "publish"
  title = $winnerRecord.title
  description = $winnerRecord.description
}
Add-Check "certificate publish succeeds" ($certPublish.Status -eq 200) "status=$($certPublish.Status)"

$resultsAfter = Invoke-JsonApi "/api/events/$EventId/results" $superAdmin.Web
$winnerAfter = @($resultsAfter.Data.data.results | Where-Object { $_._id -eq $winnerRecord._id }) | Select-Object -First 1
Add-Check "winner certificate published" ([bool]$winnerAfter.certificateUrl -and [bool]$winnerAfter.certificateIssuedAt) ""

$publicEvent = Invoke-Raw "/events/$EventId"
Add-Check "public event page renders" (($publicEvent.Status -eq 200) -and $publicEvent.Content.Contains("QA Singing Event Flow")) "status=$($publicEvent.Status)"
Add-Check "public event page shows published certificate link" ($publicEvent.Content.Contains("/certificates/")) ""

$schoolCertificates = Invoke-JsonApi "/api/school/certificates" $schoolAdmin.Web
Add-Check "school certificate feed shows winner certificate" (@($schoolCertificates.Data.certificates | Where-Object { $_.event._id -eq $EventId -and $_.placement -eq "WINNER" }).Count -ge 1) ""

$failed = @($checks | Where-Object { -not $_.pass })
$summary = [pscustomobject]@{
  total = $checks.Count
  passed = $checks.Count - $failed.Count
  failed = $failed.Count
  checks = $checks
}

$summary | ConvertTo-Json -Depth 16
if ($failed.Count -gt 0) {
  exit 1
}
