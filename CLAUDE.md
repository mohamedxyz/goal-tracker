# GoalTerra: notes for Claude Code

A goal, habit, task and study tracker. The app you run is ONE generated file, `goal-tracker.html`, wrapped for Android with Capacitor. English and Arabic (RTL). Data stays on the device (IndexedDB). No network requests, ever.

## Layout
- `src/` is the source: `style.css`, `00-head.html` (head + CHANGELOG), `10-body.html`, `99-tail.html`, and `src/js/NN-name.js`. The JS files are joined in filename order into one shared scope (top-level names are visible everywhere). `src/README.md` has the code map.
- `goal-tracker.html` is GENERATED. Never edit it by hand. Run `node build.mjs` (or `node build.mjs --check`). Format with `npm run format` (Prettier); install it once with `npm install`. Commit both `src/` and the generated file.
- `android-app/` is the Capacitor project. `npm run sync` copies the HTML into it. The APK is built by `.github/workflows/android.yml` and published as a release `android-vX.Y.Z`.
- `tests/` is a Playwright (Python) suite: `tests/run.sh` rebuilds, then runs every check in light, dark and Arabic. `tests/screenshots.py` regenerates README images.

## Working rules
- Every change = a new semver version: bump `APP_VERSION` (in `src/js/10-core-data-state.js`) and add a changelog line at the top of `src/00-head.html`.
- Batch small changes into one release. Do not push a version per tiny fix unless something is actually broken.
- Test at a 390x844 viewport, light and dark, plus Arabic/RTL: reload persistence, no page errors, no horizontal overflow. Run `tests/run.sh` before committing.
- Timebox problems: two attempts, then take the simplest solution.
- Decide and build; state what you decided. Do not ask clarifying questions in pairs.
- Keep it a single output file with no build step needed to RUN it, and no network requests.
- Never put personal information (names, devices, schools, email) in public-facing content: README, code, screenshots, commit identity. The repo may be made public; if so, publish from a clean repo with a neutral identity.

## Gotchas
- Arabic: `L2(en, ar)` for dynamic strings, `AR` dictionary + `PAT` regexes in `80-i18n-arabic.js` for static ones. Never call `L2` at load time (state is not ready); wrap in a function (see `TIPS`). `translate="no"` protects user data and the brand.
- Top-level `const`/`let` are not on `window`; call them by name in `page.evaluate`.
- Tests auto-answer the in-app dialog and expand Settings sections via an init script in `tests/helpers.py`. Tests that bypass `helpers.page()` must open sections themselves (`S.setOpen=new Set([...])`).
- All native dialogs were replaced by `askConfirm`/`askPrompt`/`askAlert` (async). Do not reintroduce `confirm()`/`prompt()`/`alert()`.
- Android bridge: `window.GTNative` exists only inside the app. Real-device behaviour cannot be tested in the cloud sandbox; ask for screenshots.
- In the cloud sandbox the Android/Gradle hosts are blocked, so the APK only builds on GitHub Actions. With a local Android SDK you can run `cd android-app && npm ci && npm run build:debug`.

## Keyboard / insets history (Android)
Capacitor's SystemBars `insetsHandling: css` padded the window by the keyboard AND passed the IME inset on to the WebView, which can shrink the page twice (blank band above the keyboard, field scrolled away). Since 0.76.0 `insetsHandling` is `disable` and `MainActivity.applyInsets()` pads the decor view once (status bar, and the taller of nav bar / keyboard) and consumes the insets. CSS and JS keyboard tweaks (`--sab`, `form.kbdock`) are kept but are secondary. Unverified on a real device at the time of writing: ask for a screenshot or screen recording.
Note: `main` once held a 0.75.0 rollback to the 0.71.1 app; 0.76.0 supersedes it.

## Data safety (0.82.0)
`src/js/76-safety-copies.js`: snapshots live in a separate IndexedDB (`goal-tracker-snap`, newest 10), saved daily, on app-version change, before restore, before erase and before a data repair. Goals, exams and topics go to Trash like tasks and habits. Erase needs a typed word (tests must set `window.__noAuto=true` and fill `#askIn` themselves). Tasks/goals keep their last 5 title+notes versions in `hist`.

## Habits (0.83.0)
`src/js/77-habit-craft.js` holds the Atomic Habits features: optional per-habit fields (`ident`, `after`, `at`, `where`, `treat`, `mini`, `env`), `habitHint`, `habitRing`, `stackOrder`, `easierCard`. `streak()`/`bestStreak()` use "never miss twice" (one missed due day is forgiven). Half-ticks are check-in rows with `mini:true`, mirrored in `S.mini`. Rewards run in `habitWin()` (90-actions.js) and can be switched off with `cfg.habitFx`. Note: inside `rpgAll()` the local names `streak`/`bestStreak` shadow the habit functions.

## Known to-do (not yet done)
- README is out of date: "Import" is now "Restore", screenshots predate 0.72, no mention of info sheets, tip cards or auto backup. `tests/screenshots.py` needs tips dismissed and Settings sections opened before it will give good images.
- Game (done in 0.81.0): boss death is permanent, overkill bonus, 25% growth cap, how-it-works sheet, badges. Still open: anti-grind rules (tiny tasks ticked straight after creating them), more badges.
- Icons: use an SVG favicon and a vector Android launcher foreground instead of small PNGs.
- Unused files: 11 `drawable*/splash.png` and the two `Example*Test.java` placeholders.
- Planned UX leftovers: jargon hints on the cards themselves (the How-it-works sheet explains them), Settings sub-pages, Goals nesting and filter-row declutter, Habit card collapsing, red "due" badge only when overdue.
