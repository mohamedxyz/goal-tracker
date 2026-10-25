/**
 * Goal templates and sample data, the Android bridge (window.GTNative, present only inside the app), and notification planning.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Templates and sample data ---------- */
async function mkGoal(o) {
  const g = {
    id: uid(),
    title: o.t,
    horizon: o.h,
    period: o.p || currentPeriod(o.h),
    parentId: o.parent || null,
    notes: '',
    kind: o.k || 'check',
    target: o.tg || 0,
    unit: o.u || '',
    value: o.v || 0,
    expected: null,
    done: !!o.done,
    doneAt: o.done ? Date.now() : null,
    created: Date.now(),
    ...(o.sample ? { sample: true } : {}),
  };
  S.goals.push(g);
  await DB.put('goals', g);
  return g;
}
async function mkHabit(o) {
  const h = {
    id: uid(),
    name: o.n,
    kind: o.avoid ? 'avoid' : '',
    mode: '',
    target: o.tg || 7,
    group: '',
    days: [],
    created: o.created || Date.now(),
    ...(o.sample ? { sample: true } : {}),
  };
  S.habits.push(h);
  await DB.put('habits', h);
  return h;
}
async function mkTask(o) {
  const t = {
    id: uid(),
    title: o.t,
    notes: '',
    repeat: '',
    tag: o.tag || '',
    items: o.items || [],
    due: o.due || null,
    priority: o.pr || 'med',
    goalId: o.goal || null,
    done: !!o.done,
    doneAt: o.done ? o.doneAt || Date.now() : null,
    created: o.created || Date.now(),
    ...(o.sample ? { sample: true } : {}),
  };
  S.tasks.push(t);
  await DB.put('tasks', t);
  return t;
}
const TEMPLATES = {
  school: {
    i: '🎓',
    n: () => L2('School year', 'عام دراسي'),
    d: () =>
      L2(
        'Top grades this year: monthly subject goals, weekly study steps, a study habit, and student mode on.',
        'درجات عالية هذا العام: أهداف شهرية للمواد، خطوات دراسة أسبوعية، عادة دراسة، وتفعيل وضع الطالب.'
      ),
    run: async () => {
      S.cfg.student = true;
      saveCfg();
      const a = await mkGoal({
        t: L2('Finish the school year with top grades', 'إنهاء العام الدراسي بدرجات عالية'),
        h: 'annual',
        k: 'rollup',
      });
      const m = await mkGoal({
        t: L2('Stay on top of every subject', 'مواكبة كل المواد'),
        h: 'monthly',
        k: 'rollup',
        parent: a.id,
      });
      await mkGoal({ t: L2('Review all class notes', 'مراجعة كل ملاحظات الحصص'), h: 'weekly', parent: m.id });
      await mkGoal({ t: L2('Hand in all homework on time', 'تسليم كل الواجبات في وقتها'), h: 'weekly', parent: m.id });
      await mkHabit({ n: L2('Study 1 hour', 'دراسة ساعة'), tg: 6 });
      await mkHabit({ n: L2('No phone in bed', 'لا هاتف في السرير'), avoid: true });
    },
  },
  skill: {
    i: '🛠',
    n: () => L2('Learn a skill', 'تعلّم مهارة'),
    d: () =>
      L2(
        'A year to get good at something: a monthly module, weekly practice hours and one small project a week.',
        'عام لتتقن شيئًا: وحدة شهرية، ساعات تدريب أسبوعية ومشروع صغير كل أسبوع.'
      ),
    run: async () => {
      const a = await mkGoal({
        t: L2('Learn a new skill this year', 'تعلّم مهارة جديدة هذا العام'),
        h: 'annual',
        k: 'rollup',
      });
      const m = await mkGoal({
        t: L2('Finish one course module', 'إنهاء وحدة من الدورة'),
        h: 'monthly',
        k: 'rollup',
        parent: a.id,
      });
      await mkGoal({
        t: L2('Practice 5 hours', 'تدريب 5 ساعات'),
        h: 'weekly',
        k: 'number',
        tg: 5,
        u: L2('hours', 'ساعات'),
        parent: m.id,
      });
      await mkGoal({ t: L2('Build one small project', 'بناء مشروع صغير'), h: 'weekly', parent: m.id });
      await mkHabit({ n: L2('Practice 30 minutes', 'تدريب 30 دقيقة'), tg: 5 });
    },
  },
  fit: {
    i: '💪',
    n: () => L2('Get fit', 'لياقة بدنية'),
    d: () =>
      L2(
        'Workouts that add up: 12 a month, 3 a week, a daily walk, and one thing to cut.',
        'تمارين تتراكم: 12 شهريًا، 3 أسبوعيًا، مشي يومي، وشيء واحد تتركه.'
      ),
    run: async () => {
      const a = await mkGoal({ t: L2('Get fit this year', 'الوصول للياقة هذا العام'), h: 'annual', k: 'rollup' });
      const m = await mkGoal({
        t: L2('Work out 12 times', 'التمرّن 12 مرة'),
        h: 'monthly',
        k: 'number',
        tg: 12,
        u: L2('workouts', 'تمارين'),
        parent: a.id,
      });
      await mkGoal({
        t: L2('3 workouts', '3 تمارين'),
        h: 'weekly',
        k: 'number',
        tg: 3,
        u: L2('workouts', 'تمارين'),
        parent: m.id,
      });
      await mkHabit({ n: L2('Walk 8,000 steps', 'المشي 8000 خطوة') });
      await mkHabit({ n: L2('No sugary drinks', 'لا مشروبات سكرية'), avoid: true });
    },
  },
};
function templateButtons() {
  return Object.entries(TEMPLATES)
    .map(
      ([k, t]) =>
        `<button type="button" class="tpl" data-action="tpl-use" data-k="${k}"><span class="tpl-i" aria-hidden="true">${t.i}</span><span class="grow"><b>${t.n()}</b><span class="meta" style="display:block">${t.d()}</span></span></button>`
    )
    .join('');
}
function openTemplates() {
  dlg.innerHTML = `<div class="hist"><div class="hist-top"><h3>Start from a template</h3><button type="button" class="icon" data-action="dlg-close" aria-label="Close">✕</button></div>
  <div class="tpls">${templateButtons()}</div>
  <p class="meta">Everything it adds is yours to rename or delete. Or try the app with sample data first:</p>
  <div class="dlg-actions"><button type="button" class="ghost" data-action="sample-add">Load sample data</button></div></div>`;
  if (!dlg.open) dlg.showModal();
}
const hasSample = () =>
  S.tasks.some((x) => x.sample) ||
  S.goals.some((x) => x.sample) ||
  S.habits.some((x) => x.sample) ||
  S.topics.some((x) => x.sample) ||
  S.exams.some((x) => x.sample);
