/**
 * render(), the single function that redraws the page; tip cards; the edit dialog and its save handler; the level calendar; the first-run intro; the habit history dialog.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Tip cards: one short, dismissible lesson per tab ---------- */
const TIPS = () => ({
  dash: [
    [
      'levels',
      () => coachTone() !== 'off',
      L2('Day levels', 'مستويات اليوم'),
      L2(
        'Finish more tasks today to climb from Spark to Blaze to Titan. Tap the banner at the top to see a calendar of your past days.',
        'أنجز مهامًا أكثر اليوم لترتقي من سبارك إلى بلايز إلى تايتان. اضغط على الشريط في الأعلى لترى تقويمًا لأيامك السابقة.'
      ),
    ],
    [
      'game',
      () => rpgOn(),
      L2('Game mode', 'وضع اللعبة'),
      L2(
        "Finished tasks, habits, study and focus deal damage to this week's boss (its HP is the bar). Tap Details for shields and stats. Clean days on avoid habits charge shields that block its counterattacks.",
        'المهام والعادات والدراسة والتركيز تضرّ زعيم هذا الأسبوع (شريط حياته). اضغط تفاصيل لترى الدروع والإحصاءات. الأيام النظيفة في عادات التجنّب تشحن دروعًا تصدّ هجماته.'
      ),
    ],
  ],
  tasks: [
    [
      'quickadd',
      () => true,
      L2('Quick add', 'إضافة سريعة'),
      L2(
        'Type "Essay tomorrow !high #uni" and the date, priority and tag fill themselves. Tap a task to edit it, tick it to finish it.',
        'اكتب «مقال غدًا» وسيُملأ التاريخ تلقائيًا. اضغط على المهمة لتعديلها، وضع علامة لإنهائها.'
      ),
    ],
  ],
  goals: [
    [
      'ladder',
      () => true,
      L2('Goals that connect', 'أهداف مترابطة'),
      L2(
        'Weekly steps roll up into monthly, annual and 5-year goals. Add a weekly goal, then link it to a bigger one to see it move.',
        'الخطوات الأسبوعية تتجمّع في أهداف شهرية وسنوية وخمسية. أضف هدفًا أسبوعيًا ثم اربطه بهدف أكبر لتراه يتقدّم.'
      ),
    ],
  ],
  habits: [
    [
      'habits',
      () => true,
      L2('Build and avoid', 'بناء وتجنّب'),
      L2(
        'Build habits are things you tick when done. Avoid habits are things to quit: you only log a slip, and clean days build your streak.',
        'عادات البناء تُعلّمها عند إنجازها. عادات التجنّب أشياء تريد تركها: تسجّل فقط عند الانزلاق، والأيام النظيفة تبني سلسلتك.'
      ),
    ],
  ],
  study: [
    [
      'study',
      () => true,
      L2('How picks work', 'كيف تعمل الاختيارات'),
      L2(
        "After studying, rate each topic Weak, OK or Strong. Weak and due topics come back first in Today's picks, and Strong ones come back later.",
        'بعد الدراسة قيّم كل موضوع: ضعيف أو متوسط أو قوي. الضعيفة والمستحقة تعود أولًا في اختيارات اليوم والقوية لاحقًا.'
      ),
    ],
  ],
});
const tipSeen = () => {
  try {
    return JSON.parse(localStorage.getItem('gt-tips') || '[]');
  } catch (e) {
    return [];
  }
};
function tipCard() {
  const seen = tipSeen(),
    t = (TIPS()[S.view] || []).find((x) => !seen.includes(x[0]) && x[1]());
  return t
    ? `<div class="card tipcard" role="note"><div class="grow"><b>💡 ${t[2]}</b><p>${t[3]}</p></div><button class="chip" data-action="tip-ok" data-k="${t[0]}">${L2('Got it', 'فهمت')}</button></div>`
    : '';
}
function render() {
  _exMap = null;
  _srMemo = new Map();
  _rest = null;
  const newly = syncGoals();
  rpgTick();
  if (window.GTNative) planNotifications();
  if (S.booted && newly.length) {
    Sound.play('goal');
    setTimeout(() => toast('🎯 Goal complete: ' + newly.map((g) => g.title).join(', ')), 50);
  }
  S.booted = true;
  if (S.view === 'study' && !S.cfg.student) S.view = 'dash';
  document.querySelectorAll('[data-view=study]').forEach((b) => (b.hidden = !S.cfg.student));
  if (S.selMode && S.selMode !== S.view) {
    S.selMode = null;
    S.sel.clear();
  }
  document.body.classList.toggle('selmode', !!S.selMode);
  document.body.classList.toggle('cmp', !!(S.cfg.student && S.cfg.stuCompact));
  if (S.view === 'bestiary' && !rpgOn()) S.view = 'dash';
  const v =
    {
      dash: viewDash,
      tasks: viewTasks,
      goals: viewGoals,
      habits: viewHabits,
      data: viewData,
      archive: viewArchive,
      trash: viewTrash,
      safety: viewSafety,
      study: viewStudy,
      bestiary: viewBestiary,
    }[S.view] || viewDash;
  $('#app').innerHTML =
    (S.persistent
      ? ''
      : `<div class="banner">This browser blocked storage — data will be lost on reload. Use Export to save it.</div>`) +
    tipCard() +
    v() +
    selBar();
  const app = $('#app'),
    changed = S._lv !== S.view;
  S._lv = S.view;
  if (changed && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    app.classList.remove('enter');
    [...app.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 9)));
    void app.offsetWidth;
    app.classList.add('enter');
    clearTimeout(S._enterT);
    S._enterT = setTimeout(() => app.classList.remove('enter'), 1100);
  } else if (!changed) {
    clearTimeout(S._enterT);
    app.classList.remove('enter');
  }
  if (S.popKey) {
    const q = S.popKey;
    S.popKey = null;
    let el = null;
    try {
      el = app.querySelector(q);
    } catch (_) {}
    if (el) {
      el.classList.add('pop');
      setTimeout(() => el.classList.remove('pop'), 450);
    }
  }
  if (S.fx) {
    const f = S.fx;
    S.fx = null;
    try {
      const el = app.querySelector(f.sel);
      if (el && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const r = el.getBoundingClientRect(),
          s = document.createElement('span');
        s.className = 'xpfloat';
        s.textContent = f.text;
        s.style.left = r.left + r.width / 2 + 'px';
        s.style.top = r.top + 'px';
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 1100);
      }
    } catch (_) {}
  }
  const nv =
    S.view === 'archive' || S.view === 'trash' || S.view === 'safety'
      ? 'data'
      : S.view === 'bestiary'
        ? 'dash'
        : S.view;
  document.querySelectorAll('#nav button,#tabbar button').forEach((b) => {
    const on = b.dataset.view === nv;
    b.classList.toggle('on', on);
    on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  });
}

