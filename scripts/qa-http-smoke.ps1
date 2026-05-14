param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$EventId = "69f3a68fc32198763219cc3c"
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
    $Body = $null,
    [int]$TimeoutSec = 40
  )

  $raw = Invoke-Raw -Path $Path -Session $Session -Method $Method -Body $Body -TimeoutSec $TimeoutSec
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
  $csrf = (Invoke-RestMethod -Uri "$BaseUrl/api/auth/csrf" -WebSession $session -TimeoutSec 15).csrfToken
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
$schoolAdmin = Login "qa-school@singing-demo.local" "password123"
$student = Login "qaaarav801" "student123"

Add-Check "super admin login" ($superAdmin.Session.user.role -eq "SUPER_ADMIN") ($superAdmin.Session.user | ConvertTo-Json -Compress)
Add-Check "school admin login" ($schoolAdmin.Session.user.role -eq "SCHOOL_ADMIN") ($schoolAdmin.Session.user | ConvertTo-Json -Compress)
Add-Check "student login" ($student.Session.user.role -eq "STUDENT") ($student.Session.user | ConvertTo-Json -Compress)

$response = Invoke-JsonApi "/api/event-proposals" $superAdmin.Web
$proposalFound = @($response.Data.data | Where-Object { $_.eventTitle -eq "ECA Inter-School Singing Competition" }).Count -gt 0
Add-Check "super admin can load ECA proposal" (($response.Status -eq 200) -and $proposalFound) "status=$($response.Status)"

$response = Invoke-JsonApi "/api/results/events" $superAdmin.Web
$resultEvent = @($response.Data.data | Where-Object { $_._id -eq $EventId }) | Select-Object -First 1
Add-Check "super admin sees result event" (($response.Status -eq 200) -and ($null -ne $resultEvent)) "status=$($response.Status)"
Add-Check "result event has 5 participants and certificates" (($resultEvent.participantCount -eq 5) -and ($resultEvent.winnerCount -eq 5)) ($resultEvent | ConvertTo-Json -Compress -Depth 8)

$response = Invoke-JsonApi "/api/events/$EventId/results" $superAdmin.Web
Add-Check "result detail loads" ($response.Status -eq 200) "status=$($response.Status)"
Add-Check "result detail has 5 participants" (@($response.Data.data.participants).Count -eq 5) "participants=$(@($response.Data.data.participants).Count)"
Add-Check "result detail has 5 certificates" (@($response.Data.data.results).Count -eq 5) "results=$(@($response.Data.data.results).Count)"
Add-Check "result detail includes participant certificate" (@($response.Data.data.results | Where-Object { $_.placement -eq "PARTICIPANT" }).Count -gt 0) ""

$response = Invoke-JsonApi "/api/school/certificates" $schoolAdmin.Web
$certificates = @($response.Data.certificates)
$winnerCertificate = $certificates | Where-Object { $_.placement -eq "WINNER" } | Select-Object -First 1
$participantCertificate = $certificates | Where-Object { $_.placement -eq "PARTICIPANT" } | Select-Object -First 1
Add-Check "school sees 5 issued certificates" (($response.Status -eq 200) -and ($certificates.Count -eq 5)) "status=$($response.Status), count=$($certificates.Count)"
Add-Check "school sees participant certificate" ($null -ne $participantCertificate -and [bool]$participantCertificate.certificateUrl) ($participantCertificate | ConvertTo-Json -Compress -Depth 8)

$response = Invoke-JsonApi "/api/events" $schoolAdmin.Web
$schoolEvent = @($response.Data.events | Where-Object { $_._id -eq $EventId }) | Select-Object -First 1
Add-Check "school feed includes registered platform event" (($response.Status -eq 200) -and [bool]$schoolEvent.isParticipating) "status=$($response.Status), participation=$($schoolEvent.participationStatus)"
Add-Check "school feed shows 5 registered students" ($schoolEvent.myParticipation.studentCount -eq 5) ($schoolEvent.myParticipation | ConvertTo-Json -Compress -Depth 8)

