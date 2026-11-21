# =====================================================================
# Mở API ra Internet qua Cloudflare quick tunnel
#   npm run share        (hoặc: powershell -NoProfile -File scripts/share-api.ps1)
#
# Script lo 3 việc: bật stack Docker, chờ API sẵn sàng, rồi mở tunnel và
# copy URL public vào clipboard. Ctrl+C để đóng tunnel (container vẫn chạy).
# =====================================================================

$ErrorActionPreference = 'Stop'

# Chạy từ thư mục gốc project, không phụ thuộc chỗ gọi script
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# --- Tìm cloudflared -------------------------------------------------
$cf = $null
foreach ($p in @(
    "$env:ProgramFiles\cloudflared\cloudflared.exe",
    "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"
)) {
    if (Test-Path $p) { $cf = $p; break }
}
if (-not $cf) {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($null -ne $cmd) { $cf = $cmd.Source }
}
if (-not $cf) {
    Write-Host "Khong tim thay cloudflared. Cai bang:" -ForegroundColor Red
    Write-Host "  winget install --id Cloudflare.cloudflared"
    exit 1
}

if (-not (Test-Path '.env.docker')) {
    Write-Host "Thieu .env.docker - copy tu .env.docker.example roi dien secrets." -ForegroundColor Red
    exit 1
}

# Lấy APP_PORT từ .env.docker, mặc định 3000
$port = 3000
$m = Select-String -Path '.env.docker' -Pattern '^\s*APP_PORT\s*=\s*(\d+)' -ErrorAction SilentlyContinue
if ($null -ne $m) { $port = [int]$m.Matches[0].Groups[1].Value }

# --- Bật stack Docker ------------------------------------------------
Write-Host "`n[1/3] Bat Docker stack..." -ForegroundColor Cyan
docker compose --env-file .env.docker up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "docker compose that bai. Kiem tra Docker Desktop da chay chua." -ForegroundColor Red
    exit 1
}

# --- Chờ API trả lời -------------------------------------------------
Write-Host "[2/3] Cho API san sang (toi da 90s)..." -ForegroundColor Cyan
$ready = $false
foreach ($i in 1..45) {
    try {
        $r = Invoke-WebRequest "http://localhost:$port/products" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {
        Start-Sleep -Seconds 2
    }
}
if (-not $ready) {
    Write-Host "API khong tra loi sau 90s. Xem log: docker compose --env-file .env.docker logs app" -ForegroundColor Red
    exit 1
}

# --- Mở tunnel -------------------------------------------------------
Write-Host "[3/3] Mo Cloudflare tunnel..." -ForegroundColor Cyan
$log = Join-Path $env:TEMP 'opl-tunnel.log'
if (Test-Path $log) { Remove-Item $log -Force }

$proc = Start-Process -FilePath $cf `
    -ArgumentList 'tunnel', '--url', "http://localhost:$port", '--no-autoupdate' `
    -RedirectStandardError $log -RedirectStandardOutput "$log.out" `
    -PassThru -NoNewWindow

# cloudflared in URL ra stderr sau vai giay
$url = $null
foreach ($i in 1..30) {
    Start-Sleep -Seconds 1
    if (Test-Path $log) {
        $hit = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue
        if ($null -ne $hit) { $url = $hit.Matches[0].Value; break }
    }
    if ($proc.HasExited) { break }
}

if (-not $url) {
    Write-Host "Khong lay duoc URL tunnel. Log:" -ForegroundColor Red
    if (Test-Path $log) { Get-Content $log -Tail 20 }
    if (-not $proc.HasExited) { $proc.Kill() }
    exit 1
}

Set-Clipboard -Value $url

Write-Host ""
Write-Host "  API san sang - URL da copy vao clipboard" -ForegroundColor Green
Write-Host ""
Write-Host "  API    $url"
Write-Host "  Docs   $url/docs"
Write-Host ""
Write-Host "  Ctrl+C de dong tunnel (container Docker van chay)." -ForegroundColor DarkGray
Write-Host "  URL nay doi moi lan chay lai script." -ForegroundColor DarkGray
Write-Host ""

$proc.WaitForExit()
