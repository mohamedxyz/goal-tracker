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
/* GoalTerra Score, 0 to 1000, over the 14 days ending `shift` days ago. It is the product of four parts:
   C completion  = recency-weighted done / due (weight halves every 7 days)
   K consistency = share of days with something due where you reached at least 50%
   V volume      = min(1, ln(1+n) / ln(7)), n = average items done per day with something due (6 a day maxes it)
   T run         = (1 + ln(1+r) / ln(15)) / 2, r = longest run of days at 50% or better inside the window
   Score = 1000 x C x K x V x T. Perfect days, every day, 6+ items, give 1000. */
function perfScore(shift) {
  const ds14 = [...Array(14)].map((_, i) => dayScore(addDays(new Date(), i - 13 - (shift || 0)))),
    live = ds14.filter((x) => x.due);
  if (!live.length) return null;
  let wd = 0,
    wn = 0;
  ds14.forEach((x, i) => {
    const w = Math.pow(0.5, (13 - i) / 7);
    wd += w * x.due;
    wn += w * x.done;
  });
  let run = 0,
    r = 0;
  for (const x of ds14) {
    run = x.due && x.pct >= 50 ? run + 1 : x.due ? 0 : run;
    r = Math.max(r, run);
  }
  const C = wd ? wn / wd : 0,
    K = live.filter((x) => x.pct >= 50).length / live.length,
    n = live.reduce((a, x) => a + x.done, 0) / live.length,
    V = Math.min(1, Math.log(1 + n) / Math.log(7)),
    T = (1 + Math.log(1 + r) / Math.log(15)) / 2;
  return Math.round(1000 * C * K * V * T);
}
function scoreInfoText() {
  return L2(
    'GoalTerra Score (0 to 1000)\n\nScore = 1000 × C × K × V × T, over the last 14 days.\n\nC completion: done ÷ due, recent days count more (weight halves every 7 days).\nK consistency: share of days with something due where you reached 50% or more.\nV volume: ln(1+n) ÷ ln(7), n = items done per day (6 a day is the max).\nT run: longest run of 50%+ days, from 0.5 (none) to 1.0 (14 days).\n\nDoing more, more days in a row, scores higher. It measures follow-through, not how important your tasks are, and many tiny tasks can inflate it, so keep it honest.',
    'نتيجة GoalTerra (من 0 إلى 1000)\n\nالنتيجة = 1000 × C × K × V × T خلال آخر 14 يومًا.\n\nC الإنجاز: المنجز ÷ المستحق، والأيام الأحدث أثقل (يتناقص الوزن للنصف كل 7 أيام).\nK الاستمرارية: نسبة الأيام التي بلغت فيها 50% أو أكثر.\nV الحجم: ln(1+n) ÷ ln(7)، n = العناصر المنجزة يوميًا (6 يوميًا هو الأقصى).\nT السلسلة: أطول سلسلة أيام 50% فأكثر، من 0.5 (لا شيء) إلى 1.0 (14 يومًا).\n\nكلما أنجزت أكثر ولأيام متتالية ارتفعت النتيجة. تقيس الالتزام لا أهمية المهام، والمهام الصغيرة الكثيرة قد تضخّمها، فكن صادقًا.'
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
  const sc = perfScore(0),
    sc0 = perfScore(14),
    sd = sc !== null && sc0 !== null ? sc - sc0 : null;
  const trend =
    delta === null
      ? L2('Your first week. Keep going.', 'أسبوعك الأول. استمر.')
      : delta === 0
        ? L2('Same as last week', 'مثل الأسبوع الماضي')
        : delta > 0
          ? L2(`Up ${delta} points on last week`, `أفضل بـ ${delta} نقطة من الأسبوع الماضي`)
          : L2(`Down ${-delta} points on last week`, `أقل بـ ${-delta} نقطة من الأسبوع الماضي`);
  return `<div class="card perf ${full ? 'full' : ''}">
    ${sc !== null ? `<button class="perf-score" data-action="score-info" aria-label="${L2('How the score works', 'كيف تُحسب النتيجة')}"><span><small><span translate="no">GoalTerra</span> ${L2('Score', 'النتيجة')}</small><b>${sc}</b></span>${sd !== null && sd !== 0 ? `<em class="${sd > 0 ? 'up' : 'dn'}">${sd > 0 ? '▲' : '▼'} ${Math.abs(sd)}</em>` : ''}<u>ⓘ</u></button>` : ''}<div class="perf-top"><div class="perf-ring"><svg viewBox="0 0 80 80" width="84" height="84" aria-hidden="true"><circle cx="40" cy="40" r="34" class="bg"/><circle cx="40" cy="40" r="34" class="fg" stroke-dasharray="${((pct / 100) * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg><b>${t.due ? pct + '%' : '–'}</b></div>
      <div class="grow"><div class="title">${full ? L2('Perfect day 🎉', 'يوم مثالي 🎉') : t.due ? L2(`${t.done} of ${t.due} done today`, `${t.done} من ${t.due} اليوم`) : L2('Nothing due today', 'لا شيء مستحق اليوم')}</div>
      <div class="meta">${trend}${p.now !== null ? ` · ${L2('week', 'الأسبوع')} ${p.now}%` : ''}</div></div></div>
    <div class="pbars" aria-label="${L2('Last 7 days', 'آخر 7 أيام')}">${bars}</div>
    <div class="perf-foot"><span>🔥 <b>${best}</b> ${L2('best streak', 'أفضل سلسلة')}</span><span>🎯 <b>${active}</b> ${L2('active goals', 'أهداف نشطة')}</span>${S.cfg.dCharts ? `<button class="chip" data-action="toggle-ins">${L2('More charts', 'المزيد')}</button>` : ''}</div></div>`;
}
