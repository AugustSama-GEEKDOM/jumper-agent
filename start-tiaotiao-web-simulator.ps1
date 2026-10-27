$ErrorActionPreference = 'Stop'

$Repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $Repo 'web\tiaotiao'
$WebPort = 4183
$ScreenPort = 18765
$ActionPort = 18766
$Python = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'
$Node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
$EdgeCandidates = @(
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$Edge = $EdgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$EdgeProfile = Join-Path $Repo 'web\edge-profile'

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Python 3.11 was not found at $Python"
}
if (-not $Node) {
    throw 'Node.js was not found on PATH'
}
if (-not $Edge) {
    throw 'Microsoft Edge was not found'
}
New-Item -ItemType Directory -Path $EdgeProfile -Force | Out-Null

$LogRoot = Join-Path $Repo 'logs'
New-Item -ItemType Directory -Path $LogRoot -Force | Out-Null
$WebLog = Join-Path $LogRoot 'tiaotiao-web-server.log'
$WebErr = Join-Path $LogRoot 'tiaotiao-web-server.err.log'
$CastLog = Join-Path $LogRoot 'tiaotiao-screen-cast.log'
$CastErr = Join-Path $LogRoot 'tiaotiao-screen-cast.err.log'

$webProcess = Start-Process -FilePath $Node -ArgumentList @('server.mjs') `
    -WorkingDirectory $WebRoot -RedirectStandardOutput $WebLog `
    -RedirectStandardError $WebErr -WindowStyle Hidden -PassThru

$ready = $false
for ($attempt = 0; $attempt -lt 50; $attempt++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$WebPort/" -UseBasicParsing -TimeoutSec 1
        if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch {
        Start-Sleep -Milliseconds 200
    }
}
if (-not $ready) {
    if (-not $webProcess.HasExited) { Stop-Process -Id $webProcess.Id -Force }
    throw "Tiaotiao web server did not become ready on port $WebPort"
}

$castProcess = Start-Process -FilePath $Python `
    -ArgumentList @('assets/jumper/tools/screen_cast.py', '--standalone', '--screen-port', "$ScreenPort", '--action-port', "$ActionPort") `
    -WorkingDirectory $Repo -RedirectStandardOutput $CastLog `
    -RedirectStandardError $CastErr -PassThru

$syncUrl = "http://127.0.0.1:$WebPort/?sync=$([uri]::EscapeDataString("http://127.0.0.1:$ScreenPort/frames"))"
# The page derives the action endpoint from the reserved port immediately
# after the screen receiver, keeping this URL compatible with Edge launchers
# that split arguments at an ampersand.
Start-Process -FilePath $Edge -ArgumentList @('--user-data-dir=' + $EdgeProfile, '--new-window', $syncUrl) | Out-Null

Write-Host "Jumper copy started: $Repo"
Write-Host "Web page: $syncUrl"
Write-Host "Action bridge: http://127.0.0.1:$ActionPort/actions"
Write-Host "Web PID: $($webProcess.Id); simulator/cast GUI PID: $($castProcess.Id)"
Write-Host 'The web eyes are synced to the simulator round screens.'
