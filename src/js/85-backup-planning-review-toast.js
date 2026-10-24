/**
 * Backup reminders and the automatic daily backup, weekly planning, period-end review, toasts with Undo, checklist parsing and repeating tasks.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Backup reminders & storage protection ---------- */
const BACKUP_STALE = 7;
function lastBackup() {
  try {
    return +localStorage.getItem('gt-last-backup') || 0;
  } catch (e) {
    return 0;
  }
}
function markBackup() {
  try {
    localStorage.setItem('gt-last-backup', String(Date.now()));
  } catch (e) {}
}
const daysSince = (ts) =>
  ts ? Math.round((new Date(TODAY() + 'T00:00') - new Date(ds(new Date(ts)) + 'T00:00')) / 864e5) : null;
const agoText = (n) =>
  n === null
    ? L2('never', 'أبدًا')
    : n <= 0
      ? L2('today', 'اليوم')
      : n === 1
        ? L2('yesterday', 'أمس')
        : L2(n + ' days ago', `منذ ${n} ${AYAM(n)}`);
/* Automatic daily backup at the time the user picks */
function autoBackupDue() {
  if (!S.cfg.abOn) return false;
  const [h, m] = String(S.cfg.abTime || '21:00')
      .split(':')
      .map(Number),
    n = new Date();
  if (n.getHours() * 60 + n.getMinutes() < h * 60 + (m || 0)) return false;
  try {
    return localStorage.getItem('gt-auto-last') !== TODAY();
  } catch (e) {
    return false;
  }
}
let _abBusy = false;
async function autoBackupTick() {
  if (
    _abBusy ||
    !S.booted ||
    !autoBackupDue() ||
    !(S.tasks.length + S.goals.length + S.habits.length + S.topics.length)
  )
    return;
  if (!(window.GTNative && GTNative.autoBackup)) {
    if (!S._abShown) {
      S._abShown = true;
      render();
    }
    return;
  }
  _abBusy = true;
  try {
    await GTNative.autoBackup(`goalterra-auto-${TODAY()}.json`, JSON.stringify(backupData()));
    markBackup();
    try {
      localStorage.setItem('gt-auto-last', TODAY());
    } catch (e) {}
    try {
      GTNative.cancel('ab' + TODAY());
    } catch (e) {}
    toast(L2('Automatic backup saved.', 'تم حفظ النسخة الاحتياطية تلقائيًا.'));
    render();
  } catch (e) {
    toast(L2('Automatic backup failed. Try Back up now.', 'فشل النسخ التلقائي. جرّب النسخ الآن.'));
  } finally {
    _abBusy = false;
  }
}
function autoCard() {
  if (window.GTNative || !autoBackupDue()) return '';
  return `<div class="card backup-cta"><div class="grow"><div class="title">${L2('Time for your daily backup', 'حان وقت نسخة اليوم الاحتياطية')}</div><div class="meta">${L2("A browser cannot save files by itself, so tap to save today's backup.", 'المتصفح لا يحفظ الملفات تلقائيًا، فاضغط لحفظ نسخة اليوم.')}</div></div><button class="btn" data-action="backup-auto">${L2('Back up now', 'انسخ الآن')}</button></div>`;
}
function backupDue() {
  const n = daysSince(lastBackup());
  return n === null || n > BACKUP_STALE;
}
const backupLevel = () => {
  const n = daysSince(lastBackup());
  return n === null
    ? S.tasks.length + S.goals.length + S.habits.length > 20
      ? 2
      : 1
    : n > 30
      ? 2
      : n > BACKUP_STALE
        ? 1
        : 0;
};
function backupNudge() {
  if (!backupDue() || !(S.tasks.length + S.goals.length + S.habits.length)) return false;
  let snooze = 0;
  try {
    snooze = +localStorage.getItem('gt-backup-snooze') || 0;
  } catch (e) {}
  return !(snooze && Date.now() - snooze < (backupLevel() > 1 ? 1 : 3) * 864e5);
}
S.storage = null; // 'protected' | 'unprotected' | 'unsupported'
async function checkStorage(ask) {
  try {
    const st = navigator.storage;
    if (!st || !st.persisted) {
      S.storage = 'unsupported';
      return;
    }
    let p = await st.persisted();
    if (!p && ask && st.persist) p = await st.persist();
    S.storage = p ? 'protected' : 'unprotected';
  } catch (e) {
    S.storage = 'unsupported';
  }
}

