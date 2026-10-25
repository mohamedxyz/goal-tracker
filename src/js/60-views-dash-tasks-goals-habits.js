/**
 * The main screens: Dashboard (viewDash), Tasks (viewTasks) with its calendar, Goals (viewGoals), Habits (viewHabits), and the Dashboard charts.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Dashboard visuals ---------- */
function dayActivity() {
  const m = {};
  for (const id of S.logs) {
    const d = id.slice(id.lastIndexOf('|') + 1);
    (m[d] || (m[d] = { h: 0, t: 0 })).h++;
  }
  for (const t of S.tasks) {
    if (t.done && t.doneAt) {
      const d = ds(new Date(t.doneAt));
      (m[d] || (m[d] = { h: 0, t: 0 })).t++;
    }
  }
  return m;
}
function heatmapCard() {
  const act = dayActivity();
  const now = new Date();
  const today = TODAY();
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  const start = addDays(monday, -25 * 7);
  let cells = '',
    months = '',
    total = 0,
    activeDays = 0,
    max = 0;
  for (let i = 0; i < 182; i++) {
    const k = ds(addDays(start, i));
    const a = act[k];
    if (a) max = Math.max(max, a.h + a.t);
  }
  let lastMonth = -1;
  for (let w = 0; w < 26; w++) {
    const colStart = addDays(start, w * 7);
    const firstOfMonth = [...Array(7)].map((_, j) => addDays(colStart, j)).find((d) => d.getDate() === 1);
    const mo = firstOfMonth || (w === 0 ? colStart : null);
    if (mo && mo.getMonth() !== lastMonth) {
      months += `<span>${fmt(mo, { month: 'short' })}</span>`;
      lastMonth = mo.getMonth();
    } else months += '<span></span>';
    for (let j = 0; j < 7; j++) {
      const d = addDays(colStart, j);
      const k = ds(d);
      if (k > today) {
        cells += '<i class="fut"></i>';
        continue;
      }
      const a = act[k] || { h: 0, t: 0 };
      const c = a.h + a.t;
      total += c;
      if (c) activeDays++;
      const lvl = c ? Math.max(1, Math.ceil((c / max) * 4)) : 0;
      const label = fmt(d, { weekday: 'short', month: 'short', day: 'numeric' });
      cells += `<i class="l${lvl} ${k === today ? 'tod' : ''}" data-tip="${label}: ${a.h} habit check-in${a.h === 1 ? '' : 's'}, ${a.t} task${a.t === 1 ? '' : 's'} done"></i>`;
    }
  }
  return `<div class="card vcard"><div class="vhead"><div class="title">Activity</div><div class="sub">Last 26 weeks</div></div>
    <div class="hm-months">${months}</div><div class="hm" role="img" aria-label="Activity heatmap: ${total} actions on ${activeDays} days">${cells}</div>
    <div class="hm-foot"><div class="meta"><span><b>${total}</b> actions</span><span><b>${activeDays}</b> active days</span></div>
    <div class="hm-legend">Less <i style="background:var(--h0)"></i><i style="background:var(--h1)"></i><i style="background:var(--h2)"></i><i style="background:var(--h3)"></i><i style="background:var(--h4)"></i> More</div></div></div>`;
}
function ringsCard() {
  const r = 26,
    C = 2 * Math.PI * r;
  const rings = Object.entries(HORIZONS)
    .map(([h, l]) => {
      const gs = S.goals.filter((g) => g.horizon === h && g.period === currentPeriod(h));
      const p = gs.length ? Math.round(gs.reduce((a, g) => a + progress(g), 0) / gs.length) : 0;
      const done = gs.filter((g) => g.done).length;
      return `<div class="ring" data-tip="${l} (${esc(currentPeriod(h))}): ${gs.length ? p + '% average across ' + gs.length + ' goal' + (gs.length > 1 ? 's' : '') : 'no goals set'}">
      <svg viewBox="0 0 64 64" aria-hidden="true"><circle class="rt" cx="32" cy="32" r="${r}"/>
      ${gs.length ? `<circle class="rv" cx="32" cy="32" r="${r}" stroke-dasharray="${((p / 100) * C).toFixed(1)} ${C.toFixed(1)}"/>` : ''}
      <text class="num" x="32" y="37" text-anchor="middle">${gs.length ? p + '%' : '–'}</text></svg>
      <div class="lbl">${l}</div><div class="cnt">${gs.length ? done + '/' + gs.length + ' done' : 'none yet'}</div></div>`;
    })
    .join('');
  return `<div class="card vcard"><div class="vhead"><div class="title">Goal progress</div><div class="sub">Current periods</div></div><div class="rings">${rings}</div></div>`;
}
function tasksChartCard() {
  const days = 14,
    W = 300,
    H = 130,
    pt = 14,
    pb = 20,
    gap = 2;
  const bw = W / days;
  const counts = [...Array(days)].map((_, i) => {
    const d = addDays(new Date(), i - (days - 1));
    const k = ds(d);
    return { d, k, n: S.tasks.filter((t) => t.done && t.doneAt && ds(new Date(t.doneAt)) === k).length };
  });
  const max = Math.max(1, ...counts.map((c) => c.n));
  const sum = counts.reduce((a, c) => a + c.n, 0);
  const base = H - pb,
    ph = base - pt;
  const bars = counts
    .map((c, i) => {
      const x = i * bw + gap / 2,
        w = bw - gap,
        h = c.n ? Math.max(4, (c.n / max) * ph) : 3,
        y = base - h,
        rr = Math.min(4, w / 2, h);
      const path = `M${x},${base}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${base}Z`;
      const lab = fmt(c.d, { weekday: 'short', month: 'short', day: 'numeric' });
      const ax =
        i % 2 === (days - 1) % 2
          ? `<text class="ax" x="${x + w / 2}" y="${H - 5}" text-anchor="middle">${c.d.getDate()}</text>`
          : '';
      return `<g data-tip="${lab}: ${c.n} task${c.n === 1 ? '' : 's'} completed"><rect class="hit" x="${i * bw}" y="0" width="${bw}" height="${base}"/><path class="bar ${c.n ? '' : 'zero'}" d="${path}"/>${ax}</g>`;
    })
    .join('');
  return `<div class="card vcard barchart"><div class="vhead"><div class="title">Tasks completed</div><div class="sub">${sum} in 14 days</div></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tasks completed per day, last 14 days, ${sum} total">${bars}<line class="base" x1="0" x2="${W}" y1="${base}" y2="${base}"/></svg></div>`;
}
function consistencyCard() {
  if (!S.habits.length)
    return `<div class="card vcard"><div class="vhead"><div class="title">Habit consistency</div><div class="sub">Last 30 days</div></div><div class="empty">Add habits to see consistency.</div></div>`;
  const mk = (hs, neg) =>
    hs
      .map((h) => ({ h, r: rate30(h), s: streak(h) }))
      .sort((a, b) => b.r - a.r)
      .map(
        ({ h, r, s }) =>
          `<div class="hbar ${neg ? 'neg' : ''}" data-tip="${esc(h.name)}: ${r}% ${neg ? 'clean' : 'done'} over the last 30 days, ${neg ? 'clean streak' : 'current streak'} ${s}"><div class="top"><span>${esc(h.name)}</span><span>${r}% ${neg ? 'clean · 🛡' : '· 🔥'}${s}</span></div>
     <div class="track"><div class="fill" style="width:${r}%"></div></div></div>`
      )
      .join('');
  const bl = S.habits.filter((h) => !isNeg(h)),
    av = S.habits.filter(isNeg);
  return `<div class="card vcard"><div class="vhead"><div class="title">Habit consistency</div><div class="sub">Last 30 days</div></div>${bl.length ? `<div class="hbars">${mk(bl, false)}</div>` : ''}${av.length ? `<div class="hsub">🛡 Staying clean</div><div class="hbars">${mk(av, true)}</div>` : ''}</div>`;
}
function viewDash() {
  const today = TODAY();
  const open = S.tasks.filter((t) => !t.done && !t.archived);
  const todays = S.tasks
    .filter((t) => !t.archived && (t.due === today || (S.cfg.dOverdue && !t.done && t.due && t.due < today)))
    .sort(
      (a, b) =>
        a.done - b.done ||
        ({ high: 0, med: 1, low: 2 }[a.priority] ?? 2) - ({ high: 0, med: 1, low: 2 }[b.priority] ?? 2)
    );
  const todaysDone = todays.filter((t) => t.done).length;
  const overdue = open.filter((t) => t.due && t.due < today).length;
  const dueHabits = S.habits.filter((h) => !isNeg(h) && dueToday(h)),
    hd = dueHabits.filter((h) => good(h, today)).length;
  const dueAvoid = S.habits.filter((h) => isNeg(h) && dueToday(h)),
    avOk = dueAvoid.filter((h) => good(h, today)).length;
  const active = S.goals.filter((g) => !g.done && g.status !== 'missed').length;
  const nRv = S.goals.filter(needsReview).length;
  const bld = S.habits.filter((h) => !isNeg(h)),
    avd = S.habits.filter(isNeg);
  const best = bld.length ? Math.max(...bld.map(streak)) : 0,
    bestClean = avd.length ? Math.max(...avd.map(streak)) : 0;
  const wk = S.goals.filter((g) => g.horizon === 'weekly' && g.period === currentPeriod('weekly'));
  const lb = daysSince(lastBackup());
  const openSlots = planTargets().reduce((a, g) => a + planLeft(g), 0),
    dow = new Date().getDay();
  const planCta = !wk.length || ((dow === 0 || dow === 1) && openSlots > 0);
  return `${sampleBanner()}${dayBanner()}${autoCard()}${backupNudge() ? `<div class="card backup-cta ${backupLevel() > 1 ? 'urgent' : ''}"><div class="grow"><div class="title">${lb === null ? 'No backup yet' : 'Last backup ' + agoText(lb)}</div><div class="meta">${backupLevel() > 1 ? 'If this browser clears its storage, everything since your last backup is gone. Back up now.' : 'Your data lives only in this browser. Save a backup and keep it somewhere safe.'}</div></div><button class="btn" data-action="backup-now">Back up now</button><button class="icon" data-action="backup-snooze" title="Remind me later" aria-label="Dismiss backup reminder">✕</button></div>` : ''}${nRv ? `<div class="card review-cta"><div class="grow"><div class="title">${nRv} goal${nRv > 1 ? 's' : ''} from past periods need${nRv > 1 ? '' : 's'} a review</div><div class="meta">Hit it, missed, or carry over. About a minute.</div></div><button class="btn" data-action="open-review">Review</button></div>` : ''}  <div class="grid2" style="margin-top:6px"><div>
    ${
      S.cfg.dTasks
        ? `<h2>Today's tasks</h2>${todays.length ? `<ul class="list">${todays.map(taskItem).join('')}</ul>` : `<div class="empty">Nothing due today.</div>`}
    ${overdue && !S.cfg.dOverdue ? `<button class="chip" style="margin-top:10px" data-action="see-overdue">${overdue} overdue from earlier days →</button>` : ''}`
        : ''
    }
    ${S.cfg.dGoals ? `<div class="h2row"><h2>This week's goals</h2><span class="hbtns"><button class="chip" data-action="open-plan">Plan this week</button><details class="chipmenu"><summary class="chip" aria-label="More">⋯</summary><div><button class="chip" data-action="open-report">Weekly report</button><button class="chip" data-action="open-month">Monthly review</button></div></details></span></div>${wk.length ? `<div class="goals">${wk.map(goalCard).join('')}</div>` : `<div class="empty">No weekly goals for ${currentPeriod('weekly')}.</div>`}` : ''}
  </div><div>
    ${S.cfg.dHabits ? `<h2>Today's habits</h2>${habitList(false)}` : ''}
  </div></div>
  ${planCta ? `<div class="card plan-cta"><div class="grow"><div class="title">${wk.length ? L2(`${openSlots} weekly slot${openSlots > 1 ? 's' : ''} still to plan`, `${openSlots} خانات أسبوعية للتخطيط`) : `Plan ${currentPeriod('weekly')}`}</div><div class="meta">${wk.length ? L2("Fill in this week's steps toward your monthly goals.", 'املأ خطوات هذا الأسبوع نحو أهدافك الشهرية.') : L2("No weekly goals yet. Pick this week's steps.", 'لا أهداف أسبوعية بعد. اختر خطوات هذا الأسبوع.')}</div></div><button class="btn" data-action="open-plan">Plan week</button></div>` : ''}${rpgCard()}<div class="stats dstats">
    <div class="card stat"><div class="n">${todaysDone}/${todays.length}</div><div class="l">Today's tasks done</div></div>
    <div class="card stat"><div class="n">${hd}/${dueHabits.length}</div><div class="l">Habits done today</div></div>
    <div class="card stat"><div class="n">${active}</div><div class="l">Active goals</div></div>
    <div class="card stat"><div class="n">🔥 ${best}</div><div class="l">Best habit streak</div></div>
    ${avd.length ? `<div class="card stat avoidstat"><div class="n">🛡 ${avOk}/${dueAvoid.length}</div><div class="l">Staying clean</div></div>` : ''}
  </div>
  ${coachCard()}
  ${studyCard()}
  ${
    S.cfg.dCharts
      ? `<button class="card insbtn" data-action="toggle-ins" aria-expanded="${!!S.insOpen}"><span>📊 Insights <small>activity, charts, habit consistency</small></span><span>${S.insOpen ? '▾' : '▸'}</span></button>
  ${
    S.insOpen
      ? `${heatmapCard()}
  <div class="split"><div>${tasksChartCard()}</div><div>${ringsCard()}</div></div>
  ${consistencyCard()}`
      : ''
  }`
      : ''
  }`;
}
const tagOf = (t) => (t.tag || '').trim();
function tagList(id) {
  return `<datalist id="${id}">${[...new Set(S.tasks.map(tagOf).filter(Boolean))]
    .sort()
    .map((n) => `<option value="${esc(n)}">`)
    .join('')}</datalist>`;
}
function taskGroups(open) {
  if (!S.cfg.groupTags) return `<ul class="list">${open.map(taskItem).join('')}</ul>`;
  const groups = new Map(),
    loose = [];
  for (const t of open) {
    const g = tagOf(t);
    if (g) {
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(t);
    } else loose.push(t);
  }
  let out = loose.length ? `<ul class="list">${loose.map(taskItem).join('')}</ul>` : '';
  for (const name of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
    const ts = groups.get(name),
      key = 'tag:' + name,
      collapsed = S.collapsed.has(key);
    const all = S.tasks.filter((t) => tagOf(t) === name && !t.archived);
    const dn = all.filter((t) => t.done).length;
    out += `<section class="hfolder ${collapsed ? 'collapsed' : ''}"><div class="hf-head"><button type="button" class="hf-toggle" data-action="toggle-folder" data-name="${esc(key)}" aria-expanded="${!collapsed}">
      <span class="hf-chev">${collapsed ? '▶' : '▼'}</span><span class="hf-name">#${esc(name)}</span></button><span class="hf-count">${dn}/${all.length}</span></div>
      <div class="hf-bar"><span style="width:${all.length ? Math.round((dn / all.length) * 100) : 0}%"></span></div>
      ${collapsed ? '' : `<ul class="list">${ts.map(taskItem).join('')}</ul>`}</section>`;
  }
  return out;
}
function viewTasks() {
  const showDone = S.cfg.showDone || S.taskFilter === 'done';
  const today = TODAY();
  const f = ['all', 'today', 'overdue', 'done'].includes(S.taskFilter) ? S.taskFilter : 'all';
  const pr = (t) => ({ high: 0, med: 1, low: 2 })[t.priority] ?? 2;
  const live = S.tasks.filter((t) => !t.archived);
  let list = live;
  if (f === 'today') list = list.filter((t) => t.due === today);
  if (f === 'overdue') list = list.filter((t) => !t.done && t.due && t.due < today);
  if (f === 'done') list = list.filter((t) => t.done);
  const byDue = (a, b) =>
    (a.due || '9999').localeCompare(b.due || '9999') ||
    (a.start || '99').localeCompare(b.start || '99') ||
    pr(a) - pr(b);
  const sorter =
    {
      due: byDue,
      prio: (a, b) => pr(a) - pr(b) || byDue(a, b),
      new: (a, b) => (b.created || 0) - (a.created || 0),
      az: (a, b) => a.title.localeCompare(b.title),
    }[S.cfg.sortBy] || byDue;
  const open = list.filter((t) => !t.done).sort(sorter);
  const done = list.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const nOver = live.filter((t) => !t.done && t.due && t.due < today).length;
  const chip = (k, l) =>
    `<button class="chip ${f === k ? 'on' : ''}" data-action="task-filter" data-v="${k}">${l}</button>`;
  return `<form class="add taskadd card" data-form="task">
    <div class="qa"><input type="text" name="title" placeholder="${L2('New task… try: tomorrow !high', 'مهمة جديدة… جرّب كتابة «غدًا»')}" required autocomplete="off" aria-describedby="qaHint"><button class="btn">Add</button></div>
    <div class="qa-hint" id="qaHint" aria-live="polite" hidden></div>
    <details class="more"><summary>More options</summary><div class="moreg">
    <input type="date" name="due" aria-label="Due date" value="${S.cfg.dueDef === 'none' ? '' : S.cfg.dueDef === 'tomorrow' ? ds(addDays(new Date(), 1)) : today}">
    <select name="priority" aria-label="Priority">${[
      ['low', 'Low'],
      ['med', 'Medium'],
      ['high', 'High'],
    ]
      .map(([v, l]) => `<option value="${v}" ${S.cfg.prio === v ? 'selected' : ''}>${l}</option>`)
      .join('')}</select>
    <select name="repeat" aria-label="Repeat">${REPEATS.map(([v, l]) => `<option value="${v}">${v ? '🔁 ' : ''}${l}</option>`).join('')}</select>
    <select name="goalId" aria-label="Weekly goal">${goalOptions('', (g) => g.horizon === 'weekly')}</select>
    <input type="text" name="tag" list="tagListAdd" placeholder="Tag folder (optional)" autocomplete="off">${tagList('tagListAdd')}
    <textarea name="notes" placeholder="Notes (optional)" style="min-height:40px"></textarea>
    <textarea name="items" placeholder="Checklist (optional, one item per line)" style="min-height:40px"></textarea>
    </div></details></form>
  ${
    S.planOn
      ? `<div class="filters"><button class="chip" data-action="tasks-plan">☰ List</button><button class="chip" data-action="tasks-cal">📅 Calendar</button></div>${planView()}`
      : S.tcalOn
        ? `<div class="filters"><button class="chip" data-action="tasks-cal">☰ List</button><button class="chip" data-action="tasks-plan">🕐 Plan</button></div>${calView()}`
        : `<div class="filters fbar"><div class="fscroll">${chip('all', 'All')}${chip('today', 'Due today')}${chip('overdue', 'Overdue' + (nOver ? ' · ' + nOver : ''))}${chip('done', 'Done')}</div><button class="chip ${selOn('tasks') ? 'on' : ''}" data-action="sel-mode" data-k="tasks" aria-pressed="${selOn('tasks')}">${selOn('tasks') ? '✓ Selecting' : '☑ Select'}</button><button class="chip" data-action="tasks-cal">📅 Calendar</button><button class="chip" data-action="tasks-plan">🕐 Plan</button></div>
  ${open.length ? taskGroups(open) : done.length && showDone ? '' : `<div class="empty">No tasks here.</div>`}
  ${done.length && showDone ? `${f === 'done' ? '' : `<button class="chip" style="margin-top:12px" data-action="toggle-done-list" aria-expanded="${!!S.doneOpen}">${S.doneOpen ? '▾' : '▸'} ${L2(done.length + ' done', done.length + ' منجزة')}</button>`}${f === 'done' || S.doneOpen ? `<ul class="list">${(S.doneAll ? done : done.slice(0, 40)).map(taskItem).join('')}</ul>` : ''}${done.length > 40 && (f === 'done' || S.doneOpen) ? `<button class="chip" style="margin-top:8px" data-action="toggle-done-all">${S.doneAll ? 'Show fewer' : 'Show all ' + done.length + ' completed'}</button>` : ''}` : ''}`
  }`;
}
/* ---------- Task calendar ---------- */
let tcal = null;
function calView() {
  const now = new Date(),
    today = TODAY();
  if (!tcal) tcal = { y: now.getFullYear(), m: now.getMonth(), sel: today };
  const due = {},
    done = {};
  for (const t of S.tasks) {
    if (t.archived && !t.done) continue;
    if (!t.done && t.due) (due[t.due] = due[t.due] || []).push(t);
    if (t.done && t.doneAt) {
      const k = ds(new Date(t.doneAt));
      (done[k] = done[k] || []).push(t);
    }
  }
  const first = new Date(tcal.y, tcal.m, 1),
    lead = (first.getDay() + 6) % 7,
    days = new Date(tcal.y, tcal.m + 1, 0).getDate();
  let cells = '<span></span>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const k = ds(new Date(tcal.y, tcal.m, d)),
      o = (due[k] || []).length,
      n = (done[k] || []).length,
      late = o && k < today;
    cells += `<button type="button" class="cd tcd ${k === today ? 'tod' : ''} ${tcal.sel === k ? 'sel' : ''} ${late ? 'late' : ''}" data-action="tcal-day" data-date="${k}" aria-label="${fmtDay(k)}: ${o} due, ${n} done"><span>${d}</span><span class="tcb">${o ? `<i class="cc o">${o}</i>` : ''}${n ? `<i class="cc d">✓${n}</i>` : ''}</span></button>`;
  }
  const wk = [...Array(7)]
    .map((_, i) => `<span>${fmt(new Date(2024, 0, 1 + i), { weekday: 'narrow' })}</span>`)
    .join('');
  const sel = tcal.sel,
    so = (due[sel] || []).sort(
      (a, b) => (({ high: 0, med: 1, low: 2 })[a.priority] ?? 2) - ({ high: 0, med: 1, low: 2 }[b.priority] ?? 2)
    ),
    sd = (done[sel] || []).sort((a, b) => a.doneAt - b.doneAt);
  return `<div class="card tcal"><div class="cal-nav"><button type="button" class="icon" data-action="tcal-month" data-d="-1" aria-label="Previous month">‹</button><b>${fmt(first, { month: 'long', year: 'numeric' })}</b><button type="button" class="icon" data-action="tcal-month" data-d="1" aria-label="Next month">›</button></div>
    <div class="cal cal-wk">${wk}</div><div class="cal">${cells}</div>
    ${tcal.y !== now.getFullYear() || tcal.m !== now.getMonth() ? `<button class="chip" style="margin-top:10px" data-action="tcal-today">Today</button>` : ''}</div>
  <div class="h2row"><h2>${fmtDay(sel)}</h2><span class="meta">${so.length} due · ${sd.length} done</span></div>
  <form class="ladd" data-form="caltask" data-date="${sel}"><input type="text" name="title" placeholder="Add a task on this day…" required autocomplete="off"><button class="chip">Add</button></form>
  ${so.length ? `<ul class="list">${so.map(taskItem).join('')}</ul>` : ''}
  ${sd.length ? `<div class="divider">Finished this day · ${sd.length}</div><ul class="list">${sd.map(taskItem).join('')}</ul>` : ''}
  ${!so.length && !sd.length ? `<div class="empty">Nothing on this day.</div>` : ''}`;
}
function viewGoals() {
  const ladder = S.horizon === 'ladder',
    h = ladder ? 'weekly' : S.horizon;
  const cur = currentPeriod(h);
  const ph = PARENT[h];
  let list = S.goals.filter((g) => g.horizon === h);
  if (S.goalScope === 'current') list = list.filter((g) => g.period === cur || needsReview(g));
  list.sort(
    (a, b) =>
      needsReview(b) - needsReview(a) ||
      a.done - b.done ||
      (a.status === 'missed') - (b.status === 'missed') ||
      b.period.localeCompare(a.period)
  );
  const defKind = h === 'weekly' ? 'check' : 'rollup';
  const seg =
    `<button class="${ladder ? 'on' : ''}" data-action="horizon" data-v="ladder">🪜 Ladder</button>` +
    Object.keys(HORIZONS)
      .map(
        (k) =>
          `<button class="${!ladder && k === h ? 'on' : ''}" data-action="horizon" data-v="${k}">${{ weekly: 'Week', monthly: 'Month', annual: 'Year', five: '5 Years' }[k]}</button>`
      )
      .join('');
  return `<div class="seg">${seg}</div>
  <form class="add taskadd card" data-form="goal" data-kind="${defKind}">
    <div class="qa"><input type="text" name="title" placeholder="New ${HORIZONS[h].toLowerCase()} goal…" required><button class="btn">Add</button></div>
    <details class="more"><summary>More options</summary><div class="moreg">
    <input type="text" name="period" value="${cur}" style="flex:0 1 130px" title="Period">
    <select name="kind" title="How will you measure it?"><option value="check" ${defKind === 'check' ? 'selected' : ''}>☐ Checkbox</option><option value="number">🔢 Number target</option>${h !== 'weekly' ? `<option value="rollup" selected>🧩 Built from ${HORIZONS[CHILD[h]].toLowerCase()} goals</option>` : ''}</select>
    <span class="f-num"><input type="number" name="target" min="0" step="any" placeholder="Target, e.g. 40" style="flex:1 1 120px"><input type="text" name="unit" placeholder="Unit, e.g. hours" style="flex:1 1 120px"></span>
    ${h !== 'weekly' ? `<span class="f-roll"><input type="number" name="expected" min="1" step="1" placeholder="How many ${HORIZONS[CHILD[h]].toLowerCase()} goals? (default ${defaultExpected({ horizon: h, period: cur })})" style="flex:1 1 100%"></span>` : ''}
    ${ph ? `<select name="parentId" aria-label="Parent goal">${goalOptions('', (g) => g.horizon === ph).replace('— No goal —', '— Supports which ' + HORIZONS[ph].toLowerCase() + ' goal? —')}</select>` : ''}
    <textarea name="notes" placeholder="Why it matters / how you'll measure it (optional)"></textarea>
    </div></details></form>
  ${ladder ? towerCard() + weekSummary() : ''}
  <div class="filters">
    <button class="chip ${S.goalScope === 'current' ? 'on' : ''}" data-action="goal-scope" data-v="current" title="${cur}">Current</button>
    <button class="chip ${S.goalScope === 'all' ? 'on' : ''}" data-action="goal-scope" data-v="all">All periods</button>${h === 'weekly' ? '<button class="chip" data-action="open-plan">Plan this week</button>' : ''}</div>
  ${ladder ? ladderView() || `<div class="empty">No goals yet. Add one above, then hang tasks under it.</div><div class="tpls" style="margin-top:12px">${templateButtons()}</div>` : list.length ? `<div class="goals">${list.map(goalCard).join('')}</div>` : `<div class="empty">No ${HORIZONS[h].toLowerCase()} goals yet.</div>`}`;
}
function viewHabits() {
  return `<details class="more habadd" ${S.habits.length ? '' : 'open'}><summary>+ New habit</summary><form class="add" data-form="habit">
    <input type="text" name="name" placeholder="New habit (e.g. Code 1 hour, or No smoking)…" required>
    <select name="kind" aria-label="Habit type"><option value="">✅ Build: tick it when done</option><option value="avoid">${S.cfg.avoidMode === 'confirm' ? '🚫 Avoid: tick each clean day' : '🚫 Avoid: clean unless you slip'}</option></select>
    <select name="target" title="Target days per week">${[7, 6, 5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n}×/week</option>`).join('')}</select>
    <input type="text" name="group" list="folderListAdd" placeholder="Folder (optional), e.g. Morning routine" style="flex:1 1 200px" autocomplete="off">${folderList('folderListAdd')}
    ${dayPicker()}
    <button class="btn">Add habit</button></form></details>
  ${habitList(true)}`;
}
// Shared by the dashboard and Habits tab; honours the "hide done today" switch.
// Dashboard row: just today — one big check button, streak and weekly progress.
function habitToday(h) {
  const k = TODAY(),
    on = good(h, k),
    s = streak(h);
  return `<li class="item ${on ? 'done' : ''}">
    <button class="tcheck ${on ? 'on' : ''}" data-action="toggle-log" data-id="${h.id}" data-date="${k}" aria-pressed="${on}" aria-label="${slipMode(h) ? (on ? 'Clean today. Tap to log a slip' : 'Slipped today. Tap to undo') : (on ? 'Undo' : 'Check off') + ' ' + esc(h.name) + ' for today'}">${slipMode(h) && !on ? '✗' : '✓'}</button>
    <div class="grow habit-open" data-action="open-habit" data-id="${h.id}" role="button" tabindex="0" title="Open history">
      <div class="title">${hname(h)} <span class="chev">›</span></div>
      <div class="meta"><span>${isNeg(h) ? '🛡 ' + s + ' day' + (s === 1 ? '' : 's') + ' clean' : '🔥 ' + s + ' day' + (s === 1 ? '' : 's')}</span><span>This week ${weekCount(h)}/${weekTarget(h)}</span></div></div></li>`;
}
function habitList(full) {
  const hideIt = (h) => S.hideDone && !(isNeg(h) && !S.cfg.avoidHide) && good(h, TODAY());
  if (!S.habits.length) return `<div class="empty">No habits yet.${full ? ' Tap a day to check it off.' : ''}</div>`;
  const today = TODAY(),
    dueAll0 = sortedHabits().filter(dueToday),
    dueAll = full ? dueAll0 : dueAll0.filter((h) => !isNeg(h)),
    doneToday = dueAll.filter((h) => good(h, today)).length;
  const avoids = full ? [] : dueAll0.filter(isNeg);
  const pool = full ? sortedHabits() : dueAll,
    offToday = S.habits.length - dueAll0.length;
  if (!pool.length && avoids.length) return avoidSection(avoids);
  if (!pool.length)
    return `<div class="empty">Nothing due today. ${offToday} habit${offToday > 1 ? 's' : ''} off.</div>`;
  const bar = `<div class="filters"><button class="chip ${S.hideDone ? 'on' : ''}" data-action="toggle-hide-done" aria-pressed="${S.hideDone}">${S.hideDone ? '✓ Hiding done today' : 'Hide done today'}</button>
    ${full ? `<button class="chip ${selOn('habits') ? 'on' : ''}" data-action="sel-mode" data-k="habits" aria-pressed="${selOn('habits')}">${selOn('habits') ? '✓ Selecting' : '☑ Select'}</button><button class="chip ${S.compact ? 'on' : ''}" data-action="toggle-compact" aria-pressed="${S.compact}">${S.compact ? '✓ Compact' : 'Compact'}</button><button class="chip ${S.reorder ? 'on' : ''}" data-action="toggle-reorder" aria-pressed="${!!S.reorder}">${S.reorder ? '✓ Reordering' : '↕ Reorder'}</button>` : ''}
    <span class="meta" style="align-self:center">${doneToday}/${dueAll.length} due done${offToday ? ` · ${offToday} off today` : ''}${S.hideDone && doneToday ? ` · ${doneToday} hidden` : ''}</span></div>`;
  const wrap = (hs) =>
    full
      ? `<div class="goals">${hs.map((h) => habitCard(h, true)).join('')}</div>`
      : `<ul class="list">${hs.map(habitToday).join('')}</ul>`;
  const grp = (list) => {
    let out = '';
    const groups = new Map(),
      loose = [];
    for (const h of list) {
      const g = folderOf(h);
      if (g) {
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(h);
      } else loose.push(h);
    }
    const gnames = [...groups.keys()].sort((a, b) => {
      const x = S.forder.indexOf(a),
        y = S.forder.indexOf(b);
      return (x < 0 ? 1e6 : x) - (y < 0 ? 1e6 : y);
    });
    for (const name of gnames) {
      const hs = groups.get(name);
      const due = hs.filter(dueToday),
        done = due.filter((h) => good(h, today)).length,
        all = due.length > 0 && done === due.length,
        collapsed = S.collapsed.has(name);
      const vis = hs.filter((h) => !hideIt(h));
      if (S.hideDone && !vis.length) continue;
      out += `<section class="hfolder ${all ? 'complete' : ''} ${collapsed || !vis.length ? 'collapsed' : ''}">
      <div class="hf-head"><button type="button" class="hf-toggle" data-action="toggle-folder" data-name="${esc(name)}" aria-expanded="${!collapsed}">
        <span class="hf-chev">${collapsed ? '▶' : '▼'}</span><span class="hf-name">${all ? '✓ ' : ''}${esc(name)}</span></button>
        <span class="hf-count">${all ? 'All done' : due.length ? done + '/' + due.length : 'Off today'}</span>
        ${full ? mvBtns('move-folder', '', `data-name="${esc(name)}"`) : ''}
        <button type="button" class="icon" data-action="rename-folder" data-name="${esc(name)}" title="Rename folder" aria-label="Rename folder">✎</button></div>
      <div class="hf-bar"><span style="width:${due.length ? Math.round((done / due.length) * 100) : 0}%"></span></div>
      ${collapsed || !vis.length ? '' : wrap(vis)}</section>`;
    }
    const looseVis = loose.filter((h) => !hideIt(h));
    if (looseVis.length) out += wrap(looseVis);
    return out;
  };
  let out = '';
  const bl = pool.filter((h) => !isNeg(h)),
    al = pool.filter(isNeg);
  if (full && al.length) {
    const bd = bl.filter(dueToday),
      bdn = bd.filter((h) => good(h, today)).length,
      ad = al.filter(dueToday),
      adn = ad.filter((h) => good(h, today)).length;
    if (bl.length)
      out +=
        `<div class="h2row hsec"><h2>✅ Build</h2><span class="meta">${bdn}/${bd.length} done today</span></div>` +
        grp(bl);
    out +=
      `<div class="h2row hsec"><h2>🛡 Avoid</h2><span class="meta">${adn}/${ad.length} clean today</span></div>` +
      grp(al);
  } else out = grp(pool);
  if (S.hideDone && dueAll.length && doneToday === dueAll.length)
    out += `<div class="allclear">All habits done for today 🎉</div>`;
  return bar + out + (avoids.length ? avoidSection(avoids) : '');
}
function avoidSection(hs) {
  const t = TODAY(),
    vis = hs.filter((h) => !(S.hideDone && S.cfg.avoidHide && good(h, t)));
  const ok = hs.filter((h) => good(h, t)).length;
  return `<section class="avoidsec"><div class="av-head"><span>🛡 Staying clean</span><span class="meta">${ok}/${hs.length} clean today</span></div>
    <ul class="list">${vis.map(avoidToday).join('')}</ul></section>`;
}
function avoidToday(h) {
  const k = TODAY(),
    on = good(h, k),
    s = streak(h),
    slip = slipMode(h);
  const state = slip ? (on ? 'Clean so far today' : 'Slipped today') : on ? 'Held today' : 'Not confirmed yet';
  const btn = slip ? (on ? 'Log slip' : 'Undo slip') : on ? 'Undo' : 'Mark avoided';
  return `<li class="item avoid ${on ? 'clean' : 'slipped'}">
    <div class="grow habit-open" data-action="open-habit" data-id="${h.id}" role="button" tabindex="0" title="Open history">
      <div class="title">${hname(h)} <span class="chev">›</span></div>
      <div class="meta"><span class="avstate">${on ? '🛡' : '⚠'} ${state}</span><span>${s} day${s === 1 ? '' : 's'} clean streak</span></div></div>
    <button class="chip avbtn ${on ? '' : 'on'}" data-action="toggle-log" data-id="${h.id}" data-date="${k}" aria-label="${btn}: ${esc(h.name)}">${btn}</button></li>`;
}
