# Isolated scraper environment (avoids conflicts with global litellm/mcp packages)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) {
    python -m venv .venv
}

& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip

# supabase 2.4.0 pins httpx<0.26, but gotrue on Python 3.13 needs httpx>=0.27 for create_client
pip install beautifulsoup4==4.12.3 python-dotenv==1.0.1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
# 1.42 needs greenlet build on Python 3.13; use newer Playwright locally (CI uses 3.11 + requirements.txt)
pip install "playwright>=1.48.0"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pip install supabase==2.4.0
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pip install httpx==0.27.0 --force-reinstall
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

playwright install chromium

Write-Host ""
Write-Host "Setup complete. Run the scraper with:"
Write-Host "  .\.venv\Scripts\Activate.ps1"
Write-Host "  python scraper.py"
