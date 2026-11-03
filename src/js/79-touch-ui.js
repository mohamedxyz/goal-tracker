/**
 * Minimal touch UI (0.87.0): the floating add button (#fab) and the bottom add sheet (task, habit or goal),
 * the bottom "more" menu (moreMenu) and the habit row menu. The add forms live here, not on the screens.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */
const FAB_VIEWS = ['dash', 'tasks', 'goals', 'habits'];
/* A single "⋯" button that opens a bottom sheet of chips. Plain <details>, so it also works without JS. */
function moreMenu(inner) {
  return `<details class="moremenu"><summary class="chip" aria-label="${L2('More', 'المزيد')}" title="${L2('More', 'المزيد')}">⋯</summary><div>${inner}</div></details>`;
}
document.addEventListener('click', (e) => {
  const d = e.target;
  if (d && d.matches && d.matches('details.moremenu[open]')) d.open = false; /* tap on the dimmed backdrop */
  else if (!(d.closest && d.closest('details.moremenu')))
    document.querySelectorAll('details.moremenu[open]').forEach((x) => (x.open = false));
});
function fabSync() {
  const f = document.getElementById('fab');
  if (!f) return;
  f.hidden = !FAB_VIEWS.includes(S.view) || !!S.selMode;
  f.setAttribute('aria-label', L2('Add', 'إضافة'));
}
const addKindFor = (v) => (v === 'habits' ? 'habit' : v === 'goals' ? 'goal' : 'task');
const fld = (label, inner) => `<label class="fl"><span>${label}</span>${inner}</label>`;
function taskAddForm() {
  const today = TODAY();
  const due = S.cfg.dueDef === 'none' ? '' : S.cfg.dueDef === 'tomorrow' ? ds(addDays(new Date(), 1)) : today;
  const pri = [
    ['low', L2('Low', 'منخفضة')],
    ['med', L2('Medium', 'متوسطة')],
    ['high', L2('High', 'عالية')],
  ];
  return `<form class="add sheetform" data-form="task" data-sheet="1">
    ${fld(L2('Task', 'المهمة'), `<input type="text" name="title" placeholder="${L2('try: call mom tomorrow 5pm !high', 'جرّب: اتصل بأمي غدًا 5م')}" required autocomplete="off" aria-describedby="qaHint">`)}
    <div class="qa-hint" id="qaHint" aria-live="polite" hidden></div>
    <details class="more"><summary>${L2('More options', 'خيارات إضافية')}</summary><div class="moreg">
    ${fld(L2('Due date', 'تاريخ الاستحقاق'), `<input type="date" name="due" value="${due}">`)}
    ${fld(L2('Priority', 'الأولوية'), `<select name="priority">${pri.map(([v, l]) => `<option value="${v}" ${S.cfg.prio === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
    ${fld(L2('Repeat', 'التكرار'), `<select name="repeat">${REPEATS.map(([v, l]) => `<option value="${v}">${v ? '🔁 ' : ''}${l}</option>`).join('')}</select>`)}
    ${fld(L2('Weekly goal', 'هدف أسبوعي'), `<select name="goalId">${goalOptions('', (g) => g.horizon === 'weekly')}</select>`)}
    ${fld(L2('Tag folder', 'مجلد الوسم'), `<input type="text" name="tag" list="tagListAdd" autocomplete="off">${tagList('tagListAdd')}`)}
    ${fld(L2('Notes', 'ملاحظات'), '<textarea name="notes"></textarea>')}
    ${fld(L2('Checklist (one item per line)', 'قائمة (بند في كل سطر)'), '<textarea name="items"></textarea>')}
    </div></details>
    <button class="btn big" type="submit">${L2('Add task', 'أضف المهمة')}</button></form>`;
}
function habitAddForm() {
  return `<form class="add sheetform" data-form="habit" data-sheet="1">
    ${fld(L2('Habit', 'العادة'), `<input type="text" name="name" placeholder="${L2('e.g. Code 1 hour, or No smoking', 'مثال: برمجة ساعة، أو بلا تدخين')}" required autocomplete="off">`)}
    ${fld(L2('Type', 'النوع'), `<select name="kind"><option value="">${L2('Build: tick it when done', 'بناء: أشّر عند الإنجاز')}</option><option value="avoid">${S.cfg.avoidMode === 'confirm' ? L2('Avoid: tick each clean day', 'تجنّب: أشّر كل يوم نظيف') : L2('Avoid: clean unless you slip', 'تجنّب: نظيف ما لم تزلّ')}</option></select>`)}
    <details class="more"><summary>${L2('More options', 'خيارات إضافية')}</summary><div class="moreg">
    ${fld(L2('Target days per week', 'أيام الهدف في الأسبوع'), `<select name="target">${[7, 6, 5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n}×/${L2('week', 'أسبوع')}</option>`).join('')}</select>`)}
    ${fld(L2('Folder', 'المجلد'), `<input type="text" name="group" list="folderListAdd" autocomplete="off">${folderList('folderListAdd')}`)}
    ${colorField(HC[S.habits.length % HC.length])}${dayPicker()}${stickFields()}
    </div></details>
    <button class="btn big" type="submit">${L2('Add habit', 'أضف العادة')}</button></form>`;
}
function goalAddForm() {
  const ladder = S.horizon === 'ladder',
    h = ladder ? 'weekly' : S.horizon,
    cur = currentPeriod(h),
    ph = PARENT[h],
    defKind = h === 'weekly' ? 'check' : 'rollup';
  const hz = Object.keys(HORIZONS)
    .map(
      (k) =>
        `<button type="button" class="chip ${k === h ? 'on' : ''}" data-action="add-hz" data-v="${k}" aria-pressed="${k === h}">${{ weekly: L2('Week', 'أسبوع'), monthly: L2('Month', 'شهر'), annual: L2('Year', 'سنة'), five: L2('5 Years', '5 سنوات') }[k]}</button>`
    )
    .join('');
  return `<form class="add sheetform" data-form="goal" data-sheet="1" data-kind="${defKind}">
    <div class="filters">${hz}</div>
    ${fld(L2('Goal', 'الهدف'), `<input type="text" name="title" placeholder="${L2('New ' + HORIZONS[h].toLowerCase() + ' goal', 'هدف جديد')}" required autocomplete="off">`)}
    <details class="more"><summary>${L2('More options', 'خيارات إضافية')}</summary><div class="moreg">
    ${fld(L2('Period', 'الفترة'), `<input type="text" name="period" value="${cur}">`)}
    ${fld(L2('How will you measure it?', 'كيف ستقيسه؟'), `<select name="kind"><option value="check" ${defKind === 'check' ? 'selected' : ''}>☐ ${L2('Checkbox', 'مربع اختيار')}</option><option value="number">🔢 ${L2('Number target', 'هدف رقمي')}</option>${h !== 'weekly' ? `<option value="rollup" selected>🧩 ${L2('Built from ' + HORIZONS[CHILD[h]].toLowerCase() + ' goals', 'مبني من أهداف أدنى')}</option>` : ''}</select>`)}
    <span class="f-num">${fld(L2('Target', 'الهدف الرقمي'), '<input type="number" name="target" min="0" step="any" placeholder="40">')}${fld(L2('Unit', 'الوحدة'), `<input type="text" name="unit" placeholder="${L2('hours', 'ساعات')}">`)}</span>
    ${h !== 'weekly' ? `<span class="f-roll">${fld(L2('How many sub-goals?', 'كم هدفًا فرعيًا؟'), `<input type="number" name="expected" min="1" step="1" placeholder="${defaultExpected({ horizon: h, period: cur })}">`)}</span>` : ''}
    ${ph ? fld(L2('Supports which goal?', 'يدعم أي هدف؟'), `<select name="parentId">${goalOptions('', (g) => g.horizon === ph).replace('— No goal —', '— ' + L2('None', 'لا شيء') + ' —')}</select>`) : ''}
    ${fld(L2('Why it matters (optional)', 'لماذا يهم (اختياري)'), '<textarea name="notes"></textarea>')}
    </div></details>
    <button class="btn big" type="submit">${L2('Add goal', 'أضف الهدف')}</button></form>`;
}
function openAddSheet(kind) {
  kind = kind || addKindFor(S.view);
  S.addKind = kind;
  const tab = (k, l) =>
    `<button type="button" class="${kind === k ? 'on' : ''}" data-action="add-kind" data-v="${k}" role="tab" aria-selected="${kind === k}">${l}</button>`;
  const form = kind === 'habit' ? habitAddForm() : kind === 'goal' ? goalAddForm() : taskAddForm();
  dlg.innerHTML = `<div class="addsheet"><div class="sheet-head"><h3>${L2('New', 'جديد')}</h3><button type="button" class="icon" data-action="dlg-close" aria-label="${L2('Close', 'إغلاق')}">✕</button></div>
    <div class="seg" role="tablist">${tab('task', L2('Task', 'مهمة'))}${tab('habit', L2('Habit', 'عادة'))}${tab('goal', L2('Goal', 'هدف'))}</div>${form}</div>`;
  if (!dlg.open) dlg.showModal();
  setTimeout(() => {
    const i = dlg.querySelector('form input[type=text]');
    if (i && dlg.open) i.focus({ preventScroll: true });
  }, 60);
}
function habitMenu(id) {
  const h = S.habits.find((x) => x.id === id);
  if (!h) return;
  dlg.innerHTML = `<div class="tmenu"><h3 translate="no">${esc(h.name)}</h3>
    ${h.mini && !good(h, TODAY()) ? `<button class="ghost" data-action="tm" data-do="log-mini" data-id="${id}" data-date="${TODAY()}">½ <span translate="no">${esc(h.mini)}</span></button>` : ''}
    <button class="ghost" data-action="tm" data-do="edit-habit" data-id="${id}">✎ ${L2('Edit', 'تعديل')}</button>
    <button class="ghost" data-action="tm" data-do="open-habit" data-id="${id}">📅 ${L2('History', 'السجل')}</button>
    <button class="ghost" data-action="tm" data-do="share-item" data-k="habit" data-id="${id}">${SHARE_ICON} ${L2('Share', 'مشاركة')}</button>
    <button class="ghost danger" data-action="tm" data-do="del-habit" data-id="${id}">✕ ${L2('Delete', 'حذف')}</button>
    <button class="ghost" data-action="dlg-close">${L2('Cancel', 'إلغاء')}</button></div>`;
  dlg.showModal();
}
function goalMenu(id) {
  const g = S.goals.find((x) => x.id === id);
  if (!g) return;
  dlg.innerHTML = `<div class="tmenu"><h3>${esc(g.title)}</h3>
    <button class="ghost" data-action="tm" data-do="edit-goal" data-id="${id}">✎ ${L2('Edit', 'تعديل')}</button>
    <button class="ghost danger" data-action="tm" data-do="del-goal" data-id="${id}">✕ ${L2('Delete', 'حذف')}</button>
    <button class="ghost" data-action="dlg-close">${L2('Cancel', 'إلغاء')}</button></div>`;
  dlg.showModal();
}
/* ---------- Habit colours and the habit grid (0.87.0) ---------- */
const HC = ['coral', 'amber', 'lime', 'teal', 'sky', 'violet', 'pink', 'sand'];
const HC_AR = ['مرجاني', 'عنبري', 'ليموني', 'فيروزي', 'سماوي', 'بنفسجي', 'وردي', 'رملي'];
const habitColor = (h) => (HC.includes(h.color) ? h.color : HC[Math.max(0, S.habits.indexOf(h)) % HC.length]);
/* Habits without a colour get the next free swatch (by position), saved once. */
function ensureHabitColors() {
  S.habits.forEach((h, i) => {
    if (!HC.includes(h.color)) {
      h.color = HC[i % HC.length];
      DB.put('habits', h);
    }
  });
}
function colorField(sel) {
  return `<fieldset class="swatches"><legend>${L2('Colour', 'اللون')}</legend>${HC.map(
    (c, i) =>
      `<label class="swatch" style="--hc:var(--pc-${c})"><input type="radio" name="color" value="${c}" ${c === sel ? 'checked' : ''} aria-label="${L2(c, HC_AR[i])}"><span></span></label>`
  ).join('')}</fieldset>`;
}
function habitGridHead() {
  const cols = [0, 1, 2, 3]
    .map((i) => {
      const d = addDays(new Date(), -i);
      return `<span class="hg-h ${i === 0 ? 'today' : ''}">${fmt(d, { weekday: 'short' })}<b>${d.getDate()}</b></span>`;
    })
    .join('');
  return `<div class="hg-head" aria-hidden="true"><span class="hg-who"></span><span class="hg-cols">${cols}</span></div>`;
}
function habitCell(h, i) {
  const d = addDays(new Date(), -i),
    k = ds(d),
    today = TODAY(),
    on = good(h, k);
  let st, ch;
  if (isMini(h.id, k)) (st = 'half'), (ch = '½');
  else if (on) (st = 'on'), (ch = '✓');
  else if (isNeg(h) && (slipMode(h) ? logged(h.id, k) : k >= bornK(h) && k < today)) (st = 'slip'), (ch = '✕');
  else if (!isDue(h, d)) (st = 'off'), (ch = '–');
  else if (k < bornK(h) || k === today) (st = 'unk'), (ch = '?');
  else (st = 'miss'), (ch = '✕');
  const state = {
    on: L2('done', 'منجز'),
    half: L2('half', 'نصف'),
    slip: L2('slip', 'زلّة'),
    off: L2('not due', 'غير مستحق'),
    unk: L2('not logged', 'غير مسجل'),
    miss: L2('missed', 'فائت'),
  }[st];
  return `<button type="button" class="hg-cell ${st}" translate="no" data-action="toggle-log" data-id="${h.id}" data-date="${k}" aria-pressed="${on}" aria-label="${esc(h.name)} ${k}: ${state}">${ch}</button>`;
}
function habitRow(h) {
  const sm = selOn('habits'),
    c = habitColor(h),
    r = rate30(h),
    C = 2 * Math.PI * 12,
    s = streak(h);
  const ring = `<svg class="hg-ring" viewBox="0 0 30 30" width="30" height="30" aria-hidden="true"><circle cx="15" cy="15" r="12" class="bg"/><circle cx="15" cy="15" r="12" class="fg" stroke-dasharray="${((r / 100) * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 15 15)"/></svg>`;
  const cells = S.reorder
    ? mvBtns('move-habit', h.id, `data-id="${h.id}"`)
    : `<span class="hg-cols">${[0, 1, 2, 3].map((i) => habitCell(h, i)).join('')}</span>`;
  return `<div class="hg-row ${sm && S.sel.has(h.id) ? 'selected' : ''}" style="--hc:var(--pc-${habitColor(h)})" ${sm ? `data-action="sel-toggle" data-id="${h.id}"` : ''}>${sm ? selBox(h.id) : ''}<button type="button" class="hg-who" data-action="habit-menu" data-id="${h.id}" title="${L2('Edit and more', 'تعديل والمزيد')}">${ring}<span class="hg-t"><span class="hg-n" translate="no" dir="auto">${isNeg(h) ? '🚫 ' : ''}${h.icon ? esc(h.icon) + ' ' : ''}${esc(h.name)}</span><small>${isNeg(h) ? '🛡' : '🔥'} ${s} · ${weekCount(h)}/${weekTarget(h)}</small></span></button>${cells}</div>`;
}
const habitGrid = (hs) =>
  `${habitGridHead()}<div class="hg">${hs.map((h) => habitRow(h) + ((hint) => (hint ? `<div class="hg-hint">${hint}</div>` : ''))(habitHint(h))).join('')}</div>`;