async function addSample() {
  const now = Date.now(),
    D = 864e5,
    sm = { sample: true };
  const a = await mkGoal({ ...sm, t: L2('Run a 10k by summer', 'الركض 10 كم قبل الصيف'), h: 'annual', k: 'rollup' });
  const m = await mkGoal({
    ...sm,
    t: L2('Build the running base', 'بناء أساس الجري'),
    h: 'monthly',
    k: 'rollup',
    parent: a.id,
  });
  const w = await mkGoal({
    ...sm,
    t: L2('Run 3 times this week', 'الجري 3 مرات هذا الأسبوع'),
    h: 'weekly',
    parent: m.id,
  });
  await mkGoal({
    ...sm,
    t: L2('Read 12 books', 'قراءة 12 كتابًا'),
    h: 'annual',
    k: 'number',
    tg: 12,
    v: 4,
    u: L2('books', 'كتب'),
  });
  const T = [
    [L2('Easy 3 km run', 'جري سهل 3 كم'), 0, 'high', w.id],
    [L2('Buy running shoes', 'شراء حذاء جري'), -2, 'med', null],
    [L2('Plan meals for the week', 'تخطيط وجبات الأسبوع'), 1, 'low', null],
    [L2('Call the bank', 'الاتصال بالبنك'), -1, 'med', null],
    [L2('Interval run', 'جري متقطع'), 2, 'high', w.id],
  ];
  for (const [t, o, pr, g] of T) await mkTask({ ...sm, t, due: ds(addDays(new Date(), o)), pr, goal: g });
  for (let i = 1; i < 12; i++)
    await mkTask({
      ...sm,
      t: L2('Finished task ', 'مهمة منجزة ') + i,
      due: ds(addDays(new Date(), -i)),
      pr: ['low', 'med', 'high'][i % 3],
      done: true,
      doneAt: now - i * D,
      created: now - (i + 2) * D,
    });
  const h = await mkHabit({ ...sm, n: L2('Read 20 minutes', 'القراءة 20 دقيقة'), created: now - 30 * D }),
    h2 = await mkHabit({
      ...sm,
      n: L2('No snacks after 9pm', 'لا وجبات خفيفة بعد 9 مساءً'),
      avoid: true,
      created: now - 20 * D,
    });
  for (let i = 1; i < 25; i++) {
    if (i % 4 === 0) continue;
    const k = ds(addDays(new Date(), -i));
    S.logs.add(h.id + '|' + k);
    await DB.put('logs', { id: h.id + '|' + k, habitId: h.id, date: k });
  }
  const k2 = ds(addDays(new Date(), -6));
  S.logs.add(h2.id + '|' + k2);
  await DB.put('logs', { id: h2.id + '|' + k2, habitId: h2.id, date: k2 });
  if (S.cfg.student) {
    const tp = {
      id: uid(),
      subject: L2('Biology', 'أحياء'),
      name: L2('Cell structure', 'بنية الخلية'),
      sessions: [
        { d: ds(addDays(new Date(), -2)), c: 1 },
        { d: ds(addDays(new Date(), -5)), c: 2 },
      ],
      created: now,
      sample: true,
    };
    S.topics.push(tp);
    await DB.put('topics', tp);
    const ex = {
      id: uid(),
      kind: 'exam',
      title: L2('Biology midterm', 'امتحان الأحياء النصفي'),
      subject: tp.subject,
      date: ds(addDays(new Date(), 6)),
      time: '09:00',
      notes: '',
      score: null,
      max: null,
      created: now,
      sample: true,
    };
    S.exams.push(ex);
    await DB.put('exams', ex);
  }
}
async function clearSample() {
  let n = 0;
  for (const t of S.tasks.filter((x) => x.sample)) {
    await DB.del('tasks', t.id);
    n++;
  }
  S.tasks = S.tasks.filter((x) => !x.sample);
  for (const g of S.goals.filter((x) => x.sample)) {
    await DB.del('goals', g.id);
    n++;
  }
  S.goals = S.goals.filter((x) => !x.sample);
  for (const h of S.habits.filter((x) => x.sample)) {
    for (const k of [...S.logs].filter((k) => k.startsWith(h.id + '|'))) {
      S.logs.delete(k);
      await DB.del('logs', k);
    }
    await DB.del('habits', h.id);
    n++;
  }
  S.habits = S.habits.filter((x) => !x.sample);
  for (const t of S.topics.filter((x) => x.sample)) {
    await DB.del('topics', t.id);
    n++;
  }
  S.topics = S.topics.filter((x) => !x.sample);
  for (const e of S.exams.filter((x) => x.sample)) {
    await DB.del('exams', e.id);
    n++;
  }
  S.exams = S.exams.filter((x) => !x.sample);
  return n;
}
function sampleBanner() {
  return hasSample()
    ? `<div class="card sample-cta"><div class="grow"><div class="title">Sample data is on</div><div class="meta">Explore freely. Clearing removes only the sample items, never your own.</div></div><button class="btn" data-action="sample-clear">Clear sample</button></div>`
    : '';
}
/* ---------- Android app bridge ----------
   Active only inside the Capacitor Android app (window.Capacitor is native there). In a browser this block does nothing. */
