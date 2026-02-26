#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/android-apk"
BUILD_DIR="$APP_DIR/build"
SRC_DIR="$APP_DIR/src"
RES_DIR="$APP_DIR/res"
ASSETS_DIR="$APP_DIR/assets"
MANIFEST="$APP_DIR/AndroidManifest.xml"
PKG="com.mtitanp.subwayrunner"
CLASS_DIR="$BUILD_DIR/classes"
DEX_DIR="$BUILD_DIR/dex"
CLASSES_JAR="$BUILD_DIR/classes.jar"
UNALIGNED_APK="$BUILD_DIR/subway-runner-unaligned.apk" ##seems to be working
ALIGNED_APK="$BUILD_DIR/subway-runner-aligned.apk"
SIGNED_APK="$BUILD_DIR/subway-runner-debug.apk"

ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BUILD_TOOLS_VERSION="${BUILD_TOOLS_VERSION:-30.0.2}"
API_LEVEL="${API_LEVEL:-30}"

ANDROID_JAR="$ANDROID_HOME/platforms/android-$API_LEVEL/android.jar"
BT_DIR="$ANDROID_HOME/build-tools/$BUILD_TOOLS_VERSION"
AAPT="$BT_DIR/aapt"
D8="$BT_DIR/d8"
ZIPALIGN="$BT_DIR/zipalign"
APKSIGNER="$BT_DIR/apksigner"

for bin in "$AAPT" "$D8" "$ZIPALIGN" "$APKSIGNER"; do
  if [[ ! -x "$bin" ]]; then
    echo "Missing build tool: $bin"
    exit 1
  fi
done

if [[ ! -f "$ANDROID_JAR" ]]; then
  echo "Missing android.jar: $ANDROID_JAR"
  exit 1
fi

mkdir -p "$BUILD_DIR" "$CLASS_DIR" "$DEX_DIR" "$ASSETS_DIR"
rm -rf "$CLASS_DIR" "$DEX_DIR"
mkdir -p "$CLASS_DIR" "$DEX_DIR"
rm -f "$UNALIGNED_APK" "$ALIGNED_APK" "$SIGNED_APK" "$CLASSES_JAR"

cp "$ROOT_DIR/index.html" "$ASSETS_DIR/index.html"
cp "$ROOT_DIR/styles.css" "$ASSETS_DIR/styles.css"
cp "$ROOT_DIR/game.js" "$ASSETS_DIR/game.js"

JAVAC_BIN="${JAVAC_BIN:-javac}"
"$JAVAC_BIN" -source 8 -target 8 -classpath "$ANDROID_JAR" -d "$CLASS_DIR" \
  "$SRC_DIR/com/mtitanp/subwayrunner/MainActivity.java"

jar cf "$CLASSES_JAR" -C "$CLASS_DIR" .
"$D8" --lib "$ANDROID_JAR" --output "$DEX_DIR" "$CLASSES_JAR"

"$AAPT" package -f \
  -M "$MANIFEST" \
  -S "$RES_DIR" \
  -A "$ASSETS_DIR" \
  -I "$ANDROID_JAR" \
  -F "$UNALIGNED_APK"

cp "$DEX_DIR/classes.dex" "$BUILD_DIR/classes.dex"
(
  cd "$BUILD_DIR"
  "$AAPT" add "$UNALIGNED_APK" classes.dex
)
rm -f "$BUILD_DIR/classes.dex"

"$ZIPALIGN" -f 4 "$UNALIGNED_APK" "$ALIGNED_APK"

DEBUG_KEYSTORE="${DEBUG_KEYSTORE:-$HOME/.android/debug.keystore}"
DEBUG_ALIAS="${DEBUG_ALIAS:-androiddebugkey}"
DEBUG_STOREPASS="${DEBUG_STOREPASS:-android}"
DEBUG_KEYPASS="${DEBUG_KEYPASS:-android}"

if [[ ! -f "$DEBUG_KEYSTORE" ]]; then
  mkdir -p "$(dirname "$DEBUG_KEYSTORE")"
  keytool -genkeypair -v \
    -storepass "$DEBUG_STOREPASS" \
    -keypass "$DEBUG_KEYPASS" \
    -keystore "$DEBUG_KEYSTORE" \
    -alias "$DEBUG_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US"
fi

cp "$ALIGNED_APK" "$SIGNED_APK"
"$APKSIGNER" sign \
  --ks "$DEBUG_KEYSTORE" \
  --ks-pass "pass:$DEBUG_STOREPASS" \
  --key-pass "pass:$DEBUG_KEYPASS" \
  --ks-key-alias "$DEBUG_ALIAS" \
  "$SIGNED_APK"

"$APKSIGNER" verify "$SIGNED_APK"
echo "APK created: $SIGNED_APK"
