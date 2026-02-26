# Subway Surfer-Style Endless Runner

A lightweight browser game inspired by Subway Surfers, with an Android APK wrapper.

## Core Features
- 3-lane endless runner with lane-switch, jump, and slide controls
- Obstacles: `barrier`, `bush`, `train`, `lowbar`, `duckbar`
- Coins, score progression, speed progression
- Shared high score API (`/api/highscore`) with top player name
- First-launch controls helper (auto hides after 3 seconds, only shown once)
- Settings:
  - Orientation: `Auto`, `Landscape`, `Portrait`
  - Runner selection: `Jogger`, `Business Man`, `Joker`, `Mechanic`
- Post-game cinematics:
  - Gold celebratory effect for new best score
  - Dark/red impact effect for non-record game over

## Run (Web)
```bash
python3.14 server.py
# open http://localhost:8080
```

`file://` mode works for local play but shared high score sync requires `server.py`.

## Controls
- `A` / `D` or Left/Right: move lanes
- `W` / Up / Space: jump
- `S` / Down: slide/duck
- Mobile: swipe left/right/up/down, tap to jump

## Why Key Changes Were Made
- API hardening (`server.py`): prevent crashes on invalid high-score payloads and avoid threaded update races.
- Keyboard default prevention (`game.js`): stop browser scrolling/interference during gameplay.
- One-time helper UX: reduce persistent visual clutter while still onboarding first-time users.
- Collision refinements:
  - lane filtering + depth gate + tighter obstacle hitboxes
  - avoids false-positive collisions from perspective overlap
  - preserves fair hit detection for player movement timing
- Duck obstacle (`duckbar`): adds explicit slide/duck gameplay mechanic.
- Road clipping: center/guide lines constrained to road shape for visual consistency.
- Cinematic game over states: clearer emotional feedback for win-vs-loss outcomes.
- Runner variants: improves personalization without changing core controls.
- Orientation setting bridge: let Android users choose orientation in-app instead of hard-locked orientation.

## Testing
### Backend/API
```bash
python3.14 -m py_compile server.py tests/test_highscore_api.py
python3.14 -m unittest -v tests/test_highscore_api.py
```

Smoke tests cover:
- default GET payload
- malformed score handling
- higher-score-wins behavior

### Frontend Script Syntax
```bash
node --check game.js
```

## Android APK
### Build
```bash
./android-apk/build_apk.sh
```

### Install
```bash
$HOME/Library/Android/sdk/platform-tools/adb install -r ./android-apk/build/subway-runner-debug.apk
```

### Packaging Notes
- Offline/manual toolchain is used (no Gradle dependency download required).
- Build script copies current `index.html`, `styles.css`, and `game.js` into `android-apk/assets` before packaging.
- Main activity uses `WebView` + JS bridge for orientation changes.
- Launcher icons are bundled in mipmap densities for Android launcher compatibility.

## Android Manual QA Checklist
- Verify swipe/tap controls are responsive.
- Confirm first-launch helper hides in ~3 seconds and does not return on restart.
- Verify orientation changes from Settings apply in-app.
- Verify runner selection persists after app restart.
- Validate collision fairness across lanes and obstacle types.
- Confirm cinematic overlay differences for new-record vs non-record game over.
- Validate APK install/update cycle with `adb install -r`.
