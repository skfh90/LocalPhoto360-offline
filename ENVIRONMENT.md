# LocalPhoto360 — Local Development Environment

This document records the **full environment used to develop and build** LocalPhoto360 on this machine (Windows 10). Use it when setting up a new PC, rebuilding after a clean install, or troubleshooting Android builds.

---

## Machine & OS

| Item | Value |
|------|-------|
| OS | Windows 10 (build 19045) |
| Shell | PowerShell |
| User profile | `C:\Users\k` |
| Workspace root | `D:\MY PREV WORK\BOSSSS` |
| **Saved toolchain on D:** | `D:\360photo environment` |

A full copy of JDK, Android SDK (project pieces), Gradle home, configs, and setup scripts lives in **`D:\360photo environment`**. See that folder’s `README.md`.

Load it in PowerShell:

```powershell
. "D:\360photo environment\scripts\setup-env.ps1"
```

---

## Project Paths

| Purpose | Path |
|---------|------|
| **This project (root)** | `D:\MY PREV WORK\BOSSSS\LocalPhoto360` |
| Android project | `D:\MY PREV WORK\BOSSSS\LocalPhoto360\android` |
| Android app module | `D:\MY PREV WORK\BOSSSS\LocalPhoto360\android\app` |
| JS / TypeScript source | `D:\MY PREV WORK\BOSSSS\LocalPhoto360\src` |
| 360 viewer Web assets | `D:\MY PREV WORK\BOSSSS\LocalPhoto360\android\app\src\main\assets\viewer` |
| Node modules | `D:\MY PREV WORK\BOSSSS\LocalPhoto360\node_modules` |
| Reference project (ported from) | `D:\MY PREV WORK\BOSSSS\360photos` |

### Short-path alias (Windows build workaround)

Long paths under `D:\MY PREV WORK\...` can cause Gradle / CMake / Ninja issues on Windows. Map a drive letter before building:

```powershell
subst L: "D:\MY PREV WORK\BOSSSS\LocalPhoto360"
# Then use: L:\android
```

Remove when done:

```powershell
subst L: /d
```

---

## Runtime & Toolchain Versions (verified on this PC)

### Java

| Item | Value |
|------|-------|
| **JDK** | **17** (Oracle JDK 17.0.11 LTS) |
| `JAVA_HOME` | `C:\Program Files\Java\jdk-17` |

React Native 0.72 + Android Gradle Plugin require **JDK 17** (not 8 or 21 for this project).

### Node.js & npm

| Item | Value |
|------|-------|
| **Node.js** | **v24.18.0** (project `package.json` requires `>=16`) |
| **npm** | **11.16.0** |
| npm config | `.npmrc` sets `legacy-peer-deps=true` |

Install dependencies:

```powershell
cd "D:\MY PREV WORK\BOSSSS\LocalPhoto360"
npm install
```

### Gradle

| Item | Value |
|------|-------|
| **Gradle (wrapper)** | **8.0.1** |
| Wrapper config | `android\gradle\wrapper\gradle-wrapper.properties` |
| JVM args | `-Xmx2048m -XX:MaxMetaspaceSize=512m` (`android\gradle.properties`) |
| Recommended `GRADLE_USER_HOME` | `C:\g` (short path; keep **several GB free** on C:) |

```powershell
$env:GRADLE_USER_HOME = "C:\g"
```

If C: is low on space, also redirect temp:

```powershell
$env:TEMP = "D:\tmp"
$env:TMP  = "D:\tmp"
New-Item -ItemType Directory -Force -Path "D:\tmp" | Out-Null
```

### Android SDK

| Item | Value |
|------|-------|
| `ANDROID_HOME` | `C:\Users\k\AppData\Local\Android\Sdk` |
| `ANDROID_SDK_ROOT` | `C:\Users\k\AppData\Local\Android\Sdk` |
| **compileSdk** | **33** |
| **targetSdk** | **33** |
| **minSdk** | **26** |
| **buildTools** | **33.0.0** |
| **NDK** | **23.1.7779620** |
| **CMake** | **3.22.1** (via Android SDK) |
| **Kotlin** | **1.7.22** |
| **ADB** | 1.0.41 |

Install via Android Studio SDK Manager:

- Android SDK Platform 33
- Android SDK Build-Tools 33.0.0
- NDK 23.1.7779620
- CMake 3.22.1

### React Native stack

| Item | Version |
|------|---------|
| **react-native** | **0.72.4** |
| **react** | 18.2.0 |
| **TypeScript** | 4.8.4 |
| **Hermes** | enabled (`hermesEnabled=true`) |
| **New Architecture** | disabled (`newArchEnabled=false`) |
| **Metro** | `@react-native/metro-config` ^0.72.9 |

### Key native dependencies

| Package | Version | Notes |
|---------|---------|-------|
| react-native-vision-camera | 3.6.3 | Camera capture |
| react-native-worklets-core | 0.2.1 | Vision Camera peer |
| react-native-screens | **3.24.0** | **Pinned** — 3.37+ breaks RN 0.72 |
| realm | 12.3.0 | Local metadata DB |
| react-native-webview | 13.5.1 | 360 viewer |
| react-native-orientation-angle | GitHub fork | Device orientation for capture |
| @bam.tech/react-native-image-resizer | 3.0.7 | Thumbnails |

