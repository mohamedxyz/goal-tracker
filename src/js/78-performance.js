/**
 * Today's performance card: how you are doing, at a glance (ring, last 7 days, week vs last week, streak).
 * Today shows this first and keeps the task/habit lists short. (All src/js files share one scope.)
 */
/* Done / due for one day, tasks and habits together. Tasks count on their due date; past misses count too. */
function dayScore(d) {
  const k = ds(d),
    hs = S.habits.filter((h) => !isNeg(h) && isDue(h, d) && k >= bornK(h));
  const ts = S.tasks.filter((t) => !t.archived && t.due === k);
  const due = hs.length + ts.length,
    done = hs.filter((h) => good(h, k)).length + ts.filter((t) => t.done).length;
  return { k, d, due, done, pct: due ? Math.round((done / due) * 100) : null };
}
function perfStats() {
  const days = [...Array(14)].map((_, i) => dayScore(addDays(new Date(), i - 13)));
  const avg = (a) => {
    const v = a.filter((x) => x.pct !== null);
    return v.length ? Math.round(v.reduce((s, x) => s + x.pct, 0) / v.length) : null;
  };
  return { days, week: days.slice(7), now: avg(days.slice(7)), before: avg(days.slice(0, 7)), today: days[13] };
}
/* ---------- GoalTerra scores (0 to 1000) ----------
   Both are slow 42-day averages (an exponentially weighted moving average, as in sports training load), seeded with
   the first week so new users are not punished. One big or lazy day barely moves them.
   HABITS  daily value = share of due habits done. A half-tick counts 0.7. A single isolated miss (done the day
           before or after) counts 0.5 instead of 0 ("never miss twice"). Days with nothing due are skipped.
   TASKS   daily points = sum over tasks done that day of (3 high, 2 medium, 1 low) + min(1, minutes / 120).
           Low-priority points are capped at 3 a day. Score = average / target (default 6 points a day), max 1000.
   OVERALL geometric mean of the two, so neglecting one drags it down. With only one of them, it is that one. */
const SC_DAYS = 84,
  SC_TAU = 42;
const scDay = (shift, i) => addDays(new Date(), -(shift || 0) - (SC_DAYS - 1 - i));
function emaSeries(vals) {
  /* vals: numbers, or null for "skip this day" */
  const live = vals.filter((v) => v !== null);
  if (!live.length) return null;
  const seed = live.slice(0, 7).reduce((a, v) => a + v, 0) / Math.min(7, live.length);
  let e = seed;
  for (const v of live.slice(Math.min(7, live.length))) e += (v - e) / SC_TAU;
  return e;
}
function habitDayValue(k, d) {
  const hs = S.habits.filter((h) => !isNeg(h) && isDue(h, d) && k >= bornK(h));
  if (!hs.length) return null;
  const prev = ds(addDays(d, -1)),
    next = ds(addDays(d, 1));
  let sum = 0;
  for (const h of hs) {
    if (good(h, k)) sum += isMini(h.id, k) ? 0.7 : 1;
    else if (good(h, prev) || (next <= TODAY() && good(h, next))) sum += 0.5;
  }
  return sum / hs.length;
}
function habitScore(shift) {
  if (!S.habits.some((h) => !isNeg(h))) return null;
  const e = emaSeries([...Array(SC_DAYS)].map((_, i) => ((d) => habitDayValue(ds(d), d))(scDay(shift, i))));
  return e === null ? null : Math.round(1000 * Math.min(1, e));
}
const taskPts = (t) =>
  ({ high: 3, med: 2, low: 1 })[t.priority] ?? 1;
