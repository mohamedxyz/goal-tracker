/**
 * HTML for one task row (taskItem), one habit card (habitCard) and shared date formatting (fmtDay, dueLeft).
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Components ---------- */
const ARCHIVE_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></svg>';
function fmtWhen(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear() !== new Date().getFullYear();
  return fmt(d, {
    month: 'short',
    day: 'numeric',
    ...(y ? { year: 'numeric' } : {}),
    hour: 'numeric',
    minute: '2-digit',
  });
}
function fmtDay(s) {
  return s ? fmt(new Date(s + 'T00:00'), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}
function dueLeft(due) {
  const n = Math.round((new Date(due + 'T00:00') - new Date(TODAY() + 'T00:00')) / 864e5);
  const txt =
    n < 0
      ? `${-n} day${n === -1 ? '' : 's'} late`
      : n === 0
        ? 'Today'
        : n === 1
          ? 'Tomorrow'
          : n <= 7
            ? `${n} days left`
            : fmtDate(due);
  const cls = n < 0 ? 'hot' : n === 0 ? 'warm' : n <= 3 ? 'soon' : '';
  return `<span class="pill ${cls}" title="${fmtDay(due)}">${txt}</span>`;
}
function taskItem(t) {
  const g = t.goalId && goalById(t.goalId);
  const today = TODAY();
  const overdue = !t.done && t.due && t.due < today;
  const sm = selOn('tasks');
  const dp = t.done ? '' : t.due ? dueLeft(t.due) : '';
  return `<li class="item trow2 pr-${t.priority || 'low'} ${t.done ? 'done dim' : ''} ${sm && S.sel.has(t.id) ? 'selected' : ''}">
    ${sm ? selBox(t.id) : `<input type="checkbox" data-action="toggle-task" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Complete">`}
    <div class="grow" ${sm ? `data-action="sel-toggle" data-id="${t.id}" role="button" tabindex="0"` : `data-action="info-task" data-id="${t.id}" role="button" tabindex="0"`}><div class="title">${iconPrefix(t)}${esc(t.title)}</div>
      ${t.notes && S.cfg.showNotes ? `<div class="tnotes">${esc(t.notes)}</div>` : ''}
      ${(t.items || []).length && S.cfg.showSubs ? `<ul class="subs">${t.items.map((it, i) => `<li><label class="${it.done ? 'sdone' : ''}"><input type="checkbox" data-action="toggle-sub" data-id="${t.id}" data-i="${i}" ${it.done ? 'checked' : ''}><span>${esc(it.text)}</span></label></li>`).join('')}</ul>` : ''}
      <div class="meta">
        ${(t.items || []).length ? `<span title="Checklist">☑ ${t.items.filter((i) => i.done).length}/${t.items.length}</span>` : ''}
        ${t.done && t.doneAt ? `<span>Done ${fmtWhen(t.doneAt)}</span>` : ''}
        ${t.done && t.due && !(t.doneAt && ds(new Date(t.doneAt)) === t.due) ? `<span>${fmtDate(t.due)}</span>` : ''}
        ${t.tag ? `<span class="tag">#${esc(t.tag)}</span>` : ''}
        ${t.focus ? `<span title="Focus time">⏱ ${fmtMin(t.focus)}</span>` : ''}
        ${(t.pushes || []).length ? `<span title="Pushed back: ${esc(t.pushes[t.pushes.length - 1].why)}">↻ ${t.pushes.length}×</span>` : ''}
        ${t.repeat ? `<span title="Repeats">🔁 ${REPEAT_LABEL[t.repeat] || ''}</span>` : ''}
        ${g ? `<span class="tag">${esc(g.title)}</span>` : ''}
      </div></div>
    ${dp}<button class="icon" data-action="task-menu" data-id="${t.id}" title="More" aria-label="More actions">⋯</button></li>`;
}
function dayButtons(h, n = 7) {
  const today = TODAY();
  let out = '';
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const k = ds(d);
    out += `<button class="day ${good(h, k) ? 'on' : ''} ${isNeg(h) && (slipMode(h) ? logged(h.id, k) : k >= bornK(h) && k < today && !logged(h.id, k)) ? 'slip' : ''} ${k === today ? 'today' : ''} ${isDue(h, d) ? '' : 'off'}" data-action="toggle-log" data-id="${h.id}" data-date="${k}" title="${k}">
      ${fmt(d, { weekday: 'narrow' })}<b>${d.getDate()}</b></button>`;
  }
  return `<div class="days">${out}</div>`;
}
function habitCard(h, full) {
  const s = streak(h);
  const sm = full && selOn('habits'),
    cm = full && (S.compact || (S.cfg.student && S.cfg.stuCompact));
  if (cm)
    return `<div class="card hcompact ${sm && S.sel.has(h.id) ? 'selected' : ''}" ${sm ? `data-action="sel-toggle" data-id="${h.id}"` : ''}><div class="habit">${sm ? selBox(h.id) : ''}
    <div class="grow habit-open" ${sm ? '' : `data-action="open-habit" data-id="${h.id}" role="button" tabindex="0" title="Open history"`}><div class="title">${hname(h)}</div>
      <div class="meta"><span class="streak">${isNeg(h) ? '🛡' : '🔥'}${s}</span><span>${weekCount(h)}/${weekTarget(h)} this wk</span></div></div>
    ${dayButtons(h)}
    ${mvBtns('move-habit', h.id, `data-id="${h.id}"`)}<button class="icon" data-action="edit-habit" data-id="${h.id}" title="Edit" aria-label="Edit">✎</button></div></div>`;
  let heat = '';
  if (full) {
    for (let i = 27; i >= 0; i--) {
      const k = ds(addDays(new Date(), -i));
      heat += `<i class="${good(h, k) ? 'on' : ''}" title="${k}"></i>`;
    }
  }
  return `<div class="card ${sm && S.sel.has(h.id) ? 'selected' : ''}" ${sm ? `data-action="sel-toggle" data-id="${h.id}"` : ''}><div class="habit">${sm ? selBox(h.id) : ''}
    <div class="grow habit-open" ${sm ? '' : `data-action="open-habit" data-id="${h.id}" role="button" tabindex="0" title="Open history"`}><div class="title">${hname(h)} <span class="chev">›</span></div>
      <div class="meta"><span class="streak">${isNeg(h) ? '🛡 ' + s + ' day' + (s === 1 ? '' : 's') + ' clean' : '🔥 ' + s + ' day' + (s === 1 ? '' : 's')}</span>
        <span>This week ${weekCount(h)}/${weekTarget(h)}</span>${full ? `<span>30-day ${rate30(h)}%</span>` : ''}${hasSched(h) ? `<span>${schedText(h)}</span>` : ''}</div></div>
    ${dayButtons(h)}
    ${full ? `${mvBtns('move-habit', h.id, `data-id="${h.id}"`)}${shareBtn('habit', h.id)}<button class="icon" data-action="edit-habit" data-id="${h.id}" title="Edit" aria-label="Edit ${esc(h.name)}">✎</button><button class="icon" data-action="del-habit" data-id="${h.id}" title="Delete" aria-label="Delete ${esc(h.name)}">✕</button>` : ''}
  </div>${full ? `<div class="heat">${heat}</div>` : ''}</div>`;
}
