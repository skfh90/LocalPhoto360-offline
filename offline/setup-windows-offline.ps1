<#
.SYNOPSIS
  Sets up LocalPhoto360 on an OFFLINE Windows machine from the release bundle.

.DESCRIPTION
  Expects the GitHub Release assets copied into one folder (-Bundle), e.g. D:\lp360-bundle:
    npm-cache.zip, gradle-offline.zip, sdk-meta.zip,
    OpenJDK17-windows-x64.msi, node-v24.*-x64.msi,
    platform-33-ext3_r03.zip, build-tools_r33-windows.zip, android-ndk-r23b-windows.zip,
    cmake-3.22.1-windows.zip, platform-tools_r37.0.1-win.zip, commandlinetools-win-*_latest.zip

  Steps (each is skipped if already done):
    1. Install JDK 17 and Node 24 from the bundled MSIs (needs admin)
    2. Lay out the Android SDK (platform 33, build-tools 33.0.0, NDK 23.1.7779620, CMake 3.22.1)
    3. Unpack the Gradle distribution + read-only dependency cache
    4. npm ci --offline from the bundled npm cache
    5. Persist env vars (JAVA_HOME, ANDROID_HOME, GRADLE_USER_HOME, GRADLE_RO_DEP_CACHE)

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File offline\setup-windows-offline.ps1 -Bundle D:\lp360-bundle
#>
param(
  [Parameter(Mandatory = $true)][string]$Bundle,
  [string]$SdkRoot = "C:\Android\Sdk",
  [string]$GradleHome = "C:\g",
  [string]$GradleRoCache = "C:\g-ro",
  [switch]$SkipMsi
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

# ---------------------------------------------------------------- 1. JDK + Node
if (-not $SkipMsi) {
  Step "JDK 17 / Node.js"
  $javaOk = $false
  # java -version writes to stderr; don't let that trip $ErrorActionPreference = Stop.
  $prevEap = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  try { $javaOk = ((& java -version 2>&1) -join " ") -match 'version "17\.' } catch {}
  $ErrorActionPreference = $prevEap
  if (-not $javaOk) {
    $msi = Find-BundleFile "OpenJDK17-windows-x64.msi"
    Write-Host "  installing $msi"
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$msi`" /qn ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJavaHome"
  } else { Write-Host "  JDK 17 already installed" }

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $msi = Find-BundleFile "node-v*-x64.msi"
    Write-Host "  installing $msi"
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$msi`" /qn"
  } else { Write-Host "  Node already installed: $(node -v)" }

  # Pick up PATH / JAVA_HOME written by the installers.
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
  $mj = [Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine")
  if ($mj) { $env:JAVA_HOME = $mj }
}

# ---------------------------------------------------------------- 2. Android SDK
Step "Android SDK -> $SdkRoot"
Install-SdkZip "platform-33-ext3_r03.zip"          (Join-Path $SdkRoot "platforms\android-33")
Install-SdkZip "build-tools_r33-windows.zip"       (Join-Path $SdkRoot "build-tools\33.0.0")
Install-SdkZip "android-ndk-r23b-windows.zip"      (Join-Path $SdkRoot "ndk\23.1.7779620")
Install-SdkZip "cmake-3.22.1-windows.zip"          (Join-Path $SdkRoot "cmake\3.22.1")
Install-SdkZip "platform-tools_r*-win.zip"         (Join-Path $SdkRoot "platform-tools")
Install-SdkZip "commandlinetools-win-*_latest.zip" (Join-Path $SdkRoot "cmdline-tools\latest")

# package.xml files + accepted licenses (so AGP recognises the hand-installed packages).
$meta = Join-Path $env:TEMP "lp360_sdkmeta"
if (Test-Path $meta) { Remove-Item -Recurse -Force $meta }
Expand-Zip (Find-BundleFile "sdk-meta.zip") $meta
Copy-Item -Recurse -Force (Join-Path $meta "sdk-meta\*") $SdkRoot
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
