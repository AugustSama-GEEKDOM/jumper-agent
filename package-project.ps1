param(
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$Repo = (Resolve-Path -LiteralPath $Repo).Path
if (-not $OutputPath) {
    $name = Split-Path -Leaf $Repo
    $OutputPath = Join-Path ([Environment]::GetFolderPath('Desktop')) ($name + '-source.zip')
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputParent = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $outputParent)) {
    New-Item -ItemType Directory -Path $outputParent -Force | Out-Null
}
if ($OutputPath.StartsWith($Repo + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Write the archive outside the source directory so it cannot include itself.'
}
if (Test-Path -LiteralPath $OutputPath) {
    throw "Archive already exists; choose another OutputPath: $OutputPath"
}

$excludedDirectories = @(
    '.git', '.venv', 'venv', 'node_modules', 'target', '__pycache__',
    '.pytest_cache', '.ruff_cache', '.warp', '.cache', 'logs', 'runs', 'outputs',
    'edge-profile', 'edge-debug-profile', 'edge-headless-profile'
)
$files = Get-ChildItem -LiteralPath $Repo -File -Recurse -Force | Where-Object {
    $relative = [System.IO.Path]::GetRelativePath($Repo, $_.FullName)
    $parts = $relative -split '[\\/]'
    $skip = $false
    foreach ($part in $parts) {
        if ($excludedDirectories -contains $part -or $part -match '^(edge|browser)-.*profile$') {
            $skip = $true
            break
        }
    }
    if ($_.Name -eq '.env' -or $_.Name -eq '.env.local' -or $_.Extension -eq '.pyc' -or
        $_.Extension -eq '.log' -or $_.Extension -eq '.pt' -or $_.Extension -eq '.ckpt' -or
        $_.Extension -eq '.zip') {
        $skip = $true
    }
    -not $skip
}

$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
Add-Type -AssemblyName System.IO.Compression
$fileStream = [System.IO.File]::Open($OutputPath, [System.IO.FileMode]::CreateNew)
$archive = [System.IO.Compression.ZipArchive]::new(
    $fileStream,
    [System.IO.Compression.ZipArchiveMode]::Create,
    $false
)
try {
    foreach ($file in $files) {
        $relative = [System.IO.Path]::GetRelativePath($Repo, $file.FullName).Replace('\', '/')
        $entry = $archive.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
        $source = [System.IO.File]::OpenRead($file.FullName)
        $destination = $entry.Open()
        try { $source.CopyTo($destination) }
        finally {
            $destination.Dispose()
            $source.Dispose()
        }
    }
}
catch {
    $archive.Dispose()
    Remove-Item -LiteralPath $OutputPath -Force -ErrorAction SilentlyContinue
    throw
}
$archive.Dispose()
$archiveSize = (Get-Item -LiteralPath $OutputPath).Length
Write-Output "Archive: $OutputPath"
Write-Output "Files: $($files.Count)"
Write-Output ("Source size: {0:N1} MiB" -f ($totalBytes / 1MB))
Write-Output ("Archive size: {0:N1} MiB" -f ($archiveSize / 1MB))