/* ---------- Weekly planning ---------- */
function planTargets() {
  const mp = currentPeriod('monthly');
  return S.goals.filter(
    (g) => g.horizon === 'monthly' && g.period === mp && !g.done && g.status !== 'missed' && goalKind(g) === 'rollup'
  );
}
const planLeft = (g) => Math.max(0, expectedOf(g) - S.goals.filter((c) => c.parentId === g.id).length);
function openPlan() {
  drawPlan();
  if (!dlg.open) dlg.showModal();
  const i = dlg.querySelector('.plan-add input[name=title]');
  i && i.focus();
}
function drawPlan() {
  const wk = currentPeriod('weekly'),
    targets = planTargets();
  const row = (parent) => {
    const mine = parent
      ? S.goals.filter((c) => c.parentId === parent.id && c.period === wk)
      : S.goals.filter((g) => g.horizon === 'weekly' && g.period === wk && !g.parentId);
    const left = parent ? planLeft(parent) : 0;
    return `<div class="card plan-row"><div class="title">${parent ? esc(parent.title) : 'Standalone weekly goals'}</div>
      ${parent ? `<div class="meta"><span>${goalDetail(parent)}</span>${left ? '' : '<span class="tag t-ok">Fully planned</span>'}</div>` : ''}
      ${mine.length ? `<ul class="plan-list">${mine.map((c) => `<li>• ${esc(c.title)}${goalKind(c) === 'number' ? ` · ${fmtNum(c.target)} ${esc(c.unit || '')}` : ''}</li>`).join('')}</ul>` : ''}
      <form class="plan-add" data-plan="${parent ? parent.id : ''}" data-kind="check">
        <input type="text" name="title" placeholder="${parent ? "This week's step toward it…" : 'A weekly goal of its own…'}" required autocomplete="off">
        <select name="kind" aria-label="How it's measured"><option value="check">☐ Checkbox</option><option value="number">🔢 Number</option></select>
        <span class="f-num"><input type="number" name="target" min="0" step="any" placeholder="Target, e.g. 10"><input type="text" name="unit" placeholder="Unit, e.g. hours"></span>
        <button class="btn">Add</button></form></div>`;
  };
  dlg.innerHTML = `<div class="hist"><div class="hist-top"><h3>Plan ${esc(wk)}</h3><button type="button" class="icon" data-action="dlg-close" aria-label="Close">✕</button></div>
    <p class="meta">${targets.length ? `Add this week's steps under your ${esc(currentPeriod('monthly'))} goals. Each one moves its monthly goal forward.` : `No monthly goals built from weekly goals for ${esc(currentPeriod('monthly'))} yet. Add standalone goals below, or create a monthly goal on the Goals tab first.`}</p>
    <div class="goals" style="margin-top:10px">${targets.map(row).join('')}${row(null)}</div>
    <div class="dlg-actions"><button type="button" class="btn" data-action="dlg-close">Done</button></div></div>`;
}
dlg.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-plan]');
  if (!f) return;
  e.preventDefault();
  const v = Object.fromEntries(new FormData(f)),
    k = v.kind === 'number' ? 'number' : 'check',
    pid = f.dataset.plan;
  if (k === 'number' && !(+v.target > 0)) {
    askAlert('Set a target number for this goal (for example 10).');
    return;
  }
  const g = {
    id: uid(),
    title: v.title.trim(),
    horizon: 'weekly',
    period: currentPeriod('weekly'),
    parentId: pid || null,
    notes: '',
    kind: k,
    target: +v.target || 0,
    unit: (v.unit || '').trim(),
    value: 0,
    expected: null,
    done: false,
    created: Date.now(),
  };
  S.goals.push(g);
  await DB.put('goals', g);
  drawPlan();
  render();
  const i = dlg.querySelector(`form[data-plan="${pid}"] input[name=title]`);
  i && i.focus();
});

/* ---------- Period-end review ---------- */
function rvNote(g) {
  const i = dlg.querySelector(`.rv-note[data-id="${g.id}"]`);
  const t = i && i.value.trim();
  if (t) g.lesson = g.lesson ? g.lesson + '\n' + t : t;
}
function openReview() {
  drawReview();
  if (S.goals.some(needsReview) && !dlg.open) dlg.showModal();
}
function drawReview() {
  const ord = { weekly: 0, monthly: 1, annual: 2, five: 3 };
  const list = S.goals
    .filter(needsReview)
    .sort((a, b) => ord[a.horizon] - ord[b.horizon] || a.period.localeCompare(b.period));
  if (!list.length) {
    if (dlg.open) {
      dlg.close();
      notify('All caught up. Reviews done ✓');
    }
    return;
  }
  dlg.innerHTML = `<div class="hist"><div class="hist-top"><h3>Review ${list.length} goal${list.length > 1 ? 's' : ''}</h3><button type="button" class="icon" data-action="dlg-close" aria-label="Close">✕</button></div>
    <p class="meta">These periods have ended. Be honest. This is where the system gets smarter.</p>
    <div class="goals" style="margin-top:10px">${list
      .map(
        (g) => `<div class="card rv">
      <div class="title">${esc(g.title)}</div>
      <div class="meta"><span class="tag">${HORIZONS[g.horizon]} · ${esc(g.period)}</span><span><b>${progress(g)}%</b>${goalDetail(g) ? ' · ' + goalDetail(g) : goalKind(g) === 'number' ? ` · ${fmtNum(g.value)}/${fmtNum(g.target)} ${esc(g.unit || '')}` : ''}</span></div>
      <input type="text" class="rv-note" data-id="${g.id}" placeholder="What got in the way / what worked? (optional)">
      <div class="rv-actions"><button type="button" class="ghost ok" data-action="rv-hit" data-id="${g.id}">✓ Hit it</button>
        <button type="button" class="ghost bad" data-action="rv-miss" data-id="${g.id}">✗ Missed</button>
        <button type="button" class="ghost" data-action="rv-carry" data-id="${g.id}">→ Carry to ${esc(currentPeriod(g.horizon))}</button></div></div>`
      )
      .join('')}</div></div>`;
}
// Show the right extra fields (target/unit, sub-goal count) for the chosen goal kind.
document.addEventListener('change', (e) => {
  if (e.target.name === 'kind' && e.target.form) e.target.form.dataset.kind = e.target.value;
});
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('act');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
let undoFn = null;
function toastUndo(msg, fn) {
  const t = $('#toast');
  undoFn = fn;
  t.innerHTML = `${esc(msg)} <button type="button" data-undo>Undo</button>`;
  t.classList.add('show', 'act');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show', 'act');
    undoFn = null;
  }, 6000);
}
$('#toast').addEventListener('click', async (e) => {
  if (!e.target.closest('[data-undo]') || !undoFn) return;
  const f = undoFn;
  undoFn = null;
  $('#toast').classList.remove('show', 'act');
  await f();
  Sound.play('undo');
  render();
});

/* ---------- Checklists ---------- */
function parseItems(txt, old = []) {
  const was = new Map((old || []).map((i) => [i.text, i]));
  return String(txt || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((text) => {
      const w = was.get(text);
      return { text, done: !!(w && w.done), ...(w && w.dmg ? { dmg: w.dmg, at: w.at } : {}) };
    });
}
/* ---------- Repeating tasks ---------- */
const REPEATS = [
  ['', 'No repeat'],
  ['daily', 'Daily'],
  ['weekdays', 'Weekdays'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
];
const REPEAT_LABEL = Object.fromEntries(REPEATS.filter((r) => r[0]));
function stepDue(d, rule) {
  const x = new Date(d);
  if (rule === 'daily') x.setDate(x.getDate() + 1);
  else if (rule === 'weekdays') {
    do x.setDate(x.getDate() + 1);
    while (x.getDay() === 0 || x.getDay() === 6);
  } else if (rule === 'weekly') x.setDate(x.getDate() + 7);
  else if (rule === 'monthly') {
    const day = x.getDate();
    x.setDate(1);
    x.setMonth(x.getMonth() + 1);
    x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
  }
  return x;
}
// Next due date after the task's own date, skipping past dates so an overdue task doesn't spawn more overdue ones.
function nextDue(t) {
  const today = TODAY();
  let d = stepDue(new Date((t.due || today) + 'T00:00'), t.repeat);
  for (let i = 0; i < 400 && ds(d) < today; i++) d = stepDue(d, t.repeat);
  return ds(d);
}
async function onTaskDone(t) {
  if (!t.repeat) return;
  if (t.done && !t.nextId) {
    const n = {
      id: uid(),
      title: t.title,
      notes: t.notes || '',
      repeat: t.repeat,
      due: nextDue(t),
      priority: t.priority,
      goalId: t.goalId || null,
      tag: t.tag || '',
      items: (t.items || []).map((i) => ({ text: i.text, done: false })),
      done: false,
      created: Date.now(),
      prevId: t.id,
    };
    t.nextId = n.id;
    S.tasks.push(n);
    await DB.put('tasks', n);
    await DB.put('tasks', t);
    toast(`🔁 Next "${t.title}" on ${fmtDate(n.due)}`);
  } else if (!t.done && t.nextId) {
    const n = S.tasks.find((x) => x.id === t.nextId);
    if (n && !n.done) {
      S.tasks = S.tasks.filter((x) => x.id !== n.id);
      await DB.del('tasks', n.id);
    }
    t.nextId = null;
    await DB.put('tasks', t);
  }
}
