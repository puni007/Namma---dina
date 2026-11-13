# Namma Dina - Windows PowerShell Database Backup Script
param(
    [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "nammadina_$Timestamp.sql"

Write-Host "==> Starting Namma Dina database backup..."

if ($env:DATABASE_URL) {
    & pg_dump $env:DATABASE_URL -f $BackupFile
} else {
    Write-Host "==> Backing up from local Docker PostgreSQL container..."
    docker exec nammadina-db-1 pg_dump -U postgres nammadina | Out-File -Encoding utf8 -FilePath $BackupFile
}

if (Test-Path $BackupFile) {
    $Size = (Get-Item $BackupFile).Length / 1MB
    Write-Host ("==> Backup completed successfully: {0} ({1:N2} MB)" -f $BackupFile, $Size)
} else {
    Write-Error "Backup file was not created."
}

