/**
 * Time blocking: give a task a start time and a length, and see the day as a timeline (the Plan view on the Tasks tab).
 * A task is a "block" when it has a due date plus `start` ("HH:MM") and `dur` (minutes).
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

const PLAN = { day: null, pick: null };
const PLAN_PX = 56; // pixels per hour on the timeline
const PLAN_LENS = [15, 30, 45, 60, 90, 120, 180, 240]; // choices in the edit dialog, minutes

const toMin = (hm) => {
  const [h, m] = String(hm).split(':');
  return (+h || 0) * 60 + (+m || 0);
};
const fromMin = (min) => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
const hmText = (min) =>
  fmt(
    new Date(2000, 0, 1, Math.floor(min / 60) % 24, min % 60),
    Object.assign(
      { hour: 'numeric', minute: '2-digit' },
      S.cfg.timeFmt === '12' ? { hour12: true } : S.cfg.timeFmt === '24' ? { hourCycle: 'h23' } : {}
    )
  );
const blockLen = (t) => t.dur || 60;
const lenText = (m) => (m < 60 ? m + L2(' min', ' د') : (m % 60 ? (m / 60).toFixed(1) : m / 60) + L2(' h', ' س'));
const isBlock = (t) => !!(t.start && t.due);
/** "9:00 AM – 10:00 AM" for a scheduled task. */
const blockTime = (t) => hmText(toMin(t.start)) + ' – ' + hmText(Math.min(1440, toMin(t.start) + blockLen(t)));

/** Lays overlapping blocks side by side: returns [{t, s, e, col, n}] (n = columns in its overlap group). */
function layoutBlocks(tasks) {
  const ev = tasks
    .map((t) => ({ t, s: toMin(t.start), e: Math.min(1440, toMin(t.start) + blockLen(t)) }))
    .sort((a, b) => a.s - b.s || b.e - a.e);
  let group = [],
    groupEnd = 0;
  const flush = () => {
    const cols = [];
    for (const x of group) {
      let c = cols.findIndex((end) => end <= x.s);
      if (c < 0) c = cols.length;
      cols[c] = x.e;
      x.col = c;
    }
    group.forEach((x) => (x.n = cols.length));
    group = [];
  };
  for (const x of ev) {
    if (group.length && x.s >= groupEnd) flush();
    group.push(x);
    groupEnd = Math.max(groupEnd, x.e);
  }
  flush();
  return ev;
}

/** Applies a change to a block, saves it, and shows a toast with Undo. */
async function planChange(t, msg, change) {
  const before = { due: t.due, start: t.start, dur: t.dur, pick: PLAN.pick };
  change();
  await DB.put('tasks', t);
  toastUndo(msg, async () => {
    Object.assign(t, { due: before.due, start: before.start, dur: before.dur });
    PLAN.pick = before.pick;
    await DB.put('tasks', t);
  });
}
/** Which blocks overlap in time: Map of task id to the titles of the blocks it overlaps. */
function blockClashes(lay) {
  const m = new Map();
  for (const a of lay)
    for (const b of lay) if (a !== b && a.s < b.e && b.s < a.e) m.set(a.t.id, (m.get(a.t.id) || []).concat(b.t.title));
  return m;
}

