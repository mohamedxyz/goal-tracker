<p align="center"><img src="docs/images/logo.svg" width="96" alt="GoalTerra logo"></p>

# GoalTerra

A free, private goal, habit, task and study tracker in **one HTML file**. No account, no server, no tracking: everything is stored on your own device. It works offline, is built for phones first (a desktop browser works too), and speaks **English and Arabic** (with a mirrored right-to-left layout).

It starts simple (tasks, goals and habits), in a flat, dark-first look made for thumbs: big tap targets and one round **+** button that opens a sheet to add a task, habit or goal. Switch on the extras you want in Settings → Add-ons.

## Quick start

1. Download [`goal-tracker.html`](goal-tracker.html) and open it in any modern browser (Chrome on Android works well).
2. On a phone, use **Add to Home screen** from the browser menu so it opens like an app.
3. The one-screen intro lets you pick a language and tick a few starter habits, or explore with sample data you can clear later.

There is also an [Android app](#android-app). **Back up regularly** (see [Your data](#your-data-and-backups)).

## Features

### Today
- A ring for today, the last 7 days as bars, this week against last week, your best streak and your active goals
- **Three scores (0 to 1000)**: Habits (showing up counts, a half-tick counts, one isolated miss costs half), Tasks (priority and length earn more, tiny low-priority tasks are capped) and Overall (the geometric mean). They are slow 42-day averages; tap a score for the formula. The weights are judgment calls, not validated science
- Your first 4 open tasks (*Show all* for the rest), goals, and habits folded into one line, with a one-line add field
- A **day level** (⚡ Spark, 🔥 Blaze, ⚔️ Titan) and insights such as a 26-week activity heatmap
- A short, dismissible tip card per tab the first time you visit it

### Tasks
- **Smart quick add**: type `Essay tomorrow !high #uni` and the date, priority and tag fill themselves. Understands *today*, *tomorrow*, weekday names, *in 3 days*, *next week*, *25 oct*, *25/10*, times and lengths (*Gym at 6pm for 1h*) and Arabic phrases such as غدًا، بكرة، بعد غد
- Due-date countdowns, priorities, notes, checklists, repeating tasks, tag folders, filters, archive, bulk Select mode, Trash with Undo, and an icon for any task, goal or habit
- **Calendar view** of due and finished tasks
- **Focus timer**: 25 minutes by default; it keeps time if the screen locks and saves the minutes on the task
- **Plan view** (add-on *Time blocking*): your day as a timeline. Give a task a start time and length, nudge or resize blocks in 15-minute steps, see overlaps marked with ⚠, and Undo any move
- Tap a task or goal for an info sheet; the last 5 titles and notes can be brought back from its edit screen

### Goals that connect
Weekly, monthly, annual and 5-year goals **roll up into each other** on one ladder: finish the weekly steps and the monthly goal moves, and so on up to the 5-year goal. The Goals tab leads with this week and month; year and 5-year goals wait in a closed *Bigger picture* fold until you want them.
- Measure a goal by a checkbox (or its linked tasks), a number target, or its sub-goals
- Templates to start fast: School year, Learn a skill, Get fit
- Weekly planning, end-of-period review and a monthly review screen

### Habits
- Each habit is one compact row with a progress ring, its own colour and the last 4 days as tap columns
- Build habits and **avoid habits** (things to quit), weekday schedules, folders and a history calendar with backfilling
- Built on *Atomic Habits*: **never miss twice** (one missed day is forgiven, two in a row reset the streak), milestones at 3, 7, 14, 30, 60 and 100 days, and a daily ring with a Perfect day celebration
- Optional **Make it stick** fields per habit: identity votes, a two-minute version (a ½ tick counts), stacking after another habit, time and place with a reminder, a treat and an environment note
- A *Hardest habit* card offers a two-minute version. Habit rewards can be switched off

### Game mode (add-on)
- **A weekly 8-bit boss**. Finishing tasks, habits, study sessions and focus time deals damage; its HP comes from the week you planned. A defeated boss stays defeated
- **The tower**: a monthly guardian, an annual boss above it, and your 5-year goal as the final boss
- **Shields and counterattacks**, but you never lose XP or levels. **Rest tokens** protect streaks on a sick day, and you can attach your own real rewards to a boss
- Hero level, 11 badges, a weeks-won-in-a-row counter and a Bestiary. Tap ? on the game card for a plain-words explanation

### Student mode (add-on)
A **Study** tab built around Ali Abdaal's [retrospective revision timetable](https://aliabdaal.com/studying/how-to-study-the-power-of-retrospective-revision-timetables/):
- Subjects and topics rated **Weak, OK or Strong** per day, with Undo
- **Today's picks** first: weak, untouched and due-for-review topics, and subjects you have class in today
- **Spaced repetition** with editable intervals, an exam and quiz logger with countdowns, and a class timetable

### Reports and sharing
- A **weekly report** (tasks, habits, goals, study, focus time, the week's boss) and a **monthly review**
- **Share with friends**: pick habits, tasks, exams or study topics and send them as a small `.json` file, copied text or through the share sheet. The receiver sees a preview first and duplicates are skipped. History, scores and personal data are never included

### Themes and settings
Six palettes (Clay, Terra, Ocean, Grape, Rose, Graphite) in light and dark, plus a pure Black (OLED) mode. Settings show six cards plus a collapsed Advanced block, and cover language, sounds, vibration, 12 or 24 hour clock, first day of the week, focus and break length and more. Your own text is never translated.

## Your data and backups

- Everything is stored locally. Nothing is uploaded anywhere
- **Back up now** saves a dated `goalterra-YYYY-MM-DD.json` file. **Restore** shows a preview (what it holds and how it compares with your data now) before anything is replaced. Older backups keep loading in newer versions
- **Automatic daily backup** (Settings → Storage & backup): in the Android app it saves quietly to `Documents/GoalTerra` (the last 7 are kept) and rings a reminder if the app wasn't opened. A browser can't save files by itself, so it shows a *Back up now* card
- **Safety copies**: the app keeps its newest 10 snapshots in a separate store (daily, on app updates, and before a restore, erase or repair). They live on the same device, so they are not a substitute for a real backup
- Deleted tasks, habits, goals, exams and topics stay in Trash for 30 days. **Erase everything** needs a typed word and can be undone. **Check my data** finds and fixes broken links
- Clearing the browser's site data deletes everything, safety copies included

## Android app

GoalTerra also runs as a real Android app (Android 7 and newer), built from the same HTML file.

1. Open the repository's **Releases** page on your phone and download the newest `GoalTerra-x.y.z.apk`.
2. Tap it. The first time, Android asks you to allow installs from your browser or Files app.
3. Updates install over the old version and keep your data.

The app adds saving backups and exports to `Documents/GoalTerra` with the share sheet, notifications (morning plan, evening check-in, class and exam reminders, focus timer, backup reminder), and a working back button. Browser data and app data are separate: to move over, **Back up now** in the browser and **Restore** in the app.

## Privacy

No analytics, no accounts, no network requests. The whole app is the single HTML file in this repository.

## For developers

The app is generated from `src/` into `goal-tracker.html` by `node build.mjs`. See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the Android build, [`src/README.md`](src/README.md) for the code map, and `tests/run.sh` for the Playwright suite. The version is shown in Settings and the changelog is at the top of `src/00-head.html`.

## License

[MIT](LICENSE).
