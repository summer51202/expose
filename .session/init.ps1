$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  expose-photo-site ??Session Init" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot

# 1. Check node_modules
Write-Host "[1/5] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $projectRoot "node_modules"))) {
    Write-Host "  node_modules not found. Running npm install..." -ForegroundColor Red
    Push-Location $projectRoot
    npm install
    Pop-Location
} else {
    Write-Host "  node_modules OK" -ForegroundColor Green
}

# 2. Check .env
Write-Host "[2/5] Checking environment..." -ForegroundColor Yellow
$envPath = Join-Path $projectRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "  WARNING: .env not found. Copy .env.example and configure it." -ForegroundColor Red
    Write-Host "  Run: Copy-Item .env.example .env" -ForegroundColor Red
} else {
    Write-Host "  .env OK" -ForegroundColor Green
}

# 3. Prisma generate
Write-Host "[3/5] Running prisma generate..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    npx prisma generate 2>&1 | Out-Null
    Write-Host "  Prisma client generated OK" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: prisma generate failed ??DB features may not work" -ForegroundColor Red
}
Pop-Location

# 4. Check git status
Write-Host "[4/5] Checking git status..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    $gitStatus = git status --porcelain 2>&1
    $branch = git branch --show-current 2>&1
    Write-Host "  Branch: $branch" -ForegroundColor Green
    $dirtyCount = ($gitStatus | Where-Object { $_ -ne "" }).Count
    if ($dirtyCount -gt 0) {
        Write-Host "  Uncommitted changes: $dirtyCount file(s)" -ForegroundColor Yellow
    } else {
        Write-Host "  Working tree clean" -ForegroundColor Green
    }
} catch {
    Write-Host "  WARNING: Not a git repository" -ForegroundColor Red
}
Pop-Location

# 5. Build check (lightweight ??no dev server)
Write-Host "[5/5] Running lint + build check..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    $lintResult = npx eslint . 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Lint OK" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Lint failed ??check errors above" -ForegroundColor Red
        $lintResult | Select-Object -Last 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    }

    $env:NEXT_DIST_DIR = ".next-init-build"
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Build OK" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Build failed ??check errors above" -ForegroundColor Red
    }
} catch {
    Write-Host "  WARNING: Build check failed" -ForegroundColor Red
} finally {
    Remove-Item Env:NEXT_DIST_DIR -ErrorAction SilentlyContinue
}
Pop-Location

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Init complete. Ready to code." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Read .session/progress.md" -ForegroundColor White
Write-Host "  2. Read .session/features.json" -ForegroundColor White
Write-Host "  3. Pick the highest-priority in_progress or not_started feature" -ForegroundColor White
Write-Host "  4. Implement ONE feature per session" -ForegroundColor White
Write-Host ""
