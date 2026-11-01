# Rebuilds and restarts the app. The data volume is kept, so learner data survives. Backs up first.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
& "$PSScriptRoot\backup.ps1"
docker compose up -d --build app
docker compose ps
