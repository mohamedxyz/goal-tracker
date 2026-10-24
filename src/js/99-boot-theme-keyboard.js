/**
 * Runs last: theme and palette, tooltips, keyboard handling, archiving on start-up, and the timers that start once everything is loaded.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Tooltips (hover + tap) ---------- */
const tip = $('#tip');
let tipEl = null;
function showTip(el, x, y) {
  tipEl = el;
  tip.textContent = el.dataset.tip;
  const r = tip.getBoundingClientRect();
  const half = r.width / 2 + 8;
  tip.style.left = Math.min(Math.max(x, half), innerWidth - half) + 'px';
  tip.style.top = Math.max(y, r.height + 14) + 'px';
  tip.classList.add('show');
}
function hideTip() {
  tipEl = null;
  tip.classList.remove('show');
}
document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('[data-tip]');
  el ? showTip(el, e.clientX, e.clientY) : hideTip();
});
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  const el = e.target.closest('[data-tip]');
  if (el) {
    const r = el.getBoundingClientRect();
    showTip(el, r.left + r.width / 2, r.top);
  } else hideTip();
});
addEventListener('scroll', hideTip, { passive: true });

/* ---------- Theme: auto → light → dark ---------- */
const THEME_LABEL = { auto: '◐ Auto', light: '☀ Light', dark: '☾ Dark', black: '● Black' };
const PALS = [
  ['clay', 'Clay', '#a45123'],
  ['terra', 'Terra', '#1f7a6d'],
  ['ocean', 'Ocean', '#2b67cc'],
  ['grape', 'Grape', '#7448c9'],
  ['rose', 'Rose', '#be3866'],
  ['graphite', 'Graphite', '#3a3a3a'],
];
function getPalette() {
  return document.documentElement.dataset.palette || 'clay';
}
function setPalette(p) {
  const r = document.documentElement;
  if (!p || p === 'clay') delete r.dataset.palette;
  else r.dataset.palette = p;
  try {
    p === 'clay' ? localStorage.removeItem('gt-palette') : localStorage.setItem('gt-palette', p);
  } catch (e) {}
  syncThemeColor();
}
function getTheme() {
  return document.documentElement.dataset.theme || 'auto';
}
function setTheme(t) {
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  try {
    t === 'auto' ? localStorage.removeItem('gt-theme') : localStorage.setItem('gt-theme', t);
  } catch (e) {}
  $('#themeBtn').textContent = THEME_LABEL[t];
  $('#themeBtn').title = 'Theme: ' + t + ' (tap to change)';
  syncThemeColor();
}
// Status-bar colour follows the actual background (handles auto mode too).
function syncThemeColor() {
  const m = document.querySelector('meta[name=theme-color]');
  const bg = getComputedStyle(document.body).backgroundColor || '#faf5ee';
  if (m) m.content = bg;
  try {
    window.GTNative && GTNative.bars(bg);
  } catch (e) {}
}
try {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeColor);
} catch (e) {}
$('#themeBtn').addEventListener('click', () => {
  const order = ['auto', 'light', 'dark', 'black'];
  setTheme(order[(order.indexOf(getTheme()) + 1) % 3]);
});
setTheme(getTheme());

async function autoArchive() {
  const days = +S.cfg.autoArch;
  if (!days) return;
  const cut = Date.now() - days * 864e5;
  for (const t of S.tasks)
    if (t.done && !t.archived && t.doneAt && t.doneAt < cut) {
      t.archived = true;
      t.archivedAt = Date.now();
      await DB.put('tasks', t);
    }
}
(async () => {
  applyLang();
  await load();
  await autoArchive();
  if (S.cfg.rpg && !S.cfg.rpgSince) {
    S.cfg.rpgSince = TODAY();
    saveCfg();
  }
  render();
  ftTick(true);
  if (!introSeen()) {
    if (S.tasks.length || S.goals.length || S.habits.length) markIntro();
    else openIntro();
  }
  await checkStorage(true);
  if (S.view === 'data') render();
})();

setInterval(autoBackupTick, 60000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) autoBackupTick();
});
setTimeout(autoBackupTick, 2500);

/* Keyboard handling.
   Tapping a text field inside a form docks that form to the bottom edge, right above the keyboard
   (like a chat box). The field is then always visible and the page behind it is never scrolled, so
   there is no jump to the end of the page. The tab bar is hidden while typing. */
(() => {
  const vv = window.visualViewport,
    vh = () => (vv ? vv.height : innerHeight),
    root = document.documentElement;
  let maxH = innerHeight,
    lastW = innerWidth,
    docked = null,
    spacer = null,
    undockT;
  const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
  const upd = () => {
    if (innerWidth !== lastW) {
      lastW = innerWidth;
      maxH = innerHeight;
    }
    maxH = Math.max(maxH, innerHeight, vh());
    root.classList.toggle('kb', vh() < maxH - 120 && typing());
  };
  const undock = () => {
    if (docked) docked.classList.remove('kbdock');
    if (spacer) spacer.remove();
    docked = spacer = null;
  };
  const dock = (form) => {
    clearTimeout(undockT);
    if (docked === form) return;
    undock();
    spacer = document.createElement('div');
    spacer.style.height = form.offsetHeight + 'px';
    form.before(spacer);
    form.classList.add('kbdock');
    docked = form;
  };
  document.addEventListener('focusin', (ev) => {
    const e = ev.target,
      form = e.closest && e.closest('form');
    if (/^(INPUT|TEXTAREA)$/.test(e.tagName) && form && !e.closest('dialog, header, .top')) dock(form);
    else if (docked && !docked.contains(e)) undock();
    upd();
  });
  document.addEventListener('focusout', (ev) => {
    if (docked && !docked.contains(ev.relatedTarget)) {
      clearTimeout(undockT);
      undockT = setTimeout(() => {
        if (!docked || !docked.contains(document.activeElement)) undock();
      }, 350);
    }
    setTimeout(upd, 200);
  });
  addEventListener('resize', upd);
  if (vv) vv.addEventListener('resize', upd);
})();
