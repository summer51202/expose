param(
    [string]$Feature = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  expose-photo-site ??Session Verify" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allPassed = $true

# 1. Lint check
Write-Host "[1/4] Running lint..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    $lintResult = npx eslint . 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Lint OK" -ForegroundColor Green
    } else {
        Write-Host "  Lint FAILED" -ForegroundColor Red
        $lintResult | Select-Object -Last 15 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        $allPassed = $false
    }
} catch {
    Write-Host "  Lint check error" -ForegroundColor Red
    $allPassed = $false
}
Pop-Location

# 2. TypeScript type check
Write-Host "[2/4] Running type check..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    $tscResult = npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  TypeScript OK" -ForegroundColor Green
    } else {
        Write-Host "  TypeScript FAILED" -ForegroundColor Red
        $tscResult | Select-Object -Last 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        $allPassed = $false
    }
} catch {
    Write-Host "  Type check error" -ForegroundColor Red
    $allPassed = $false
}
Pop-Location

# 3. Build check
Write-Host "[3/4] Running build..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    $env:NEXT_DIST_DIR = ".next-verify-build"
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Build OK" -ForegroundColor Green
    } else {
        Write-Host "  Build FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  Build check error" -ForegroundColor Red
    $allPassed = $false
} finally {
    Remove-Item Env:NEXT_DIST_DIR -ErrorAction SilentlyContinue
}
Pop-Location

# 4. Git status
Write-Host "[4/4] Checking git status..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    $status = git status --porcelain 2>&1
    $untracked = ($status | Where-Object { $_ -match "^\?\?" }).Count
    $modified = ($status | Where-Object { $_ -match "^ M|^M " }).Count
    Write-Host "  Untracked: $untracked, Modified: $modified" -ForegroundColor $(if ($untracked + $modified -gt 0) { "Yellow" } else { "Green" })
} catch {
    Write-Host "  Not a git repo" -ForegroundColor Yellow
}
Pop-Location

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ALL CHECKS PASSED" -ForegroundColor Green
    Write-Host "  Safe to commit and end session." -ForegroundColor Green
} else {
    Write-Host "  SOME CHECKS FAILED" -ForegroundColor Red
    Write-Host "  Fix issues before committing." -ForegroundColor Red
}
Write-Host "========================================`n" -ForegroundColor Cyan

if ($Feature -ne "") {
    Write-Host "Feature verified: $Feature" -ForegroundColor White
    Write-Host "Remember to:" -ForegroundColor White
    Write-Host "  1. Update features.json ??set status to 'done'" -ForegroundColor White
    Write-Host "  2. git add + git commit" -ForegroundColor White
    Write-Host "  3. Update progress.md with session summary" -ForegroundColor White
}
