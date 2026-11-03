# Developing GoalTerra

See also `src/README.md` (code map) and `CLAUDE.md` (working rules).

## Android build

`android-app/` is a [Capacitor](https://capacitorjs.com) project. `npm run sync` copies `goal-tracker.html` into the app and adds the Capacitor runtime next to it (the web file itself stays network-free). The GitHub Actions workflow `.github/workflows/android.yml` builds the APK on every change and publishes it as a release; the app's version always matches `APP_VERSION`.

To build locally you need Node 22, JDK 21 and the Android SDK:
```
cd android-app
npm ci
npm run build:debug        # APK in android/app/build/outputs/apk/debug/
```
Debug builds use the fixed key in `android-app/keys/debug.keystore` (a public debug key). For a Play Store release, create your own upload key, keep it safe, and build with `GT_KEYSTORE`, `GT_KEYSTORE_PASSWORD`, `GT_KEY_ALIAS` and `GT_KEY_PASSWORD` set (`npm run build:release`).

## Development

The app you run is the single file `goal-tracker.html`, and you never need a build step to use it. To work on it, edit the pieces in `src/` (see `src/README.md` for a code map), then run `npm run build` (or `node build.mjs`) to regenerate `goal-tracker.html`. `node build.mjs --check` fails if the generated file is stale. The Android app copies the generated file as is.

A Playwright test suite (development only, never part of the app) lives in `tests/`:

```
pip install playwright        # Chromium must be available to Playwright
npm install                   # once, for Prettier (`npm run format`)
tests/run.sh                  # every check: light, dark and Arabic, overflow, page errors
tests/run.sh qa focus         # only some tests
python3 tests/screenshots.py  # regenerate the README screenshots from demo data
```
