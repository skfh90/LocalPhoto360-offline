<#
.SYNOPSIS
  Sets up LocalPhoto360 on an OFFLINE Windows machine from the release bundle.

.DESCRIPTION
  Prerequisites already installed on the machine (NOT shipped in the bundle):
    - JDK 17 (JAVA_HOME set)            - Node.js 16+ (24 LTS recommended)
    - Android SDK with: platforms;android-33, build-tools;33.0.0,
      ndk;23.1.7779620, cmake;3.22.1

  Expects the GitHub Release assets copied into one folder (-Bundle), e.g. D:\lp360-bundle:
    npm-cache.zip, gradle-offline.zip, sdk-meta.zip,
    platform-tools_r*-win.zip, commandlinetools-win-*_latest.zip

  Steps (each is skipped if already done):
    1. Check prerequisites (JDK 17, Node, SDK components)
    2. Add adb / cmdline-tools / SDK licenses if the SDK lacks them
    3. Unpack the Gradle distribution + read-only dependency cache
    4. Persist env vars (ANDROID_HOME, GRADLE_USER_HOME, GRADLE_RO_DEP_CACHE)
    5. npm ci --offline from the bundled npm cache

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File offline\setup-windows-offline.ps1 -Bundle D:\lp360-bundle
#>
param(
  [Parameter(Mandatory = $true)][string]$Bundle,
  [string]$SdkRoot = $(if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }),
  [string]$GradleHome = "C:\g",
  [string]$GradleRoCache = "C:\g-ro"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Bundle = (Resolve-Path $Bundle).Path

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

function Find-BundleFile($pattern) {
  $f = Get-ChildItem -Path $Bundle -Filter $pattern -File | Select-Object -First 1
  if (-not $f) { throw "Missing bundle file matching '$pattern' in $Bundle" }
  return $f.FullName
}

# tar.exe (bsdtar, built into Windows 10 1803+) is much faster than Expand-Archive.
function Expand-Zip($zip, $dest) {
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  if (Get-Command tar.exe -ErrorAction SilentlyContinue) {
    tar.exe -xf $zip -C $dest
    if ($LASTEXITCODE -ne 0) { throw "tar failed on $zip" }
  } else {
    Expand-Archive -Path $zip -DestinationPath $dest -Force
  }
}

# Extract an SDK zip and place its content at $target (unwrapping a single top-level folder).
function Install-SdkZip($pattern, $target) {
  if (Test-Path (Join-Path $target "source.properties")) {
    Write-Host "  already present: $target"
    return
  }
  $zip = Find-BundleFile $pattern
  $parent = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  # Extract next to the target (same drive, so Move-Item works) with a short name (path limit).
  $tmp = Join-Path $parent ("_x" + (Get-Random -Maximum 99999))
  Expand-Zip $zip $tmp
  $items = @(Get-ChildItem $tmp)
  $src = $tmp
  if ($items.Count -eq 1 -and $items[0].PSIsContainer) { $src = $items[0].FullName }
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Move-Item -Path $src -Destination $target
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
  Write-Host "  installed: $target"
}

# ---------------------------------------------------------------- 1. Prerequisites
Step "Checking prerequisites"
$missing = @()
# java -version writes to stderr; don't let that trip $ErrorActionPreference = Stop.
$prevEap = $ErrorActionPreference; $ErrorActionPreference = "Continue"
$javaVer = ""
try { $javaVer = (& java -version 2>&1) -join " " } catch {}
$ErrorActionPreference = $prevEap
if ($javaVer -notmatch 'version "17\.') { $missing += "JDK 17 on PATH (found: '$javaVer')" }
if (-not $env:JAVA_HOME) { $missing += "JAVA_HOME environment variable (pointing to JDK 17)" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += "Node.js 16+ (24 LTS recommended)" }
foreach ($c in @("platforms\android-33", "build-tools\33.0.0", "ndk\23.1.7779620", "cmake\3.22.1")) {
  if (-not (Test-Path (Join-Path $SdkRoot $c))) { $missing += "Android SDK component $SdkRoot\$c" }
}
if ($missing.Count -gt 0) {
  throw ("Missing prerequisites:`n  - " + ($missing -join "`n  - ") + "`nInstall them (or pass -SdkRoot) and rerun.")
}
Write-Host "  java: $javaVer"
Write-Host "  node: $(node -v)"
Write-Host "  sdk:  $SdkRoot"

