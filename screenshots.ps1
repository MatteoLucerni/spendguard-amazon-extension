param(
    [string]$ChromePath = $env:CHROME_PATH,
    [string[]]$Scene
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$harnessDir = Join-Path $projectRoot 'tools\screenshots'
$templatePath = Join-Path $harnessDir 'harness.html'
$generatedPath = Join-Path $harnessDir '.harness.generated.html'
$outputDir = Join-Path $projectRoot 'docs\images\screenshots'
$manifestPath = Join-Path $projectRoot 'manifest.json'

$viewportWidth = 720
$viewportHeight = 640
$scaleFactor = 2
$entryScript = 'src/main.js'

$allScenes = @(
    'widget',
    'settings',
    'normal-lock',
    'checkout-lock',
    'hard-lock',
    'checkout-warning'
)

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

$scenes = if ($Scene) { $Scene } else { $allScenes }
$unknown = $scenes | Where-Object { $allScenes -notcontains $_ }
if ($unknown) {
    Write-Error "Unknown scene(s): $($unknown -join ', '). Available: $($allScenes -join ', ')"
    exit 1
}

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

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$profileDir = Join-Path ([System.IO.Path]::GetTempPath()) "spendguard-screenshots-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $profileDir -Force | Out-Null

try {
    [System.IO.File]::WriteAllText($generatedPath, $html, (New-Object System.Text.UTF8Encoding $false))
    $harnessUrl = ([System.Uri]$generatedPath).AbsoluteUri

    Write-Host ''
    Write-Host "  Browser: $ChromePath" -ForegroundColor DarkGray
    Write-Host "  Output:  $outputDir" -ForegroundColor DarkGray
    Write-Host ''

    foreach ($name in $scenes) {
        $outputPath = Join-Path $outputDir "$name.png"
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
            "--force-device-scale-factor=$scaleFactor",
            "--window-size=$viewportWidth,$viewportHeight",
            '--virtual-time-budget=3000',
            "--screenshot=`"$outputPath`"",
            "`"$($harnessUrl)?scene=$name`""
        )

        Start-Process -FilePath $ChromePath -ArgumentList $arguments -Wait -WindowStyle Hidden

        if (-not (Test-Path $outputPath)) {
            Write-Error "Screenshot not created for scene '$name'"
            exit 1
        }

        $sizeKB = [math]::Round((Get-Item $outputPath).Length / 1024, 1)
        Write-Host "  $name.png ($sizeKB KB)" -ForegroundColor Green
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
