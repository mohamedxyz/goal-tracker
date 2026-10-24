/**
 * Weekly report, monthly review, search, sharing with friends, and backup and restore.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Weekly report ---------- */
const rep_ = { off: 0 };
function weekData(off) {
  const now = new Date();
  const mon = addDays(now, -((now.getDay() + 6) % 7) + off * 7);
  mon.setHours(0, 0, 0, 0);
  const days = [...Array(7)].map((_, i) => addDays(mon, i));
  const a = ds(days[0]),
    z = ds(days[6]),
    today = TODAY();
  const t0 = days[0].getTime(),
    t1 = addDays(days[6], 1).getTime();
  const done = S.tasks.filter((t) => t.done && t.doneAt >= t0 && t.doneAt < t1);
  const missed = S.tasks.filter((t) => !t.done && t.due && t.due >= a && t.due <= z && t.due < today && !t.archived);
  const habits = S.habits
    .map((h) => {
      const born = ds(new Date(h.created || 0));
      let due = 0,
        n = 0;
      for (const d of days) {
        const k = ds(d);
        if (k > today || k < born) continue;
        if (isDue(h, d)) {
          due++;
          if (good(h, k)) n++;
        } else if (good(h, k)) {
          due++;
          n++;
        }
      }
      return { h, due, n };
    })
    .filter((x) => x.due);
  const wk = isoWeek(days[0]);
  const goals = S.goals.filter((g) => g.horizon === 'weekly' && g.period === wk);
  const finished = S.goals.filter((g) => g.done && g.doneAt >= t0 && g.doneAt < t1);
  const study = S.cfg.student ? { ...studyWeek(a, z), exams: S.exams.filter((e) => e.date >= a && e.date <= z) } : null;
  const by = doneByDay(),
    lv = [0, 0, 0, 0];
  for (const d of days) {
    const k = ds(d);
    if (k > today) continue;
    const n = (by[k] || []).length;
    lv[n ? tierOf(n) + 1 : 0]++;
  }
  let focus = 0;
  for (const t of S.tasks) for (const f of t.focusLog || []) if (f.at >= t0 && f.at < t1) focus += f.m;
  const boss = rpgOn() ? rpgAll().weeks.find((x) => x.key === wk) || null : null;
  return { days, a, z, done, missed, habits, goals, finished, study, lv, focus, boss, wk };
}
function levelRow(lv) {
  return `<div class="lvrow"><span>⚡ ${lv[1]} <small>${L2('Spark', 'شرارة')}</small></span><span>🔥 ${lv[2]} <small>${L2('Blaze', 'لهب')}</small></span><span>⚔️ ${lv[3]} <small>${L2('Titan', 'جبّار')}</small></span><span>· ${lv[0]} <small>${L2('none', 'بلا')}</small></span></div>`;
}
function bossRow(key, b) {
  if (!b) return '';
  const m = monster(key);
  return `<div class="kv"><span><span translate="no">${m.name}</span> · ${m.title}</span><span class="pill sm ${b.won ? 'ok' : ''}">${b.won ? L2('Defeated', 'هُزم') : b.key === rpgAll().cur.key ? `${b.total}/${b.hp}` : L2('Escaped', 'هرب')}</span></div>`;
}
function drawReport() {
  const w = weekData(rep_.off);
  const hd = w.habits.reduce((x, y) => x + y.due, 0),
    hn = w.habits.reduce((x, y) => x + y.n, 0);
  const rate = hd ? Math.round((hn / hd) * 100) : 0;
  const stat = (n, l) =>
    `<div class="card" style="text-align:center;padding:10px"><div style="font-size:24px;font-weight:700">${n}</div><div class="meta" style="justify-content:center">${l}</div></div>`;
  const label =
    rep_.off === 0
      ? 'This week'
      : rep_.off === -1
        ? 'Last week'
        : fmt(w.days[0], { month: 'short', day: 'numeric' }) +
          ' – ' +
          fmt(w.days[6], { month: 'short', day: 'numeric' });
  dlg.innerHTML = `<form method="dialog" data-report><h3>Weekly report</h3>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <button type="button" class="icon" data-action="rep-nav" data-d="-1" aria-label="Previous week">‹</button><b>${label}</b>
      <button type="button" class="icon" data-action="rep-nav" data-d="1" aria-label="Next week" ${rep_.off >= 0 ? 'disabled' : ''}>›</button></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${stat(w.done.length, 'tasks done')}${stat(w.missed.length, 'tasks missed')}${stat(hd ? rate + '%' : '—', 'habits')}</div>
    <h2 style="margin-top:14px">Day levels</h2>${levelRow(w.lv)}
    ${w.focus ? `<div class="kv"><span>Focus time</span><span>${fmtMin(w.focus)}</span></div>` : ''}
    ${w.boss ? `<h2 style="margin-top:14px">Week boss</h2>${bossRow(w.wk, w.boss)}` : ''}
    ${w.habits.length ? `<h2 style="margin-top:14px">Habits</h2>${w.habits.map((x) => `<div class="kv"><span>${esc(x.h.name)}</span><span>${x.n}/${x.due}</span></div>`).join('')}` : ''}
    ${w.goals.length ? `<h2 style="margin-top:14px">Weekly goals</h2>${w.goals.map((g) => `<div class="kv"><span>${esc(g.title)}</span><span>${g.done ? '✓ done' : Math.round(progress(g)) + '%'}</span></div>`).join('')}` : ''}
    ${w.finished.length ? `<h2 style="margin-top:14px">Goals finished</h2>${w.finished.map((g) => `<div class="kv"><span>${esc(g.title)}</span><span>${HORIZONS[g.horizon]}</span></div>`).join('')}` : ''}
    ${
      w.missed.length
        ? `<h2 style="margin-top:14px">Missed tasks</h2>${w.missed
            .slice(0, 8)
            .map((t) => `<div class="kv"><span>${esc(t.title)}</span><span>${fmtDate(t.due)}</span></div>`)
            .join('')}`
        : ''
    }
    ${w.study && (w.study.sessions || w.study.exams.length) ? `<h2 style="margin-top:14px">Study</h2><div class="kv"><span>Study sessions</span><span>${w.study.sessions}</span></div><div class="kv"><span>Topics studied</span><span>${w.study.topics}</span></div>${w.study.exams.map((e) => `<div class="kv"><span>${e.kind === 'quiz' ? '❓' : '📝'} ${esc(e.title)}</span><span>${e.score != null ? e.score + (e.max ? '/' + e.max : '') : fmtDate(e.date)}</span></div>`).join('')}` : ''}
    ${!w.done.length && !w.habits.length && !w.goals.length && !w.missed.length && !(w.study && (w.study.sessions || w.study.exams.length)) ? '<div class="empty">Nothing recorded this week.</div>' : ''}
    <div class="dlg-actions"><button class="ghost" value="cancel" formnovalidate>Close</button></div></form>`;
}
/* ---------- Monthly review ---------- */
const mrev = { off: 0 };
function monthData(off) {
  const now = new Date(),
    f = new Date(now.getFullYear(), now.getMonth() + off, 1),
    l = new Date(f.getFullYear(), f.getMonth() + 1, 0),
    a = ds(f),
    z = ds(l),
    today = TODAY(),
    mk = a.slice(0, 7);
  const t0 = f.getTime(),
    t1 = addDays(l, 1).getTime(),
    done = S.tasks.filter((t) => t.done && t.doneAt >= t0 && t.doneAt < t1);
  const missed = S.tasks.filter((t) => !t.done && t.due && t.due >= a && t.due <= z && t.due < today && !t.archived);
  let hd = 0,
    hn = 0;
  for (const h of S.habits) {
    const born = bornK(h);
    for (let d = new Date(f); d <= l; d = addDays(d, 1)) {
      const k = ds(d);
      if (k > today || k < born) continue;
      if (isDue(h, d)) {
        hd++;
        if (good(h, k)) hn++;
      }
    }
  }
  const by = doneByDay(),
    lv = [0, 0, 0, 0],
    wkc = {};
  for (let d = new Date(f); d <= l; d = addDays(d, 1)) {
    const k = ds(d);
    if (k > today) continue;
    const n = (by[k] || []).length;
    lv[n ? tierOf(n) + 1 : 0]++;
    const w = isoWeek(d);
    wkc[w] = (wkc[w] || 0) + n;
  }
  const best = Object.entries(wkc).sort((x, y) => y[1] - x[1])[0];
  let focus = 0;
  for (const t of S.tasks) for (const fl of t.focusLog || []) if (fl.at >= t0 && fl.at < t1) focus += fl.m;
  const fin = S.goals.filter((g) => g.done && g.doneAt >= t0 && g.doneAt < t1),
    mg = S.goals.filter((g) => g.horizon === 'monthly' && g.period === mk);
  const guard = rpgOn() ? rpgTower().months.find((m) => m.key === mk) || null : null;
  return { f, mk, done, missed, hd, hn, lv, best, focus, fin, mg, guard };
}
function drawMonth() {
  const m = monthData(mrev.off),
    stat = (n, l) =>
      `<div class="card" style="text-align:center;padding:10px"><div style="font-size:22px;font-weight:700">${n}</div><div class="meta" style="justify-content:center">${l}</div></div>`;
  const byH = (h) => m.fin.filter((g) => g.horizon === h).length;
  dlg.innerHTML = `<form method="dialog" data-report><h3>Monthly review</h3>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <button type="button" class="icon" data-action="mrev-nav" data-d="-1" aria-label="Previous month">‹</button><b>${fmt(m.f, { month: 'long', year: 'numeric' })}</b>
      <button type="button" class="icon" data-action="mrev-nav" data-d="1" aria-label="Next month" ${mrev.off >= 0 ? 'disabled' : ''}>›</button></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${stat(m.done.length, 'tasks done')}${stat(m.missed.length, 'tasks missed')}${stat(m.hd ? Math.round((m.hn / m.hd) * 100) + '%' : '—', 'habits')}</div>
    <h2 style="margin-top:14px">Day levels</h2>${levelRow(m.lv)}
    ${m.focus ? `<div class="kv"><span>Focus time</span><span>${fmtMin(m.focus)}</span></div>` : ''}
    ${m.best && m.best[1] ? `<div class="kv"><span>Best week</span><span>${m.best[0]} · ${m.best[1]} ${L2('tasks', 'مهام')}</span></div>` : ''}
    ${
      m.fin.length
        ? `<h2 style="margin-top:14px">Goals finished</h2>${['weekly', 'monthly', 'annual', 'five']
            .filter(byH)
            .map((h) => `<div class="kv"><span>${HORIZONS[h]}</span><span>${byH(h)}</span></div>`)
            .join('')}`
        : ''
    }
    ${m.mg.length ? `<h2 style="margin-top:14px">This month's goals</h2>${m.mg.map((g) => `<div class="kv"><span>${esc(g.title)}</span><span>${g.done ? '✓ done' : Math.round(progress(g)) + '%'}</span></div>`).join('')}` : ''}
    ${m.guard ? `<h2 style="margin-top:14px">Guardian</h2><div class="kv"><span><span translate="no">${monster('M:' + m.mk).name}</span> · ${guardianTitle(m.mk)}</span><span class="pill sm ${m.guard.won ? 'ok' : ''}">${m.guard.won ? L2('Defeated', 'هُزم') : m.guard.past ? L2('Escaped', 'هرب') : `${Math.min(m.guard.dmg, m.guard.hp)}/${m.guard.hp}`}</span></div>` : ''}
    <div class="dlg-actions"><button class="ghost" value="cancel" formnovalidate>Close</button></div></form>`;
}
/* ---------- Search ---------- */
function searchResults(q) {
  q = q.trim().toLowerCase();
  if (!q) return '<div class="empty">Type to search tasks, goals and habits.</div>';
  const has = (...a) =>
    a.some((x) =>
      String(x || '')
        .toLowerCase()
        .includes(q)
    );
  const row = (k, id, main, sub) =>
    `<button type="button" class="srow" data-sr="${k}:${id}"><b>${main}</b><span>${sub}</span></button>`;
  const tasks = S.tasks
    .filter((t) => has(t.title, t.notes, t.tag, (t.items || []).map((i) => i.text).join(' ')))
    .slice(0, 30)
    .map((t) =>
      row(
        'task',
        t.id,
        esc(t.title),
        (t.archived ? 'Archived task' : t.done ? 'Done task' : 'Task') + (t.due ? ' · ' + fmtDate(t.due) : '')
      )
    );
  const goals = S.goals
    .filter((g) => has(g.title, g.notes, g.lesson))
    .slice(0, 30)
    .map((g) =>
      row('goal', g.id, esc(g.title), HORIZONS[g.horizon] + ' goal · ' + esc(g.period) + (g.done ? ' · done' : ''))
    );
  const habits = S.habits
    .filter((h) => has(h.name, h.group))
    .slice(0, 30)
    .map((h) => row('habit', h.id, esc(h.name), 'Habit' + (h.group ? ' · ' + esc(h.group) : '')));
  const topics = S.cfg.student
    ? S.topics
        .filter((t) => has(t.name, t.subject))
        .slice(0, 30)
        .map((t) => row('topic', t.id, esc(t.name), 'Topic · ' + esc(t.subject)))
    : [];
  const exams = S.cfg.student
    ? S.exams
        .filter((e) => has(e.title, e.subject, e.notes))
        .slice(0, 20)
        .map((e) => row('exam', e.id, esc(e.title), (e.kind === 'quiz' ? 'Quiz' : 'Exam') + ' · ' + fmtDate(e.date)))
    : [];
  const all = [...tasks, ...goals, ...habits, ...topics, ...exams];
  return all.length ? all.join('') : '<div class="empty">Nothing found.</div>';
}
function openSearch() {
  dlg.innerHTML = `<form method="dialog" data-search><h3>Search</h3>
    <input type="search" name="q" placeholder="Search everything…" autocomplete="off" aria-label="Search">
    <div id="srList" class="srlist">${searchResults('')}</div>
    <div class="dlg-actions"><button class="ghost" value="cancel" formnovalidate>Close</button></div></form>`;
  dlg.showModal();
  dlg.querySelector('input').focus();
}
dlg.addEventListener('input', (e) => {
  if (e.target.name !== 'q' || !('search' in e.target.form.dataset)) return;
  $('#srList').innerHTML = searchResults(e.target.value);
});
dlg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.form && 'search' in e.target.form.dataset) e.preventDefault();
});
dlg.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sr]');
  if (!b) return;
  const [k, id] = b.dataset.sr.split(':');
  openEdit(k, id);
});
$('#searchBtn').addEventListener('click', openSearch);
/* ---------- Share with friends (JSON) ---------- */
const SHARE_APP = 'goal-tracker-share';
const SHARE_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg>';
const shareBtn = (k, id) =>
  `<button class="icon" data-action="share-item" data-k="${k}" data-id="${id}" title="Share" aria-label="Share">${SHARE_ICON}</button>`;
function shareRows(key, label, arr, nameOf, sub, chk) {
  return arr.length
    ? `<h2 style="margin:12px 0 4px">${label}</h2>${arr.map((x) => `<label class="check"><input type="checkbox" data-sh-item="${key}:${x.id}" ${chk ? 'checked' : ''}> <span>${esc(nameOf(x))}${sub ? ` <small class="meta">${esc(sub(x) || '')}</small>` : ''}</span></label>`).join('')}`
    : '';
}
function openShare(pre) {
  const one = pre ? pre.split(':') : null,
    only = (k, arr) => (one ? (one[0] === k ? arr.filter((x) => x.id === one[1]) : []) : arr);
  const tasks = only(
      'task',
      S.tasks.filter((t) => (one ? true : !t.archived && !t.done))
    ),
    habitsL = only('habit', S.habits),
    examsL = only('exam', S.exams),
    topicsL = only('topic', S.topics);
  dlg.innerHTML = `<form method="dialog" data-share><h3>Share items</h3><p class="meta">Tick what to send. Only titles, dates, notes and settings are shared.</p>
    <div style="max-height:46vh;overflow:auto">${shareRows(
      'habit',
      'Habits',
      habitsL,
      (h) => (h.kind === 'avoid' ? '🚫 ' : '') + h.name,
      (h) => h.group,
      !!one
    )}
    ${shareRows(
      'task',
      'Tasks and homework',
      tasks,
      (t) => t.title,
      (t) => (t.due ? fmtDate(t.due) : ''),
      !!one
    )}
    ${shareRows(
      'exam',
      'Exams and quizzes',
      examsL,
      (e) => (e.kind === 'quiz' ? '❓ ' : '📝 ') + e.title,
      (e) => (e.subject ? e.subject + ' · ' + fmtDate(e.date) : fmtDate(e.date)),
      !!one
    )}
    ${shareRows(
      'topic',
      'Study topics',
      topicsL,
      (t) => t.name,
      (t) => t.subject,
      !!one
    )}
    ${habitsL.length + tasks.length + examsL.length + topicsL.length ? '' : '<div class="empty">Nothing to share yet.</div>'}</div>
    <div class="row" style="margin-top:10px">${one ? '<button type="button" class="chip" data-sh="more">More items…</button>' : '<button type="button" class="chip" data-sh="all">Select all</button><button type="button" class="chip" data-sh="none">Clear</button>'}</div>
    <div class="dlg-actions" style="flex-wrap:wrap"><button class="ghost" value="cancel" formnovalidate>Close</button>
      <button type="button" class="ghost" data-sh="file">Save file</button><button type="button" class="ghost" data-sh="copy">Copy text</button>${navigator.share || window.GTNative ? '<button type="button" class="btn" data-sh="send">Share…</button>' : ''}</div></form>`;
  dlg.showModal();
}
function sharePayload() {
  const picked = [...dlg.querySelectorAll('[data-sh-item]:checked')].map((c) => c.dataset.shItem.split(':'));
  const out = { app: SHARE_APP, version: 1, habits: [], tasks: [], exams: [], topics: [] };
  for (const [k, id] of picked) {
    if (k === 'habit') {
      const h = S.habits.find((x) => x.id === id);
      if (h)
        out.habits.push({
          name: h.name,
          kind: h.kind || '',
          mode: h.mode || '',
          target: h.target || 7,
          days: h.days || [],
          group: h.group || '',
        });
    }
    if (k === 'task') {
      const t = S.tasks.find((x) => x.id === id);
      if (t)
        out.tasks.push({
          title: t.title,
          notes: t.notes || '',
          items: (t.items || []).map((i) => i.text),
          due: t.due || null,
          priority: t.priority || 'low',
          repeat: t.repeat || '',
          tag: t.tag || '',
        });
    }
    if (k === 'exam') {
      const e = S.exams.find((x) => x.id === id);
      if (e)
        out.exams.push({
          kind: e.kind,
          title: e.title,
          subject: e.subject || '',
          date: e.date,
          time: e.time || '',
          notes: e.notes || '',
        });
    }
    if (k === 'topic') {
      const t = S.topics.find((x) => x.id === id);
      if (t) out.topics.push({ subject: t.subject, name: t.name });
    }
  }
  return out;
}
const sharedCount = (o) => o.habits.length + o.tasks.length + o.exams.length + o.topics.length;
async function shareDo(a) {
  if (a === 'more') {
    openShare();
    return;
  }
  if (a === 'all' || a === 'none') {
    dlg.querySelectorAll('[data-sh-item]').forEach((c) => (c.checked = a === 'all'));
    return;
  }
  const o = sharePayload();
  if (!sharedCount(o)) {
    toast('Tick at least one item first');
    return;
  }
  const json = JSON.stringify(o);
  const name = `goal-tracker-share-${TODAY()}.json`;
  if (a === 'copy') {
    let ok = false;
    try {
      await navigator.clipboard.writeText(json);
      ok = true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch (__) {}
      ta.remove();
    }
    toast(
      ok
        ? `Copied ${sharedCount(o)} item${sharedCount(o) > 1 ? 's' : ''}. Paste it to your friend.`
        : 'Could not copy on this browser. Use Save file instead.'
    );
  }
  if (a === 'file' && window.GTNative) {
    try {
      const r = await GTNative.saveFile(name, json, false);
      toast(r.msg);
    } catch (e) {
      toast('Could not save: ' + ((e && e.message) || e));
    }
    return;
  }
  if (a === 'send' && window.GTNative) {
    try {
      await GTNative.shareFile(name, json);
    } catch (e) {}
    return;
  }
  if (a === 'file') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const l = document.createElement('a');
    l.href = url;
    l.download = name;
    document.body.appendChild(l);
    l.click();
    l.remove();
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    toast('Saved ' + name);
  }
  if (a === 'send') {
    try {
      const f = new File([json], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [f] }))
        await navigator.share({ files: [f], title: 'GoalTerra items' });
      else await navigator.share({ title: 'GoalTerra items', text: json });
    } catch (e) {
      if (e && e.name !== 'AbortError') toast('Sharing is not available here. Use Copy text.');
    }
  }
}
let SHP = null;
function openShareImport() {
  SHP = null;
  dlg.innerHTML = `<form method="dialog" data-shimp><h3>Import shared items</h3><p class="meta">Paste what your friend sent, or choose their .json file. You will see a preview before anything is added.</p>
    <textarea name="text" spellcheck="false" placeholder="Paste shared text here…" style="min-height:120px;font:12px/1.4 ui-monospace,monospace"></textarea>
    <div class="row" style="margin-top:6px"><button type="button" class="ghost" data-shimp-act="file">Choose file</button><input type="file" id="shFile" accept=".json,application/json,text/plain,application/octet-stream" hidden></div>
    <div class="dlg-actions"><button class="ghost" value="cancel" formnovalidate>Close</button><button type="button" class="btn" data-shimp-act="read">Preview</button></div></form>`;
  dlg.showModal();
}
function cleanShared(d) {
  const str = (v, n) => String(v ?? '').slice(0, n),
    okDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null);
  const arr = (v) => (Array.isArray(v) ? v.slice(0, 200) : []);
  return {
    habits: arr(d.habits)
      .filter((h) => h && h.name)
      .map((h) => ({
        name: str(h.name, 120),
        kind: h.kind === 'avoid' ? 'avoid' : '',
        mode: h.mode === 'confirm' ? 'confirm' : '',
        target: Math.min(7, Math.max(1, +h.target || 7)),
        days: arr(h.days)
          .map(Number)
          .filter((n) => n >= 0 && n <= 6),
        group: str(h.group, 60),
      })),
    tasks: arr(d.tasks)
      .filter((t) => t && t.title)
      .map((t) => ({
        title: str(t.title, 200),
        notes: str(t.notes, 2000),
        items: arr(t.items)
          .slice(0, 50)
          .map((x) => str(x, 200))
          .filter(Boolean),
        due: okDate(t.due),
        priority: ['low', 'med', 'high'].includes(t.priority) ? t.priority : 'low',
        repeat: REPEAT_LABEL[t.repeat] ? t.repeat : '',
        tag: str(t.tag, 40),
      })),
    exams: arr(d.exams)
      .filter((e) => e && e.title && okDate(e.date))
      .map((e) => ({
        kind: e.kind === 'quiz' ? 'quiz' : 'exam',
        title: str(e.title, 200),
        subject: str(e.subject, 80),
        date: e.date,
        time: /^\d{2}:\d{2}$/.test(e.time || '') ? e.time : '',
        notes: str(e.notes, 2000),
      })),
    topics: arr(d.topics)
      .filter((t) => t && t.name && t.subject)
      .map((t) => ({ subject: str(t.subject, 80), name: str(t.name, 120) })),
  };
}
function shimpPreview(text) {
  let d;
  try {
    d = JSON.parse(
      String(text || '')
        .replace(/^\uFEFF/, '')
        .trim()
    );
  } catch (e) {
    askAlert("That isn't valid shared text. Ask your friend to share it again.");
    return;
  }
  if (!d || d.app !== SHARE_APP) {
    askAlert("That isn't a shared GoalTerra file.");
    return;
  }
  SHP = cleanShared(d);
  const n = SHP.habits.length + SHP.tasks.length + SHP.exams.length + SHP.topics.length;
  const rows = (k, label, arr, nm) =>
    arr.length
      ? `<h2 style="margin:12px 0 4px">${label}</h2>${arr.map((x, i) => `<label class="check"><input type="checkbox" data-shimp-item="${k}:${i}" checked> <span>${esc(nm(x))}</span></label>`).join('')}`
      : '';
  dlg.innerHTML = `<form method="dialog" data-shimp><h3>Add shared items?</h3>
    ${n ? `<div style="max-height:46vh;overflow:auto">${rows('habit', 'Habits', SHP.habits, (h) => (h.kind === 'avoid' ? '🚫 ' : '') + h.name)}${rows('task', 'Tasks and homework', SHP.tasks, (t) => t.title + (t.due ? ' · ' + fmtDate(t.due) : ''))}${rows('exam', 'Exams and quizzes', SHP.exams, (e) => (e.kind === 'quiz' ? '❓ ' : '📝 ') + e.title + ' · ' + fmtDate(e.date))}${rows('topic', 'Study topics', SHP.topics, (t) => t.subject + ': ' + t.name)}</div>` : '<div class="empty">Nothing usable in that file.</div>'}
    <div class="dlg-actions"><button class="ghost" value="cancel" formnovalidate>Cancel</button>${n ? '<button type="button" class="btn" data-shimp-act="add">Add selected</button>' : ''}</div></form>`;
}
async function shimpAdd() {
  const picked = new Set([...dlg.querySelectorAll('[data-shimp-item]:checked')].map((c) => c.dataset.shimpItem));
  let add = 0,
    skip = 0;
  const now = Date.now();
  const low = (x) => x.trim().toLowerCase();
  SHP.habits.forEach((h, i) => {
    if (!picked.has('habit:' + i)) return;
    if (S.habits.some((x) => low(x.name) === low(h.name) && (x.kind || '') === h.kind)) {
      skip++;
      return;
    }
    const n = {
      id: uid(),
      name: h.name,
      kind: h.kind,
      mode: h.mode,
      target: h.kind === 'avoid' ? 7 : h.target,
      group: h.group,
      days: h.kind === 'avoid' ? [] : h.days,
      created: now,
    };
    S.habits.push(n);
    DB.put('habits', n);
    add++;
  });
  SHP.tasks.forEach((t, i) => {
    if (!picked.has('task:' + i)) return;
    if (S.tasks.some((x) => !x.archived && low(x.title) === low(t.title) && (x.due || null) === t.due)) {
      skip++;
      return;
    }
    const n = {
      id: uid(),
      title: t.title,
      notes: t.notes,
      items: t.items.map((text) => ({ text, done: false })),
      due: t.due,
      priority: t.priority,
      repeat: t.repeat,
      tag: t.tag,
      goalId: null,
      done: false,
      created: now,
    };
    S.tasks.push(n);
    DB.put('tasks', n);
    add++;
  });
  let student = false;
  SHP.exams.forEach((e, i) => {
    if (!picked.has('exam:' + i)) return;
    if (S.exams.some((x) => low(x.title) === low(e.title) && x.date === e.date)) {
      skip++;
      return;
    }
    const n = { id: uid(), ...e, score: null, max: null, created: now };
    S.exams.push(n);
    DB.put('exams', n);
    add++;
    student = true;
  });
  SHP.topics.forEach((t, i) => {
    if (!picked.has('topic:' + i)) return;
    if (S.topics.some((x) => low(x.subject) === low(t.subject) && low(x.name) === low(t.name))) {
      skip++;
      return;
    }
    const n = { id: uid(), subject: t.subject, name: t.name, sessions: [], created: now };
    S.topics.push(n);
    DB.put('topics', n);
    add++;
    student = true;
  });
  if (student && !S.cfg.student) {
    S.cfg.student = true;
    saveCfg();
  }
  dlg.close();
  render();
  toast(
    `Added ${add} item${add === 1 ? '' : 's'}${skip ? `, skipped ${skip} you already have` : ''}${student ? '. Student mode is on' : ''}`
  );
}
dlg.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sh]');
  if (b) {
    shareDo(b.dataset.sh);
    return;
  }
  const c = e.target.closest('[data-shimp-act]');
  if (!c) return;
  if (c.dataset.shimpAct === 'file') dlg.querySelector('#shFile').click();
  if (c.dataset.shimpAct === 'read') shimpPreview(dlg.querySelector('textarea[name=text]').value);
  if (c.dataset.shimpAct === 'add') shimpAdd();
});
dlg.addEventListener('change', async (e) => {
  if (e.target.id !== 'shFile') return;
  const f = e.target.files[0];
  if (!f) return;
  let t = '';
  try {
    t = await f.text();
  } catch (_) {}
  shimpPreview(t);
});
/* ---------- Backup & restore ---------- */
function notify(m) {
  typeof toast === 'function' ? toast(m) : askAlert(m);
}
function backupData() {
  return {
    app: 'goal-tracker',
    version: 1,
    appVersion: APP_VERSION,
    exported: new Date().toISOString(),
    tasks: S.tasks,
    goals: S.goals,
    habits: S.habits,
    topics: S.topics,
    exams: S.exams,
    trash: S.trash,
    logs: [...S.logs].map((id) => {
      const i = id.lastIndexOf('|');
      return { id, habitId: id.slice(0, i), date: id.slice(i + 1) };
    }),
    settings: { cfg: S.cfg, sound: Sound.on, hideDone: S.hideDone, compact: S.compact },
  };
}
function restorePreview(d, rows, skipped) {
  const cur = {
    tasks: S.tasks.length,
    goals: S.goals.length,
    habits: S.habits.length,
    logs: S.logs.size,
    topics: S.topics.length,
    exams: S.exams.length,
  };
  const lab = {
    tasks: L2('Tasks', 'المهام'),
    goals: L2('Goals', 'الأهداف'),
    habits: L2('Habits', 'العادات'),
    logs: L2('Check-ins', 'تسجيلات'),
    topics: L2('Topics', 'المواضيع'),
    exams: L2('Exams', 'الامتحانات'),
  };
  const dates = [...rows.tasks.map((t) => t.created), ...rows.goals.map((g) => g.created)]
    .filter((x) => typeof x === 'number')
    .sort((a, b) => a - b);
  const ex = d.exported ? new Date(d.exported) : null,
    exOk = ex && !isNaN(ex),
    lost = Object.keys(cur).filter((k) => rows[k].length < cur[k]);
  return new Promise((res) => {
    dlg.innerHTML = `<div class="hist"><div class="hist-top"><h3>Restore this backup?</h3><button type="button" class="icon" data-rp="0" aria-label="Close">✕</button></div>
      <div class="kv"><span>${L2('Made', 'أُنشئت')}</span><span>${exOk ? fmtWhen(ex.getTime()) + ' · ' + agoText(daysSince(ex.getTime())) : '—'}</span></div>
      ${d.appVersion ? `<div class="kv"><span>${L2('App version', 'إصدار التطبيق')}</span><span>${esc(String(d.appVersion))}</span></div>` : ''}
      ${dates.length ? `<div class="kv"><span>${L2('Covers', 'تغطي')}</span><span>${fmtDate(ds(new Date(dates[0])))} – ${fmtDate(ds(new Date(dates.at(-1))))}</span></div>` : ''}
      <table class="rp"><thead><tr><th></th><th>${L2('Backup', 'النسخة')}</th><th>${L2('Now', 'الآن')}</th></tr></thead><tbody>${Object.keys(
        cur
      )
        .map(
          (k) =>
            `<tr class="${rows[k].length < cur[k] ? 'less' : ''}"><td>${lab[k]}</td><td>${rows[k].length}</td><td>${cur[k]}</td></tr>`
        )
        .join('')}</tbody></table>
      ${skipped ? `<p class="meta">${L2(`${skipped} damaged rows will be skipped.`, `سيتم تخطي ${skipped} صفًا تالفًا.`)}</p>` : ''}
      ${lost.length ? `<div class="rpg-warn">${L2('⚠ This backup has fewer items than you have now. Restoring replaces everything, so the extra items will be gone.', '⚠ هذه النسخة فيها عناصر أقل مما لديك الآن. الاستعادة تستبدل كل شيء، فستضيع العناصر الإضافية.')}</div>` : ''}
      <p class="meta">${L2('Restoring replaces all current data with the backup.', 'الاستعادة تستبدل كل البيانات الحالية بالنسخة.')}</p>
      <div class="dlg-actions"><button type="button" class="ghost" data-rp="0">${L2('Cancel', 'إلغاء')}</button><button type="button" class="btn ${lost.length ? 'danger' : ''}" data-rp="1">${L2('Restore', 'استعادة')}</button></div></div>`;
    const done = (v) => {
      dlg.removeEventListener('click', h);
      dlg.removeEventListener('close', c);
      if (dlg.open) dlg.close();
      res(v);
    };
    const h = (e) => {
        const b = e.target.closest('[data-rp]');
        if (b) done(b.dataset.rp === '1');
      },
      c = () => done(false);
    dlg.addEventListener('click', h);
    dlg.addEventListener('close', c);
    if (!dlg.open) dlg.showModal();
  });
}
async function restore(text, source) {
  text = (text || '').replace(/^\uFEFF/, '').trim();
  if (!text)
    throw new Error(
      source === 'file'
        ? 'the file is empty (0 bytes), so the export never finished saving. Export again, or use "Copy backup text" instead.'
        : 'nothing was pasted.'
    );
  let d;
  try {
    d = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `the ${source} is cut off or isn't valid JSON (${(text.length / 1024).toFixed(1)} KB). Export it again, or use "Copy backup text" instead.`
    );
  }
  if (!d || !Array.isArray(d.tasks) || !Array.isArray(d.goals)) throw new Error("that isn't a GoalTerra backup.");
  const rows = {};
  let skipped = 0;
  for (const st of STORES) {
    const src = Array.isArray(d[st]) ? d[st] : [];
    rows[st] = src.filter((r) => {
      const ok =
        r && typeof r === 'object' && typeof r.id === 'string' && r.id && (st !== 'logs' || r.id.includes('|'));
      if (!ok) skipped++;
      return ok;
    });
  }
  const n =
    `${rows.tasks.length} tasks, ${rows.goals.length} goals, ${rows.habits.length} habits, ${rows.logs.length} check-ins` +
    (rows.topics.length || rows.exams.length ? `, ${rows.topics.length} topics, ${rows.exams.length} exams` : '') +
    (skipped ? ` (${skipped} damaged rows skipped)` : '');
  if (!(await restorePreview(d, rows, skipped))) return false;
  const snap = backupData();
  try {
    for (const st of STORES) {
      await DB.clear(st);
      for (const row of rows[st]) await DB.put(st, row);
    }
  } catch (err) {
    try {
      for (const st of STORES) {
        await DB.clear(st);
        for (const row of snap[st] || []) await DB.put(st, row);
      }
      await load();
      render();
    } catch (_) {}
    throw new Error('the restore failed part-way, so your previous data was put back (' + err.message + ').');
  }
  if (d.settings && typeof d.settings === 'object') {
    const st = d.settings;
    if (st.cfg && typeof st.cfg === 'object') {
      const o = {};
      for (const k in CFG_DEF) if (k in st.cfg && typeof st.cfg[k] === typeof CFG_DEF[k]) o[k] = st.cfg[k];
      S.cfg = { ...CFG_DEF, ...o };
      saveCfg();
      applyLang();
    }
    if (typeof st.sound === 'boolean') Sound.set(st.sound);
    if (typeof st.hideDone === 'boolean') {
      S.hideDone = st.hideDone;
      try {
        localStorage.setItem('gt-hide-done', st.hideDone ? '1' : '0');
      } catch (e) {}
    }
    if (typeof st.compact === 'boolean') {
      S.compact = st.compact;
      try {
        localStorage.setItem('gt-compact', st.compact ? '1' : '0');
      } catch (e) {}
    }
  }
  await load();
  render();
  return n;
}
function openBackup(mode) {
  const copy = mode === 'copy';
  dlg.innerHTML = `<form method="dialog" data-backup="${mode}"><h3>${copy ? 'Backup as text' : 'Restore from text'}</h3>
    <p class="meta">${copy ? 'Copy this and paste it somewhere safe, like a note or a message to yourself.' : 'Paste a backup you copied earlier. This replaces all current data.'}</p>
    <textarea name="text" spellcheck="false" style="min-height:180px;font:12px/1.4 ui-monospace,monospace" ${copy ? 'readonly' : 'placeholder="Paste backup here…"'}>${copy ? esc(JSON.stringify(backupData())) : ''}</textarea>
    <div class="dlg-actions"><button class="ghost" value="cancel" formnovalidate>Close</button><button class="btn" value="go">${copy ? 'Copy' : 'Restore'}</button></div></form>`;
  dlg.showModal();
  const ta = dlg.querySelector('textarea');
  copy ? ta.select() : ta.focus();
}
dlg.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-backup]');
  if (!f) return;
  e.preventDefault();
  if (e.submitter && e.submitter.value === 'cancel') {
    dlg.close();
    return;
  }
  const ta = f.elements.text;
  if (f.dataset.backup === 'copy') {
    let ok = false;
    try {
      await navigator.clipboard.writeText(ta.value);
      ok = true;
    } catch (_) {
      try {
        ta.select();
        ok = document.execCommand('copy');
      } catch (__) {}
    }
    if (ok && ta.value.length > 2) {
      markBackup();
      render();
    }
    if (e.submitter) e.submitter.textContent = ok ? 'Copied ✓' : 'Select all and copy manually';
    return;
  }
  try {
    const n = await restore(ta.value, 'pasted text');
    if (n) {
      dlg.close();
      notify('Restored ' + n + '.');
    }
  } catch (err) {
    askAlert('Restore failed: ' + err.message);
  }
});
$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const n = await restore(await file.text(), 'file');
    if (n) notify('Imported ' + n + '.');
  } catch (err) {
    askAlert('Import failed: ' + err.message);
  } finally {
    e.target.value = '';
  }
});