$response = Invoke-JsonApi "/api/student/talent-profile" $student.Web
$achievements = @($response.Data.data.achievements)
Add-Check "student talent profile loads" ($response.Status -eq 200) "status=$($response.Status)"
Add-Check "student sees certificate achievement" (@($achievements | Where-Object { $_.event.title -eq "ECA Inter-School Singing Competition" -and $_.certificateUrl }).Count -gt 0) ($achievements | ConvertTo-Json -Compress -Depth 8)
Add-Check "student stats count participated event" ($response.Data.data.stats.eventsParticipated -ge 1) ($response.Data.data.stats | ConvertTo-Json -Compress)

$response = Invoke-JsonApi "/api/events/hub/available" $student.Web
$registeredEvent = @($response.Data.events | Where-Object { $_._id -eq $EventId -and $_.participationStatus }) | Select-Object -First 1
Add-Check "student registered events include completed event" (($response.Status -eq 200) -and ($null -ne $registeredEvent)) "status=$($response.Status), count=$(@($response.Data.events).Count), eventStatus=$($registeredEvent.eventStatus)"

$response = Invoke-JsonApi "/api/events/hub/my-requests" $student.Web
Add-Check "student request history loads" ($response.Status -eq 200) "status=$($response.Status)"
Add-Check "student request history includes singing request" (@($response.Data.APPROVED | Where-Object { $_.eventId -eq $EventId }).Count -gt 0) "total=$($response.Data.total)"

$response = Invoke-JsonApi "/api/events/hub/past" $student.Web
Add-Check "student completed event history loads" ($response.Status -eq 200) "status=$($response.Status)"
Add-Check "student completed event history includes singing event" (@($response.Data.events | Where-Object { $_.eventId -eq $EventId }).Count -gt 0) "total=$($response.Data.total)"

$response = Invoke-Raw "/events/$EventId" -TimeoutSec 60
Add-Check "public event page renders" (($response.Status -eq 200) -and $response.Content.Contains("ECA Inter-School Singing Competition")) "status=$($response.Status)"
Add-Check "public event page exposes certificate links" ($response.Content.Contains("/certificates/") -and $response.Content.Contains("Aarav Shrestha")) ""

if ($winnerCertificate.certificateUrl) {
  $response = Invoke-Raw $winnerCertificate.certificateUrl -TimeoutSec 60
  Add-Check "winner certificate renders award wording" (($response.Status -eq 200) -and $response.Content.Contains("Awarded to") -and $response.Content.Contains("earned")) "status=$($response.Status)"
}

if ($participantCertificate.certificateUrl) {
  $response = Invoke-Raw $participantCertificate.certificateUrl -TimeoutSec 60
  Add-Check "participant certificate renders participation wording" (($response.Status -eq 200) -and $response.Content.Contains("Issued to") -and $response.Content.Contains("participated in")) "status=$($response.Status)"
}

$yesterday = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
$response = Invoke-JsonApi "/api/event-proposals" $null "POST" @{
  organizationName = "QA Past Date Org"
  contactName = "QA Tester"
  contactEmail = "qa-past@example.local"
  eventTitle = "Past Proposal Test"
  eventDescription = "Should be rejected"
  preferredDate = $yesterday
}
Add-Check "past preferred proposal date is rejected" (($response.Status -eq 400) -and ($response.Data.message -match "past")) "status=$($response.Status), message=$($response.Data.message)"

$response = Invoke-JsonApi "/api/events" $superAdmin.Web "POST" @{
  title = "QA Past Event $(Get-Date -Format FileDateTime)"
  description = "Should be rejected because date is in the past"
  date = $yesterday
  eventScope = "PLATFORM"
  eventType = "COMPETITION"
  visibility = "PUBLIC"
}
Add-Check "past event creation is rejected" (($response.Status -eq 400) -and ($response.Data.message -match "past|today|future")) "status=$($response.Status), message=$($response.Data.message)"

$response = Invoke-JsonApi "/api/events/$EventId/results" $superAdmin.Web "PUT" @{
  resultsPublished = $true
  publishPublicly = $true
  placements = @()
}
Add-Check "republish without correction reason is rejected" (($response.Status -eq 400) -and ($response.Data.message -match "correction reason")) "status=$($response.Status), message=$($response.Data.message)"

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
