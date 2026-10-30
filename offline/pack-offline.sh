#!/usr/bin/env bash
# Regenerates the offline bundle (release assets) on an ONLINE macOS/Linux machine.
# Requires: node/npm, JAVA_HOME -> JDK 17, ANDROID_HOME -> SDK with platform 33,
# build-tools 33.0.0, NDK 23.1.7779620, CMake 3.22.1. Output: offline-bundle/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/offline-bundle"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
: "${JAVA_HOME:?set JAVA_HOME to a JDK 17}"
: "${ANDROID_HOME:?set ANDROID_HOME}"

rm -rf "$OUT" && mkdir -p "$OUT"

echo "==> npm cache (every tarball in package-lock.json, all platforms)"
node -e 'const p=require(process.argv[1]).packages;const s=new Set();for(const k in p){const r=p[k].resolved;if(r&&r.startsWith("https://"))s.add(r)}console.log([...s].join("\n"))' \
  "$ROOT/package-lock.json" > "$WORK/urls.txt"
xargs -n 40 -P 6 npm cache add --cache "$WORK/npm-cache" < "$WORK/urls.txt"
(cd "$WORK" && zip -qr "$OUT/npm-cache.zip" npm-cache)

echo "==> clean copy + npm ci --offline"
mkdir -p "$WORK/src"
rsync -a --exclude node_modules --exclude 'android/app/build' --exclude 'android/build' \
  --exclude 'android/.gradle' --exclude 'android/app/.cxx' --exclude offline-bundle --exclude .git \
  "$ROOT/" "$WORK/src/"
(cd "$WORK/src" && REALM_DISABLE_ANALYTICS=1 npm ci --offline --no-audit --no-fund --cache "$WORK/npm-cache")

echo "==> Gradle build with an empty GRADLE_USER_HOME (fills the dependency cache)"
export GRADLE_USER_HOME="$WORK/gradle-home"
(cd "$WORK/src/android" && chmod +x gradlew && ./gradlew --no-daemon assembleDebug assembleRelease)

echo "==> Windows aapt2 (AGP downloads aapt2 per host OS)"
AGP_AAPT2="$(ls "$GRADLE_USER_HOME/caches/modules-2/files-2.1/com.android.tools.build/aapt2")"
mkdir -p "$WORK/aapt2win"
cat > "$WORK/aapt2win/build.gradle" <<EOF
repositories { google() }
configurations { win }
dependencies { win "com.android.tools.build:aapt2:${AGP_AAPT2}:windows" }
tasks.register("fetch") { doLast { configurations.win.files.each { println it } } }
EOF
echo 'rootProject.name="aapt2win"' > "$WORK/aapt2win/settings.gradle"
GRADLE_BIN="$(ls -d "$GRADLE_USER_HOME"/wrapper/dists/gradle-8.0.1-all/*/gradle-8.0.1)/bin/gradle"
(cd "$WORK/aapt2win" && "$GRADLE_BIN" --no-daemon -q fetch)

echo "==> gradle-offline.zip"
G="$WORK/gradle-offline"
mkdir -p "$G/ro-cache"
rsync -a --exclude '*.lock' --exclude 'gc.properties' "$GRADLE_USER_HOME/caches/modules-2" "$G/ro-cache/"
curl -sSfL -o "$G/gradle-8.0.1-all.zip" https://services.gradle.org/distributions/gradle-8.0.1-all.zip
(cd "$WORK" && zip -qr "$OUT/gradle-offline.zip" gradle-offline)

echo "==> sdk-meta.zip (package.xml + licenses from this SDK)"
M="$WORK/sdk-meta"
for c in platforms/android-33 build-tools/33.0.0 ndk/23.1.7779620 cmake/3.22.1 platform-tools; do
  mkdir -p "$M/$c" && cp "$ANDROID_HOME/$c/package.xml" "$M/$c/"
done
cp -R "$ANDROID_HOME/licenses" "$M/"
(cd "$WORK" && zip -qr "$OUT/sdk-meta.zip" sdk-meta)

echo "==> Windows toolchain installers"
B=https://dl.google.com/android/repository
curl -sSfL -o "$WORK/repo.xml" "$B/repository2-3.xml"
for pkg in "platforms;android-33" "build-tools;33.0.0" "ndk;23.1.7779620" "cmake;3.22.1" "platform-tools" "cmdline-tools;latest"; do
  f="$(python3 -I - "$WORK/repo.xml" "$pkg" <<'PY'
import sys, xml.etree.ElementTree as ET
for p in ET.parse(sys.argv[1]).getroot().findall('remotePackage'):
    if p.get('path') == sys.argv[2]:
        for a in p.iter('archive'):
            h = a.find('host-os')
            if h is None or h.text == 'windows':
                print(a.find('complete/url').text); sys.exit()
PY
)"
  curl -sSfL -o "$OUT/$f" "$B/$f"
done
curl -sSfL -o "$OUT/OpenJDK17-windows-x64.msi" \
  "https://api.adoptium.net/v3/installer/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
NODE_MSI="$(curl -sSfL https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt | grep -o 'node-v[0-9.]*-x64.msi' | head -1)"
curl -sSfL -o "$OUT/$NODE_MSI" "https://nodejs.org/dist/latest-v24.x/$NODE_MSI"

(cd "$OUT" && shasum -a 256 * > SHA256SUMS.txt)
ls -lh "$OUT"
echo "Done. Upload with: gh release create <tag> $OUT/*"