const NATIVE = !!(
  window.Capacitor &&
  Capacitor.isNativePlatform &&
  Capacitor.isNativePlatform() &&
  Capacitor.registerPlugin
);
if (NATIVE)
  (() => {
    const P = (n) => Capacitor.registerPlugin(n),
      LN = P('LocalNotifications'),
      FS = P('Filesystem'),
      SH = P('Share'),
      APP = P('App'),
      SB = P('SystemBars'),
      BG = P('ThemeBg');
    const nid = (s) => {
      let h = 7;
      for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0;
      return (Math.abs(h) % 2000000000) + 1;
    };
    let permAsked = false,
      chan = false;
    const perm = async () => {
      try {
        let r = await LN.checkPermissions();
        if (r.display !== 'granted' && !permAsked) {
          permAsked = true;
          r = await LN.requestPermissions();
        }
        return r.display === 'granted';
      } catch (e) {
        return false;
      }
    };
    const channel = async () => {
      if (chan) return;
      chan = true;
      try {
        await LN.createChannel({
          id: 'gt',
          name: 'GoalTerra',
          description: 'Reminders and timers',
          importance: 4,
          visibility: 1,
        });
      } catch (e) {}
    };
    const exactOk = async () => {
      try {
        return (await LN.checkExactNotificationSetting()).exact_alarm === 'granted';
      } catch (e) {
        return false;
      }
    };
    const save = async (dir, name, text) =>
      (
        await FS.writeFile({
          path: dir ? dir + '/' + name : name,
          data: text,
          directory: dir ? 'DOCUMENTS' : 'CACHE',
          encoding: 'utf8',
          recursive: true,
        })
      ).uri;
    window.GTNative = {
      async schedule(id, at, title, body) {
        if (!S.cfg.nOn || !(await perm())) return;
        await channel();
        try {
          await LN.schedule({
            notifications: [
              {
                id: nid(id),
                title,
                body,
                channelId: 'gt',
                schedule: { at: new Date(at), allowWhileIdle: true },
                isExactNotification: await exactOk(),
              },
            ],
          });
        } catch (e) {}
      },
      async cancel(id) {
        try {
          await LN.cancel({ notifications: [{ id: nid(id) }] });
        } catch (e) {}
      },
      async saveFile(name, text, share) {
        const uri = await save('GoalTerra', name, text);
        if (share !== false) {
          try {
            await SH.share({ title: name, files: [uri], dialogTitle: L2('Save or send', 'احفظ أو أرسل') });
          } catch (e) {}
        }
        return { msg: L2(`Saved to Documents/GoalTerra/${name}`, `حُفظ في Documents/GoalTerra/${name}`) };
      },
      async saveBackup(name, text) {
        return this.saveFile(name, text, true);
      },
      async autoBackup(name, text) {
        await save('GoalTerra', name, text);
        try {
          const r = await FS.readdir({ path: 'GoalTerra', directory: 'DOCUMENTS' });
          const old = (r.files || [])
            .map((f) => f.name || f)
            .filter((n) => /^goalterra-auto-.*\.json$/.test(n))
            .sort();
          for (const n of old.slice(0, Math.max(0, old.length - 7)))
            await FS.deleteFile({ path: 'GoalTerra/' + n, directory: 'DOCUMENTS' });
        } catch (e) {}
        return true;
      },
      async shareFile(name, text) {
        const uri = await save('', name, text);
        await SH.share({ title: name, files: [uri] });
      },
      bars(bg) {
        try {
          const m = (String(bg).match(/\d+/g) || [255, 255, 255]).map(Number),
            l = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
          SB.setStyle({ style: l < 0.5 ? 'DARK' : 'LIGHT' });
          BG.setColor({
            color:
              '#' +
              m
                .slice(0, 3)
                .map((x) => x.toString(16).padStart(2, '0'))
                .join(''),
          }).catch(() => {});
        } catch (e) {}
      },
      async allowExact() {
        try {
          await LN.changeExactNotificationSetting();
        } catch (e) {}
      },
      async exactOk() {
        return exactOk();
      },
      async testNotify() {
        if (!(await perm())) {
          askAlert(
            L2(
              'Notifications are blocked. Allow them for GoalTerra in Android settings.',
              'الإشعارات محظورة. اسمح بها لتطبيق GoalTerra من إعدادات أندرويد.'
            )
          );
          return;
        }
        await channel();
        await LN.schedule({
          notifications: [
            {
              id: nid('test'),
              title: 'GoalTerra',
              body: L2('Notifications work.', 'الإشعارات تعمل.'),
              channelId: 'gt',
              schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
              isExactNotification: false,
            },
          ],
        });
      },
      async reschedule(list) {
        const old = (() => {
          try {
            return JSON.parse(localStorage.getItem('gt-nids') || '[]');
          } catch (e) {
            return [];
          }
        })();
        if (old.length)
          try {
            await LN.cancel({ notifications: old.map((id) => ({ id })) });
          } catch (e) {}
        if (!S.cfg.nOn || !list.length) {
          localStorage.setItem('gt-nids', '[]');
          return;
        }
        if (!(await perm())) return;
        await channel();
        const ids = list.map((n) => nid(n.key));
        try {
          await LN.schedule({
            notifications: list.map((n, i) => ({
              id: ids[i],
              title: n.title,
              body: n.body,
              channelId: 'gt',
              schedule: { at: new Date(n.at), allowWhileIdle: true },
              isExactNotification: false,
            })),
          });
        } catch (e) {}
        try {
          localStorage.setItem('gt-nids', JSON.stringify(ids));
        } catch (e) {}
      },
    };
    APP.addListener('backButton', () => {
      if (dlg.open) {
        dlg.close();
        return;
      }
      if (S.selMode) {
        S.selMode = null;
        S.sel.clear();
        render();
        return;
      }
      if (typeof cellEl !== 'undefined' && cellEl) {
        hideCellMenu();
        return;
      }
      if (S.view !== 'dash') {
        S.view = 'dash';
        render();
        scrollTo(0, 0);
        return;
      }
      APP.exitApp();
    });
    APP.addListener('resume', () => {
      render();
      ftTick(true);
      planNotifications(true);
      autoBackupTick();
    });
    document.documentElement.classList.add('native');
  })();
