$uri = "http://localhost:3000/api/admin/school-config"
Write-Host "Testing: $uri" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $uri -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_)" -ForegroundColor Red
}
