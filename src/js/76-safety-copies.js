/**
 * Safety copies: automatic snapshots kept in a SEPARATE IndexedDB (goal-tracker-snap), so a bad restore,
 * an erase or a bug in the main database can always be rolled back. Also the "Check my data" repair tool.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */
const SNAP_KEEP = 10;
const Snap = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res) => {
      try {
        const r = indexedDB.open('goal-tracker-snap', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('snaps', { keyPath: 'id' });
        r.onsuccess = () => res((this.db = r.result));
        r.onerror = () => res(null);
      } catch (e) {
        res(null);
      }
    });
  },
  async run(mode, fn) {
    const db = await this.open();
    if (!db) throw new Error('no snapshot storage');
    return new Promise((res, rej) => {
      const t = db.transaction('snaps', mode),
        r = fn(t.objectStore('snaps'));
      t.oncomplete = () => res(r && 'result' in r ? r.result : undefined);
      t.onerror = () => rej(t.error);
    });
  },
  all() {
    return this.run('readonly', (s) => s.getAll()).then((a) => (a || []).sort((x, y) => y.at - x.at));
  },
  put(v) {
    return this.run('readwrite', (s) => s.put(v));
  },
  del(id) {
    return this.run('readwrite', (s) => s.delete(id));
  },
};
/* Save a snapshot of everything. Returns the record, or null when there is nothing to save or storage failed. */
async function snapSave(reason) {
  const n = {
    tasks: S.tasks.length,
    goals: S.goals.length,
    habits: S.habits.length,
    logs: S.logs.size,
    topics: S.topics.length,
    exams: S.exams.length,
  };
  if (!(n.tasks + n.goals + n.habits + n.topics + n.exams)) return null;
  try {
    const rec = {
      id: 's' + Date.now() + Math.random().toString(36).slice(2, 5),
      at: Date.now(),
      reason,
      n,
      json: JSON.stringify(backupData()),
    };
    await Snap.put(rec);
    const all = await Snap.all();
    for (const old of all.slice(SNAP_KEEP)) await Snap.del(old.id);
    return rec;
  } catch (e) {
    return null;
  }
}
/* Once per app update and once per day, quietly. */
async function snapBoot() {
  let last = '',
    day = '';
  try {
    last = localStorage.getItem('gt-lastver') || '';
    day = localStorage.getItem('gt-snap-day') || '';
  } catch (e) {}
  const reason = last && last !== APP_VERSION ? 'update' : day !== TODAY() ? 'daily' : '';
  if (reason) await snapSave(reason);
  try {
    localStorage.setItem('gt-lastver', APP_VERSION);
    localStorage.setItem('gt-snap-day', TODAY());
  } catch (e) {}
}
const snapWhy = (r) =>
  ({
    daily: L2('Daily copy', 'نسخة يومية'),
    update: L2('Before an app update', 'قبل تحديث التطبيق'),
    restore: L2('Before a restore', 'قبل الاستعادة'),
    erase: L2('Before erasing', 'قبل المسح'),
    check: L2('Before a data repair', 'قبل إصلاح البيانات'),
  })[r] || r;
