$body = @{
    email = "testfaculty1@school.com"
    password = "Password123"
    schoolName = "Faculty Test School"
    principalName = "John Doe"
    principalPhone = "9800123456"
    schoolLocation = "Kathmandu"
    schoolPhone = "9800123456"
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
            faculties = "Science, Commerce, Humanities"
        }
        bachelor = @{
            startingYear = 1
            endingYear = 3
            hasSemesters = $false
            faculties = ""
        }
    }
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/register" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing

Write-Host "Status Code: $($response.StatusCode)"
Write-Host "Response Body:"
Write-Host $response.Content