# ---------------------------------------------------------------- 2. adb / cmdline-tools / licenses
Step "Android SDK extras"
Install-SdkZip "platform-tools_r*-win.zip"         (Join-Path $SdkRoot "platform-tools")
Install-SdkZip "commandlinetools-win-*_latest.zip" (Join-Path $SdkRoot "cmdline-tools\latest")

# Licenses + package.xml, never overwriting what the existing SDK already has.
$meta = Join-Path $env:TEMP "lp360_sdkmeta"
if (Test-Path $meta) { Remove-Item -Recurse -Force $meta }
Expand-Zip (Find-BundleFile "sdk-meta.zip") $meta
$metaRoot = Join-Path $meta "sdk-meta"
Get-ChildItem -Recurse -File $metaRoot | ForEach-Object {
  $rel = $_.FullName.Substring($metaRoot.Length + 1)
  $dest = Join-Path $SdkRoot $rel
  if ((Test-Path (Split-Path -Parent $dest)) -and -not (Test-Path $dest)) {
    Copy-Item $_.FullName $dest
    Write-Host "  added $rel"
  } elseif ($rel -like "licenses\*" -and -not (Test-Path $dest)) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
    Copy-Item $_.FullName $dest
    Write-Host "  added $rel"
  }
}
Remove-Item -Recurse -Force $meta

# ---------------------------------------------------------------- 3. Gradle
Step "Gradle distribution + dependency cache"
if (-not (Test-Path (Join-Path $GradleRoCache "modules-2"))) {
  New-Item -ItemType Directory -Force -Path $GradleRoCache | Out-Null
  $tmp = Join-Path $GradleRoCache "_x"
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
  Expand-Zip (Find-BundleFile "gradle-offline.zip") $tmp
  Move-Item (Join-Path $tmp "gradle-offline\ro-cache\modules-2") $GradleRoCache

  # Wrapper unzips the distribution itself when the zip is present but not yet extracted.
  $distDir = Join-Path $GradleHome "wrapper\dists\gradle-8.0.1-all\aro4hu1c3oeioove7l0i4i14o"
  New-Item -ItemType Directory -Force -Path $distDir | Out-Null
  Move-Item -Force (Join-Path $tmp "gradle-offline\gradle-8.0.1-all.zip") $distDir
  Remove-Item -Recurse -Force $tmp
  Write-Host "  dependency cache: $GradleRoCache\modules-2"
} else { Write-Host "  already present: $GradleRoCache\modules-2" }

# ---------------------------------------------------------------- 4. Env vars
Step "Environment variables (User scope)"
$envs = @{
  "ANDROID_HOME"        = $SdkRoot
  "ANDROID_SDK_ROOT"    = $SdkRoot
  "GRADLE_USER_HOME"    = $GradleHome
  "GRADLE_RO_DEP_CACHE" = $GradleRoCache
  "REALM_DISABLE_ANALYTICS" = "1"
}
foreach ($k in $envs.Keys) {
  [Environment]::SetEnvironmentVariable($k, $envs[$k], "User")
  Set-Item -Path "env:$k" -Value $envs[$k]
  Write-Host "  $k = $($envs[$k])"
}
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pt = Join-Path $SdkRoot "platform-tools"
if ($userPath -notlike "*$pt*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$pt", "User")
  $env:Path = "$env:Path;$pt"
}

"sdk.dir=$($SdkRoot -replace '\\','/')" | Set-Content -Encoding ASCII (Join-Path $ProjectRoot "android\local.properties")

# ---------------------------------------------------------------- 5. npm
Step "npm ci --offline"
$cacheDir = Join-Path $env:TEMP "lp360_npmcache"
if (-not (Test-Path (Join-Path $cacheDir "npm-cache\_cacache"))) {
  Expand-Zip (Find-BundleFile "npm-cache.zip") $cacheDir
}
Push-Location $ProjectRoot
try {
  npm ci --offline --no-audit --no-fund --cache (Join-Path $cacheDir "npm-cache")
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
} finally { Pop-Location }

Step "Done"
Write-Host @"
Open a NEW PowerShell window (to load env vars), then:

  cd $ProjectRoot
  npm start                       # Metro bundler
  npm run android:offline         # debug build + install on USB device

Release APK:
  cd android
  .\gradlew.bat --offline assembleRelease --no-parallel "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
"@
