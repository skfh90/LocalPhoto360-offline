# LocalPhoto360

Offline Android app for **multi-shot 360 capture**, local storage, and 360 viewing.

## Features

- Multi-shot 360 capture with guided green targets (ported from `360photos`)
- Saves all frames + `rot.txt` locally under app storage
- Home gallery with thumbnails
- Detail screen to browse captured frames
- Import a stitched `photo360.jpg` to view in the built-in 360 WebView viewer
- **No server, no login, no cloud upload**

## Requirements

- Node 16+
- Android SDK 33
- Physical Android device with camera + motion sensors (recommended)

## Setup

> **Offline Windows machine?** See [OFFLINE.md](OFFLINE.md). The npm and Gradle dependencies ship as GitHub Release assets. JDK 17, Node and the Android SDK/NDK must already be installed.

```bash
cd LocalPhoto360
npm install --legacy-peer-deps
```

On Windows, if VisionCamera CMake fails with “Filename longer than 260 characters”, use a short Gradle home:

```powershell
$env:GRADLE_USER_HOME = "C:\g"
npm run android
```

Otherwise:

```bash
npm run android
```

## Project structure

- `src/screens/capture` — multi-shot capture flow
- `src/screens/home` — saved captures list
- `src/screens/detail` — frames + import panorama
- `src/screens/viewer` — 360 WebView viewer
- `android/app/src/main/assets/viewer` — Photo Sphere Viewer assets

## Stitching

After a multi-shot capture finishes, the app builds an equirectangular `photo360.jpg`
**on device** (offline) from the frames + `rot.txt`, then marks the item **360 ready**.

You can also:

1. Open a capture → **Stitch 360** (re-run if needed), or
2. **Import 360** → pick an equirectangular JPEG manually.

## Run release APK

```bash
cd android
./gradlew assembleRelease
```

APK: `android/app/build/outputs/apk/release/app-release.apk`