/* ---------- Edit dialog ---------- */
const dlg = $('#editDlg');
function parentOpts(h, sel, selfId) {
  const ph = PARENT[h];
  if (!ph) return null;
  return (
    `<option value="">— None —</option>` +
    S.goals
      .filter((g) => g.horizon === ph && g.id !== selfId && (!g.done || g.id === sel))
      .map(
        (g) => `<option value="${g.id}" ${g.id === sel ? 'selected' : ''}>${esc(g.title)} (${esc(g.period)})</option>`
      )
      .join('')
  );
}
function parentField(h, sel, selfId) {
  const o = parentOpts(h, sel, selfId);
  return o
    ? `<label>Supports which ${HORIZONS[PARENT[h]].toLowerCase()} goal?</label><select name="parentId">${o}</select>`
    : '';
}
function openEdit(kind, id) {
  let body = '',
    title = '';
  if (kind === 'task') {
    const t = S.tasks.find((x) => x.id === id);
    title = 'Edit task';
    const goals =
      `<option value="">— No weekly goal —</option>` +
      S.goals
        .filter((g) => (g.horizon === 'weekly' && !g.done) || g.id === t.goalId)
        .map(
          (g) =>
            `<option value="${g.id}" ${g.id === t.goalId ? 'selected' : ''}>${HORIZONS[g.horizon]} · ${esc(g.title)}</option>`
        )
        .join('');
    body = `<label>Title</label><input type="text" name="title" value="${esc(t.title)}" required>${iconField(t.icon)}
      <div class="two"><div><label>Due date</label><input type="date" name="due" value="${t.due || ''}"></div>
      <div><label>Priority</label><select name="priority">${[
        ['low', 'Low'],
        ['med', 'Medium'],
        ['high', 'High'],
      ]
        .map(([v, l]) => `<option value="${v}" ${t.priority === v ? 'selected' : ''}>${l}</option>`)
        .join('')}</select></div></div>
      <div class="two"><div><label>Start time</label><input type="time" name="start" value="${t.start || ''}"></div>
      <div><label>Length</label><select name="dur">${PLAN_LENS.map((m) => `<option value="${m}" ${blockLen(t) === m ? 'selected' : ''}>${lenText(m)}</option>`).join('')}</select></div></div>
      <label>Weekly goal</label><select name="goalId">${goals}</select>
      <label>Tag folder</label><input type="text" name="tag" list="tagListEdit" value="${esc(t.tag || '')}" placeholder="None" autocomplete="off">${tagList('tagListEdit')}
      <label>Repeat</label><select name="repeat">${REPEATS.map(([r, l]) => `<option value="${r}" ${(t.repeat || '') === r ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label>Notes</label><textarea name="notes" placeholder="Details, links, anything…">${esc(t.notes)}</textarea>${histBox(t)}
      <label>Checklist (one item per line)</label><textarea name="items" placeholder="Item one&#10;Item two">${esc((t.items || []).map((i) => i.text).join('\n'))}</textarea>
      <label class="check"><input type="checkbox" name="done" ${t.done ? 'checked' : ''}> Completed</label>`;
  }
  if (kind === 'goal') {
    const g = goalById(id);
    title = 'Edit goal';
    body = `<label>Title</label><input type="text" name="title" value="${esc(g.title)}" required>${iconField(g.icon)}
      <div class="two"><div><label>Horizon</label><select name="horizon">${Object.entries(HORIZONS)
        .map(([k, l]) => `<option value="${k}" ${g.horizon === k ? 'selected' : ''}>${l}</option>`)
        .join('')}</select></div>
      <div><label>Period</label><input type="text" name="period" value="${esc(g.period)}" required></div></div>
      <div id="parentWrap">${parentField(g.horizon, g.parentId, g.id)}</div>
      <label>How it's measured</label><select name="kind">${[
        ['check', '☐ Checkbox (or all linked tasks done)'],
        ['number', '🔢 Number target'],
        ['rollup', '🧩 Built from sub-goals'],
      ]
        .map(([v, l]) => `<option value="${v}" ${goalKind(g) === v ? 'selected' : ''}>${l}</option>`)
        .join('')}</select>
      <div class="f-num"><div class="two"><div><label>Target</label><input type="number" name="target" min="0" step="any" value="${+g.target || ''}"></div>
        <div><label>Unit</label><input type="text" name="unit" value="${esc(g.unit || '')}" placeholder="hours, pages…"></div></div>
        <label>Current value</label><input type="number" name="value" step="any" value="${+g.value || 0}"></div>
      <div class="f-roll"><label>Sub-goals needed to complete it</label><input type="number" name="expected" min="1" step="1" value="${g.expected || ''}" placeholder="default ${defaultExpected(g)}"></div>
      <label>Status</label><select name="status">${[
        ['active', 'Active'],
        ['done', 'Done'],
        ['missed', 'Missed'],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${(g.done ? 'done' : g.status === 'missed' ? 'missed' : 'active') === v ? 'selected' : ''}>${l}</option>`
        )
        .join('')}</select>
      <label>Notes</label><textarea name="notes">${esc(g.notes)}</textarea>${histBox(g)}
      <label>Review note (what got in the way / what worked)</label><textarea name="lesson">${esc(g.lesson || '')}</textarea>`;
  }
  if (kind === 'habit') {
    const h = S.habits.find((x) => x.id === id);
    title = 'Edit habit';
    body = `<label>Name</label><input type="text" name="name" value="${esc(h.name)}" required>${iconField(h.icon)}
      <label>Type</label><select name="kind"><option value="">✅ Build: tick it when done</option><option value="avoid" ${slipMode(h) ? 'selected' : ''}>🚫 Avoid: clean unless you slip</option><option value="avoid-confirm" ${isNeg(h) && !slipMode(h) ? 'selected' : ''}>🚫 Avoid: tick each clean day</option></select>
      <label>Target</label><select name="target">${[7, 6, 5, 4, 3, 2, 1].map((n) => `<option value="${n}" ${(h.target || 7) === n ? 'selected' : ''}>${n}× per week</option>`).join('')}</select>
      <label>Folder</label><input type="text" name="group" list="folderListEdit" value="${esc(h.group || '')}" placeholder="None. Type a name to create one" autocomplete="off">${folderList('folderListEdit')}
      <label>Schedule</label>${dayPicker(h.days || [])}${isNeg(h) ? '' : stickFields(h)}`;
  }
  if (kind === 'exam') {
    const e = S.exams.find((x) => x.id === id) || { kind: 'exam', date: TODAY() };
    title = id === 'new' ? 'Add exam or quiz' : 'Edit ' + (e.kind === 'quiz' ? 'quiz' : 'exam');
    body = `<label>Type</label><select name="ekind"><option value="exam" ${e.kind === 'exam' ? 'selected' : ''}>📝 Exam</option><option value="quiz" ${e.kind === 'quiz' ? 'selected' : ''}>❓ Quiz / test</option></select>
      <label>Title</label><input type="text" name="title" value="${esc(e.title || '')}" placeholder="e.g. Biochemistry midterm" required>
      <label>Subject</label><input type="text" name="subject" list="subjListEx" value="${esc(e.subject || '')}" autocomplete="off">${subjList('subjListEx')}
      <div class="two"><div><label>Date</label><input type="date" name="date" value="${e.date || ''}" required></div><div><label>Time (optional)</label><input type="time" name="time" value="${e.time || ''}"></div></div>
      <div class="two"><div><label>Score (after it)</label><input type="number" name="score" step="any" min="0" value="${e.score ?? ''}"></div><div><label>Out of</label><input type="number" name="max" step="any" min="0" value="${e.max ?? ''}"></div></div>
      <label>Notes</label><textarea name="notes" placeholder="Room, syllabus, what to bring…">${esc(e.notes || '')}</textarea>`;
  }
  if (kind === 'topic') {
    const t = S.topics.find((x) => x.id === id);
    title = 'Edit topic';
    body = `<label>Topic</label><input type="text" name="name" value="${esc(t.name)}" required>
      <label>Subject</label><input type="text" name="subject" list="subjListEdit" value="${esc(t.subject)}" required autocomplete="off">${subjList('subjListEdit')}`;
  }
  dlg.innerHTML = `<form method="dialog" data-edit="${kind}" data-id="${id}"><h3>${title}</h3>${body}
    <div class="dlg-actions"><button class="ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="save">Save</button></div></form>`;
  if (kind === 'goal') dlg.querySelector('form').dataset.kind = goalKind(goalById(id));
  dlg.showModal();
  const f = dlg.querySelector('input[type=text]');
  f.focus();
  f.select();
}
dlg.addEventListener('change', (e) => {
  if (e.target.name !== 'horizon') return;
  const f = e.target.form;
  const g = goalById(f.dataset.id);
  const h = e.target.value;
  $('#parentWrap').innerHTML = parentField(h, g.horizon === h ? g.parentId : '', g.id);
  const p = f.elements.period;
  if (h !== g.horizon) p.value = currentPeriod(h);
  else p.value = g.period;
});
dlg.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-edit]');
  if (!f) return;
  e.preventDefault();
  if (e.submitter && e.submitter.value === 'cancel') {
    dlg.close();
    return;
  }
  const kind = f.dataset.edit;
  if (kind === 'bulktasks' || kind === 'bulkhabits') {
    if ((await applyBulk(kind, f)) === false) return;
    dlg.close();
    render();
    return;
  }
  const v = Object.fromEntries(new FormData(f));
  const id = f.dataset.id;
  if (kind === 'task') {
    const t = S.tasks.find((x) => x.id === id);
    const done = !!v.done;
    if (beastOn() && !t.done && !done && t.due && t.due <= TODAY() && (!v.due || v.due > t.due)) {
      const why = await askWhy('pushing this back');
      if (!why) {
        toast('Not saved. Titan wants a reason.');
        return;
      }
      (t.pushes = t.pushes || []).push({ at: Date.now(), from: t.due, to: v.due || null, why });
    }
    const pt0 = t.title,
      pn0 = t.notes;
    Object.assign(t, {
      icon: v.icon || '',
      title: v.title.trim(),
      due: v.due || (v.start ? TODAY() : null),
      start: v.start || null,
      dur: +v.dur || 60,
      priority: v.priority,
      goalId: v.goalId || null,
      notes: (v.notes || '').trim(),
      repeat: v.repeat || '',
      tag: (v.tag || '').trim(),
      items: parseItems(v.items, t.items),
    });
    histPush(t, pt0, pn0);
    if (done !== t.done) {
      t.done = done;
      t.doneAt = done ? Date.now() : null;
      freezeDmg(t);
      Sound.play(done ? 'task' : 'undo');
      await onTaskDone(t);
    }
    await DB.put('tasks', t);
  }
  if (kind === 'goal') {
    const g = goalById(id);
    const old = g.horizon;
    let gk = v.kind || 'check';
    if (gk === 'rollup' && v.horizon === 'weekly') gk = 'check';
    const pt = g.title,
      pn = g.notes;
    Object.assign(g, {
      icon: v.icon || '',
      title: v.title.trim(),
      horizon: v.horizon,
      period: v.period.trim(),
      parentId: v.parentId || null,
      notes: (v.notes || '').trim(),
      kind: gk,
      target: +v.target || 0,
      unit: (v.unit || '').trim(),
      value: +v.value || 0,
      expected: v.expected ? Math.max(1, Math.round(+v.expected)) : null,
      lesson: (v.lesson || '').trim(),
    });
    histPush(g, pt, pn);
    if (v.status === 'done') {
      if (!g.done) {
        g.done = true;
        g.doneAt = Date.now();
      }
      g.autoDone = false;
      g.status = null;
      g.manualOpen = false;
    } else if (v.status === 'missed') {
      g.done = false;
      g.autoDone = false;
      g.status = 'missed';
    } else {
      if (g.done && progressRaw(g) >= 100) g.manualOpen = true;
      g.done = false;
      g.autoDone = false;
      g.status = null;
    }
    if (old !== g.horizon) {
      // keep the hierarchy valid: unlink sub-goals that no longer sit one level below
      for (const c of S.goals.filter((c) => c.parentId === g.id && PARENT[c.horizon] !== g.horizon)) {
        c.parentId = null;
        await DB.put('goals', c);
      }
    }
    await DB.put('goals', g);
  }
  if (kind === 'exam') {
    const o = {
      kind: v.ekind === 'quiz' ? 'quiz' : 'exam',
      title: v.title.trim(),
      subject: (v.subject || '').trim(),
      date: v.date,
      time: v.time || '',
      notes: (v.notes || '').trim(),
      score: v.score === '' || v.score == null ? null : +v.score,
      max: v.max === '' || v.max == null ? null : +v.max,
    };
    if (id === 'new') {
      const e = { id: uid(), created: Date.now(), ...o };
      S.exams.push(e);
      await DB.put('exams', e);
    } else {
      const e = S.exams.find((x) => x.id === id);
      Object.assign(e, o);
      await DB.put('exams', e);
    }
  }
  if (kind === 'topic') {
    const t = S.topics.find((x) => x.id === id);
    Object.assign(t, { name: v.name.trim(), subject: v.subject.trim() || t.subject });
    await DB.put('topics', t);
  }
  if (kind === 'habit') {
    const h = S.habits.find((x) => x.id === id);
    const av = v.kind === 'avoid' || v.kind === 'avoid-confirm';
    const newMode = av && v.kind === 'avoid-confirm' ? 'confirm' : '';
    if (isNeg(h) && av && (h.mode || '') !== newMode) {
      // meaning of a check-in flips, so invert every day since creation to keep history the same
      for (let d = new Date(bornK(h) + 'T00:00'); ds(d) <= TODAY(); d = addDays(d, 1)) {
        const k = ds(d),
          id = h.id + '|' + k;
        if (S.logs.has(id)) {
          S.logs.delete(id);
          await DB.del('logs', id);
        } else {
          S.logs.add(id);
          await DB.put('logs', { id, habitId: h.id, date: k });
        }
      }
    }
    Object.assign(h, {
      icon: v.icon || '',
      mode: newMode,
      name: v.name.trim(),
      kind: av ? 'avoid' : '',
      target: av ? 7 : +v.target,
      group: (v.group || '').trim(),
      days: av ? [] : readDays(f),
      ...stickRead(v),
    });
    await DB.put('habits', h);
  }
  dlg.close();
  render();
});

