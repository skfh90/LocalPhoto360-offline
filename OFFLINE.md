# Offline Windows setup

How to build and update LocalPhoto360 on a Windows 10/11 x64 machine with **no internet access**.

All dependencies ship as assets on the GitHub Release `offline-bundle-v1`, not in git.

## 1. On a machine with internet

Download the repository and all release assets, then copy both folders to a USB drive:

```powershell
gh repo clone skfh90/LocalPhoto360-offline
gh release download offline-bundle-v1 -R skfh90/LocalPhoto360-offline -D lp360-bundle
```

Without `gh`, download the source ZIP and every asset by hand from the repository's **Releases** page.

| Asset | What it is |
|---|---|
| `npm-cache.zip` | All 989 npm package tarballs from `package-lock.json` (for `npm ci --offline`) |
| `gradle-offline.zip` | Gradle 8.0.1 distribution, plus a read-only Maven dependency cache for debug and release builds (includes Windows `aapt2`) |
| `sdk-meta.zip` | Android SDK `package.xml` files and accepted licenses |
| `OpenJDK17-windows-x64.msi` | Eclipse Temurin JDK 17 |
| `node-v24.*-x64.msi` | Node.js 24 LTS |
| `platform-33-ext3_r03.zip` | Android SDK Platform 33 |
| `build-tools_r33-windows.zip` | Build-Tools 33.0.0 |
| `android-ndk-r23b-windows.zip` | NDK 23.1.7779620 (VisionCamera / worklets native build) |
| `cmake-3.22.1-windows.zip` | CMake 3.22.1 |
| `platform-tools_r*-win.zip` | adb |
| `commandlinetools-win-*_latest.zip` | sdkmanager (optional) |

Total size is about 2.8 GB. `SHA256SUMS.txt` lists a checksum for every asset (`Get-FileHash <file>` on Windows).

## 2. On the offline Windows machine

Put the project at a **short path**, such as `C:\lp360`. Long paths break CMake and Ninja.

Then run this in an **administrator** PowerShell:

```powershell
cd C:\lp360
powershell -ExecutionPolicy Bypass -File offline\setup-windows-offline.ps1 -Bundle D:\lp360-bundle
```

The script does the following:
- Installs JDK 17 and Node, skipping either one if already installed.
- Sets up the Android SDK in `C:\Android\Sdk`.
- Unpacks Gradle into `C:\g` and the dependency cache into `C:\g-ro`.
- Sets these variables: `ANDROID_HOME`, `GRADLE_USER_HOME` and `GRADLE_RO_DEP_CACHE`.
- Writes `android\local.properties`.
- Runs `npm ci --offline`.

If JDK 17 and Node are already installed, pass `-SkipMsi`. The SDK, Gradle and cache locations can be changed with `-SdkRoot`, `-GradleHome` and `-GradleRoCache`.

## 3. Build and run

Open a **new** PowerShell window so it picks up the environment variables.

```powershell
cd C:\lp360
npm start                     # terminal 1: Metro
npm run android:offline       # terminal 2: debug build + install via USB
```

To build a release APK:

```powershell
cd android
.\gradlew.bat --offline assembleRelease --no-parallel "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
# -> android\app\build\outputs\apk\release\app-release.apk
```

Always pass `--offline` to Gradle, or use `npm run android:offline` instead of `npm run android`. Without it, Gradle tries to reach Maven repositories and fails.

## Updating code offline

Changes to anything in `src/` and to the Java/Gradle code work fully offline.

**Adding or upgrading an npm or Gradle dependency needs internet.** Do it on an online machine and regenerate the bundle there. On macOS or Linux with JDK 17 and the Android SDK, run:

```bash
offline/pack-offline.sh            # builds offline-bundle/ with all assets
```

Then publish a new release, or copy `offline-bundle/` across by hand.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Could not resolve ...` / `No cached version ... available for offline mode` | The dependency isn't in the bundle. Check `GRADLE_RO_DEP_CACHE=C:\g-ro` (the folder that *contains* `modules-2`), or regenerate the bundle online. |
| `npm ERR! code ENOTCACHED` | `package-lock.json` changed after the bundle was made. Regenerate the bundle. |
| Realm prints `Failed to download prebuild` during `npm ci` | Harmless. That binary is only used for Node/Jest, not the Android app. |
| CMake / Ninja "Filename longer than 260 characters" | Move the project to a shorter path such as `C:\lp360`, or use `subst L: <project>`. |
| `SDK location not found` | Rerun the setup script, or create `android\local.properties` with `sdk.dir=C:/Android/Sdk`. |
