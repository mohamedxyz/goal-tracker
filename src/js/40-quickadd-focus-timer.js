/**
 * Smart quick add (parseQuick turns 'Essay tomorrow !high #uni' into fields) and the focus timer.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Smart quick add ---------- */
const QA_WD = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};
const QA_WDAR = {
  أحد: 0,
  احد: 0,
  اثنين: 1,
  إثنين: 1,
  ثلاثاء: 2,
  أربعاء: 3,
  اربعاء: 3,
  خميس: 4,
  جمعة: 5,
  جمعه: 5,
  سبت: 6,
};
const QA_MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const QA_PRI = {
  high: 'high',
  h: 'high',
  3: 'high',
  عالي: 'high',
  عالية: 'high',
  med: 'med',
  medium: 'med',
  m: 'med',
  2: 'med',
  متوسط: 'med',
  متوسطة: 'med',
  low: 'low',
  l: 'low',
  1: 'low',
  منخفض: 'low',
  منخفضة: 'low',
};
// Pulls a due date, !priority and #tag out of a quick-add title. Tokens must stand alone (spaces around them).
function parseQuick(raw) {
  let s = ' ' + String(raw || '').replace(/\s+/g, ' ') + ' ',
    due = null,
    priority = null,
    tag = null;
  const now = new Date(),
    T = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dm = (d, mo) => {
    if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
    let x = new Date(T.getFullYear(), mo - 1, d);
    if (x.getDate() !== d) return null;
    if (x < T) x = new Date(T.getFullYear() + 1, mo - 1, d);
    return x;
  };
  const wd = (i) => addDays(T, (i - T.getDay() + 7) % 7);
  const take = (re, fn) => {
    if (due) return;
    const m = s.match(new RegExp('(?<=\\s)' + re + '(?=\\s)', 'iu'));
    if (!m) return;
    const d = fn(m);
    if (d) {
      due = ds(d);
      s = s.replace(m[0], ' ');
    }
  };
  take('(?:today|tod|اليوم)', () => T);
  take('بعد\\s+(?:غد|غدٍ|بكرة|باچر)', () => addDays(T, 2));
  take('(?:tomorrow|tmrw?|غدا|غدًا|غداً|بكرة|باچر|باكر)', () => addDays(T, 1));
  take('in\\s+(\\d{1,3})\\s+(days?|weeks?)', (m) => addDays(T, +m[1] * (/^w/i.test(m[2]) ? 7 : 1)));
  take('بعد\\s+(\\d{1,3})\\s+(?:أيام|ايام|يوم|يومًا|يوما)', (m) => addDays(T, +m[1]));
  take('بعد\\s+(\\d{1,2})\\s+(?:أسابيع|اسابيع|أسبوع|اسبوع)', (m) => addDays(T, 7 * m[1]));
  take('(?:next\\s+week|الأسبوع\\s+القادم|الاسبوع\\s+القادم)', () => addDays(T, (8 - T.getDay()) % 7 || 7));
  take(
    '(?:on\\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)',
    (m) => (/^[A-Z]{3,}$/.test(m[1]) ? null : wd(QA_WD[m[1].toLowerCase()]))
  );
  take('(?:يوم\\s+)?ال(أحد|احد|اثنين|إثنين|ثلاثاء|أربعاء|اربعاء|خميس|جمعة|جمعه|سبت)', (m) => wd(QA_WDAR[m[1]]));
  take('(\\d{4})-(\\d{1,2})-(\\d{1,2})', (m) => {
    const x = new Date(+m[1], m[2] - 1, +m[3]);
    return x.getDate() === +m[3] ? x : null;
  });
  take('(\\d{1,2})\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*', (m) =>
    dm(+m[1], QA_MON.indexOf(m[2].toLowerCase()) + 1)
  );
  take('(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s+(\\d{1,2})', (m) =>
    dm(+m[2], QA_MON.indexOf(m[1].toLowerCase()) + 1)
  );
  if (!due) {
    const m = s.match(/(?<=\s)(\d{1,2})\/(\d{1,2})\s$/);
    if (m) {
      const d = dm(+m[1], +m[2]);
      if (d) {
        due = ds(d);
        s = s.slice(0, m.index) + ' ';
      }
    }
  }
  const pm = s.match(/(?<=\s)!(high|medium|med|low|h|m|l|1|2|3|عالي|عالية|متوسط|متوسطة|منخفض|منخفضة)(?=\s)/iu);
  if (pm) {
    priority = QA_PRI[pm[1].toLowerCase()];
    s = s.replace(pm[0], ' ');
  }
  const tm = s.match(/(?<=\s)#([\p{L}\p{N}_-]{1,40})(?=\s)/u);
  if (tm) {
    tag = tm[1];
    s = s.replace(tm[0], ' ');
  }
  const title = s.replace(/\s+/g, ' ').trim();
  return { title: title || String(raw || '').trim(), due, priority, tag };
}
function qaHint(inp) {
  const f = inp.form,
    h = f && f.querySelector('.qa-hint');
  if (!h) return;
  const q = parseQuick(inp.value),
    bits = [];
  if (q.due) bits.push(`<span class="pill sm">📅 ${fmtDay(q.due)}</span>`);
  if (q.priority)
    bits.push(`<span class="pill sm">⚑ ${{ high: 'High', med: 'Medium', low: 'Low' }[q.priority]}</span>`);
  if (q.tag) bits.push(`<span class="pill sm" translate="no">#${esc(q.tag)}</span>`);
  h.innerHTML = bits.join(' ');
  h.hidden = !bits.length;
}
document.addEventListener('input', (e) => {
  if (e.target.matches && e.target.matches('form[data-form=task] input[name=title]')) qaHint(e.target);
});
/* ---------- Focus timer ---------- */
// One session at a time, stored as timestamps so it survives screen locks, reloads and the app being closed.
let FT = null;
try {
  FT = JSON.parse(localStorage.getItem('gt-focus') || 'null');
} catch (e) {}
let ftBusy = false,
  ftKey = '';
const ftSave = () => {
  try {
    FT ? localStorage.setItem('gt-focus', JSON.stringify(FT)) : localStorage.removeItem('gt-focus');
  } catch (e) {}
};
const ftLeft = () => (FT ? Math.max(0, FT.len - ((FT.paused ? FT.pausedAt : Date.now()) - FT.start)) : 0);
const fmtMin = (n) =>
  n >= 60 ? `${Math.floor(n / 60)}${L2('h', 'س')} ${n % 60}${L2('m', 'د')}` : `${n}${L2('m', 'د')}`;
function natSchedule(id, at, title, body) {
  try {
    window.GTNative && GTNative.schedule(id, at, title, body);
  } catch (e) {}
}
function natCancel(id) {
  try {
    window.GTNative && GTNative.cancel(id);
  } catch (e) {}
}
function ftNotify() {
  natCancel('focus');
  if (FT && !FT.paused) {
    const t = S.tasks.find((x) => x.id === FT.taskId);
    natSchedule(
      'focus',
      Date.now() + ftLeft(),
      FT.phase === 'focus' ? L2('Focus session done', 'انتهت جلسة التركيز') : L2('Break over', 'انتهت الاستراحة'),
      FT.phase === 'focus'
        ? L2('Time for a break: ', 'حان وقت الاستراحة: ') + (t ? t.title : '')
        : L2('Ready for another round?', 'مستعد لجولة أخرى؟')
    );
  }
}
function ftStart(taskId, phase) {
  phase = phase || 'focus';
  const min = +(phase === 'focus' ? S.cfg.focusLen : S.cfg.breakLen) || 25;
  FT = { taskId, phase, start: Date.now(), len: min * 60000, paused: false, n: (FT && FT.n) || 0 };
  ftSave();
  ftNotify();
  ftTick(true);
}
function ftToggle() {
  if (!FT) return;
  if (FT.paused) {
    FT.start += Date.now() - FT.pausedAt;
    FT.paused = false;
  } else {
    FT.paused = true;
    FT.pausedAt = Date.now();
  }
  ftSave();
  ftNotify();
  ftTick(true);
}
async function ftLog(id, min) {
  const t = S.tasks.find((x) => x.id === id);
  if (!t || min < 1) return null;
  (t.focusLog = t.focusLog || []).push({ at: Date.now(), m: min });
  t.focus = (t.focus || 0) + min;
  await DB.put('tasks', t);
  return t;
}
async function ftStop() {
  if (!FT) return;
  const was = FT;
  FT = null;
  ftSave();
  natCancel('focus');
  ftTick(true);
  if (was.phase === 'focus') {
    const min = Math.floor(((was.paused ? was.pausedAt : Date.now()) - was.start) / 60000);
    if (min >= 5) {
      const t = await ftLog(was.taskId, min);
      if (t) toast(`Logged ${min} min on "${t.title}".`);
    } else toast("Stopped. Sessions under 5 minutes aren't logged.");
  }
  render();
}
async function ftFinish() {
  if (ftBusy || !FT) return;
  ftBusy = true;
  try {
    const was = FT;
    if (was.phase === 'focus') {
      const t = await ftLog(was.taskId, Math.round(was.len / 60000));
      Sound.play('goal');
      FT = { ...was, n: (was.n || 0) + 1 };
      ftStart(was.taskId, 'break');
      if (t) toast(`Focus done: ${Math.round(was.len / 60000)} min on "${t.title}". Break time.`);
    } else {
      FT = null;
      ftSave();
      natCancel('focus');
      Sound.play('habit');
      toast('Break over. Ready for another round?');
    }
    ftTick(true);
    render();
  } finally {
    ftBusy = false;
  }
}
function ftTick(full) {
  const bar = $('#focusBar');
  if (!bar) return;
  if (!FT) {
    bar.hidden = true;
    ftKey = '';
    document.body.classList.remove('ftOn');
    return;
  }
  const left = ftLeft();
  if (left <= 0 && !FT.paused) {
    ftFinish();
    return;
  }
  const mm = Math.floor(left / 60000),
    ss = Math.floor(left / 1000) % 60,
    time = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  const t = S.tasks.find((x) => x.id === FT.taskId),
    key = FT.phase + FT.paused + (t ? t.title : '');
  if (full || key !== ftKey || bar.hidden) {
    ftKey = key;
    bar.hidden = false;
    bar.classList.toggle('brk', FT.phase === 'break');
    document.body.classList.add('ftOn');
    bar.innerHTML = `<div class="ft-main"><span class="ft-ph">${FT.phase === 'focus' ? '⏱ Focus' : '☕ Break'}${FT.paused ? ` <span>· ${L2('paused', 'متوقف')}</span>` : ''}</span><span class="ft-t" translate="no">${t ? esc(t.title) : ''}</span></div><b class="ft-time">${time}</b>
      <button type="button" data-action="ft-toggle" aria-label="${FT.paused ? 'Resume' : 'Pause'}" title="${FT.paused ? 'Resume' : 'Pause'}">${FT.paused ? '▶' : '❚❚'}</button>${FT.phase === 'break' ? `<button type="button" data-action="ft-skip" aria-label="Skip break" title="Skip break">⏭</button>` : ''}<button type="button" data-action="ft-stop" aria-label="Stop" title="Stop">✕</button>`;
  } else {
    const e = bar.querySelector('.ft-time');
    if (e) e.textContent = time;
  }
}
setInterval(() => {
  if (FT) ftTick();
}, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && FT) ftTick(true);
});
