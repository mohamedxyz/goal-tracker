/**
 * Info sheets: tapping a task, goal or the week boss opens openInfo() with the full details.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Info sheets: tap a task, goal or boss for the full picture ---------- */
const irow = (l, v) => (v ? `<div class="irow"><span>${l}</span><b>${v}</b></div>` : '');
const iBtn = (label, act, id, cls) =>
  `<button type="button" class="${cls || 'ghost'}" data-action="tm" data-do="${act}" data-id="${id}">${label}</button>`;
function infoShell(title, body, acts) {
  dlg.innerHTML = `<div class="hist info"><div class="hist-top"><h3>${title}</h3><button type="button" class="icon" data-action="dlg-close" aria-label="Close">✕</button></div>${body}<div class="dlg-actions">${acts}</div></div>`;
  if (!dlg.open) dlg.showModal();
}
function openInfo(kind, id) {
  if (kind === 'task') {
    const t = S.tasks.find((x) => x.id === id);
    if (!t) return;
    const g = t.goalId && goalById(t.goalId),
      items = t.items || [];
    const pr = { high: L2('High', 'عالية'), med: L2('Medium', 'متوسطة'), low: L2('Low', 'منخفضة') }[t.priority] || '';
    const body = `<div class="inf-sub">${t.done ? L2('Done', 'منجزة') + (t.doneAt ? ' · ' + fmtWhen(t.doneAt) : '') : t.due ? dueLeft(t.due) : L2('No due date', 'بلا موعد')}</div>
      ${irow(L2('Due', 'الموعد'), t.due ? fmtDay(t.due) : '')}${irow(L2('Time block', 'الفترة'), isBlock(t) ? blockTime(t) : '')}${irow(L2('Priority', 'الأولوية'), pr)}${irow(L2('Goal', 'الهدف'), g ? esc(g.title) : '')}${irow(L2('Folder', 'المجلد'), t.tag ? '#' + esc(t.tag) : '')}
      ${irow(L2('Repeats', 'التكرار'), t.repeat ? REPEAT_LABEL[t.repeat] || '' : '')}${irow(L2('Focus time', 'وقت التركيز'), t.focus ? fmtMin(t.focus) : '')}
      ${irow(L2('Pushed back', 'أُجّلت'), (t.pushes || []).length ? t.pushes.length + '×' : '')}${irow(L2('Created', 'أُنشئت'), t.created ? fmtDate(ds(new Date(t.created))) : '')}
      ${t.notes ? `<div class="inf-notes">${esc(t.notes)}</div>` : ''}
      ${items.length ? `<div class="inf-list"><b>${L2('Checklist', 'القائمة')} ${items.filter((i) => i.done).length}/${items.length}</b>${items.map((i) => `<div class="${i.done ? 'sdone' : ''}">${i.done ? '☑' : '☐'} ${esc(i.text)}</div>`).join('')}</div>` : ''}`;
    infoShell(
      iconPrefix(t) + esc(t.title),
      body,
      iBtn(t.done ? L2('Reopen', 'إعادة فتح') : '✓ ' + L2('Done', 'تم'), 'toggle-task', id) +
        (t.done ? '' : iBtn('⏱ ' + L2('Focus', 'تركيز'), 'ft-start', id)) +
        (isBlock(t) ? iBtn('✕ ' + L2('Unschedule', 'إلغاء الجدولة'), 'plan-unset', id) : '') +
        iBtn('✎ ' + L2('Edit', 'تعديل'), 'edit-task', id, 'btn')
    );
  } else if (kind === 'goal') {
    const g = goalById(id);
    if (!g) return;
    const p = progress(g),
      par = g.parentId && goalById(g.parentId),
      k = goalKind(g);
    const kids = S.goals.filter((c) => c.parentId === g.id),
      tasks = S.tasks.filter((x) => x.goalId === g.id);
    const kindL =
      {
        check: L2('Checkbox or linked tasks', 'مربع أو مهام مرتبطة'),
        number: L2('Number target', 'هدف رقمي'),
        rollup: L2('Built from sub-goals', 'من أهداف فرعية'),
      }[k] || '';
    const st = g.done
      ? L2('Done', 'منجز')
      : g.status === 'missed'
        ? L2('Missed', 'فائت')
        : needsReview(g)
          ? L2('Needs review', 'يحتاج مراجعة')
          : L2('Active', 'نشط');
    const body = `<div class="inf-sub">${esc(HORIZONS[g.horizon])} · ${esc(g.period)} · ${st}</div>
      <div class="bar"><span style="width:${p}%"></span></div><div class="meta" style="margin:4px 0 8px">${p}%${goalDetail(g) ? ' · ' + goalDetail(g) : ''}</div>
      ${irow(L2('Measured by', 'يُقاس بـ'), kindL)}${k === 'number' ? irow(L2('Progress', 'التقدم'), `${fmtNum(g.value)} / ${fmtNum(g.target)} ${esc(g.unit || '')}`) : ''}${irow(L2('Supports', 'يدعم'), par ? esc(par.title) : '')}
      ${g.notes ? `<div class="inf-notes">${esc(g.notes)}</div>` : ''}${g.lesson ? `<div class="inf-notes">${esc(g.lesson)}</div>` : ''}
      ${kids.length ? `<div class="inf-list"><b>${L2('Sub-goals', 'أهداف فرعية')}</b>${kids.map((c) => `<div class="${c.done ? 'sdone' : ''}">${c.done ? '☑' : '☐'} ${esc(c.title)} <span class="meta">${progress(c)}%</span></div>`).join('')}</div>` : ''}
      ${
        tasks.length
          ? `<div class="inf-list"><b>${L2('Linked tasks', 'المهام المرتبطة')} ${tasks.filter((x) => x.done).length}/${tasks.length}</b>${tasks
              .slice(0, 12)
              .map((x) => `<div class="${x.done ? 'sdone' : ''}">${x.done ? '☑' : '☐'} ${esc(x.title)}</div>`)
              .join('')}</div>`
          : ''
      }`;
    infoShell(
      iconPrefix(g) + esc(g.title),
      body,
      iBtn(g.done ? L2('Reopen', 'إعادة فتح') : '✓ ' + L2('Complete', 'إكمال'), 'done-goal', id) +
        iBtn('✎ ' + L2('Edit', 'تعديل'), 'edit-goal', id, 'btn')
    );
  } else if (kind === 'boss') {
    if (!rpgOn()) return;
    const A = rpgAll(),
      w = A.cur,
      m = monster(w.key),
      left = Math.max(0, w.hp - w.total),
      pct = Math.max(0, Math.round((left / w.hp) * 100)),
      dl = 7 - ((new Date().getDay() + 6) % 7);
    const src = [
      ['⚔️', L2('Tasks', 'المهام'), w.tD],
      ['🔁', L2('Habits', 'العادات'), w.hD],
      S.cfg.student ? ['📚', L2('Study', 'الدراسة'), w.sD] : null,
      w.fD ? ['⏱', L2('Focus', 'التركيز'), w.fD] : null,
    ].filter(Boolean);
    const body = `<div class="inf-boss"><div class="rpg-spr">${m.svg}</div><div><b translate="no">${m.name}</b><div class="meta">${m.title}</div></div></div>
      <div class="bar hp"><span style="width:${pct}%"></span></div><div class="meta" style="margin:4px 0 8px">${w.won ? L2('Defeated', 'هُزم') : L2(`${left} of ${w.hp} HP left · ${dl === 1 ? 'last day' : dl + ' days left'}`, `تبقّى ${left} من ${w.hp} · ${dl === 1 ? 'آخر يوم' : dl + ' أيام'}`)}</div>
      <div class="inf-list"><b>${L2('Damage so far', 'الضرر حتى الآن')}</b>${src.map((s) => `<div>${s[0]} ${s[1]} <b>${s[2]}</b></div>`).join('')}</div>
      ${irow(L2('Shields', 'الدروع'), A.shields + '/3')}${irow(L2('Morale', 'المعنويات'), A.morale + '%')}${irow(L2('Rest tokens', 'رموز الراحة'), String(A.tokens))}
      <p class="meta">${L2('Every finished task, habit, study session and focus minute hits it. High priority, finishing early and Titan days hit harder. Clean days on avoid habits charge shields that block its counterattacks.', 'كل مهمة أو عادة أو جلسة دراسة أو دقيقة تركيز تضربه. الأولوية العالية والإنجاز المبكر وأيام تايتان تضرب أقوى. الأيام النظيفة في عادات التجنّب تشحن دروعًا تصدّ هجماته.')}</p>`;
    infoShell(
      L2('Week boss', 'زعيم الأسبوع'),
      body,
      iBtn('🏰 ' + L2('Tower', 'البرج'), 'open-tower', '') +
        iBtn('📖 ' + L2('Bestiary', 'الموسوعة'), 'open-bestiary', '', 'btn')
    );
  }
}
