# Goal Tracker

A free, private goal, habit, task and study tracker in **one HTML file**. No account, no server, no tracking: everything is stored on your own device. It works offline and is built for phones first (it also works on a desktop browser), in **English and Arabic**.

<p align="center">
  <img src="docs/images/dashboard.png" width="240" alt="Dashboard">
  <img src="docs/images/habits.png" width="240" alt="Habits">
  <img src="docs/images/study.png" width="240" alt="Study tab">
</p>

## Quick start

1. Download [`goal-tracker.html`](goal-tracker.html).
2. Open it in any modern browser (Chrome on Android works well).
3. On a phone, use **Add to Home screen** from the browser menu so it opens like an app.

Your data lives in the browser's IndexedDB. **Back it up regularly** from Settings (see [Your data](#your-data-and-backups)).

## Features

### Dashboard
Today's tasks, habits and goals at a glance, a 26-week activity heatmap, tasks completed per day, your best streak, and a weekly report. Every section can be switched off in Settings.

### Tasks
- Due dates, priorities, notes and **checklists** with a progress counter (2/4)
- **Repeating tasks**: daily, weekdays, weekly or monthly. Finish one and the next appears
- **Tag folders**: group tasks (for example *Homework* or *Home*) into collapsible folders
- Sort by due date, priority, newest or A to Z; filter by Today, Overdue or Done
- Archive finished tasks (or auto-archive them after 1, 7 or 30 days)
- Delete confirmation plus a 6-second **Undo**

<p align="center"><img src="docs/images/tasks.png" width="240" alt="Tasks"></p>

### Goals that connect
Weekly, monthly, annual and 5-year goals that **roll up into each other**: finish enough weekly goals and the monthly goal completes, and so on up to the 5-year goal.
- Measure a goal by a checkbox (or its linked tasks), by a number target (pages, hours, money), or by its sub-goals
- **Weekly planning** helps you fill open slots under your monthly goals
- **End-of-period review**: hit it, missed, or carry over, with a note on what worked
- Progress only shows 100% when a goal is genuinely complete

<p align="center"><img src="docs/images/goals.png" width="240" alt="Goals"></p>

### Habits
- **Schedules**: choose which weekdays a habit is due. Streaks skip days off
- **Folders** that turn green when everything inside is done
- **Avoid habits** (things to quit, such as *No sugar*): a day counts as clean unless you log a slip, or as a slip unless you tick it clean. You choose the default
- History calendar for each habit, with backfilling of past days
- Compact view, hide-done toggle, reorder with up/down buttons

### Student mode
Turn it on in Settings to get a **Study** tab built around Ali Abdaal's [retrospective revision timetable](https://aliabdaal.com/studying/how-to-study-the-power-of-retrospective-revision-timetables/):
- Add subjects and topics, then log study sessions by tapping a day and choosing **Weak, OK or Strong**. Backfill past days for the retrospective part
- **Today's picks**: the topics to study now (weak, untouched and due for review first), each rated with one tap
- **Spaced repetition**: each topic gets a next-review date from its latest rating, shorter when an exam is close. Intervals are editable in Settings
- **Exam and quiz logger** with countdowns, reminders on the dashboard, and results/scores afterwards
- Insights per subject and a 14-day study chart, also included in the weekly report

<p align="center">
  <img src="docs/images/study-picks.png" width="240" alt="Today's picks">
  <img src="docs/images/study-dark.png" width="240" alt="Study tab in dark mode">
  <img src="docs/images/weekly-report.png" width="240" alt="Weekly report">
</p>

### Share with friends (JSON)
Pick habits, tasks or homework, exams and quizzes, and study topics, and send them as a small `.json` file, copied text, or through your phone's share sheet. Your friend imports it with a preview first; duplicates are skipped. History, scores and personal data are never included.

<p align="center"><img src="docs/images/share.png" width="240" alt="Share dialog"></p>

### Settings
Sound effects, theme (auto, light, dark), language, default due date and priority for new tasks, task sorting and grouping, auto-archive, which dashboard sections to show, how avoid habits behave, confirm-before-delete, spaced repetition intervals, and Student mode.

<p align="center"><img src="docs/images/settings.png" width="240" alt="Settings"></p>

### Search, animations and accessibility
- Search across tasks, goals, habits, topics and exams from the header
- Smooth page transitions and tap feedback (switched off automatically if your device asks for reduced motion)
- Light and dark themes, large tap targets, labelled buttons for screen readers

### Arabic and right-to-left
Settings → Language switches the whole app to Arabic with a mirrored right-to-left layout and Arabic dates. Your own text is never translated.

<p align="center">
  <img src="docs/images/dashboard-arabic.png" width="240" alt="Arabic dashboard">
  <img src="docs/images/study-arabic.png" width="240" alt="Arabic study tab">
  <img src="docs/images/dashboard-dark.png" width="240" alt="Dark mode">
</p>

## Your data and backups

- Everything is stored locally. Nothing is uploaded anywhere
- **Export JSON**, **Copy backup text** and **Paste backup text** live in Settings; older backups keep loading in newer versions
- The app asks the browser to protect its storage from being cleared, and reminds you when your last backup is old
- Clearing the browser's site data deletes your data, so keep a backup

## Versions

The app follows [semantic versioning](https://semver.org) and the full changelog is at the top of `goal-tracker.html`. The current version is shown in Settings.

## Privacy

No analytics, no accounts, no network requests. The whole app is the single HTML file in this repository.
