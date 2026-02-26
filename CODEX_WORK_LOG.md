# Codex Work Log

Last updated: 2026-02-26 12:10:17 IST

## Scope
This file documents work completed by Codex (the AI coding agent) in this repository.

## Verified repository state at time of update
- Branch: `main`
- Git history: no commits exist yet on this branch.
- Working tree: untracked project files present, no tracked changes.

## Work completed by Codex in this session
1. Reviewed repository status with `git status --short --branch`.
2. Attempted to read commit history with:
   - `git log --oneline --decorate -n 40`
   - `git log --pretty=format:'%h%x09%an%x09%ad%x09%s' --date=short -n 80`
3. Confirmed both log commands returned the same result: there are no commits yet, so no historical changes can be attributed from git history.
4. Audited repository behavior and identified key issues in game and backend code:
   - API crash risk on malformed score input.
   - High-score race condition risk in threaded server mode.
   - Keyboard control conflict with browser defaults.
5. Implemented backend hardening in `server.py`:
   - Added safe integer parsing for `high_score` with fallback to `0`.
   - Added `threading.Lock()` and wrapped read/compare/write update logic.
6. Implemented frontend control fix in `game.js`:
   - Added handled-key tracking and `e.preventDefault()` for gameplay keys.
7. Added smoke tests in `tests/test_highscore_api.py`:
   - default GET behavior,
   - malformed payload handling,
   - high-score update rule (higher score wins).
8. Ran verification commands:
   - `python3.14 -m py_compile server.py tests/test_highscore_api.py`
   - `node --check game.js`
   - `python3.14 -m unittest -v tests/test_highscore_api.py`
9. Fixed a test isolation issue in smoke tests by clearing temp high-score state in `setUp`.
10. Updated `README.md` with the changes and rationale.
11. Performed Android compatibility assessment (code-path validation for touch, viewport, control behavior).
12. Standardized docs and commands to `python3.14`; updated Python shebangs accordingly.
13. Implemented Android APK packaging pipeline under `android-apk/`:
    - Created manifest/resources/Java activity.
    - Added deterministic build script (`android-apk/build_apk.sh`).
    - Built and validated launchable APK.
14. Added Android launcher icons and verified icon metadata in built APK.
15. Added in-game settings and persistence:
    - Orientation setting (`auto`/`landscape`/`portrait`) with Android JS bridge support.
    - Runner selection setting (`jogger`/`businessman`/`joker`/`mechanic`) with custom rendering profiles.
16. Added first-launch-only control helper behavior:
    - Shows once for 3 seconds, then remains hidden on future runs/restarts.
17. Added new gameplay obstacle (`duckbar`) requiring slide/duck input.
18. Fixed road rendering so center/guide lines are clipped within the road geometry.
19. Reworked collision behavior multiple times to address false positives:
    - lane gating,
    - tighter horizontal overlap checks,
    - depth gate near player plane,
    - per-obstacle narrowed logical hitboxes.
20. Added cinematic game-over effects:
    - distinct win-vs-loss canvas and overlay treatments.
21. Rebuilt/synced Android APK repeatedly after each gameplay/UI update to ensure packaged assets match latest source.
22. Added and maintained LAN share flow for `android-apk/build` via Python HTTP server (for APK download on local network).
23. Updated README again to comprehensively document implemented features and rationale.

## Why the fixes were made
- Prevent runtime failure: malformed JSON score fields could raise `ValueError` and fail requests.
- Protect correctness under concurrency: threaded request handling needed synchronization to avoid write races.
- Improve gameplay input reliability: keys used for movement/jump/slide should not trigger browser-level actions.
- Preserve quality over time: smoke tests now cover the critical high-score API behaviors.
- Support Android delivery: repository now includes reproducible APK build/install path.
- Improve fairness/clarity: collision logic and road rendering were adjusted to match player expectation from perspective visuals.
- Improve UX and accessibility: helper timing, configurable orientation, runner customization, and cinematic feedback improve usability and engagement.

## Notes
- Because the repository has no commits, there is no verifiable historical record of prior work by Codex in git at this time.
