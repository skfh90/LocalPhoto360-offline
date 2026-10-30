# Offline Windows setup

How to build and update LocalPhoto360 on a Windows 10/11 x64 machine with **no internet access**.

The project's npm and Gradle dependencies ship as assets on the GitHub Release `offline-bundle-v1`, not in git.

## Prerequisites (not included in the bundle)

Install these on the Windows machine first:

| Tool | Version |
|---|---|
| JDK | **17**, with `JAVA_HOME` set (not 8 or 21) |
| Node.js | 16 or later (24 LTS recommended) |
| Android SDK Platform | 33 |
| Android SDK Build-Tools | 33.0.0 |
| NDK | 23.1.7779620 |
| CMake | 3.22.1 |

The setup script checks for each of these and stops with a list of whatever is missing.

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
| `sdk-meta.zip` | Android SDK licenses and `package.xml` files (only added where the SDK lacks them) |
| `platform-tools_r*-win.zip` | adb (only installed if the SDK has no `platform-tools`) |
| `commandlinetools-win-*_latest.zip` | sdkmanager (only installed if missing) |

Total size is about 1.8 GB. `SHA256SUMS.txt` lists a checksum for every asset (`Get-FileHash <file>` on Windows).

## 2. On the offline Windows machine

Put the project at a **short path**, such as `C:\lp360`. Long paths break CMake and Ninja.

Then run this in PowerShell (administrator rights aren't needed):

```powershell
cd C:\lp360
powershell -ExecutionPolicy Bypass -File offline\setup-windows-offline.ps1 -Bundle D:\lp360-bundle
```

The script does the following:
- Checks the prerequisites above.
- Uses the SDK at `ANDROID_HOME`, or `%LOCALAPPDATA%\Android\Sdk` if that's unset. Adds adb, cmdline-tools and licenses only if they're missing.
- Unpacks Gradle into `C:\g` and the dependency cache into `C:\g-ro`.
- Sets these variables: `ANDROID_HOME`, `GRADLE_USER_HOME` and `GRADLE_RO_DEP_CACHE`.
- Writes `android\local.properties`.
- Runs `npm ci --offline`.

The SDK, Gradle and cache locations can be changed with `-SdkRoot`, `-GradleHome` and `-GradleRoCache`.

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
| `SDK location not found` | Rerun the setup script, or create `android\local.properties` with `sdk.dir=<your SDK path, with forward slashes>`. |