`gradle.properties` also sets:

```
VisionCamera_disableFrameProcessors=true
```

---

## App Identity

| Item | Value |
|------|-------|
| Application ID | `com.localphoto360` |
| Namespace | `com.localphoto360` |
| versionCode | 1 |
| versionName | 1.0 |
| Release ABIs (phones) | `arm64-v8a`, `armeabi-v7a` |

---

## Environment Variables (summary)

Set these in PowerShell before building, or in Windows System Environment Variables:

```powershell
JAVA_HOME          = C:\Program Files\Java\jdk-17
ANDROID_HOME       = C:\Users\k\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT   = C:\Users\k\AppData\Local\Android\Sdk
GRADLE_USER_HOME   = C:\g

# Optional when C: is tight on space:
TEMP               = D:\tmp
TMP                = D:\tmp
```

Add to `PATH` (if not already):

```
C:\Program Files\Java\jdk-17\bin
C:\Users\k\AppData\Local\Android\Sdk\platform-tools
C:\Users\k\AppData\Local\Android\Sdk\emulator
```

---

## Build Commands

### Start Metro (JS bundler)

```powershell
cd "D:\MY PREV WORK\BOSSSS\LocalPhoto360"
npm start
```

### Debug build + install (USB device)

```powershell
cd "D:\MY PREV WORK\BOSSSS\LocalPhoto360"
npm run android
```

Or:

```powershell
$env:GRADLE_USER_HOME = "C:\g"
cd "D:\MY PREV WORK\BOSSSS\LocalPhoto360\android"
.\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

### Release APK (for real phone)

```powershell
$env:TEMP = "D:\tmp"
$env:TMP  = "D:\tmp"
$env:GRADLE_USER_HOME = "C:\g"

subst L: "D:\MY PREV WORK\BOSSSS\LocalPhoto360"
cd L:\android

.\gradlew.bat --stop
.\gradlew.bat assembleRelease --no-parallel "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
```

**Release APK output:**

```
D:\MY PREV WORK\BOSSSS\LocalPhoto360\android\app\build\outputs\apk\release\app-release.apk
```

(~44 MB, signed with debug keystore for local testing)

**Install on phone:**

```powershell
adb devices
adb install -r "D:\MY PREV WORK\BOSSSS\LocalPhoto360\android\app\build\outputs\apk\release\app-release.apk"
```

Release signing config (testing only) is in `android\app\build.gradle` → `signingConfigs.debug` / `debug.keystore`.

---

## On-Device Data Paths

Captured photos are stored **offline** on the phone:

| Item | Location |
|------|----------|
| Photo folders | `<App DocumentDirectory>/photo/<folder>/` |
| Per capture | `img_*.jpeg`, `rot.txt`, `thumbnail.jpg` |
| Panorama (after import) | `photo360.jpg` |
| Metadata | Realm model `PhotoCapture` |

---

## Windows Build Troubleshooting

### C: drive full (`ENOSPC`)

Gradle, npm, and temp files use C: by default. Free space on C: (target **5+ GB**), then:

- Delete `C:\g\caches` (safe; re-downloaded on next build)
- Clear `%LOCALAPPDATA%\Temp`
- Use `$env:TEMP = "D:\tmp"` and `$env:TMP = "D:\tmp"`

### Ninja / CMake “Permission denied”

```powershell
.\gradlew.bat --stop
Get-Process java,ninja,cmake -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force "node_modules\react-native-vision-camera\android\.cxx" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\react-native-worklets-core\android\.cxx" -ErrorAction SilentlyContinue
```

Then rebuild using `subst L:` and `--no-parallel`.

### Gradle download timeout

Gradle 8.0.1 zip URL:

```
https://services.gradle.org/distributions/gradle-8.0.1-all.zip
```

Place under `%GRADLE_USER_HOME%\wrapper\dists\gradle-8.0.1-all\<hash>\gradle-8.0.1-all.zip` if the wrapper download fails.

### react-native-screens version

Do **not** upgrade `react-native-screens` past **3.24.0** without upgrading React Native. Newer versions reference `BaseReactPackage` and break RN 0.72 builds.

---

## Recommended IDE

- **Android Studio** — Android SDK, emulator, NDK, CMake, device debugging
- **VS Code / Cursor** — TypeScript editing; open folder `D:\MY PREV WORK\BOSSSS\LocalPhoto360`

---

## Quick Verification Checklist

```powershell
java -version          # 17.x
node -v                # >= 16
npm -v
adb version
echo $env:JAVA_HOME
echo $env:ANDROID_HOME
cd "D:\MY PREV WORK\BOSSSS\LocalPhoto360\android"
.\gradlew.bat -v       # Gradle 8.0.1
```

---

## Document Info

| Item | Value |
|------|-------|
| Generated for | LocalPhoto360 |
| Last verified build | Release APK built successfully (~44 MB) |
| Platform target | **Android only** (offline 360 capture + viewer) |
