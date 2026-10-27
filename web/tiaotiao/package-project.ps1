$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
$stage = Join-Path $root '.package-stage'
$zip = Join-Path $desktop 'tiaotiao-project-source-docs.zip'

if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage 'docs') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage 'tools') | Out-Null

$files = @(
  'README.md', '.env.example', '.gitignore', 'package.json', 'start-tiaotiao.bat',
  'app.js', 'index.html', 'style.css', 'server.mjs', 'favicon.svg',
  'promo.html', 'promo.css', 'promo.js', 'preview-promo.mjs', 'qa-layout.mjs',
  'render-demo.mjs', 'package-project.ps1'
)
foreach ($file in $files) { Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $stage $file) }
$localizedLauncher = Get-ChildItem -LiteralPath $root -Filter '*.bat' -File |
  Where-Object { $_.Name -ne 'start-tiaotiao.bat' } |
  Select-Object -First 1
if ($localizedLauncher) {
  Copy-Item -LiteralPath $localizedLauncher.FullName -Destination (Join-Path $stage $localizedLauncher.Name)
}
foreach ($file in (Get-ChildItem -LiteralPath (Join-Path $root 'docs') -File -Recurse)) {
  $relative = $file.FullName.Substring((Join-Path $root 'docs').Length).TrimStart('\', '/')
  $destination = Join-Path (Join-Path $stage 'docs') $relative
  $parent = Split-Path -Parent $destination
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination $destination
}
foreach ($file in (Get-ChildItem -LiteralPath (Join-Path $root 'tools') -File -Recurse)) {
  $relative = $file.FullName.Substring((Join-Path $root 'tools').Length).TrimStart('\', '/')
  $destination = Join-Path (Join-Path $stage 'tools') $relative
  $parent = Split-Path -Parent $destination
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination $destination
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $stage,
  $zip,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)
Remove-Item -LiteralPath $stage -Recurse -Force
Write-Output $zip
