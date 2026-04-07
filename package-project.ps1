# package-project.ps1
# This script builds the project and packages it into a ZIP file for delivery.

$projectName = "vocalflow-windows"
$zipName = "$projectName.zip"
$destination = ".." # Create ZIP in the parent directory

Write-Host "Building project..." -ForegroundColor Cyan
npm run build

Write-Host "Creating ZIP archive (excluding node_modules)..." -ForegroundColor Cyan

# Remove old zip if exists
if (Test-Path "$destination\$zipName") {
    Remove-Item "$destination\$zipName"
}

# Use Compress-Archive to create the ZIP
# We define the items to include
$itemsToInclude = Get-ChildItem -Path . -Exclude "node_modules", ".git", "package-lock.json", "*.log"

Compress-Archive -Path $itemsToInclude -DestinationPath "$destination\$zipName" -Force

Write-Host "Package created: $destination\$zipName" -ForegroundColor Green
