param(
    [ValidateSet('All', 'Site', 'Store')]
    [string]$Target = 'All',
    [string[]]$Scene,
    [string]$ChromePath = $env:CHROME_PATH
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$projectRoot = $PSScriptRoot
$harnessDir = Join-Path $projectRoot 'tools\screenshots'
$templatePath = Join-Path $harnessDir 'harness.html'
$generatedPath = Join-Path $harnessDir '.harness.generated.html'
$storePagePath = Join-Path $harnessDir 'store.html'
$siteOutputDir = Join-Path $projectRoot 'docs\images\screenshots'
$storeOutputDir = Join-Path $projectRoot 'store\screenshots'
$manifestPath = Join-Path $projectRoot 'manifest.json'
$entryScript = 'src/main.js'

$siteViewport = @{ Width = 720; Height = 640; Scale = 2 }
$storeViewport = @{ Width = 1280; Height = 800; Scale = 1 }

$siteScenes = @(
    'widget',
    'settings',
    'normal-lock',
    'checkout-lock',
    'hard-lock',
    'checkout-warning'
)

$storeShots = @(
    'widget',
    'normal-lock',
    'checkout-warning',
    'hard-lock',
    'settings'
)

if ($storeShots.Count -gt 5) {
    Write-Error 'The Chrome Web Store accepts at most 5 screenshots.'
    exit 1
}

if (-not $ChromePath) {
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe')
    )
    $ChromePath = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
}

if (-not $ChromePath -or -not (Test-Path $ChromePath)) {
    Write-Error 'Chrome or Edge not found. Pass -ChromePath or set the CHROME_PATH environment variable.'
    exit 1
}

if ($Scene) {
    $known = $siteScenes + $storeShots | Select-Object -Unique
    $unknown = $Scene | Where-Object { $known -notcontains $_ }
    if ($unknown) {
        Write-Error "Unknown scene(s): $($unknown -join ', '). Available: $($known -join ', ')"
        exit 1
    }
}

function Select-Scenes([string[]]$list) {
    if ($Scene) {
        return @($list | Where-Object { $Scene -contains $_ })
    }
    return @($list)
}

$runSite = $Target -eq 'All' -or $Target -eq 'Site'
$runStore = $Target -eq 'All' -or $Target -eq 'Store'
$selectedSite = @(if ($runSite) { Select-Scenes $siteScenes })
$selectedStore = @(if ($runStore) { Select-Scenes $storeShots })

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$contentScripts = @()
foreach ($cs in $manifest.content_scripts) {
    foreach ($jsFile in $cs.js) {
        if ($jsFile -ne $entryScript) {
            $contentScripts += $jsFile
        }
    }
}

$scriptTags = ($contentScripts | ForEach-Object { "    <script src=`"../../$_`"></script>" }) -join "`n"
$template = Get-Content $templatePath -Raw
if ($template -notmatch '<!-- SPENDGUARD_CONTENT_SCRIPTS -->') {
    Write-Error "Placeholder missing in $templatePath"
    exit 1
}
$html = $template.Replace('    <!-- SPENDGUARD_CONTENT_SCRIPTS -->', $scriptTags)

$profileDir = Join-Path ([System.IO.Path]::GetTempPath()) "spendguard-screenshots-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $profileDir -Force | Out-Null

function Invoke-Screenshot([string]$url, [string]$outputPath, [hashtable]$viewport) {
    if (Test-Path $outputPath) {
        Remove-Item $outputPath -Force
    }

    $arguments = @(
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--allow-file-access-from-files',
        "--user-data-dir=`"$profileDir`"",
        "--force-device-scale-factor=$($viewport.Scale)",
        "--window-size=$($viewport.Width),$($viewport.Height)",
        '--virtual-time-budget=4000',
        "--screenshot=`"$outputPath`"",
        "`"$url`""
    )

    Start-Process -FilePath $ChromePath -ArgumentList $arguments -Wait -WindowStyle Hidden

    if (-not (Test-Path $outputPath)) {
        Write-Error "Screenshot not created: $outputPath"
        exit 1
    }
}

function ConvertTo-OpaquePng([string]$path, [int]$expectedWidth, [int]$expectedHeight) {
    $source = [System.Drawing.Image]::FromFile($path)
    try {
        if ($source.Width -ne $expectedWidth -or $source.Height -ne $expectedHeight) {
            Write-Error "$path is $($source.Width)x$($source.Height), expected ${expectedWidth}x${expectedHeight}"
            exit 1
        }
        $opaque = New-Object System.Drawing.Bitmap $source.Width, $source.Height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $graphics = [System.Drawing.Graphics]::FromImage($opaque)
        try {
            $graphics.Clear([System.Drawing.Color]::White)
            $graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
        }
        finally {
            $graphics.Dispose()
        }
    }
    finally {
        $source.Dispose()
    }

    try {
        $opaque.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $opaque.Dispose()
    }
}

function Write-Result([string]$path) {
    $sizeKB = [math]::Round((Get-Item $path).Length / 1024, 1)
    Write-Host "  $(Split-Path $path -Leaf) ($sizeKB KB)" -ForegroundColor Green
}

try {
    [System.IO.File]::WriteAllText($generatedPath, $html, (New-Object System.Text.UTF8Encoding $false))
    $harnessUrl = ([System.Uri]$generatedPath).AbsoluteUri
    $storeUrl = ([System.Uri]$storePagePath).AbsoluteUri

    Write-Host ''
    Write-Host "  Browser: $ChromePath" -ForegroundColor DarkGray

    if ($selectedSite.Count -gt 0) {
        if (-not (Test-Path $siteOutputDir)) {
            New-Item -ItemType Directory -Path $siteOutputDir -Force | Out-Null
        }
        Write-Host ''
        Write-Host "  Website -> $siteOutputDir" -ForegroundColor Cyan
        foreach ($name in $selectedSite) {
            $outputPath = Join-Path $siteOutputDir "$name.png"
            Invoke-Screenshot "$($harnessUrl)?scene=$name" $outputPath $siteViewport
            Write-Result $outputPath
        }
    }

    if ($selectedStore.Count -gt 0) {
        if (-not (Test-Path $storeOutputDir)) {
            New-Item -ItemType Directory -Path $storeOutputDir -Force | Out-Null
        }
        Write-Host ''
        Write-Host "  Chrome Web Store -> $storeOutputDir" -ForegroundColor Cyan
        foreach ($name in $selectedStore) {
            $position = [array]::IndexOf($storeShots, $name) + 1
            $outputPath = Join-Path $storeOutputDir "$position-$name.png"
            Invoke-Screenshot "$($storeUrl)?shot=$name" $outputPath $storeViewport
            ConvertTo-OpaquePng $outputPath $storeViewport.Width $storeViewport.Height
            Write-Result $outputPath
        }
    }

    Write-Host ''
}
finally {
    if (Test-Path $generatedPath) {
        Remove-Item $generatedPath -Force
    }
    if (Test-Path $profileDir) {
        Remove-Item $profileDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