/* ---------- Habit history dialog ---------- */
let cal = { id: null, y: 0, m: 0 };
function habitDates(h) {
  return [...S.logs]
    .filter((k) => k.startsWith(h.id + '|'))
    .map((k) => k.slice(k.lastIndexOf('|') + 1))
    .sort();
}
function bestStreak(h) {
  const dates = isNeg(h) ? [bornK(h)] : habitDates(h);
  if (!dates.length) return 0;
  let best = 0,
    run = 0,
    miss = false;
  const today = TODAY();
  for (let d = new Date(dates[0] + 'T00:00'); ds(d) <= today; d = addDays(d, 1)) {
    const k = ds(d);
    if (good(h, k)) {
      run++;
      miss = false;
      best = Math.max(best, run);
    } else if (isDue(h, d) && !isRest(k) && (k !== today || slipMode(h))) {
      if (isNeg(h) || miss) {
        run = 0;
        miss = false;
      } else miss = true;
    }
  }
  return best;
}
/* ---------- Level calendar ---------- */
let lcal = { y: 0, m: 0, sel: null };
function doneByDay() {
  const c = {};
  for (const t of S.tasks)
    if (t.done && t.doneAt) {
      const k = ds(new Date(t.doneAt));
      (c[k] = c[k] || []).push(t);
    }
  return c;
}
const lvlNum = (n) => (n ? tierOf(n) + 1 : 0);
function openLevels() {
  const d = new Date();
  lcal = { y: d.getFullYear(), m: d.getMonth(), sel: null };
  drawLevels();
  if (!dlg.open) dlg.showModal();
}
function drawLevels() {
  const by = doneByDay(),
    now = new Date(),
    today = TODAY(),
    L = lvlAt();
  const first = new Date(lcal.y, lcal.m, 1),
    lead = (first.getDay() + 6) % 7,
    days = new Date(lcal.y, lcal.m + 1, 0).getDate();
  const cnt = [0, 0, 0, 0];
  let total = 0,
    cells = '<span></span>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const k = ds(new Date(lcal.y, lcal.m, d)),
      n = (by[k] || []).length,
      lv = lvlNum(n),
      fut = k > today;
    if (!fut) {
      cnt[lv]++;
      total += n;
    }
    const ic = lv ? TIERS[lv - 1].i : '';
    cells += `<button type="button" class="cd lc lv${lv} ${k === today ? 'tod' : ''} ${lcal.sel === k ? 'sel' : ''}" ${fut ? 'disabled' : `data-action="lvl-day" data-date="${k}"`} aria-label="${k}: ${n} ${L2('tasks', 'مهام')}${lv ? ', ' + L2(TIERS[lv - 1].n, AR[TIERS[lv - 1].n]) : ''}">${d}${ic ? `<i class="lvi" aria-hidden="true">${ic}</i>` : ''}</button>`;
  }
  const wk = [...Array(7)]
    .map((_, i) => `<span>${fmt(new Date(2024, 0, 1 + i), { weekday: 'narrow' })}</span>`)
    .join('');
  const atNow = lcal.y === now.getFullYear() && lcal.m === now.getMonth();
  const tn = (i) => L2(TIERS[i].n, AR[TIERS[i].n]);
  let dayBox = '';
  if (lcal.sel) {
    const list = by[lcal.sel] || [],
      lv = lvlNum(list.length);
    dayBox = `<div class="lv-day"><b>${fmtDate(lcal.sel)}${lv ? ' · ' + TIERS[lv - 1].i + ' ' + tn(lv - 1) : ''}</b> · ${list.length} ${L2(list.length === 1 ? 'task' : 'tasks', 'مهمة')}
      ${
        list.length
          ? `<ul>${list
              .slice(0, 12)
              .map((t) => `<li>${esc(t.title)}</li>`)
              .join('')}</ul>${list.length > 12 ? `<div class="meta">+${list.length - 12}</div>` : ''}`
          : `<div class="meta">${L2('Nothing finished.', 'لم تُنجز شيئًا.')}</div>`
      }</div>`;
  }
  const stat = (b, l) => `<div><b>${b}</b><span>${l}</span></div>`;
  dlg.innerHTML = `<div class="hist">
    <div class="hist-top"><h3>${L2('Day levels', 'مستويات الأيام')}</h3><button type="button" class="icon" data-action="dlg-close" aria-label="Close">✕</button></div>
    <div class="hist-stats">${stat('⚡ ' + cnt[1], tn(0))}${stat('🔥 ' + cnt[2], tn(1))}${stat('⚔️ ' + cnt[3], tn(2))}${stat(total, L2('Tasks done', 'مهام منجزة'))}</div>
    <div class="cal-nav"><button type="button" class="icon" data-action="lvl-month" data-d="-1" aria-label="Previous month">‹</button><b>${fmt(first, { month: 'long', year: 'numeric' })}</b><button type="button" class="icon" data-action="lvl-month" data-d="1" ${atNow ? 'disabled' : ''} aria-label="Next month">›</button></div>
    <div class="cal cal-wk">${wk}</div><div class="cal">${cells}</div>
    <div class="lv-legend"><span>⚡ ${tn(0)} 1–${L[1] - 1}</span><span>🔥 ${tn(1)} ${L[1]}–${L[2] - 1}</span><span>⚔️ ${tn(2)} ${L[2]}+</span><span>${L2('Blank: nothing finished', 'فارغ: لم تُنجز شيئًا')}</span></div>
    ${dayBox || `<p class="meta">${L2('Tap a day to see what you finished.', 'اضغط على يوم لترى ما أنجزته.')}</p>`}
    <p class="meta">${L2('Levels use your current thresholds from Settings.', 'تُحسب المستويات حسب حدودك الحالية في الإعدادات.')}</p></div>`;
}
/* ---------- First-run intro ---------- */
let introStep = 0,
  introOn = false;
