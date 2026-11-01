# Saves the learner data and uploads to backups\saarthi-<timestamp>.tar.gz (run while the app is up).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force "$root\backups" | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$vol = (docker volume ls --format '{{.Name}}' | Where-Object { $_ -like '*saarthi-data' } | Select-Object -First 1)
if (-not $vol) { throw 'Could not find the saarthi-data volume. Is the app deployed?' }
docker run --rm -v "${vol}:/data:ro" -v "$root\backups:/backup" alpine tar czf "/backup/saarthi-$stamp.tar.gz" -C /data .
Write-Host "Saved backups\saarthi-$stamp.tar.gz"
