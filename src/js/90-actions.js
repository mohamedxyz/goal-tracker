/**
 * All click handling: the `actions` object (one entry per data-action in the HTML), the document-level click, change and submit listeners, and long-press to select.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Actions ---------- */
async function toggleLog(hid, date) {
  const id = hid + '|' + date;
  const hh = S.habits.find((x) => x.id === hid),
    neg = hh && slipMode(hh);
  if (S.logs.has(id)) {
    const long = hh && !neg && streak(hh) >= 7;
    S.logs.delete(id);
    await DB.del('logs', id);
    Sound.play(neg ? 'habit' : 'undo');
    if (long)
      toastUndo(`Removed a check-in from "${hh.name}".`, async () => {
        S.logs.add(id);
        await DB.put('logs', { id, habitId: hid, date });
      });
  } else if (neg) {
    S.logs.add(id);
    await DB.put('logs', { id, habitId: hid, date });
    Sound.play('undo');
    toast(`Slip logged for "${hh.name}". Tap the day again to undo.`);
  } else {
    S.logs.add(id);
    S.mini.delete(id);
    await DB.put('logs', { id, habitId: hid, date });
    await habitWin(hh, date, false);
  }
}
/* Reward for a check-in: floating +XP, milestone, perfect day or folder-complete toast. */
const MILES = [3, 7, 14, 30, 60, 100];
async function habitWin(h, date, mini) {
  const fx = S.cfg.habitFx !== false;
  if (h && !isNeg(h)) {
    if (fx) {
      const xp = Math.max(1, Math.round(habitHit(h, date) / (mini ? 2 : 1)));
      S.fx = {
        sel: `[data-action="toggle-log"][data-id="${h.id}"][data-date="${date}"]`,
        text: rpgOn() ? `+${xp} XP` : `+1 ${L2('vote', 'صوت')}`,
      };
    }
    if (fx && date === TODAY()) {
      const s = streak(h),
        key = h.id + ':' + s,
        seen = (S.cfg.mile || '').split(',');
      if (MILES.includes(s) && !seen.includes(key)) {
        S.cfg.mile = [...seen.filter(Boolean), key].join(',');
        saveCfg();
        Sound.play('goal');
        const v = habitDates(h).length;
        toast(
          h.ident
            ? L2(
                `🔥 ${s} days in a row: ${v} votes for being ${h.ident}`,
                `🔥 ${s} يومًا متتاليًا: ${v} صوتًا لتصبح ${h.ident}`
              )
            : L2(`🔥 ${s} days in a row: ${h.name}`, `🔥 ${s} يومًا متتاليًا: ${h.name}`)
        );
        return;
      }
      const due = S.habits.filter((x) => !isNeg(x) && dueToday(x));
      if (due.length && due.every((x) => good(x, date))) {
        Sound.play('goal');
        toast(L2('🎉 Perfect day: every habit done', '🎉 يوم مثالي: أنجزت كل العادات'));
        return;
      }
    }
  }
  const g = h && folderOf(h);
  if (g && date === TODAY() && S.habits.filter((x) => folderOf(x) === g && dueToday(x)).every((x) => good(x, date))) {
    Sound.play('goal');
    toast(`✅ ${g}: all done for today`);
  } else Sound.play('habit');
}
const actions = {
  'see-overdue'() {
    S.taskFilter = 'overdue';
    S.view = 'tasks';
    scrollTo(0, 0);
  },
  async 'archive-task'(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    t.archived = true;
    t.archivedAt = Date.now();
    await DB.put('tasks', t);
  },
  async unarchive(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    t.archived = false;
    t.archivedAt = null;
    await DB.put('tasks', t);
  },
  'toggle-done-all'() {
    S.doneAll = !S.doneAll;
  },
  'toggle-done-list'() {
    S.doneOpen = !S.doneOpen;
  },
  'rpg-more'() {
    S.rpgOpen = !S.rpgOpen;
  },
  'tip-ok'(el) {
    try {
      localStorage.setItem('gt-tips', JSON.stringify([...new Set([...tipSeen(), el.dataset.k])]));
    } catch (e) {}
  },
  'tips-reset'() {
    try {
      localStorage.removeItem('gt-tips');
    } catch (e) {}
    toast(L2('Tips will show again.', 'ستظهر النصائح مجددًا.'));
  },
  'set-acc'(el) {
    S.setOpen = S.setOpen || new Set();
    const k = el.dataset.k;
    S.setOpen.has(k) ? S.setOpen.delete(k) : S.setOpen.add(k);
  },
  'open-share'() {
    openShare();
    return false;
  },
  'share-item'(el) {
    openShare(el.dataset.k + ':' + el.dataset.id);
    return false;
  },
  'open-share-import'() {
    openShareImport();
    return false;
  },
  'open-archive'() {
    S.view = 'archive';
    scrollTo(0, 0);
  },
  'back-data'() {
    S.view = 'data';
    scrollTo(0, 0);
  },
  palette(el) {
    setPalette(el.dataset.v);
  },
  'ladd-open'(el) {
    S.ladAdd = el.dataset.id;
    setTimeout(() => {
      const i = document.querySelector('.ladd input');
      if (i) i.focus();
    }, 40);
  },
  'ladd-close'() {
    S.ladAdd = null;
  },
  'tasks-cal'() {
    S.tcalOn = !S.tcalOn;
    if (S.tcalOn && S.planOn && PLAN.day && typeof tcal !== 'undefined' && tcal) {
      const d = new Date(PLAN.day + 'T00:00');
      tcal = { y: d.getFullYear(), m: d.getMonth(), sel: PLAN.day }; // open the calendar on the day you were planning
    }
    S.planOn = false;
    if (S.selMode) S.selMode = null;
  },
  /* ----- Time blocking (Plan view) ----- */
  'tasks-plan'() {
    if (!S.planOn && S.tcalOn && tcal) PLAN.day = tcal.sel === TODAY() ? null : tcal.sel; // plan the day picked in the calendar
    S.planOn = !S.planOn;
    S.tcalOn = false;
    PLAN.pick = null;
    if (S.selMode) S.selMode = null;
    if (S.planOn) setTimeout(scrollPlan, 80);
  },
  'plan-day'(el) {
    PLAN.day = ds(addDays(new Date((PLAN.day || TODAY()) + 'T00:00'), +el.dataset.d));
    PLAN.pick = null;
  },
  'plan-today'() {
    PLAN.day = null;
    setTimeout(scrollPlan, 80);
  },
  'plan-pick'(el) {
    PLAN.pick = PLAN.pick === el.dataset.id ? null : el.dataset.id;
  },
  async 'plan-slot'(el) {
    const min = +el.dataset.min,
      day = PLAN.day || TODAY();
    const t = PLAN.pick && S.tasks.find((x) => x.id === PLAN.pick);
    if (t) {
      PLAN.pick = null;
      await planChange(t, L2('Scheduled at ' + hmText(min), 'جُدولت عند ' + hmText(min)), () => {
        t.due = day;
        t.start = fromMin(min);
        t.dur = t.dur || 60;
      });
      return;
    }
    const raw = await askPrompt(
      L2(
        'New block at ' + hmText(min) + ' (tip: add "for 90 min")',
        'فترة جديدة عند ' + hmText(min) + ' (نصيحة: أضف «لمدة 90 دقيقة»)'
      )
    );
    if (!raw || !raw.trim()) return false;
    // You can type a time and length too, e.g. "Study at 4pm for 90 min"; otherwise the tapped time is used.
    const q = parseQuick(raw + ' ' + fromMin(min));
    const typed = parseQuick(raw);
    if (typed.start) Object.assign(q, typed);
    const nb = {
      id: uid(),
      title: q.title,
      start: q.start,
      dur: q.dur || 60,
      notes: '',
      repeat: '',
      tag: q.tag || '',
      items: [],
      due: day,
      priority: q.priority || S.cfg.prio,
      goalId: null,
      done: false,
      created: Date.now(),
    };
    S.tasks.push(nb);
    await DB.put('tasks', nb);
    toastUndo(L2('Block added', 'أُضيفت الفترة'), async () => {
      S.tasks = S.tasks.filter((x) => x.id !== nb.id);
      await DB.del('tasks', nb.id);
    });
  },
  /* Selected block: move it 15 minutes, or make it 15 minutes shorter or longer. */
  async 'plan-nudge'(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    if (!t || !t.start) return;
    const to = Math.max(0, Math.min(1440 - blockLen(t), toMin(t.start) + +el.dataset.d));
    await planChange(t, L2('Moved to ' + hmText(to), 'نُقلت إلى ' + hmText(to)), () => (t.start = fromMin(to)));
  },
  async 'plan-len'(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    if (!t || !t.start) return;
    const len = Math.max(15, Math.min(480, blockLen(t) + +el.dataset.d, 1440 - toMin(t.start)));
    await planChange(t, L2('Length ' + lenText(len), 'المدة ' + lenText(len)), () => (t.dur = len));
  },
  async 'plan-unset'(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    if (!t) return;
    PLAN.pick = null;
    await planChange(t, L2('Unscheduled', 'أُلغيت الجدولة'), () => (t.start = null));
  },
  'tcal-day'(el) {
    tcal.sel = el.dataset.date;
  },
  'tcal-month'(el) {
    const d = new Date(tcal.y, tcal.m + +el.dataset.d, 1);
    tcal.y = d.getFullYear();
    tcal.m = d.getMonth();
  },
  'tcal-today'() {
    const d = new Date();
    tcal = { y: d.getFullYear(), m: d.getMonth(), sel: TODAY() };
  },
  async 'rw-set'(el) {
    const k = el.dataset.k,
      o = getRw(),
      cur = o[k] ? o[k].t : '';
    const v = await askPrompt('Your reward for beating this boss (leave empty to remove):', cur);
    if (v === null) return false;
    const t = v.trim();
    if (t) o[k] = { t: t.slice(0, 80), c: o[k] ? o[k].c : 0 };
    else delete o[k];
    setRw(o);
  },
  'rw-claim'(el) {
    const o = getRw(),
      k = el.dataset.k;
    if (o[k]) {
      o[k].c = 1;
      setRw(o);
      Sound.play('goal');
      toast('🎁 Enjoy it. You earned it.');
    }
  },
  'rest-day'() {
    const t = TODAY(),
      y = ds(addDays(new Date(), -1)),
      A = rpgAll();
    dlg.innerHTML = `<div class="hist"><div class="hist-top"><h3>🛌 Rest day</h3><button type="button" class="icon" data-action="dlg-close" aria-label="Close">✕</button></div>
      <p class="meta">A rest day keeps every streak intact and stops the boss counterattacking. You have ${A.tokens} rest token${A.tokens === 1 ? '' : 's'}; you earn one for each weekly boss you beat.</p>
      <div class="dlg-actions"><button type="button" class="ghost" data-action="rest-use" data-d="${y}" ${isRest(y) ? 'disabled' : ''}>Rest yesterday</button><button type="button" class="btn" data-action="rest-use" data-d="${t}" ${isRest(t) ? 'disabled' : ''}>Rest today</button></div></div>`;
    dlg.showModal();
    return false;
  },
  'rest-use'(el) {
    const A = rpgAll();
    if (A.tokens < 1) return false;
    const d = el.dataset.d,
      set = new Set((S.cfg.restDays || '').split(',').filter(Boolean));
    set.add(d);
    S.cfg.restDays = [...set].sort().join(',');
    _rest = null;
    saveCfg();
    dlg.close();
    toast('🛌 Rest day set. Streaks are safe.');
  },
  async 'cls-del'(el) {
    const a = getClasses(),
      c = a.find((x) => x.id === el.dataset.id);
    if (!c || !(await askConfirm(`Delete "${c.subject}" on ${dayName(+c.day)}?`))) return false;
    setClasses(a.filter((x) => x.id !== c.id));
  },
  'tpl-open'() {
    if (introOn) {
      introOn = false;
      markIntro();
    }
    openTemplates();
    return false;
  },
  async 'tpl-use'(el) {
    const t = TEMPLATES[el.dataset.k];
    if (!t) return false;
    if (introOn) {
      introOn = false;
      markIntro();
    }
    await t.run();
    if (dlg.open) dlg.close();
    S.view = 'goals';
    S.horizon = 'ladder';
    scrollTo(0, 0);
    toast(L2('Template added: ', 'أُضيف القالب: ') + t.n());
  },
  async 'sample-add'() {
    if (introOn) {
      introOn = false;
      markIntro();
    }
    if (hasSample()) {
      if (dlg.open) dlg.close();
      return;
    }
    await addSample();
    if (dlg.open) dlg.close();
    S.view = 'dash';
    scrollTo(0, 0);
    toast(
      L2(
        'Sample data loaded. Clear it any time from the banner.',
        'حُمّلت البيانات التجريبية. امسحها متى شئت من الشريط.'
      )
    );
  },
  async 'sample-clear'() {
    if (!(await askConfirm('Remove all sample items? Your own items stay.'))) return false;
    const n = await clearSample();
    toast(L2(`Removed ${n} sample items.`, `أُزيل ${n} عنصرًا تجريبيًا.`));
  },
  'open-month'() {
    mrev.off = 0;
    drawMonth();
    dlg.showModal();
    return false;
  },
  'mrev-nav'(el) {
    mrev.off = Math.min(0, mrev.off + +el.dataset.d);
    drawMonth();
    return false;
  },
  async 'n-test'() {
    await GTNative.testNotify();
    toast(L2('A test notification arrives in a few seconds.', 'سيصل إشعار تجريبي خلال ثوانٍ.'));
    return false;
  },
  async 'n-exact'() {
    await GTNative.allowExact();
    return false;
  },
  'open-tower'() {
    S.view = 'goals';
    S.horizon = 'ladder';
    scrollTo(0, 0);
  },
  'open-bestiary'() {
    S.view = 'bestiary';
    scrollTo(0, 0);
  },
  'back-dash'() {
    S.view = 'dash';
    scrollTo(0, 0);
  },
  async 'purge-archived'() {
    const gone = S.tasks.filter((t) => t.archived && t.done);
    if (
      !gone.length ||
      !(await askConfirm(
        `Permanently delete ${gone.length} completed archived task${gone.length > 1 ? 's' : ''}?\n\nThis can't be undone. Not-completed archived tasks are kept.`
      ))
    )
      return false;
    for (const t of gone) await DB.del('tasks', t.id);
    S.tasks = S.tasks.filter((t) => !gone.includes(t));
    toastUndo(`Deleted ${gone.length} archived task${gone.length > 1 ? 's' : ''}.`, async () => {
      for (const t of gone) {
        S.tasks.push(t);
        await DB.put('tasks', t);
      }
    });
  },
  'open-habit'(el) {
    openHabit(el.dataset.id);
    return false;
  },
  'info-task'(el) {
    openInfo('task', el.dataset.id);
    return false;
  },
  'info-goal'(el) {
    openInfo('goal', el.dataset.id);
    return false;
  },
  'info-game'() {
    openInfo('game');
    return false;
  },
  'info-boss'() {
    openInfo('boss');
    return false;
  },
  'icon-toggle'(el) {
    const grid = el.closest('.iconpick').querySelector('.icon-grid');
    grid.hidden = !grid.hidden;
    return false;
  },
  'icon-pick'(el) {
    const box = el.closest('.iconpick');
    box.querySelector('input[name=icon]').value = el.dataset.i;
    box.querySelector('.icon-cur').textContent = el.dataset.i || '＋';
    box.querySelector('.icon-grid').hidden = true;
    return false;
  },
  async 'cal-toggle'(el) {
    await toggleLog(cal.id, el.dataset.date);
    drawHabit();
  },
  'cal-month'(el) {
    const d = new Date(cal.y, cal.m + +el.dataset.d, 1);
    cal.y = d.getFullYear();
    cal.m = d.getMonth();
    drawHabit();
    return false;
  },
  'dlg-close'() {
    dlg.close();
    return false;
  },
  'open-levels'() {
    openLevels();
    return false;
  },
  'lvl-month'(el) {
    const d = new Date(lcal.y, lcal.m + +el.dataset.d, 1);
    lcal.y = d.getFullYear();
    lcal.m = d.getMonth();
    lcal.sel = null;
    drawLevels();
    return false;
  },
  'lvl-day'(el) {
    lcal.sel = lcal.sel === el.dataset.date ? null : el.dataset.date;
    drawLevels();
    return false;
  },
  'open-intro'() {
    openIntro();
    return false;
  },
  'intro-step'(el) {
    introStep = Math.max(0, Math.min(5, introStep + +el.dataset.d));
    drawIntro();
    return false;
  },
  'intro-lang'(el) {
    S.cfg.lang = el.dataset.v;
    saveCfg();
    applyLang();
    render();
    drawIntro();
  },
  'intro-student'() {
    S.cfg.student = !S.cfg.student;
    saveCfg();
    render();
    drawIntro();
  },
  'intro-done'(el) {
    introOn = false;
    markIntro();
    dlg.close();
    if (el.dataset.go) {
      S.view = el.dataset.go;
      scrollTo(0, 0);
    }
  },
  'edit-task'(el) {
    openEdit('task', el.dataset.id);
    return false;
  },
  'edit-goal'(el) {
    openEdit('goal', el.dataset.id);
    return false;
  },
  'edit-habit'(el) {
    openEdit('habit', el.dataset.id);
    return false;
  },
  async 'toggle-sub'(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    const it = t && t.items[+el.dataset.i];
    if (!it) return;
    it.done = !it.done;
    if (!t.done) {
      if (it.done) {
        it.at = Date.now();
        it.dmg = Math.max(1, Math.round(taskBase(t) / t.items.length));
      } else {
        delete it.at;
        delete it.dmg;
      }
    }
    Sound.play(it.done ? 'task' : 'undo');
    await DB.put('tasks', t);
  },
  async 'toggle-task'(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    freezeDmg(t);
    Sound.play(t.done ? 'task' : 'undo');
    await DB.put('tasks', t);
    await onTaskDone(t);
  },
  'toggle-hide-done'() {
    S.hideDone = !S.hideDone;
    try {
      localStorage.setItem('gt-hide-done', S.hideDone ? '1' : '0');
    } catch (e) {}
  },
  'toggle-folder'(el) {
    const n = el.dataset.name;
    if (n.startsWith('sub:')) {
      S.subOpen = S.subOpen || new Set();
      S.subOpen.has(n) ? S.subOpen.delete(n) : S.subOpen.add(n);
      return;
    }
    S.collapsed.has(n) ? S.collapsed.delete(n) : S.collapsed.add(n);
    saveCollapsed();
  },
  async 'rename-folder'(el) {
    const old = el.dataset.name;
    const r = await askPrompt(`Rename folder "${old}"\n(Leave empty to remove the folder. Its habits are kept.)`, old);
    if (r === null) return false;
    const nn = r.trim();
    if (nn === old) return false;
    for (const h of S.habits.filter((x) => folderOf(x) === old)) {
      h.group = nn;
      await DB.put('habits', h);
    }
    if (S.collapsed.delete(old) && nn) S.collapsed.add(nn);
    saveCollapsed();
    S.forder = S.forder.map((x) => (x === old ? nn : x)).filter(Boolean);
    saveForder();
  },
  'toggle-reorder'() {
    S.reorder = !S.reorder;
  },
  async 'move-habit'(el) {
    const all = sortedHabits();
    const h = all.find((x) => x.id === el.dataset.id);
    const g = folderOf(h);
    const sib = all.filter((x) => folderOf(x) === g);
    const i = sib.indexOf(h),
      j = i + +el.dataset.d;
    if (j < 0 || j >= sib.length) return false;
    [sib[i], sib[j]] = [sib[j], sib[i]];
    let k = 0;
    const out = all.map((x) => (folderOf(x) === g ? sib[k++] : x));
    for (let n = 0; n < out.length; n++)
      if (out[n].order !== n) {
        out[n].order = n;
        await DB.put('habits', out[n]);
      }
  },
  'move-folder'(el) {
    const names = [...new Set(sortedHabits().map(folderOf).filter(Boolean))].sort((a, b) => {
      const x = S.forder.indexOf(a),
        y = S.forder.indexOf(b);
      return (x < 0 ? 1e6 : x) - (y < 0 ? 1e6 : y);
    });
    const i = names.indexOf(el.dataset.name),
      j = i + +el.dataset.d;
    if (i < 0 || j < 0 || j >= names.length) return false;
    [names[i], names[j]] = [names[j], names[i]];
    S.forder = names;
    saveForder();
  },
  'topic-cell'(el) {
    showCellMenu(el);
    return false;
  },
  async 'topic-set'(el) {
    const t = S.topics.find((x) => x.id === el.dataset.id);
    if (!t) return false;
    const d = el.dataset.d,
      c = +el.dataset.c;
    t.sessions = t.sessions || [];
    const i = t.sessions.findIndex((x) => x.d === d);
    if (c === 0) {
      if (i >= 0) t.sessions.splice(i, 1);
      Sound.play('undo');
    } else {
      if (i < 0) t.sessions.push({ d, c });
      else t.sessions[i].c = c;
      Sound.play(c === 3 ? 'task' : 'habit');
    }
    hideCellMenu();
    S.popKey = `[data-action="topic-cell"][data-id="${CSS.escape(t.id)}"][data-d="${d}"]`;
    await DB.put('topics', t);
  },
  'add-exam'() {
    openEdit('exam', 'new');
    return false;
  },
  'edit-exam'(el) {
    openEdit('exam', el.dataset.id);
    return false;
  },
  'toggle-past-exams'() {
    S.examsPast = !S.examsPast;
  },
  async 'del-exam'(el) {
    const e = S.exams.find((x) => x.id === el.dataset.id);
    if (!e || !(await askConfirm(`Delete "${e.title}"?`))) return false;
    S.exams = S.exams.filter((x) => x !== e);
    await DB.del('exams', e.id);
    await trashAdd('exam', e);
    toastUndo('Deleted.', async () => {
      await trashRestore('exam:' + e.id);
    });
  },
  async 'topic-rate'(el) {
    const t = S.topics.find((x) => x.id === el.dataset.id);
    if (!t) return false;
    const c = +el.dataset.c,
      d = TODAY();
    const row = el.closest('.pick');
    if (row) {
      row.classList.add('leaving');
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise((r) => setTimeout(r, 260));
    }
    t.sessions = t.sessions || [];
    const prev0 = t.sessions.find((x) => x.d === d),
      prevC = prev0 ? prev0.c : null;
    const i = t.sessions.findIndex((x) => x.d === d);
    if (i < 0) t.sessions.push({ d, c });
    else t.sessions[i].c = c;
    Sound.play(c === 3 ? 'task' : 'habit');
    await DB.put('topics', t);
    toastUndo(L2('Rated.', 'تم التقييم.'), async () => {
      const k = t.sessions.findIndex((x) => x.d === d);
      if (prevC === null) {
        if (k >= 0) t.sessions.splice(k, 1);
      } else if (k >= 0) t.sessions[k].c = prevC;
      else t.sessions.push({ d, c: prevC });
      await DB.put('topics', t);
    });
  },
  async 'score-info'() {
    await askAlert(scoreInfoText());
    return false;
  },
  'dash-all'() {
    S.dashAll = !S.dashAll;
  },
  'dash-hab'() {
    S.dashHab = !S.dashHab;
  },
  'picks-all'() {
    S.picksAll = !S.picksAll;
  },
  'goto-study'() {
    S.view = 'study';
    scrollTo(0, 0);
  },
  'edit-topic'(el) {
    openEdit('topic', el.dataset.id);
    return false;
  },
  async 'del-topic'(el) {
    const t = S.topics.find((x) => x.id === el.dataset.id);
    if (!t || !(await askConfirm(`Delete topic "${t.name}" and its study log?`))) return false;
    S.topics = S.topics.filter((x) => x !== t);
    await DB.del('topics', t.id);
    await trashAdd('topic', t);
    toastUndo('Topic deleted.', async () => {
      await trashRestore('topic:' + t.id);
    });
  },
  'toggle-compact'() {
    S.compact = !S.compact;
    try {
      localStorage.setItem('gt-compact', S.compact ? '1' : '0');
    } catch (e) {}
  },
  set(el) {
    const k = el.dataset.k,
      v = el.type === 'checkbox' ? el.checked : el.value;
    if (k === 'sound') {
      Sound.set(v);
      if (v) Sound.play('task');
    } else if (k === 'hideDone') {
      S.hideDone = v;
      try {
        localStorage.setItem('gt-hide-done', v ? '1' : '0');
      } catch (e) {}
    } else if (k === 'compact') {
      S.compact = v;
      try {
        localStorage.setItem('gt-compact', v ? '1' : '0');
      } catch (e) {}
    } else if (k === 'theme') setTheme(v);
    else if (k in CFG_DEF) {
      S.cfg[k] = v;
      if (k === 'rpg' && v && !S.cfg.rpgSince) S.cfg.rpgSince = TODAY();
      saveCfg();
      if (k === 'lang') applyLang();
      if (k === 'autoArch')
        return autoArchive().then(() => {
          render();
        });
    }
  },
  'toggle-sound'() {
    Sound.set(!Sound.on);
    if (Sound.on) Sound.play('task');
  },
  async 'del-task'(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    if (!t) return false;
    if (
      S.cfg.cTask &&
      !(await askConfirm(
        `Delete "${t.title}"?\n\nIt stays in Trash (Settings) for ${TRASH_DAYS} days.${t.archived ? '' : ' Tip: archive it instead to keep it with your tasks.'}`
      ))
    )
      return false;
    if (
      beastOn() &&
      !t.done &&
      !t.archived &&
      t.due &&
      t.due <= TODAY() &&
      !(await askWhy('deleting work that is due'))
    ) {
      toast('Not deleted. Titan wants a reason.');
      return false;
    }
    await removeTasks([t]);
    toastUndo('Task moved to Trash.', async () => {
      await trashRestore('task:' + t.id);
    });
  },
  'task-filter'(el) {
    S.taskFilter = el.dataset.v;
  },
  'toggle-ins'() {
    S.insOpen = !S.insOpen;
  },
  async 'coach-pull-n'(el) {
    const today = TODAY(),
      n = +el.dataset.n || 1;
    const list = S.tasks
      .filter((t) => !t.done && !t.archived && t.due && t.due > today)
      .sort((a, b) => a.due.localeCompare(b.due) || (a.created || 0) - (b.created || 0))
      .slice(0, n);
    const old = list.map((t) => t.due);
    for (const t of list) {
      t.due = today;
      await DB.put('tasks', t);
    }
    toastUndo(`Pulled ${list.length} into today.`, async () => {
      for (let i = 0; i < list.length; i++) {
        list[i].due = old[i];
        await DB.put('tasks', list[i]);
      }
    });
  },
  async 'coach-pull'(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    if (!t) return false;
    const old = t.due;
    t.due = TODAY();
    await DB.put('tasks', t);
    toastUndo('Pulled into today.', async () => {
      t.due = old;
      await DB.put('tasks', t);
    });
  },
  'task-menu'(el) {
    const t = S.tasks.find((x) => x.id === el.dataset.id);
    if (!t) return false;
    const id = t.id;
    dlg.innerHTML = `<div class="tmenu"><h3>${esc(t.title)}</h3>
      ${t.done ? '' : `<button class="ghost" data-action="tm" data-do="ft-start" data-id="${id}">⏱ Focus ${S.cfg.focusLen} min</button>`}
      <button class="ghost" data-action="tm" data-do="edit-task" data-id="${id}">✎ Edit</button>
      <button class="ghost" data-action="tm" data-do="share-item" data-k="task" data-id="${id}">${SHARE_ICON} Share</button>
      <button class="ghost" data-action="tm" data-do="archive-task" data-id="${id}">${ARCHIVE_ICON} Archive</button>
      <button class="ghost danger" data-action="tm" data-do="del-task" data-id="${id}">✕ Delete</button>
      <button class="ghost" data-action="dlg-close">Cancel</button></div>`;
    dlg.showModal();
    return false;
  },
  async tm(el) {
    dlg.close();
    const r = await actions[el.dataset.do](el);
    return r;
  },
  async 'ft-start'(el) {
    if (FT && FT.phase === 'focus' && !(await askConfirm('Stop the current focus session and start a new one?')))
      return false;
    ftStart(el.dataset.id, 'focus');
    return false;
  },
  'ft-toggle'() {
    ftToggle();
    return false;
  },
  'ft-skip'() {
    FT = null;
    ftSave();
    natCancel('focus');
    ftTick(true);
    return false;
  },
  async 'ft-stop'() {
    await ftStop();
    return false;
  },
  'sel-mode'(el) {
    if (S.selMode === el.dataset.k) {
      S.selMode = null;
    } else {
      S.selMode = el.dataset.k;
    }
    S.sel.clear();
  },
  'sel-toggle'(el) {
    const id = el.dataset.id;
    S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id);
  },
  'sel-all'() {
    document.querySelectorAll('#app [data-action=sel-toggle]').forEach((e) => S.sel.add(e.dataset.id));
  },
  'sel-none'() {
    S.sel.clear();
  },
  'sel-exit'() {
    S.selMode = null;
    S.sel.clear();
  },
  'bulk-edit'() {
    openBulk();
    return false;
  },
  async 'bulk-done'() {
    const list = S.tasks.filter((t) => S.sel.has(t.id) && !t.done);
    const ids = list.map((t) => t.id);
    for (const t of list) {
      t.done = true;
      t.doneAt = Date.now();
      freezeDmg(t);
      await DB.put('tasks', t);
      await onTaskDone(t);
    }
    Sound.play('task');
    toastUndo(`Marked ${list.length} done.`, async () => {
      for (const t of S.tasks.filter((x) => ids.includes(x.id))) {
        t.done = false;
        t.doneAt = null;
        freezeDmg(t);
        await DB.put('tasks', t);
        await onTaskDone(t);
      }
    });
    S.selMode = null;
    S.sel.clear();
  },
  async 'bulk-archive'() {
    const list = S.tasks.filter((t) => S.sel.has(t.id));
    const ids = list.map((t) => t.id);
    for (const t of list) {
      t.archived = true;
      t.archivedAt = Date.now();
      await DB.put('tasks', t);
    }
    toastUndo(`Archived ${list.length} task${list.length === 1 ? '' : 's'}.`, async () => {
      for (const t of S.tasks.filter((x) => ids.includes(x.id))) {
        t.archived = false;
        t.archivedAt = null;
        await DB.put('tasks', t);
      }
    });
    S.selMode = null;
    S.sel.clear();
  },
  async 'bulk-del'() {
    const k = S.selMode,
      n = S.sel.size;
    if (!n) return false;
    if (
      !(await askConfirm(
        `Delete ${n} ${k === 'tasks' ? 'task' : 'habit'}${n === 1 ? '' : 's'}?\n\nThey stay in Trash (Settings) for ${TRASH_DAYS} days.`
      ))
    )
      return false;
    const ids = [...S.sel];
    if (k === 'tasks') await removeTasks(S.tasks.filter((t) => S.sel.has(t.id)));
    else await removeHabits(S.habits.filter((h) => S.sel.has(h.id)));
    S.selMode = null;
    S.sel.clear();
    toastUndo(`${n} moved to Trash.`, async () => {
      for (const id of ids) await trashRestore((k === 'tasks' ? 'task:' : 'habit:') + id);
    });
  },
  'open-trash'() {
    S.view = 'trash';
    scrollTo(0, 0);
  },
  async 'trash-restore'(el) {
    const r = S.trash.find((x) => x.id === el.dataset.id);
    await trashRestore(el.dataset.id);
    if (r) toast('Restored ' + trashName(r) + '.');
  },
  async 'trash-del'(el) {
    if (!(await askConfirm("Delete this forever? This can't be undone."))) return false;
    S.trash = S.trash.filter((x) => x.id !== el.dataset.id);
    await DB.del('trash', el.dataset.id);
  },
  async 'trash-empty'() {
    if (
      !S.trash.length ||
      !(await askConfirm(
        `Delete ${S.trash.length} item${S.trash.length === 1 ? '' : 's'} in Trash forever? This can't be undone.`
      ))
    )
      return false;
    for (const r of S.trash) await DB.del('trash', r.id);
    S.trash = [];
  },
  horizon(el) {
    S.horizon = el.dataset.v;
  },
  'goal-scope'(el) {
    S.goalScope = el.dataset.v;
  },
  async 'done-goal'(el) {
    const g = goalById(el.dataset.id);
    if (g.done) {
      g.done = false;
      g.autoDone = false;
      g.doneAt = null;
      if (progressRaw(g) >= 100) g.manualOpen = true;
      Sound.play('undo');
    } else {
      g.done = true;
      g.autoDone = false;
      g.doneAt = Date.now();
      g.status = null;
      g.manualOpen = false;
      Sound.play('task');
    }
    await DB.put('goals', g);
  },
  async 'goal-inc'(el) {
    const g = goalById(el.dataset.id);
    g.value = +((+g.value || 0) + 1).toFixed(2);
    await DB.put('goals', g);
  },
  async 'goal-dec'(el) {
    const g = goalById(el.dataset.id);
    g.value = Math.max(0, +((+g.value || 0) - 1).toFixed(2));
    await DB.put('goals', g);
  },
  async 'goal-set'(el) {
    const g = goalById(el.dataset.id);
    const r = await askPrompt(`${g.title}\nCurrent value${g.unit ? ' (' + g.unit + ')' : ''}:`, fmtNum(g.value));
    if (r === null || r.trim() === '' || isNaN(+r)) return false;
    g.value = Math.max(0, +r);
    await DB.put('goals', g);
  },
  'open-review'() {
    openReview();
    return false;
  },
  'open-plan'() {
    openPlan();
    return false;
  },
  'open-report'() {
    rep_.off = 0;
    drawReport();
    dlg.showModal();
    return false;
  },
  'rep-nav'(el) {
    rep_.off = Math.min(0, rep_.off + +el.dataset.d);
    drawReport();
    return false;
  },
  async 'rv-hit'(el) {
    const g = goalById(el.dataset.id);
    Object.assign(g, { done: true, autoDone: false, doneAt: Date.now(), status: null, reviewedAt: Date.now() });
    rvNote(g);
    Sound.play('task');
    await DB.put('goals', g);
    drawReview();
  },
  async 'rv-miss'(el) {
    const g = goalById(el.dataset.id);
    Object.assign(g, { status: 'missed', reviewedAt: Date.now() });
    rvNote(g);
    Sound.play('undo');
    await DB.put('goals', g);
    drawReview();
  },
  async 'rv-carry'(el) {
    const g = goalById(el.dataset.id);
    g.carried = (g.carried || []).concat(g.period);
    g.period = currentPeriod(g.horizon);
    g.reviewedAt = Date.now();
    rvNote(g);
    await DB.put('goals', g);
    drawReview();
  },
  async 'goal-progress'(el) {
    const g = goalById(el.dataset.id);
    g.progress = +el.value;
    await DB.put('goals', g);
  },
  async 'del-goal'(el) {
    const id = el.dataset.id;
    if (S.cfg.cGoal && !(await askConfirm('Delete this goal? Linked tasks and sub-goals are kept but unlinked.')))
      return false;
    const gone = goalById(id);
    const lt = S.tasks.filter((t) => t.goalId === id),
      lc = S.goals.filter((c) => c.parentId === id);
    for (const t of lt) {
      t.goalId = null;
      await DB.put('tasks', t);
    }
    for (const c of lc) {
      c.parentId = null;
      await DB.put('goals', c);
    }
    S.goals = S.goals.filter((g) => g.id !== id);
    await DB.del('goals', id);
    await trashAdd('goal', gone, null, { tasks: lt.map((t) => t.id), goals: lc.map((c) => c.id) });
    toastUndo('Goal deleted.', async () => {
      await trashRestore('goal:' + id);
    });
  },
  async 'toggle-log'(el) {
    await toggleLog(el.dataset.id, el.dataset.date);
  },
  async 'log-mini'(el) {
    const hid = el.dataset.id,
      date = el.dataset.date || TODAY(),
      id = hid + '|' + date;
    if (S.logs.has(id)) return false;
    S.logs.add(id);
    S.mini.add(id);
    await DB.put('logs', { id, habitId: hid, date, mini: true });
    await habitWin(
      S.habits.find((x) => x.id === hid),
      date,
      true
    );
  },
  'addon-coach'(el) {
    S.cfg.coachTone = el.checked ? 'on' : 'off';
    saveCfg();
  },
  'intro-pick'(el) {
    S.introPick = S.introPick || new Set();
    const k = el.dataset.k;
    S.introPick.has(k) ? S.introPick.delete(k) : S.introPick.add(k);
    el.classList.toggle('on', S.introPick.has(k));
    el.setAttribute('aria-pressed', S.introPick.has(k));
    return false;
  },
  async 'intro-go'() {
    const own = ((document.getElementById('introOwn') || {}).value || '').trim(),
      mk = (name, icon, mini) => ({
        id: uid(),
        name,
        icon: icon || '',
        kind: '',
        mode: '',
        target: 7,
        group: '',
        days: [],
        mini: mini || '',
        created: Date.now(),
      });
    const list = STARTERS.filter((x) => (S.introPick || new Set()).has(x[0])).map((x) =>
      mk(L2(x[2], x[3]), x[1], L2(x[4], x[5]))
    );
    if (own) list.push(mk(own));
    for (const h of list) {
      S.habits.push(h);
      await DB.put('habits', h);
    }
    S.introPick = null;
    introOn = false;
    markIntro();
    dlg.close();
    S.view = list.length ? 'dash' : S.view;
    if (list.length) toast(L2('Tick them off on Today. Small is fine.', 'علّمها في اليوم. الصغير يكفي.'));
  },
  'info-habits'() {
    openInfo('habits');
    return false;
  },
  easier(el) {
    S._stick = true;
    openEdit('habit', el.dataset.id);
    return false;
  },
  async 'del-habit'(el) {
    const gone = S.habits.find((h) => h.id === el.dataset.id);
    if (!gone) return false;
    if (
      S.cfg.cHabit &&
      !(await askConfirm(
        `Delete "${gone.name}" and its history?\n\nIt stays in Trash (Settings) for ${TRASH_DAYS} days.`
      ))
    )
      return false;
    await removeHabits([gone]);
    toastUndo('Habit moved to Trash.', async () => {
      await trashRestore('habit:' + gone.id);
    });
  },
  'backup-now'() {
    return actions.export();
  },
  'backup-auto'() {
    try {
      localStorage.setItem('gt-auto-last', TODAY());
    } catch (e) {}
    return actions.export();
  },
  export() {
    const json = JSON.stringify(backupData());
    const name = `goalterra-${TODAY()}.json`;
    if (window.GTNative && GTNative.saveBackup) {
      GTNative.saveBackup(name, json)
        .then((r) => {
          if (r !== false) {
            markBackup();
            notify((r && r.msg) || `Saved ${name}.`);
            render();
          }
        })
        .catch((e) => askAlert('Backup failed: ' + ((e && e.message) || e)));
      return false;
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Android saves downloads asynchronously; revoking the link too early leaves an empty file.
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    if (json.length > 2) markBackup();
    notify(`Saved ${name} (${(json.length / 1024).toFixed(1)} KB) to Downloads.`);
    if (S.view === 'data') render();
    return false;
  },
  'backup-copy'() {
    openBackup('copy');
    return false;
  },
  'backup-snooze'() {
    try {
      localStorage.setItem('gt-backup-snooze', String(Date.now()));
    } catch (e) {}
  },
  async 'storage-persist'() {
    await checkStorage(true);
    notify(
      S.storage === 'protected' ? 'Storage is now protected ✓' : 'The browser declined for now. Keep regular backups.'
    );
  },
  'backup-paste'() {
    openBackup('paste');
    return false;
  },
  import() {
    $('#importFile').click();
    return false;
  },
  async wipe() {
    const word = L2('ERASE', 'مسح');
    const typed = await askPrompt(
      L2(
        `This erases ALL tasks, goals, habits and history. A safety copy is kept so you can undo it.\n\nType ${word} to confirm.`,
        `سيمسح هذا كل المهام والأهداف والعادات والسجل. تُحفظ نسخة أمان للتراجع.\n\nاكتب ${word} للتأكيد.`
      ),
      ''
    );
    if (typeof typed !== 'string' || !['erase', 'مسح'].includes(typed.trim().toLowerCase())) {
      if (typed !== null) toast(L2('Not erased. The word did not match.', 'لم يُمسح شيء. الكلمة غير مطابقة.'));
      return false;
    }
    const sn = await snapSave('erase');
    if (!sn) {
      await askAlert(
        L2("Couldn't save a safety copy, so nothing was erased.", 'تعذّر حفظ نسخة أمان، لذلك لم يُمسح شيء.')
      );
      return false;
    }
    for (const s of STORES) await DB.clear(s);
    S.tasks = [];
    S.goals = [];
    S.habits = [];
    S.topics = [];
    S.exams = [];
    S.trash = [];
    S.logs = new Set();
    toastUndo(L2('Everything erased.', 'تم مسح كل شيء.'), async () => {
      await restore(sn.json, 'safety copy', true);
    });
  },
  async 'open-safety'() {
    S.snaps = await Snap.all().catch(() => []);
    S.view = 'safety';
    scrollTo(0, 0);
  },
  async 'snap-now'() {
    const r = await snapSave('daily');
    S.snaps = await Snap.all().catch(() => []);
    toast(r ? L2('Safety copy saved.', 'تم حفظ نسخة الأمان.') : L2("Couldn't save a copy.", 'تعذّر حفظ النسخة.'));
  },
  async 'snap-restore'(el) {
    const r = (S.snaps || []).find((x) => x.id === el.dataset.id);
    if (!r) return false;
    try {
      if ((await restore(r.json, 'safety copy')) === false) return false;
      S.snaps = await Snap.all().catch(() => []);
      toast(
        L2(
          'Restored. Your previous data was saved as a new safety copy.',
          'تمت الاستعادة. حُفظت بياناتك السابقة كنسخة أمان جديدة.'
        )
      );
    } catch (e) {
      await askAlert(L2('Could not restore: ', 'تعذّرت الاستعادة: ') + e.message);
    }
  },
  async 'data-check'() {
    await dataCheck();
  },
  'hist-use'(el) {
    const f = el.closest('form'),
      item = f.dataset.edit === 'task' ? S.tasks.find((x) => x.id === f.dataset.id) : goalById(f.dataset.id),
      h = item && (item.hist || [])[+el.dataset.i];
    if (!h) return false;
    f.elements.title.value = h.title;
    f.elements.notes.value = h.notes || '';
    return false;
  },
  'ab-yes'() {
    S.cfg.abOn = true;
    S.cfg.abAsked = true;
    saveCfg();
    toast(L2('Daily backup is on.', 'تم تفعيل النسخ اليومي.'));
  },
  'ab-no'() {
    S.cfg.abAsked = true;
    saveCfg();
  },
};