const introSeen = () => {
  try {
    return localStorage.getItem('gt-intro') === '1';
  } catch (e) {
    return true;
  }
};
const markIntro = () => {
  try {
    localStorage.setItem('gt-intro', '1');
  } catch (e) {}
};
function openIntro() {
  introStep = 0;
  introOn = true;
  drawIntro();
  if (!dlg.open) dlg.showModal();
}
function drawIntro() {
  const L = lvlAt(),
    stu = !!S.cfg.student,
    ar = S.cfg.lang === 'ar';
  const steps = [
    {
      i: '<svg viewBox="0 0 100 100" width="76" height="76" aria-hidden="true"><defs><clipPath id="introGlobe"><circle cx="50" cy="50" r="27"/></clipPath></defs><g transform="rotate(-22 50 50)"><ellipse cx="50" cy="50" rx="45" ry="15" fill="none" style="stroke:var(--logo-orbit)" stroke-width="3.6"/></g><circle cx="50" cy="50" r="27" fill="#0E4F5C" style="stroke:var(--logo-ring)" stroke-width="1.8"/><g clip-path="url(#introGlobe)"><ellipse cx="50" cy="50" rx="27" ry="9" fill="none" stroke="#2F8C8A" stroke-width="1.5"/><path d="M20 54 C28 43 39 45 46 51 C52 57 60 50 68 54 C73 57 77 61 80 68 L80 82 L20 82 Z" fill="#2E9E6B"/></g><g transform="rotate(-22 50 50)"><path d="M5 50 A45 15 0 0 0 95 50" fill="none" style="stroke:var(--logo-orbit)" stroke-width="3.6" stroke-linecap="round"/><circle cx="78.9" cy="61.5" r="7" fill="#E8803A" style="stroke:var(--card)" stroke-width="2.6"/></g></svg>',
      t: L2('Welcome to GoalTerra', 'أهلاً بك في GoalTerra'),
      p: L2(
        "Turn big goals into this week's steps, and show up every day. No account, no internet: everything stays on this phone.",
        'حوّل أهدافك الكبيرة إلى خطوات لهذا الأسبوع، والتزم بها كل يوم. بلا حساب وبلا إنترنت: كل شيء يبقى على هذا الهاتف.'
      ),
      x: `<div class="intro-row"><button type="button" class="${ar ? 'ghost' : 'btn'}" data-action="intro-lang" data-v="en">English</button><button type="button" class="${ar ? 'btn' : 'ghost'}" data-action="intro-lang" data-v="ar">العربية</button></div>`,
    },
    {
      i: '🪜',
      t: L2('The goal ladder', 'سلّم الأهداف'),
      p: L2(
        'Start with a 5-year goal, then break it into annual, monthly and weekly goals. Finish the small steps and progress climbs the ladder by itself.',
        'ابدأ بهدف لخمس سنوات، ثم قسّمه إلى أهداف سنوية وشهرية وأسبوعية. أنجز الخطوات الصغيرة وسيصعد التقدم في السلّم تلقائيًا.'
      ),
    },
    {
      i: '⚡',
      t: L2('Day levels', 'مستويات الأيام'),
      p: L2(
        `Every task you finish today raises your level: ⚡ Spark, 🔥 Blaze at ${L[1]}, ⚔️ Titan at ${L[2]}. Titan days get tougher on purpose. Tap the banner on the Dashboard to see your level calendar.`,
        `كل مهمة تنجزها اليوم ترفع مستواك: ⚡ شرارة، 🔥 لهب عند ${L[1]}، ⚔️ جبّار عند ${L[2]}. أيام الجبّار أصعب عن قصد. اضغط على الشريط في الرئيسية لترى تقويم مستوياتك.`
      ),
    },
    {
      i: '🔁',
      t: L2('Habits', 'العادات'),
      p: L2(
        'Add habits you want to build, and "avoid" habits for things you\'re quitting. Every clean day grows your 🛡 streak.',
        'أضف عادات تريد بناءها، وعادات "تجنّب" لأشياء تريد تركها. كل يوم نظيف يزيد سلسلتك 🛡.'
      ),
    },
    {
      i: '🎓',
      t: L2('Studying?', 'هل تدرس؟'),
      p: L2(
        'Student mode adds a Study tab: a revision timetable with Weak/OK/Strong ratings, spaced repetition and exam countdowns.',
        'وضع الطالب يضيف تبويب الدراسة: جدول مراجعة بتقييم ضعيف/مقبول/قوي، ومراجعة متباعدة، وعدّ تنازلي للامتحانات.'
      ),
      x: `<div class="intro-row"><button type="button" class="${stu ? 'btn' : 'ghost'}" data-action="intro-student">${stu ? L2('✓ Student mode on', '✓ وضع الطالب مفعّل') : L2('Turn on student mode', 'تفعيل وضع الطالب')}</button></div>`,
    },
    {
      i: '🚀',
      t: L2("You're set", 'أنت جاهز'),
      p: L2(
        'Your data lives only in this browser, so copy a backup from Settings now and then. Start with one goal for this week.',
        'بياناتك محفوظة في هذا المتصفح فقط، لذا انسخ نسخة احتياطية من الإعدادات بين حين وآخر. ابدأ بهدف واحد لهذا الأسبوع.'
      ),
      x: `<div class="intro-row"><button type="button" class="ghost" data-action="tpl-open">${L2('Use a template', 'استخدم قالبًا')}</button><button type="button" class="ghost" data-action="sample-add">${L2('Try sample data', 'جرّب بيانات تجريبية')}</button></div>`,
    },
  ];
  const st = steps[introStep],
    last = introStep === steps.length - 1;
  dlg.innerHTML = `<div class="intro">
    <div class="ii" aria-hidden="true">${st.i}</div><h3>${st.t}</h3><p>${st.p}</p>${st.x || ''}
    <div class="intro-dots" aria-hidden="true">${steps.map((_, i) => `<i class="${i === introStep ? 'on' : ''}"></i>`).join('')}</div>
    <div class="intro-nav">${introStep ? `<button type="button" class="ghost" data-action="intro-step" data-d="-1">${L2('Back', 'رجوع')}</button>` : `<button type="button" class="ghost" data-action="intro-done">${L2('Skip', 'تخطٍّ')}</button>`}<span class="grow"></span>
    ${last ? `<button type="button" class="ghost" data-action="intro-done" data-go="goals">${L2('Set my first goal', 'حدّد هدفي الأول')}</button><button type="button" class="btn" data-action="intro-done">${L2("Let's go", 'لنبدأ')}</button>` : `<button type="button" class="btn" data-action="intro-step" data-d="1">${L2('Next', 'التالي')}</button>`}</div></div>`;
}
dlg.addEventListener('close', () => {
  if (introOn) {
    introOn = false;
    markIntro();
  }
});
function openHabit(id) {
  const d = new Date();
  cal = { id, y: d.getFullYear(), m: d.getMonth() };
  drawHabit();
  dlg.showModal();
}
function drawHabit() {
  const h = S.habits.find((x) => x.id === cal.id);
  if (!h) {
    dlg.close();
    return;
  }
  const now = new Date(),
    today = TODAY(),
    createdK = h.created ? ds(new Date(h.created)) : null;
  const first = new Date(cal.y, cal.m, 1),
    lead = (first.getDay() + 6) % 7,
    days = new Date(cal.y, cal.m + 1, 0).getDate();
  let cells = '<span></span>'.repeat(lead),
    monthCount = 0;
  for (let d = 1; d <= days; d++) {
    const k = ds(new Date(cal.y, cal.m, d)),
      on = good(h, k),
      star = k === createdK;
    if (on) monthCount++;
    cells += `<button type="button" class="cd ${on ? 'on' : ''} ${k === today ? 'tod' : ''} ${isDue(h, new Date(cal.y, cal.m, d)) ? '' : 'off'}" ${k > today ? 'disabled' : `data-action="cal-toggle" data-date="${k}"`} aria-pressed="${on}" aria-label="${k}${star ? ', habit created' : ''}">${d}${star ? '<i class="star" aria-hidden="true">★</i>' : ''}</button>`;
  }
  const wk = [...Array(7)]
    .map((_, i) => `<span>${fmt(new Date(2024, 0, 1 + i), { weekday: 'narrow' })}</span>`)
    .join(''); // 1 Jan 2024 was a Monday
  const atNow = cal.y === now.getFullYear() && cal.m === now.getMonth();
  const created = createdK
    ? `<span><i class="star-inline">★</i> Created ${fmtDate(createdK)}${createdK.slice(0, 4) !== today.slice(0, 4) ? ', ' + createdK.slice(0, 4) : ''}</span>`
    : '';
  dlg.innerHTML = `<div class="hist">
    <div class="hist-top"><h3>${esc(h.name)}</h3><button type="button" class="icon" data-action="dlg-close" aria-label="Close">✕</button></div>
    <div class="hist-stats"><div><b>🔥 ${streak(h)}</b><span>Current</span></div><div><b>${bestStreak(h)}</b><span>Best streak</span></div><div><b>${habitDates(h).length}</b><span>Total days</span></div><div><b>${rate30(h)}%</b><span>Last 30</span></div></div>
    ${h.env ? `<p class="meta" translate="no">🛠 ${esc(h.env)}</p>` : ''}
    <div class="cal-nav"><button type="button" class="icon" data-action="cal-month" data-d="-1" aria-label="Previous month">‹</button><b>${fmt(first, { month: 'long', year: 'numeric' })}</b><button type="button" class="icon" data-action="cal-month" data-d="1" ${atNow ? 'disabled' : ''} aria-label="Next month">›</button></div>
    <div class="cal cal-wk">${wk}</div><div class="cal">${cells}</div>
    <div class="meta cal-foot"><span>${monthCount} day${monthCount === 1 ? '' : 's'} this month</span>${created}</div>
    <p class="meta">Tap any past day to check it off or undo it.</p></div>`;
}
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-action]')) {
    e.preventDefault();
    e.target.click();
  }
});
