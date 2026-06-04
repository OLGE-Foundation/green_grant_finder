# Isolated scraper environment (avoids conflicts with global litellm/mcp packages)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) {
    python -m venv .venv
}

& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip

pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

playwright install chromium

Write-Host ""
Write-Host "Setup complete. Run the scraper with:"
Write-Host "  .\.venv\Scripts\Activate.ps1"
Write-Host "  python scraper.py"