function planView() {
  const today = TODAY(),
    day = PLAN.day || today;
  const blocks = S.tasks.filter((t) => !t.archived && t.due === day && t.start);
  const lay = layoutBlocks(blocks);
  // Show your day (Settings: 6:00 to midnight by default), stretched to fit anything earlier or later.
  const first = lay.length ? Math.min(...lay.map((x) => x.s)) : 1440,
    last = lay.length ? Math.max(...lay.map((x) => x.e)) : 0;
  const s0 = Math.max(0, Math.min(toMin(S.cfg.planFrom || '06:00'), Math.floor(first / 60) * 60)),
    e0 = Math.min(1440, Math.max(toMin(S.cfg.planTo || '24:00'), Math.ceil(last / 60) * 60));
  const pr = (t) => ({ high: 0, med: 1, low: 2 })[t.priority] ?? 2;
  const tray = S.tasks
    .filter(
      (t) => !t.archived && !t.done && !t.start && (t.due === day || (day === today && (!t.due || t.due < today)))
    )
    .sort((a, b) => pr(a) - pr(b))
    .slice(0, 30);
  const pick = PLAN.pick && S.tasks.find((t) => t.id === PLAN.pick && !t.done && !t.archived);
  if (!pick) PLAN.pick = null;
  const clash = blockClashes(lay);
  const planned = lay.reduce((n, x) => n + (x.e - x.s), 0);

  let rows = '';
  for (let h = s0 / 60; h < e0 / 60; h++) {
    rows += `<div class="pl-hr"><span class="pl-lab">${hmText(h * 60)}</span>
      <button type="button" class="pl-slot" data-action="plan-slot" data-min="${h * 60}" aria-label="${hmText(h * 60)}"></button>
      <button type="button" class="pl-slot half" data-action="plan-slot" data-min="${h * 60 + 30}" aria-label="${hmText(h * 60 + 30)}"></button></div>`;
  }
  const blk = lay
    .map((x) => {
      const t = x.t,
        h = Math.max(24, ((x.e - x.s) / 60) * PLAN_PX - 2);
      return `<div class="pl-b pr-${t.priority || 'low'} ${t.done ? 'done' : ''} ${PLAN.pick === t.id ? 'sel' : ''} ${clash.has(t.id) && !t.done ? 'clash' : ''}" style="top:${((x.s - s0) / 60) * PLAN_PX}px;height:${h}px;inset-inline-start:${(x.col / x.n) * 100}%;width:${100 / x.n}%" data-action="plan-pick" data-id="${t.id}" role="button" tabindex="0">
        <button type="button" class="pl-ck" data-action="toggle-task" data-id="${t.id}" aria-label="${L2('Mark done', 'تم')}">${t.done ? '✓' : ''}</button>
        <b>${clash.has(t.id) && !t.done ? '⚠ ' : ''}${iconPrefix(t)}${esc(t.title)}</b>${h >= 40 ? `<span>${hmText(x.s)} – ${hmText(x.e)}</span>` : ''}</div>`;
    })
    .join('');
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const now =
    day === today && nowMin >= s0 && nowMin <= e0
      ? `<div class="pl-now" style="top:${((nowMin - s0) / 60) * PLAN_PX}px"></div>`
      : '';

  return `<div class="card plan">
    <div class="cal-nav"><button type="button" class="icon" data-action="plan-day" data-d="-1" aria-label="${L2('Previous day', 'اليوم السابق')}">‹</button><b>${fmtDay(day)}</b><button type="button" class="icon" data-action="plan-day" data-d="1" aria-label="${L2('Next day', 'اليوم التالي')}">›</button></div>
    <div class="meta pl-sum">${blocks.length ? L2(blocks.length + ' blocks · ' + lenText(planned) + ' planned', blocks.length + ' فترات · ' + lenText(planned) + ' مخطّطة') + (clash.size ? ' · ⚠ ' + L2(clash.size + ' overlapping', clash.size + ' متداخلة') : '') : L2('Nothing scheduled yet.', 'لا شيء مجدول بعد.')}${day !== today ? ` <button type="button" class="chip" data-action="plan-today">${L2('Today', 'اليوم')}</button>` : ''}</div>
    ${
      pick && pick.start
        ? `<div class="pl-bar"><div class="meta"><b>${esc(pick.title)}</b> · ${blockTime(pick)} · ${L2('tap a time to move it', 'اضغط على وقت لنقلها')}</div>
      ${clash.has(pick.id) ? `<div class="meta pl-warn">⚠ ${L2('Overlaps with ', 'تتداخل مع ')}${clash.get(pick.id).map(esc).join('، ')}</div>` : ''}
      <div class="pl-btns">${[
        ['plan-nudge', -15, '▲ 15', L2('15 minutes earlier', 'أبكر بـ15 دقيقة')],
        ['plan-nudge', 15, '▼ 15', L2('15 minutes later', 'أبعد بـ15 دقيقة')],
        ['plan-len', -15, '− 15', L2('Shorter by 15 minutes', 'أقصر بـ15 دقيقة')],
        ['plan-len', 15, '+ 15', L2('Longer by 15 minutes', 'أطول بـ15 دقيقة')],
      ]
        .map(
          ([a, d, l, tip]) =>
            `<button type="button" class="chip" data-action="${a}" data-id="${pick.id}" data-d="${d}" title="${tip}" aria-label="${tip}">${l}</button>`
        )
        .join('')}
      <button type="button" class="chip" data-action="info-task" data-id="${pick.id}" aria-label="${L2('Details', 'تفاصيل')}">ⓘ</button>
      <button type="button" class="chip" data-action="plan-unset" data-id="${pick.id}" aria-label="${L2('Unschedule', 'إلغاء الجدولة')}">✕</button></div></div>`
        : ''
    }
    ${
      tray.length
        ? `<div class="pl-tray"><div class="meta">${pick && !pick.start ? L2('Now tap a time for “' + pick.title + '”', 'اضغط على وقت لـ«' + pick.title + '»') : L2('Not scheduled · tap one, then tap a time', 'غير مجدولة · اضغط على مهمة ثم على وقت')}</div>
      <div class="pl-chips">${tray.map((t) => `<button type="button" class="chip ${PLAN.pick === t.id ? 'on' : ''}" data-action="plan-pick" data-id="${t.id}" aria-pressed="${PLAN.pick === t.id}">${iconPrefix(t)}${esc(t.title)}</button>`).join('')}</div></div>`
        : ''
    }
    <div class="pl-grid" style="--plh:${PLAN_PX}px" data-s0="${s0}">${rows}<div class="pl-layer">${blk}${now}</div></div>
    <div class="meta pl-hint">${L2('Tap an empty time to add a block. Tap a block to move or resize it.', 'اضغط على وقت فارغ لإضافة فترة. اضغط على فترة لنقلها أو تغيير مدتها.')}</div></div>`;
}

/* Swipe sideways on the timeline to change the day, or on the month calendar to change the month. */
(() => {
  let x0 = 0,
    y0 = 0,
    t0 = 0,
    on = null;
  document.addEventListener(
    'touchstart',
    (e) => {
      on = e.target.closest && (e.target.closest('.pl-grid') ? 'day' : e.target.closest('.tcal') ? 'month' : null);
      if (!on || e.touches.length !== 1) return (on = null);
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = Date.now();
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (!on || S.cfg.planSwipe === false) return;
      const k = on;
      on = null;
      const c = e.changedTouches[0],
        dx = c.clientX - x0,
        dy = c.clientY - y0;
      if (Date.now() - t0 > 700 || Math.abs(dx) < 70 || Math.abs(dx) < 2 * Math.abs(dy)) return;
      // Swiping towards the end of the line moves forward: right-to-left in English, left-to-right in Arabic.
      const next = dx < 0 === (document.documentElement.dir !== 'rtl') ? 1 : -1;
      if (k === 'day' && S.planOn) {
        PLAN.day = ds(addDays(new Date((PLAN.day || TODAY()) + 'T00:00'), next));
        PLAN.pick = null;
      } else if (k === 'month' && S.tcalOn && tcal) {
        const d = new Date(tcal.y, tcal.m + next, 1);
        tcal.y = d.getFullYear();
        tcal.m = d.getMonth();
      } else return;
      render();
    },
    { passive: true }
  );
})();