function viewSafety() {
  const list = S.snaps || [];
  const row = (r) =>
    `<div class="card trash-row"><div class="grow"><div class="title">${esc(fmtWhen(r.at))}</div>
      <div class="meta"><span>${snapWhy(r.reason)}</span><span>${r.n.tasks} ${L2('tasks', 'مهمة')}</span><span>${r.n.goals} ${L2('goals', 'هدف')}</span><span>${r.n.habits} ${L2('habits', 'عادة')}</span></div></div>
      <button class="btn" data-action="snap-restore" data-id="${esc(r.id)}">${L2('Restore', 'استعادة')}</button></div>`;
  return `<div class="arch-head"><button class="ghost" data-action="back-data">${L2('← Settings', '← الإعدادات')}</button><h2 style="margin:0">${L2('Safety copies', 'نسخ الأمان')}</h2></div>
    <div class="bar-row"><span class="meta" style="margin:0">${L2(`The app keeps its own copies on this device (last ${SNAP_KEEP}): daily, before updates, before a restore and before erasing. Restoring one replaces what you have now, and takes a copy of that first.`, `يحتفظ التطبيق بنسخ على هذا الجهاز (آخر ${SNAP_KEEP}): يوميًا، وقبل التحديثات، وقبل الاستعادة وقبل المسح. الاستعادة تستبدل بياناتك الحالية وتحفظ نسخة منها أولًا.`)}</span>
      <button class="ghost" data-action="snap-now">${L2('Save one now', 'احفظ نسخة الآن')}</button></div>
    ${list.length ? `<div class="goals">${list.map(row).join('')}</div>` : `<div class="empty">${L2('No safety copies yet.', 'لا توجد نسخ أمان بعد.')}</div>`}`;
}
/* ---------- Check my data ---------- */
function dataIssues() {
  const gid = new Set(S.goals.map((g) => g.id)),
    hid = new Set(S.habits.map((h) => h.id));
  return {
    tasks: S.tasks.filter((t) => t.goalId && !gid.has(t.goalId)),
    goals: S.goals.filter((g) => g.parentId && !gid.has(g.parentId)),
    logs: [...S.logs].filter((k) => !hid.has(k.slice(0, k.lastIndexOf('|')))),
    starts: S.tasks.filter((t) => t.start && !t.due),
  };
}
async function dataCheck() {
  const q = dataIssues(),
    total = q.tasks.length + q.goals.length + q.logs.length + q.starts.length;
  if (!total) {
    await askAlert(
      L2('Everything checks out. No broken links or leftovers found.', 'كل شيء سليم. لا توجد روابط مكسورة ولا بقايا.')
    );
    return false;
  }
  const lines = [
    q.tasks.length &&
      L2(`${q.tasks.length} task(s) point to a goal that no longer exists`, `${q.tasks.length} مهمة مرتبطة بهدف محذوف`),
    q.goals.length &&
      L2(`${q.goals.length} goal(s) point to a missing parent goal`, `${q.goals.length} هدف مرتبط بهدف أعلى محذوف`),
    q.logs.length &&
      L2(`${q.logs.length} check-in(s) belong to a deleted habit`, `${q.logs.length} تسجيل يخص عادة محذوفة`),
    q.starts.length &&
      L2(`${q.starts.length} task(s) have a start time but no date`, `${q.starts.length} مهمة لها وقت بداية بلا تاريخ`),
  ].filter(Boolean);
  if (
    !(await askConfirm(
      lines.join('\n') +
        '\n\n' +
        L2(
          'Fix them? A safety copy is saved first. Nothing is deleted except the leftover check-ins.',
          'هل تصلحها؟ تُحفظ نسخة أمان أولًا. لا يُحذف شيء سوى التسجيلات اليتيمة.'
        )
    ))
  )
    return false;
  if (!(await snapSave('check'))) {
    await askAlert(
      L2("Couldn't save a safety copy, so nothing was changed.", 'تعذّر حفظ نسخة أمان، لذلك لم يتغير شيء.')
    );
    return false;
  }
  for (const t of q.tasks) {
    t.goalId = null;
    await DB.put('tasks', t);
  }
  for (const g of q.goals) {
    g.parentId = null;
    await DB.put('goals', g);
  }
  for (const t of q.starts) {
    t.start = null;
    await DB.put('tasks', t);
  }
  for (const k of q.logs) {
    S.logs.delete(k);
    await DB.del('logs', k);
  }
  toast(L2(`Fixed ${total} thing(s).`, `تم إصلاح ${total} عنصر.`));
}
/* ---------- Edit history (last 5 titles and notes) ---------- */
function histPush(item, prevTitle, prevNotes) {
  if (prevTitle === item.title && (prevNotes || '') === (item.notes || '')) return;
  item.hist = [{ at: Date.now(), title: prevTitle, notes: prevNotes || '' }, ...(item.hist || [])].slice(0, 5);
}
function histBox(item) {
  const h = (item && item.hist) || [];
  if (!h.length) return '';
  return `<details class="more"><summary>${L2('Earlier versions', 'نسخ سابقة')} (${h.length})</summary>${h
    .map(
      (x, i) =>
        `<div class="row" style="margin:6px 0;align-items:center"><span class="meta grow" translate="no">${esc(fmtWhen(x.at))} · ${esc(x.title)}${x.notes ? ' · ' + esc(x.notes.slice(0, 40)) : ''}</span><button type="button" class="chip" data-action="hist-use" data-i="${i}">${L2('Use', 'استخدم')}</button></div>`
    )
    .join('')}</details>`;
}
