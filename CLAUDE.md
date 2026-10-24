# GoalTerra: notes for Claude Code

A goal, habit, task and study tracker. The app is ONE file, `goal-tracker.html`, wrapped for Android with Capacitor. English and Arabic (RTL). Data stays on the device (IndexedDB). No network requests, ever.

## State of the repo
`main` is the 0.71.1 app rolled back and re-released as 0.75.0 (the user preferred its keyboard and input behaviour). Edit `goal-tracker.html` directly here.
The later work (0.72 to 0.74.5: tips, info sheets, select mode, auto backup, icons, `src/` build, keyboard docking) is on the branch `app-0.74`.

## Rules
- Every change = a new semver version (`APP_VERSION` in `goal-tracker.html` plus a changelog line at the top). Gradle and the workflow read the version from that line.
- Test at 390x844, light, dark and Arabic: no page errors, no horizontal overflow. `tests/run.sh`.
- Keep it a single file with no network requests. No personal information in public content.
- Real-device behaviour (keyboard, status bar) cannot be tested in the cloud sandbox; ask for screenshots.
