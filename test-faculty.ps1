Start-Sleep -Seconds 2

$payload = @{
    email = "testfacultyapi@example.com"
    password = "TestPass123"
    schoolName = "Faculty Test School"
    principalName = "Dr. Test"
    principalPhone = "9800000001"
    schoolLocation = "Kathmandu"
    schoolPhone = "9800000002"
    website = ""
    establishedYear = 2020
    educationLevels = @{
        school = $false
        highSchool = $true
        bachelor = $false
    }
    schoolConfig = @{
        schoolLevel = @{
            minGrade = 1
            maxGrade = 10
        }
        highSchool = @{
            faculties = "Science, Commerce"
        }
        bachelor = @{
            startingYear = 1
            endingYear = 3
            hasSemesters = $false
            faculties = ""
        }
    }
} | ConvertTo-Json -Depth 10

Write-Host "Sending registration request..." -ForegroundColor Cyan
Write-Host "Payload: $payload`n" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/register" -Method POST -ContentType "application/json" -Body $payload -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Green
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
