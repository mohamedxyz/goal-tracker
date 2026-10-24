# GoalTerra source

`goal-tracker.html` (the file you run) is generated from this folder by `node build.mjs`. Edit the files here, never the generated file.

## How it fits together

- `00-head.html`: the HTML head, the **changelog** (newest line first) and the inline start-up theme script.
- `style.css`: all styles. Colours are CSS variables, so light, dark, Black and the six palettes are just different values.
- `10-body.html` / `99-tail.html`: the page shell (header, `<main id="app">`, tab bar, the two dialogs) and the closing tags.
- `js/NN-name.js`: the code, joined **in filename order into one shared scope**. A top-level name defined in one file is visible in every other file, so there are no imports. Keep the numbering: a file may only use another file's names at call time, not while loading (for example, never call `L2()` at the top level).

## The main loop

1. `load()` reads IndexedDB into the state object `S` (tasks, goals, habits, logs, topics, exams, trash) and settings into `S.cfg`.
2. `render()` (in `70-render-tips-edit-intro.js`) builds the HTML string for the current screen (`viewDash`, `viewTasks`, ...) and puts it in `#app`. Screens are plain template strings; there is no framework.
3. Clicks are handled in one place: each element carries `data-action="name"` and `actions[name]` in `90-actions.js` runs. A handler that returns `false` skips the re-render.
4. Data changes go through `DB.put` / `DB.del`, then `render()` runs again.

## Things worth knowing

- **Language:** dynamic text uses `L2('English', 'العربية')`; static text is translated by the `AR` dictionary in `80-i18n-arabic.js`.
- **Game mode** is not stored: `rpgAll()` recomputes bosses, shields and morale from your history each time, and memoizes the result.
- **Dialogs:** use `askConfirm`, `askPrompt` and `askAlert` (async). Do not use the browser's `confirm`, `prompt` or `alert`.
- **Android:** `window.GTNative` exists only inside the Capacitor app; check for it before using it.
- **Style:** code is formatted with Prettier (`npm run format`). Run `npm run build` after any change and `npm test` before committing.
