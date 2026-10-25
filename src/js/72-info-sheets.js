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
  } else if (kind === 'game') {
    const A = rpgAll(),
      have = earned(),
      L = lvlAt(),
      B = badges();
    const row = (icon, head, text) => `<div class="irow"><span>${icon} ${head}</span><b>${text}</b></div>`;
    const body = `<p class="meta">${L2('Everything you finish hits this week’s boss. It is only a mirror of what you really did, so nothing is lost if you skip the game.', 'كل ما تنجزه يضرب زعيم هذا الأسبوع. إنه مرآة لما فعلته فقط، فلا تخسر شيئًا إن تجاهلت اللعبة.')}</p>
      <div class="inf-list"><b>${L2('What deals damage', 'ما الذي يسبب الضرر')}</b>
      <div>⚔️ ${L2('Tasks: low 10, medium 20, high 30. ×1.5 when linked to a weekly goal, +20% if finished early, half if late.', 'المهام: منخفضة 10، متوسطة 20، عالية 30. ×1.5 إن ارتبطت بهدف أسبوعي، +20% عند الإنجاز مبكرًا، والنصف إن تأخرت.')}</div>
      <div>🔁 ${L2('Habits: 5 per check-in, up to 10 as a streak grows.', 'العادات: 5 لكل تسجيل، حتى 10 مع نمو السلسلة.')}</div>
      <div>⏱ ${L2('Focus: 2 per 5 minutes.', 'التركيز: 2 لكل 5 دقائق.')}${S.cfg.student ? ' 📚 ' + L2('Study: 5, 8 or 12 per session.', 'الدراسة: 5 أو 8 أو 12 للجلسة.') : ''}</div></div>
      <div class="inf-list"><b>${L2('Day levels', 'مستويات اليوم')}</b>
      <div>⚡ ${L2('Spark', 'الشرارة')} ${L2('is a normal day.', 'يوم عادي.')} 🔥 ${L2('Blaze', 'اللهب')} ${L2('from ' + L[1] + ' tasks: +10% damage.', 'من ' + L[1] + ' مهام: +10% ضرر.')} ⚔️ ${L2('Titan', 'الجبّار')} ${L2('from ' + L[2] + ' tasks: +25% and critical hits.', 'من ' + L[2] + ' مهام: +25% وضربات حرجة.')}</div></div>
      <div class="inf-list"><b>${L2('The boss’s HP', 'صحة الزعيم')}</b>
      <div>${L2('HP means health: the damage you must deal in a week. It is the highest of: 80% of the damage you planned, 90% of your recent weekly average, or 60. One huge week raises the next boss by at most 25%.', 'الصحة هي الضرر المطلوب في الأسبوع. تساوي الأعلى بين: 80% مما خططت له، أو 90% من متوسطك الأسبوعي الأخير، أو 60. أسبوع ضخم واحد يرفع الزعيم التالي 25% كحد أقصى.')}</div>
      <div>${L2('Once it is defeated it stays defeated. Damage beyond its HP becomes a small XP bonus (overkill).', 'إذا هُزم يبقى مهزومًا. الضرر الزائد يتحول إلى مكافأة صغيرة (ضربة قاضية).')}</div></div>
      <div class="inf-list"><b>${L2('Shields and morale', 'الدروع والمعنويات')}</b>
      <div>🛡 ${L2('Each clean day on an avoid habit adds a shield (up to 3).', 'كل يوم نظيف على عادة تجنّب يضيف درعًا (حتى 3).')}</div>
      <div>❤ ${L2('A day with no damage makes the boss counterattack: a shield blocks it, otherwise morale drops 25%. At 0 it knocks you out and heals the boss 20%. A defeated boss no longer attacks that week.', 'يوم بلا ضرر يجعل الزعيم يهاجم: الدرع يصدّه وإلا هبطت المعنويات 25%. عند 0 يُغمى عليك ويشفى الزعيم 20%. الزعيم المهزوم لا يهاجم بقية الأسبوع.')}</div>
      <div>🌙 ${L2('Rest tokens (one per week won) let you take a day off with no counterattack.', 'رموز الراحة (واحد لكل أسبوع تفوز به) تتيح يوم راحة بلا هجوم.')}</div></div>
      <div class="inf-list"><b>${L2('Badges', 'الأوسمة')} ${B.filter((b) => have.has(b.id) || b.ok).length}/${B.length}</b>
      <div class="badges">${B.map((b) => `<div class="badge ${have.has(b.id) || b.ok ? 'on' : ''}" title="${esc(b.desc)}"><span>${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div></div>
      ${irow(L2('Weeks won in a row', 'أسابيع متتالية'), String(A.streak))}${irow(L2('Best streak', 'أفضل سلسلة'), String(A.bestStreak))}`;
    infoShell(
      L2('How the game works', 'كيف تعمل اللعبة'),
      body,
      iBtn('🏰 ' + L2('Tower', 'البرج'), 'open-tower', '') +
        iBtn('📖 ' + L2('Bestiary', 'الموسوعة'), 'open-bestiary', '', 'btn')
    );
  } else if (kind === 'habits') {
    const row = (icon, head, text) => `<div class="irow"><span>${icon} ${head}</span><b>${text}</b></div>`;
    infoShell(
      L2('How habits work', 'كيف تعمل العادات'),
      `<p class="meta">${L2('Built on the four laws of Atomic Habits. Everything under "Make it stick" is optional.', 'مبنية على القوانين الأربعة لكتاب العادات الذرية. كل ما تحت «اجعلها تثبت» اختياري.')}</p>
      <div class="inf-list"><b>${L2('1. Make it obvious', '1. اجعلها واضحة')}</b>
      <div>${L2('Say when and where, and stack it after something you already do: "After my morning coffee, I will read."', 'حدّد الوقت والمكان واربطها بشيء تفعله أصلًا: «بعد قهوة الصباح سأقرأ».')}</div></div>
      <div class="inf-list"><b>${L2('2. Make it attractive', '2. اجعلها جذابة')}</b>
      <div>${L2('Every check-in is a vote for the person you want to become. Pair it with a treat you only allow after.', 'كل إنجاز هو صوت للشخص الذي تريد أن تصبحه. اربطها بمكافأة لا تأخذها إلا بعدها.')}</div></div>
      <div class="inf-list"><b>${L2('3. Make it easy', '3. اجعلها سهلة')}</b>
      <div>${L2('Give a habit a two-minute version. Tapping ½ counts for the streak and the ring, for half the XP. Showing up beats doing it perfectly.', 'أعطِ العادة نسخة من دقيقتين. زر ½ يحسب للسلسلة والحلقة بنصف النقاط. الحضور أهم من الكمال.')}</div></div>
      <div class="inf-list"><b>${L2('4. Make it satisfying', '4. اجعلها ممتعة')}</b>
      <div>${L2('You see the XP at once, the ring fills as you go, and 3, 7, 14, 30, 60 and 100 days get a celebration.', 'ترى النقاط فورًا، وتمتلئ الحلقة أثناء التقدم، ويُحتفل بأيام 3 و7 و14 و30 و60 و100.')}</div></div>
      <div class="inf-list"><b>${L2('Never miss twice', 'لا تفوّت مرتين')}</b>
      <div>${L2('One missed day does not break your streak. Two due days in a row do.', 'يوم واحد فائت لا يكسر سلسلتك. يومان مستحقان متتاليان يكسرانها.')}</div></div>`,
      `<button type="button" class="btn" data-action="dlg-close">${L2('Got it', 'فهمت')}</button>`
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
      iBtn('❓ ' + L2('How it works', 'كيف تعمل'), 'info-game', '') +
        iBtn('🏰 ' + L2('Tower', 'البرج'), 'open-tower', '') +
        iBtn('📖 ' + L2('Bestiary', 'الموسوعة'), 'open-bestiary', '', 'btn')
    );
  }
}