function taskDayLoads(shift) {
  const by = new Map();
  for (const t of S.tasks)
    if (t.done && t.doneAt) {
      const k = ds(new Date(t.doneAt));
      const o = by.get(k) || { main: 0, low: 0 };
      const pts = taskPts(t) + Math.min(1, (t.dur || 0) / 120);
      if (t.priority === 'high' || t.priority === 'med') o.main += pts;
      else o.low += pts;
      by.set(k, o);
    }
  const first = S.tasks.reduce((m, t) => Math.min(m, t.created || Date.now()), Date.now());
  return [...Array(SC_DAYS)].map((_, i) => {
    const d = scDay(shift, i),
      k = ds(d),
      o = by.get(k);
    if (k < ds(new Date(first)) && !o) return null;
    return o ? o.main + Math.min(3, o.low) : 0;
  });
}
function taskScore(shift) {
  if (!S.tasks.length) return null;
  const loads = taskDayLoads(shift),
    e = emaSeries(loads);
  return e === null ? null : Math.round(1000 * Math.min(1, e / (S.cfg.taskTarget || 6)));
}
function overallScore(shift) {
  const h = habitScore(shift),
    t = taskScore(shift);
  if (h === null && t === null) return null;
  if (h === null) return t;
  if (t === null) return h;
  return Math.round(Math.sqrt(h * t));
}
/* Last 7 days far above the 42-day pace: a gentle burnout warning. */
function overpace() {
  const l = taskDayLoads(0).filter((v) => v !== null);
  if (l.length < 21) return false;
  const e = emaSeries(l),
    w = l.slice(-7).reduce((a, v) => a + v, 0) / 7;
  return e > 1 && w > e * 1.6;
}
function scoreInfoText() {
  return L2(
    'GoalTerra scores (0 to 1000)\n\nTwo slow averages over about 42 days, so one great or lazy day barely moves them.\n\nHabits score: share of due habits done each day. A half-tick counts 0.7. One isolated miss counts half, because you never missed twice. Days with nothing due are skipped.\n\nTasks score: points per finished task: 3 high, 2 medium, 1 low, plus up to 1 more for a long task (2 hours = full). Low-priority points are capped at 3 a day. 6 points a day = 1000.\n\nOverall: the geometric mean √(habits × tasks), so ignoring one side pulls it down.\n\nIt measures follow-through and effort, not how important your goals are. If you mark everything high priority it inflates.',
    'نتائج GoalTerra (من 0 إلى 1000)\n\nمتوسطان بطيئان على نحو 42 يومًا، فيوم رائع أو كسول واحد بالكاد يحركهما.\n\nنتيجة العادات: نسبة العادات المنجزة من المستحقة كل يوم. نصف التأشير يحسب 0.7. تفويت واحد معزول يحسب نصفًا لأنك لم تفوّت مرتين. الأيام بلا عادات مستحقة تُتخطى.\n\nنتيجة المهام: نقاط لكل مهمة منجزة: 3 عالية، 2 متوسطة، 1 منخفضة، وحتى نقطة إضافية للمهمة الطويلة (ساعتان = كاملة). نقاط المنخفضة بحد أقصى 3 يوميًا. 6 نقاط يوميًا = 1000.\n\nالإجمالي: المتوسط الهندسي √(العادات × المهام)، فإهمال جانب واحد يخفضه.\n\nتقيس الالتزام والجهد لا أهمية أهدافك. وإن جعلت كل شيء عالي الأولوية تضخّمت.'
  );
}
function perfCard() {
  if (!S.tasks.length && !S.habits.length && !S.goals.length) return '';
  const p = perfStats(),
    t = p.today;
  const pct = t.due ? t.pct : 0,
    C = 2 * Math.PI * 34,
    full = t.due && t.done === t.due;
  const delta = p.now !== null && p.before !== null ? p.now - p.before : null;
  const bld = S.habits.filter((h) => !isNeg(h)),
    best = bld.length ? Math.max(...bld.map(streak)) : 0,
    active = S.goals.filter((g) => !g.done && g.status !== 'missed').length;
  const bars = p.week
    .map((x, i) => {
      const h = x.pct === null ? 4 : Math.max(4, Math.round((x.pct / 100) * 44)),
        lab = fmt(x.d, { weekday: 'short' });
      return `<div class="pbar ${i === 6 ? 'now' : ''} ${x.pct === null ? 'none' : ''}" title="${esc(lab)}: ${x.pct === null ? '–' : x.pct + '%'}"><span style="height:${h}px"></span><i>${esc(lab.slice(0, 2))}</i></div>`;
    })
    .join('');
  const sc = overallScore(0),
    sc0 = overallScore(7),
    hs = habitScore(0),
    hs0 = habitScore(7),
    ts = taskScore(0),
    ts0 = taskScore(7);
  const arrow = (a, b) => (a === null || b === null || a === b ? '' : `<em class="${a > b ? 'up' : 'dn'}">${a > b ? '▲' : '▼'}${Math.abs(a - b)}</em>`);
  const trend =
    delta === null
      ? L2('Your first week. Keep going.', 'أسبوعك الأول. استمر.')
      : delta === 0
        ? L2('Same as last week', 'مثل الأسبوع الماضي')
        : delta > 0
          ? L2(`Up ${delta} points on last week`, `أفضل بـ ${delta} نقطة من الأسبوع الماضي`)
          : L2(`Down ${-delta} points on last week`, `أقل بـ ${-delta} نقطة من الأسبوع الماضي`);
  return `<div class="card perf ${full ? 'full' : ''}">
    ${sc !== null ? `<button class="perf-score" data-action="score-info" aria-label="${L2('How the scores work', 'كيف تُحسب النتائج')}"><span><small><span translate="no">GoalTerra</span> ${L2('Score', 'النتيجة')}</small><b>${sc}</b></span>${arrow(sc, sc0)}<u>ⓘ</u></button><div class="sub-scores">${hs !== null ? `<span>${L2('Habits', 'العادات')} <b>${hs}</b>${arrow(hs, hs0)}</span>` : ''}${ts !== null ? `<span>${L2('Tasks', 'المهام')} <b>${ts}</b>${arrow(ts, ts0)}</span>` : ''}</div>${overpace() ? `<div class="meta warn">${L2('You are running well above your usual pace. Protect your rest.', 'تعمل فوق وتيرتك المعتادة بكثير. احمِ راحتك.')}</div>` : ''}` : ''}<div class="perf-top"><div class="perf-ring"><svg viewBox="0 0 80 80" width="84" height="84" aria-hidden="true"><circle cx="40" cy="40" r="34" class="bg"/><circle cx="40" cy="40" r="34" class="fg" stroke-dasharray="${((pct / 100) * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg><b>${t.due ? pct + '%' : '–'}</b></div>
      <div class="grow"><div class="title">${full ? L2('Perfect day 🎉', 'يوم مثالي 🎉') : t.due ? L2(`${t.done} of ${t.due} done today`, `${t.done} من ${t.due} اليوم`) : L2('Nothing due today', 'لا شيء مستحق اليوم')}</div>
      <div class="meta">${trend}${p.now !== null ? ` · ${L2('week', 'الأسبوع')} ${p.now}%` : ''}</div></div></div>
    <div class="pbars" aria-label="${L2('Last 7 days', 'آخر 7 أيام')}">${bars}</div>
    <div class="perf-foot"><span>🔥 <b>${best}</b> ${L2('best streak', 'أفضل سلسلة')}</span><span>🎯 <b>${active}</b> ${L2('active goals', 'أهداف نشطة')}</span>${S.cfg.dCharts ? `<button class="chip" data-action="toggle-ins">${L2('More charts', 'المزيد')}</button>` : ''}</div></div>`;
}
