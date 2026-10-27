$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'web\edge-debug-profile'
$url = 'http://127.0.0.1:4183/?sync=http%3A%2F%2F127.0.0.1%3A18765%2Fframes'
New-Item -ItemType Directory -Path $profile -Force | Out-Null
Start-Process -FilePath $edge -ArgumentList @('--user-data-dir=' + $profile, '--remote-debugging-port=9222', '--new-window', $url) | Out-Null