// Upcoming reminders for the next 7 days, rebuilt whenever data changes (Android app only).
let _nTimer = null,
  _nKey = '';
function planNotifications(force) {
  if (!window.GTNative) return;
  const key =
    DBV +
    '|' +
    TODAY() +
    '|' +
    JSON.stringify([
      S.cfg.abOn,
      S.cfg.abTime,
      S.cfg.nOn,
      S.cfg.nMorning,
      S.cfg.nEvening,
      S.cfg.nClasses,
      S.cfg.nExams,
      S.cfg.nBlocks,
      S.cfg.nBlockLead,
      S.cfg.classes,
      S.cfg.lang,
      S.cfg.rpg,
    ]);
  if (!force && key === _nKey) return;
  _nKey = key;
  clearTimeout(_nTimer);
  _nTimer = setTimeout(() => GTNative.reschedule(buildNotifications()), 1500);
}
function buildNotifications() {
  const out = [],
    now = Date.now(),
    at = (d, hm) => {
      const [h, m] = String(hm || '08:00')
        .split(':')
        .map(Number);
      const x = new Date(d);
      x.setHours(h, m || 0, 0, 0);
      return x.getTime();
    };
  for (let i = 0; i < 7; i++) {
    const d = addDays(new Date(), i),
      k = ds(d);
    const due = S.tasks.filter((t) => !t.done && !t.archived && t.due === k).length,
      late = i === 0 ? S.tasks.filter((t) => !t.done && !t.archived && t.due && t.due < k).length : 0;
    const hs = S.habits.filter((h) => !isNeg(h) && isDue(h, d) && k >= bornK(h)),
      cls = classesOn(d.getDay()),
      ex = S.cfg.student ? S.exams.filter((e) => e.date === k) : [];
    const m = at(d, S.cfg.nMorning);
    if (m > now && (due || hs.length || cls.length || ex.length)) {
      const bits = [];
      if (due) bits.push(L2(`${due} task${due === 1 ? '' : 's'} due`, `${due} مهام مستحقة`));
      if (late) bits.push(L2(`${late} overdue`, `${late} متأخرة`));
      if (hs.length) bits.push(L2(`${hs.length} habit${hs.length === 1 ? '' : 's'}`, `${hs.length} عادات`));
      if (cls.length) bits.push(L2(`${cls.length} class${cls.length === 1 ? '' : 'es'}`, `${cls.length} حصص`));
      for (const e of ex) bits.push((e.kind === 'quiz' ? '❓ ' : '📝 ') + e.title);
      out.push({
        key: 'm' + k,
        at: m,
        title: i === 0 ? L2('Today in GoalTerra', 'يومك في GoalTerra') : fmtDay(k),
        body: bits.join(' · '),
      });
    }
    const e = at(d, S.cfg.nEvening);
    if (e > now) {
      let body = '';
      if (i === 0) {
        const left = hs.filter((h) => !good(h, k)).length,
          tl = S.tasks.filter((t) => !t.done && !t.archived && t.due && t.due <= k).length;
        if (left || tl)
          body = L2(
            `${left ? left + ' habit' + (left === 1 ? '' : 's') : ''}${left && tl ? ' and ' : ''}${tl ? tl + ' task' + (tl === 1 ? '' : 's') : ''} left today.`,
            `${left ? left + ' عادات' : ''}${left && tl ? ' و' : ''}${tl ? tl + ' مهام' : ''} متبقية اليوم.`
          );
        if (rpgOn() && !(rpgAll().dayD[k] > 0) && !isRest(k))
          body +=
            (body ? ' ' : '') +
            L2('No damage yet: the boss counterattacks tonight.', 'لا ضرر بعد: الزعيم سيهاجم الليلة.');
      } else if (hs.length) body = L2("Evening check-in: tick off today's habits.", 'مراجعة المساء: علّم عادات اليوم.');
      if (body) out.push({ key: 'e' + k, at: e, title: L2('Evening check-in', 'مراجعة المساء'), body });
    }
    if (S.cfg.nClasses)
      for (const c of cls) {
        const t = at(d, c.start) - 10 * 60000;
        if (t > now)
          out.push({
            key: 'c' + k + c.id,
            at: t,
            title: L2(`${c.subject} at ${c.start}`, `${c.subject} الساعة ${c.start}`),
            body: c.room ? L2('Room ', 'القاعة ') + c.room : L2('Class in 10 minutes', 'الحصة بعد 10 دقائق'),
          });
      }
    if (S.cfg.nBlocks)
      for (const t of S.tasks.filter((t) => !t.done && !t.archived && t.due === k && t.start)) {
        const when = at(d, t.start) - (+S.cfg.nBlockLead || 0) * 60000;
        if (when > now)
          out.push({
            key: 'b' + k + t.id,
            at: when,
            title: t.title,
            body: L2('Starts at ', 'تبدأ الساعة ') + hmText(toMin(t.start)) + ' · ' + lenText(blockLen(t)),
          });
      }
    if (S.cfg.nExams && S.cfg.student)
      for (const x of S.exams.filter((x) => x.date === ds(addDays(d, 1)) && x.score == null)) {
        const t = at(d, '18:00');
        if (t > now)
          out.push({
            key: 'x' + x.id,
            at: t,
            title: L2('Tomorrow: ', 'غدًا: ') + x.title,
            body: (x.time ? x.time + ' · ' : '') + L2('A last review tonight helps.', 'مراجعة أخيرة الليلة تفيد.'),
          });
      }
  }
  if (S.cfg.abOn)
    for (let i = 0; i < 7; i++) {
      const d = addDays(new Date(), i),
        t = at(d, S.cfg.abTime || '21:00');
      if (t > now)
        out.push({
          key: 'ab' + ds(d),
          at: t,
          title: L2('Daily backup', 'النسخ الاحتياطي اليومي'),
          body: L2("Open GoalTerra to save today's backup.", 'افتح GoalTerra لحفظ نسخة اليوم.'),
        });
    }
  if (backupDue()) {
    const t = at(addDays(new Date(), 1), '12:00');
    out.push({
      key: 'bk',
      at: t,
      title: L2('Back up GoalTerra', 'انسخ GoalTerra احتياطيًا'),
      body: L2(
        'Your last backup is old. Open Settings and tap Back up now.',
        'آخر نسخة احتياطية قديمة. افتح الإعدادات واضغط انسخ احتياطيًا الآن.'
      ),
    });
  }
  return out.sort((a, b) => a.at - b.at).slice(0, 60);
}
function notifCard() {
  if (!window.GTNative) return '';
  const c = S.cfg,
    times = [...Array(24)].map((_, h) => String(h).padStart(2, '0') + ':00');
  return `<div class="card settings setacc ${S.setOpen && S.setOpen.has('Notifications') ? 'open' : ''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Notifications" role="button" tabindex="0">Notifications</div>
    ${sw('nOn', 'Reminders', 'Morning plan, evening check-in, classes and exams, as phone notifications', c.nOn)}
    ${sel(
      'nMorning',
      'Morning plan at',
      times.slice(5, 12).map((t) => [t, t]),
      c.nMorning
    )}
    ${sel(
      'nEvening',
      'Evening check-in at',
      times.slice(17, 23).map((t) => [t, t]),
      c.nEvening
    )}
    ${sw('nClasses', 'Class reminders', '10 minutes before each class', c.nClasses)}
    ${sw('nExams', 'Exam reminders', 'The evening before an exam or quiz', c.nExams)}
    ${sw('nBlocks', 'Time-block reminders', 'A reminder before each scheduled block starts', c.nBlocks)}
    ${sel(
      'nBlockLead',
      'Remind me',
      [
        ['0', L2('At the start', 'عند البدء')],
        ['5', L2('5 minutes before', 'قبلها بـ5 دقائق')],
        ['10', L2('10 minutes before', 'قبلها بـ10 دقائق')],
        ['15', L2('15 minutes before', 'قبلها بـ15 دقيقة')],
        ['30', L2('30 minutes before', 'قبلها بـ30 دقيقة')],
      ],
      c.nBlockLead
    )}
    <div class="row" style="margin-top:8px"><button class="ghost" data-action="n-test">Send a test notification</button><button class="ghost" data-action="n-exact">Exact timers</button></div>
    <p class="meta">Exact timers let the focus timer ring on the second; without them Android may deliver it a little late.</p></div>`;
}