const POP = new Set(['toggle-task', 'toggle-log', 'topic-cell', 'toggle-sub', 'done-goal', 'goal-inc', 'goal-dec']);
function markPop(el) {
  const d = el.dataset;
  if (!POP.has(d.action)) return;
  S.popKey =
    `[data-action="${d.action}"]` +
    (d.id ? `[data-id="${CSS.escape(d.id)}"]` : '') +
    (d.date ? `[data-date="${d.date}"]` : '') +
    (d.i !== undefined ? `[data-i="${d.i}"]` : '');
}
// Long-press a task or habit to start selecting (Escape or Back leaves select mode).
(() => {
  let tm = null,
    fired = false,
    sx = 0,
    sy = 0;
  const cancel = () => {
    clearTimeout(tm);
    tm = null;
  };
  document.addEventListener('pointerdown', (e) => {
    cancel();
    if (
      S.selMode ||
      (S.view !== 'tasks' && S.view !== 'habits') ||
      (e.button || 0) > 0 ||
      e.target.closest('input,button,select,a')
    )
      return;
    const row = e.target.closest(S.view === 'tasks' ? '#app .item.trow2' : '#app .goals>.card');
    if (!row) return;
    const idEl = row.querySelector('[data-id]');
    if (!idEl) return;
    sx = e.clientX;
    sy = e.clientY;
    tm = setTimeout(() => {
      tm = null;
      fired = true;
      S.selMode = S.view;
      S.sel.clear();
      S.sel.add(idEl.dataset.id);
      try {
        navigator.vibrate && navigator.vibrate(15);
      } catch (_) {}
      render();
    }, 520);
  });
  document.addEventListener('pointermove', (e) => {
    if (tm && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel();
  });
  document.addEventListener(
    'pointerup',
    () => {
      cancel();
      if (fired) {
        fired = false;
        S._eat = Date.now();
      }
    },
    true
  );
  document.addEventListener(
    'pointercancel',
    () => {
      cancel();
      fired = false;
    },
    true
  );
  document.addEventListener('scroll', cancel, true);
  document.addEventListener('contextmenu', (e) => {
    if (fired || (S.selMode && e.target.closest('#app .item,#app .card'))) e.preventDefault();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.selMode && !dlg.open) {
      S.selMode = null;
      S.sel.clear();
      render();
    }
  });
})();
document.addEventListener('click', async (e) => {
  if (S._eat && Date.now() - S._eat < 700) {
    S._eat = 0;
    e.preventDefault();
    return;
  }
  const nav = e.target.closest('#nav button,#tabbar button');
  if (nav) {
    const same = S.view === nav.dataset.view;
    S.view = nav.dataset.view;
    render();
    if (!same || nav.closest('#tabbar')) scrollTo(0, 0);
    return;
  }
  const el = e.target.closest('[data-action]');
  if (!el || el.type === 'checkbox' || el.type === 'range' || el.type === 'time' || el.tagName === 'SELECT') return;
  markPop(el);
  const fn = actions[el.dataset.action];
  if (fn && (await fn(el)) !== false) render();
});
document.addEventListener('change', async (e) => {
  const el = e.target.closest('[data-action]');
  if (el && (el.type === 'checkbox' || el.type === 'range' || el.type === 'time' || el.tagName === 'SELECT')) {
    markPop(el);
    await actions[el.dataset.action](el);
    render();
  }
});
document.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const v = Object.fromEntries(new FormData(f));
  const kind = f.dataset.form;
  if (kind === 'task') {
    const q = parseQuick(v.title);
    const t = {
      id: uid(),
      title: q.title,
      notes: (v.notes || '').trim(),
      repeat: v.repeat || '',
      tag: q.tag || (v.tag || '').trim(),
      items: parseItems(v.items),
      due: q.due || v.due || (q.start ? TODAY() : null),
      start: q.start,
      dur: q.dur,
      priority: q.priority || v.priority,
      goalId: v.goalId || null,
      done: false,
      created: Date.now(),
    };
    S.tasks.push(t);
    await DB.put('tasks', t);
  }
  if (kind === 'goal') {
    const hz = S.horizon === 'ladder' ? 'weekly' : S.horizon;
    let gk = v.kind || 'check';
    if (gk === 'rollup' && hz === 'weekly') gk = 'check';
    if (gk === 'number' && !(+v.target > 0)) {
      askAlert('Set a target number for this goal (for example 40).');
      return;
    }
    const g = {
      id: uid(),
      title: v.title.trim(),
      horizon: hz,
      period: (v.period || currentPeriod(hz)).trim(),
      parentId: v.parentId || null,
      notes: (v.notes || '').trim(),
      kind: gk,
      target: +v.target || 0,
      unit: (v.unit || '').trim(),
      value: 0,
      expected: v.expected ? Math.max(1, Math.round(+v.expected)) : null,
      done: false,
      created: Date.now(),
    };
    S.goals.push(g);
    await DB.put('goals', g);
  }
  if (kind === 'cls') {
    const a = getClasses();
    a.push({
      id: uid(),
      subject: (v.subject || '').trim().slice(0, 60),
      day: +v.day,
      start: v.start,
      end: v.end && v.end > v.start ? v.end : '',
      room: (v.room || '').trim().slice(0, 30),
    });
    setClasses(a);
    if (!S.topics.some((t) => t.subject === v.subject.trim()))
      toast('Class added. Add topics for it below to get study picks.');
  }
  if (kind === 'caltask') {
    const q = parseQuick(v.title);
    const t = {
      id: uid(),
      title: q.title,
      notes: '',
      repeat: '',
      tag: q.tag || '',
      items: [],
      due: q.due || f.dataset.date,
      start: q.start,
      dur: q.dur,
      priority: q.priority || S.cfg.prio,
      goalId: null,
      done: false,
      created: Date.now(),
    };
    S.tasks.push(t);
    await DB.put('tasks', t);
    setTimeout(() => {
      const i = document.querySelector('form[data-form=caltask] input');
      if (i) i.focus();
    }, 60);
  }
  if (kind === 'ltask') {
    const q = parseQuick(v.title);
    const t = {
      id: uid(),
      title: q.title,
      notes: '',
      repeat: '',
      tag: q.tag || '',
      items: [],
      due:
        q.due || (S.cfg.dueDef === 'none' ? null : S.cfg.dueDef === 'tomorrow' ? ds(addDays(new Date(), 1)) : TODAY()),
      priority: q.priority || S.cfg.prio,
      goalId: f.dataset.goal,
      done: false,
      created: Date.now(),
    };
    S.tasks.push(t);
    await DB.put('tasks', t);
    setTimeout(() => {
      const i = document.querySelector('.ladd input');
      if (i) i.focus();
    }, 60);
  }
  if (kind === 'topics') {
    const sub = (v.subject || '').trim();
    const names = String(v.names || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (!sub || !names.length) {
      return;
    }
    let added = 0;
    for (const name of names) {
      if (S.topics.some((t) => t.subject === sub && t.name.toLowerCase() === name.toLowerCase())) continue;
      const t = { id: uid(), subject: sub, name, sessions: [], created: Date.now() };
      S.topics.push(t);
      await DB.put('topics', t);
      added++;
    }
    toast(added ? `Added ${added} topic${added > 1 ? 's' : ''} to ${sub}` : 'Those topics already exist');
  }
  if (kind === 'habit') {
    const av = v.kind === 'avoid';
    const h = {
      id: uid(),
      name: v.name.trim(),
      kind: av ? 'avoid' : '',
      mode: av && S.cfg.avoidMode === 'confirm' ? 'confirm' : '',
      target: av ? 7 : +v.target,
      group: (v.group || '').trim(),
      days: av ? [] : readDays(f),
      ...stickRead(v),
      created: Date.now(),
    };
    S.habits.push(h);
    await DB.put('habits', h);
  }
  const gl = f.dataset.goal;
  render();
  const first = kind === 'ltask' ? $(`#app form[data-goal="${gl}"] input`) : $('#app form input[type=text]');
  if (first) first.focus();
});

/** Scrolls the Plan timeline to the current time (today) or to the first block. */
function scrollPlan() {
  const e = document.querySelector('.pl-now') || document.querySelector('.pl-b');
  if (e) e.scrollIntoView({ block: 'center' });
}
