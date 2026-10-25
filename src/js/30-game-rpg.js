/**
 * Game mode.
 * rpgAll() derives everything from your history: the weekly boss, the tower of monthly guardians and annual bosses, shields and morale, rest tokens, exam elites and rewards.
 * Also the 8-bit monster generator.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Game mode (RPG) ---------- */
const rpgOn = () => !!S.cfg.rpg;
const PRI_DMG = { low: 10, med: 20, high: 30 };
const mondayOf = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const weekKeys = (mon) => [...Array(7)].map((_, i) => ds(addDays(mon, i)));
const heroLv = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1;
function taskBase(t) {
  let v = PRI_DMG[t.priority] || 10;
  const g = t.goalId && goalById(t.goalId);
  if (g && g.horizon === 'weekly') v *= 1.5;
  return v;
}
// Damage for one finished task. nth = its position among tasks finished that day (sets Blaze/Titan bonus and the 12+ taper).
function taskDmgCalc(t, at, nth) {
  let v = taskBase(t);
  const k = ds(new Date(at));
  if (t.due) {
    if (k < t.due) v *= 1.2;
    else if (k > t.due) v *= 0.5;
  }
  const p = (t.pushes || []).length;
  if (p) v *= Math.max(0.5, 1 - 0.1 * p);
  if (t.created && at - t.created < 5 * 60e3) v *= 0.5;
  const tr = tierOf(nth);
  let crit = false;
  if (tr === 1) v *= 1.1;
  else if (tr === 2) {
    v *= 1.25;
    crit = true;
  }
  if (nth > 12) v *= 0.5;
  return { v: Math.max(1, Math.round(v)), crit };
}
function freezeDmg(t) {
  if (!t.done) {
    delete t.dmg;
    delete t.crit;
    return;
  }
  if (t.dmg != null) return;
  const k = TODAY();
  const n = S.tasks.filter((x) => x.done && x.doneAt && ds(new Date(x.doneAt)) === k).length;
  const d = taskDmgCalc(t, t.doneAt || Date.now(), Math.max(1, n)),
    prior = (t.items || []).reduce((a, i) => a + (i.dmg || 0), 0);
  t.dmg = Math.max(1, d.v - prior);
  if (d.crit) t.crit = true;
}
function habitHit(h, k) {
  let r = 0,
    d = new Date(k + 'T00:00');
  for (let i = 0; i < 35; i++) {
    const kk = ds(d);
    if (good(h, kk)) r++;
    else if (isDue(h, d)) break;
    d = addDays(d, -1);
  }
  return 5 + Math.min(5, Math.floor(r / 7));
}
let _rpg = null;
// Everything is derived from history (finished tasks, check-ins, study sessions), so nothing new is stored except each task's frozen damage.
// Memo key: data version + day + the settings the game reads. Navigation re-renders reuse the last result.
let _rpgKey = '';
const rpgKey = () =>
  [
    DBV,
    TODAY(),
    S.tasks.length,
    S.logs.size,
    S.habits.length,
    S.topics.length,
    S.exams.length,
    S.goals.length,
    S.cfg.student,
    S.cfg.rpgSince,
    S.cfg.restDays,
    S.cfg.lvl2,
    S.cfg.lvl3,
    S.cfg.eliteTarget,
  ].join('|');
function rpgAll() {
  const key = rpgKey();
  if (_rpg && _rpgKey === key) return _rpg;
  const today = TODAY(),
    byDay = {},
    tdmg = new Map(),
    gmap = new Map(S.goals.map((g) => [g.id, g])),
    stu = !!S.cfg.student,
    wkOf = new Map();
  const isoK = (k) => {
    let w = wkOf.get(k);
    if (!w) {
      w = isoWeek(new Date(k + 'T00:00'));
      wkOf.set(k, w);
    }
    return w;
  };
  const base = (t) => {
    let v = PRI_DMG[t.priority] || 10;
    const g = t.goalId && gmap.get(t.goalId);
    if (g && g.horizon === 'weekly') v *= 1.5;
    return v;
  };
  for (const t of S.tasks)
    if (t.done && t.doneAt) {
      const k = ds(new Date(t.doneAt));
      (byDay[k] = byDay[k] || []).push(t);
    }
  for (const k in byDay)
    byDay[k]
      .sort((a, b) => a.doneAt - b.doneAt)
      .forEach((t, i) =>
        tdmg.set(t.id, t.dmg != null ? { v: t.dmg, crit: !!t.crit } : taskDmgCalc(t, t.doneAt, i + 1))
      );
  // One pass over tasks: focus and checklist damage by day, planned damage by week.
  const fDay = {},
    iDay = {},
    plan = {},
    sDay = {},
    hDay = {};
  for (const t of S.tasks) {
    for (const f of t.focusLog || []) {
      const k = ds(new Date(f.at));
      fDay[k] = (fDay[k] || 0) + 2 * Math.floor(f.m / 5);
    }
    for (const it of t.items || [])
      if (it.dmg && it.at) {
        const k = ds(new Date(it.at));
        iDay[k] = (iDay[k] || 0) + it.dmg;
      }
    if (t.due) {
      const w = isoK(t.due);
      plan[w] = (plan[w] || 0) + base(t);
    }
  }
  if (stu)
    for (const tp of S.topics)
      for (const se of tp.sessions || []) {
        sDay[se.d] = (sDay[se.d] || 0) + ([0, 5, 8, 12][se.c] || 0);
      }
  let start = today;
  const lo = (k) => {
    if (k && k < start) start = k;
  };
  for (const t of S.tasks) {
    if (t.created) lo(ds(new Date(t.created)));
    if (t.doneAt) lo(ds(new Date(t.doneAt)));
  }
  for (const id of S.logs) lo(id.slice(id.lastIndexOf('|') + 1));
  if (stu) for (const k in sDay) lo(k);
  const curMon = mondayOf(new Date());
  let mon = mondayOf(new Date(start + 'T00:00'));
  const min = addDays(curMon, -7 * 103);
  if (mon < min) mon = min;
  // Habit hits: same rule as habitHit (good days in the last 35, back to the last missed due day), computed in one forward pass.
  const build = S.habits.filter((h) => !isNeg(h)),
    from = ds(addDays(mon, -40));
  for (const h of build) {
    const gi = [];
    let p = 0,
      brk = -1e9,
      i = 0;
    for (let d = new Date(from + 'T00:00'); ds(d) <= today; d = addDays(d, 1), i++) {
      const k = ds(d);
      if (S.logs.has(h.id + '|' + k)) {
        gi.push(i);
        const lim = Math.max(brk, i - 35);
        while (p < gi.length && gi[p] <= lim) p++;
        if (k >= ds(mon)) hDay[k] = (hDay[k] || 0) + 5 + Math.min(5, Math.floor((gi.length - p) / 7));
      } else if (isDue(h, d)) brk = i;
    }
  }
  const weeks = [],
    hist = [],
    dayD = {};
  let xp = 0,
    totT = 0,
    totH = 0,
    totS = 0;
  for (let m = new Date(mon); m <= curMon; m = addDays(m, 7)) {
    const keys = weekKeys(m),
      wk = isoWeek(m);
    let tD = 0,
      hD = 0,
      sD = 0,
      fD = 0,
      best = 0,
      planned = plan[wk] || 0;
    for (const k of keys) {
      let dd = 0;
      for (const t of byDay[k] || []) {
        const d = tdmg.get(t.id);
        tD += d.v;
        dd += d.v;
        if (d.v > best) best = d.v;
      }
      if (iDay[k]) {
        tD += iDay[k];
        dd += iDay[k];
      }
      if (fDay[k]) {
        fD += fDay[k];
        dd += fDay[k];
      }
      if (hDay[k]) {
        hD += hDay[k];
        dd += hDay[k];
      }
      if (sDay[k]) {
        sD += sDay[k];
        dd += sDay[k];
      }
      if (dd) dayD[k] = dd;
    }
    for (const h of build) {
      const b = bornK(h);
      for (const k of keys) if (k >= b && isDue(h, new Date(k + 'T00:00'))) planned += 5;
    }
    const total = tD + hD + sD + fD,
      prev = hist.slice(-4).filter((x) => x > 0),
      avg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 0;
    const hp = Math.max(60, Math.round(planned * 0.8), Math.round(avg * 0.9));
    hist.push(Math.min(total, Math.round(hp * 1.25))); // one huge week raises the next boss by at most 25%
    xp += total;
    totT += tD + fD;
    totH += hD;
    totS += sD;
    weeks.push({ key: wk, keys, tD, hD, sD, fD, total, hp, best, won: total >= hp });
  }
  let clean = 0;
  for (const h of S.habits.filter(isNeg)) {
    let d = new Date(bornK(h) + 'T00:00');
    for (let i = 0; i < 1500 && ds(d) <= today; i++, d = addDays(d, 1)) if (good(h, ds(d))) clean++;
  }
  if (stu) for (const x of elites()) xp += x.bonus;
  // Counterattacks: replay each finished day since Game mode was turned on.
  // Once a week's boss is dead it stops attacking for the rest of that week, and a knockout can never undo a win.
  const negs = S.habits.filter(isNeg),
    since = S.cfg.rpgSince || today,
    wmap = new Map(weeks.map((w) => [w.key, w])),
    st = {};
  let sh = 0,
    mor = 100,
    kos = 0,
    blocked = 0,
    hits = 0;
  for (let d = new Date(since + 'T00:00'), i = 0; ds(d) < today && i < 800; d = addDays(d, 1), i++) {
    const k = ds(d),
      wk = isoWeek(d),
      w = wmap.get(wk);
    let s = st[wk];
    if (!s) {
      s = st[wk] = { cum: 0, ko: 0, dead: false };
      if (w) for (const kk of w.keys) if (kk < k) s.cum += dayD[kk] || 0;
    }
    s.cum += dayD[k] || 0;
    if (w && !s.dead && s.cum >= Math.round(w.hp * (1 + 0.2 * s.ko))) s.dead = true;
    for (const h of negs) if (k >= bornK(h) && good(h, k)) sh = Math.min(3, sh + 1);
    if ((dayD[k] || 0) > 0) mor = Math.min(100, mor + 10);
    else if (isRest(k) || s.dead) {
    } else if (sh > 0) {
      sh--;
      blocked++;
    } else {
      hits++;
      mor -= 25;
      if (mor <= 0) {
        kos++;
        s.ko++;
        mor = 100;
      }
    }
  }
  let overXp = 0;
  for (const w of weeks) {
    const s = st[w.key];
    if (s && s.ko) {
      w.ko = s.ko;
      w.hp = Math.round(w.hp * (1 + 0.2 * w.ko));
    }
    w.won = w.total >= w.hp;
    w.over = Math.max(0, w.total - w.hp);
    if (w.won) overXp += Math.min(40, Math.round(w.over * 0.25)); // overkill: a small bonus, not a bigger boss
  }
  xp += overXp;
  // Weeks won in a row (the week in progress never breaks the streak).
  let streak = 0,
    bestStreak = 0,
    run = 0;
  for (const w of weeks) {
    run = w.won ? run + 1 : w === weeks[weeks.length - 1] ? run : 0;
    bestStreak = Math.max(bestStreak, run);
  }
  streak = run;
  let shields = sh;
  for (const h of negs) if (today >= bornK(h) && good(h, today)) shields = Math.min(3, shields + 1);
  const used = (S.cfg.restDays || '').split(',').filter(Boolean).length,
    tokens = Math.max(0, weeks.filter((w) => w.won).length - used);
  _rpgKey = key;
  return (_rpg = {
    weeks,
    cur: weeks[weeks.length - 1],
    xp,
    totT,
    totH,
    totS,
    clean,
    dayD,
    shields,
    morale: mor,
    kos,
    blocked,
    hits,
    tokens,
    overXp,
    streak,
    bestStreak,
  });
}
/* Exam elites: preparation from study sessions on the exam's subject in the 21 days before; the logged score decides the outcome. */
function eliteOf(e, idx) {
  const end = e.date,
    start = ds(addDays(new Date(e.date + 'T00:00'), -21)),
    hp = e.kind === 'quiz' ? 30 : 60;
  let prep = 0;
  if (idx) {
    for (const se of idx.get(e.subject || '') || []) if (se.d >= start && se.d <= end) prep += [0, 5, 8, 12][se.c] || 0;
  } else
    for (const t of S.topics)
      if ((t.subject || '') === (e.subject || ''))
        for (const se of t.sessions || []) if (se.d >= start && se.d <= end) prep += [0, 5, 8, 12][se.c] || 0;
  const pct = e.score != null ? (e.max > 0 ? Math.round((e.score / e.max) * 100) : Math.round(e.score)) : null,
    today = TODAY();
  const state = pct != null ? (pct >= (+S.cfg.eliteTarget || 60) ? 'won' : 'lost') : e.date < today ? 'await' : 'prep';
  return { e, hp, prep, pct, state, bonus: state === 'won' ? (e.kind === 'quiz' ? 25 : 50) : 0, days: daysTo(e.date) };
}
let _el = null,
  _elKey = '';
function elites() {
  if (!S.cfg.student) return [];
  const k = rpgKey();
  if (_el && _elKey === k) return _el;
  const idx = new Map();
  for (const t of S.topics) {
    const a = idx.get(t.subject || '') || [];
    for (const se of t.sessions || []) a.push(se);
    idx.set(t.subject || '', a);
  }
  _elKey = k;
  return (_el = S.exams.map((e) => eliteOf(e, idx)));
}
/* Rewards and rest tokens */
function getRw() {
  try {
    return JSON.parse(S.cfg.rewards || '{}') || {};
  } catch (e) {
    return {};
  }
}
function setRw(o) {
  S.cfg.rewards = JSON.stringify(o);
  saveCfg();
}
function rwLine(key, won) {
  const r = getRw()[key];
  if (!r)
    return `<button type="button" class="ladd-btn rw-add" data-action="rw-set" data-k="${key}">🎁 Add a reward</button>`;
  return `<div class="rw ${won ? 'on' : ''}"><button type="button" class="rw-t" data-action="rw-set" data-k="${key}" title="Edit reward">🎁 <span translate="no">${esc(r.t)}</span></button>${won ? (r.c ? `<span class="meta">${L2('claimed', 'تم استلامها')}</span>` : `<button type="button" class="chip" data-action="rw-claim" data-k="${key}">${L2('Unlocked! Claim it', 'فُتحت! استلمها')}</button>`) : `<span class="meta">${L2('unlocks when you win', 'تُفتح عند الفوز')}</span>`}</div>`;
}
function eliteLine() {
  if (!S.cfg.student) return '';
  const L = elites(),
    aw = L.find((x) => x.state === 'await'),
    nx = L.filter((x) => x.state === 'prep').sort((a, b) => a.e.date.localeCompare(b.e.date))[0],
    x = aw || nx;
  if (!x) return '';
  const m = monster('E:' + x.e.id);
  return `<button type="button" class="tw-mini elite" data-action="edit-exam" data-id="${x.e.id}"><span class="tw-spr sm">${m.svg}</span><span class="grow" style="min-width:0;text-align:start"><b translate="no">${m.name}</b> <span class="meta" style="display:inline">${esc(x.e.title || x.e.subject || '')}</span></span><b>${x.state === 'await' ? L2('Log score', 'سجّل الدرجة') : `${Math.min(x.prep, x.hp)}/${x.hp}`}</b></button>`;
}
/* Badges: derived from your history, then remembered once earned (S.cfg.ach) so they never disappear. */
function badges() {
  const A = rpgAll(),
    done = S.tasks.filter((t) => t.done).length,
    B = (id, icon, en, ar, den, dar, ok) => ({ id, icon, name: L2(en, ar), desc: L2(den, dar), ok });
  return [
    B(
      'first',
      '🏆',
      'First blood',
      'أول انتصار',
      'Defeat a week boss.',
      'اهزم زعيم أسبوع.',
      A.weeks.some((w) => w.won)
    ),
    B('s3', '🔥', 'Hat trick', 'ثلاثية', 'Win 3 weeks in a row.', 'افز بثلاثة أسابيع متتالية.', A.bestStreak >= 3),
    B(
      's8',
      '🌋',
      'Unstoppable',
      'لا يُوقَف',
      'Win 8 weeks in a row.',
      'افز بثمانية أسابيع متتالية.',
      A.bestStreak >= 8
    ),
    B(
      'perfect',
      '📅',
      'Perfect week',
      'أسبوع مثالي',
      'Deal damage on all 7 days of a week.',
      'سجّل ضررًا في أيام الأسبوع السبعة.',
      A.weeks.some((w) => w.keys.every((k) => A.dayD[k] > 0))
    ),
    B(
      'over',
      '💥',
      'Overkill',
      'ضربة قاضية',
      'End a week with 150% of the boss HP.',
      'أنهِ أسبوعًا بـ150% من صحة الزعيم.',
      A.weeks.some((w) => w.won && w.total >= w.hp * 1.5)
    ),
    B('t100', '✅', 'Century', 'المئة', 'Finish 100 tasks.', 'أنجز 100 مهمة.', done >= 100),
    B(
      'c7',
      '🌱',
      'Clean week',
      'أسبوع نظيف',
      '7 clean days on avoid habits.',
      '7 أيام نظيفة على عادات التجنّب.',
      A.clean >= 7
    ),
    B(
      'c30',
      '🌳',
      'Clean month',
      'شهر نظيف',
      '30 clean days on avoid habits.',
      '30 يومًا نظيفًا على عادات التجنّب.',
      A.clean >= 30
    ),
    B(
      'shield',
      '🛡',
      'Guarded',
      'محمي',
      'Block 5 counterattacks with shields.',
      'صُدَّ 5 هجمات بالدروع.',
      A.blocked >= 5
    ),
    B('l5', '⭐', 'Level 5', 'المستوى 5', 'Reach hero level 5.', 'بلغ مستوى البطل 5.', heroLv(A.xp) >= 5),
    B('l10', '🌟', 'Level 10', 'المستوى 10', 'Reach hero level 10.', 'بلغ مستوى البطل 10.', heroLv(A.xp) >= 10),
  ];
}
const earned = () => new Set((S.cfg.ach || '').split(',').filter(Boolean));
// Saves newly earned badges. The very first check only records what you already have, so nothing pops up all at once.
function badgeCheck() {
  const have = earned(),
    first = S.cfg.ach == null,
    now = badges().filter((b) => b.ok && !have.has(b.id));
  if (!first && !now.length) return;
  now.forEach((b) => have.add(b.id));
  S.cfg.ach = [...have].join(',');
  saveCfg();
  if (!first)
    setTimeout(() => {
      Sound.play('goal');
      toast('🏅 ' + now[0].name + (now.length > 1 ? ' +' + (now.length - 1) : ''));
    }, 1200);
}
function rpgTick() {
  if (!rpgOn()) {
    S._rpgK = null;
    return;
  }
  const w = rpgAll().cur;
  if (S._rpgK === w.key && w.total > S._rpgT) {
    const now = Date.now();
    S.rpgHit = { n: w.total - S._rpgT, at: now, crit: S.tasks.some((t) => t.crit && t.doneAt > now - 3000) };
    setTimeout(() => Sound.play('hit'), 140);
    if (S._rpgT < w.hp && w.total >= w.hp) {
      const m = monster(w.key);
      setTimeout(() => {
        Sound.play('goal');
        toast('🏆 ' + m.name + ' defeated!');
      }, 500);
    }
  }
  const T = rpgTower(),
    gm = T.curM,
    gy = T.curY;
  if (S._rpgM && S._rpgM.k === gm.key && !S._rpgM.won && gm.won)
    setTimeout(() => {
      Sound.play('goal');
      toast('👑 ' + monster('M:' + gm.key).name + ' defeated!');
    }, 900);
  if (S._rpgY && S._rpgY.k === gy.key && !S._rpgY.won && gy.won)
    setTimeout(() => {
      Sound.play('goal');
      toast('👑 ' + monster('Y:' + gy.key).name + ' defeated!');
    }, 1700);
  const ew = elites()
    .filter((x) => x.state === 'won')
    .map((x) => x.e.id);
  if (S._rpgE)
    for (const id of ew)
      if (!S._rpgE.includes(id)) {
        const m = monster('E:' + id);
        setTimeout(() => {
          Sound.play('goal');
          toast('⚡ ' + m.name + ' defeated!');
        }, 600);
      }
  S._rpgE = ew;
  badgeCheck();
  S._rpgM = { k: gm.key, won: gm.won };
  S._rpgY = { k: gy.key, won: gy.won };
  S._rpgK = w.key;
  S._rpgT = w.total;
}
/* Monsters: a 16x16 mirrored pixel sprite and a name, both generated from the week id, so every week is unique and repeatable. */
function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MON_A = [
  'Grum',
  'Zor',
  'Blo',
  'Kra',
  'Mog',
  'Vex',
  'Sno',
  'Dra',
  'Plu',
  'Thra',
  'Gli',
  'Bor',
  'Qua',
  'Fen',
  'Ska',
  'Nub',
  'Wro',
  'Yag',
];
const MON_B = ['va', 'mo', 'li', 'ru', 'ka', 'zi', 'do', '', '', 'go'];
const MON_C = ['k', 'x', 'th', 'gor', 'b', 'ss', 'nar', 'rok', 'm', 'z', 'dle', 'mp'];
const MON_T = [
  'the Procrastinator',
  'the Snoozer',
  'of Endless Tabs',
  'the Deadline Eater',
  'the Doomscroller',
  'of Unread Messages',
  'the Excuse Maker',
  'the Distractor',
  'of Tomorrow',
  'the Couch Golem',
  'the Notification Fiend',
  'of Half-Done Drafts',
  'the Overthinker',
  'the Time Thief',
  'the Lazy Tide',
  'of Later',
];
const _mon = new Map();
function monster(key) {
  if (_mon.has(key)) return _mon.get(key);
  const r = rng(hash32('gt-mon:' + key)),
    g = [...Array(16)].map(() => Array(16).fill(0));
  const put = (y, x, v) => {
    g[y][x] = v;
    g[y][15 - x] = v;
  };
  for (let y = 1; y <= 14; y++)
    for (let x = 1; x <= 7; x++) {
      const cx = (x - 1) / 6,
        cy = 1 - Math.abs(y - 7.5) / 6.5;
      if (r() < 0.55 * cx + 0.5 * cy - 0.12) put(y, x, 1);
    }
  for (let y = 3; y <= 12; y++) put(y, 7, 1);
  for (let y = 1; y <= 14; y++)
    for (let x = 1; x <= 7; x++)
      if (g[y][x] && !g[y - 1][x] && !g[y + 1][x] && !g[y][x - 1] && !g[y][x + 1]) put(y, x, 0);
  const ey = 4 + Math.floor(r() * 3),
    ex = 5 + Math.floor(r() * 2);
  for (let y = ey - 1; y <= ey + 2; y++) for (let x = ex - 1; x <= Math.min(7, ex + 1); x++) if (!g[y][x]) put(y, x, 1);
  for (let y = 1; y <= 14; y++)
    for (let x = 1; x <= 7; x++)
      if (g[y][x] === 1) {
        if (!g[y - 1][x] && r() < 0.7) put(y, x, 3);
        else if (y > 9 && r() < 0.5) put(y, x, 2);
      }
  put(ey, ex, 5);
  put(ey + 1, ex, 6);
  const my = ey + 3;
  if (my <= 13) {
    const k = 1 + Math.floor(r() * 2);
    for (let x = 8 - k; x <= 7; x++) {
      if (!g[my][x]) continue;
      put(my, x, 6);
    }
    if (r() < 0.5 && g[my + 1][7 - k + 1]) put(my + 1, 8 - k, 5);
  }
  const o = g.map((row) => row.slice());
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      if (
        !g[y][x] &&
        [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ].some(([a, b]) => g[y + a] && g[y + a][x + b])
      )
        o[y][x] = 4;
  const h = Math.floor(r() * 360),
    C = [
      null,
      `hsl(${h} 58% 50%)`,
      `hsl(${h} 58% 36%)`,
      `hsl(${h} 70% 68%)`,
      `hsl(${h} 45% 13%)`,
      '#ffffff',
      '#15110e',
    ];
  let rects = '';
  for (let y = 0; y < 16; y++) {
    let x = 0;
    while (x < 16) {
      const v = o[y][x];
      let e = x;
      while (e < 16 && o[y][e] === v) e++;
      if (v) rects += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${C[v]}"/>`;
      x = e;
    }
  }
  const n = rng(hash32('gt-name:' + key)),
    pick = (a) => a[Math.floor(n() * a.length)];
  const name = pick(MON_A) + pick(MON_B) + pick(MON_C),
    title = pick(MON_T);
  const m = {
    name,
    title,
    svg: `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`,
  };
  _mon.set(key, m);
  return m;
}
function rpgCard() {
  if (!rpgOn()) return '';
  const A = rpgAll(),
    w = A.cur,
    m = monster(w.key),
    left = Math.max(0, w.hp - w.total),
    pct = Math.max(0, Math.round((left / w.hp) * 100));
  const dl = 7 - ((new Date().getDay() + 6) % 7),
    hit = S.rpgHit && Date.now() - S.rpgHit.at < 1500 ? S.rpgHit : null;
  const L = heroLv(A.xp),
    lo = 50 * (L - 1) * (L - 1),
    hi = 50 * L * L,
    xpPct = Math.round(((A.xp - lo) / (hi - lo)) * 100);
  const status = w.won
    ? w.over > 0 && rpgAll().overXp > 0
      ? L2('Defeated. It joins your bestiary.', 'هُزم. انضم إلى موسوعتك.') +
        ' ' +
        L2(
          'Overkill bonus +' + Math.min(40, Math.round(w.over * 0.25)) + ' XP',
          'مكافأة الضربة القاضية +' + Math.min(40, Math.round(w.over * 0.25)) + ' نقطة'
        )
      : 'Defeated. It joins your bestiary.'
    : dl === 1
      ? `${left} HP to go. It escapes tonight.`
      : `${left} HP to go`;
  return `<div class="card rpg ${w.won ? 'won' : ''} ${S.rpgOpen ? 'open' : ''}"><div class="rpg-top" data-action="info-boss" role="button" tabindex="0">
    <div class="rpg-spr ${hit ? 'shake' : ''}">${m.svg}${hit ? `<span class="rpg-dmg ${hit.crit ? 'crit' : ''}">−${hit.n}</span>` : ''}</div>
    <div class="grow" style="min-width:0"><div class="rpg-lbl"><span>Week boss</span><span>${w.won ? '🏆' : dl === 1 ? 'Last day' : dl + ' days left'}</span></div>
      <b class="rpg-name" translate="no">${m.name}</b><span class="rpg-sub">${m.title}</span>
      <div class="bar hp" role="progressbar" aria-valuemin="0" aria-valuemax="${w.hp}" aria-valuenow="${left}" aria-label="Boss HP"><span style="width:${pct}%"></span></div>
      <div class="meta"><span>${status}</span><button type="button" class="chip" data-action="rpg-more" aria-expanded="${!!S.rpgOpen}">${S.rpgOpen ? L2('Less', 'أقل') : L2('Details', 'تفاصيل')}</button></div></div></div>
    <div class="rpg-def rpg-x"><span title="Shields">🛡 ${L2('Shields', 'الدروع')} ${A.shields}/3</span><span title="Morale">❤ ${L2('Morale', 'المعنويات')} ${A.morale}%</span><span title="Rest tokens">🛌 ${L2('Rest tokens', 'رموز الراحة')} ${A.tokens}</span>${w.ko ? `<span title="Knocked out">💫 ${w.ko}</span>` : ''}${isRest(TODAY()) ? `<span>${L2('Resting today', 'يوم راحة')}</span>` : A.tokens ? `<button type="button" class="chip rest-btn" data-action="rest-day">🛌 Rest day</button>` : ''}</div>
    ${rwLine('W:' + w.key, w.won)}
    ${!(A.dayD[TODAY()] > 0) && new Date().getHours() >= 18 && !w.won ? `<div class="rpg-warn">${A.shields ? L2('⚠ No damage yet today. Tonight it counterattacks; a shield will block it.', '⚠ لا ضرر بعد اليوم. سيهاجم الليلة، وسيصدّه درع.') : L2('⚠ No damage yet today. Tonight it counterattacks and you lose Morale.', '⚠ لا ضرر بعد اليوم. سيهاجم الليلة وستخسر من معنوياتك.')}</div>` : ''}
    <div class="meta rpg-x" style="margin-top:6px"><span title="Tasks">⚔️ ${L2('Tasks', 'المهام')} ${w.tD}</span><span title="Habits">🔁 ${L2('Habits', 'العادات')} ${w.hD}</span>${S.cfg.student ? `<span title="Study">📚 ${L2('Study', 'الدراسة')} ${w.sD}</span>` : ''}${w.fD ? `<span title="Focus time">⏱ ${L2('Focus', 'التركيز')} ${w.fD}</span>` : ''}<span>${L2('Boss HP', 'حياة الزعيم')} ${w.hp}</span></div>
    <div class="rpg-x">${(() => {
      const g = rpgTower().curM;
      return `<button type="button" class="tw-mini" data-action="open-tower"><span class="tw-spr sm">${bossSvg('M:' + g.key, 1)}</span><span>${guardianTitle(g.key)}</span><b>${Math.min(g.dmg, g.hp)}/${g.hp}</b></button>`;
    })()}${eliteLine()}</div>
    <div class="rpg-hero"><b>Lv ${L}</b><div class="bar xp"><span style="width:${xpPct}%"></span></div><span>${A.xp} / ${hi} XP</span>${A.streak >= 2 ? `<span title="${L2('Weeks won in a row', 'أسابيع متتالية فزت بها')}">🔥 ${A.streak}</span>` : ''}<button class="chip" data-action="info-game" aria-label="${L2('How the game works', 'كيف تعمل اللعبة')}">?</button><button class="chip" data-action="open-bestiary">Bestiary →</button></div></div>`;
}
/* Tower: monthly guardians (weekly wins + monthly goals) and annual bosses (guardians + annual goals), derived from history. */
const thuMonth = (w) => w.keys[3].slice(0, 7);
function weeksInMonth(mk) {
  const y = +mk.slice(0, 4),
    mo = +mk.slice(5, 7) - 1;
  let n = 0;
  for (let m = mondayOf(new Date(y, mo, 1 - 6)); m <= new Date(y, mo + 1, 0); m = addDays(m, 7))
    if (ds(addDays(m, 3)).slice(0, 7) === mk) n++;
  return n;
}
function rpgTower() {
  const A = rpgAll();
  if (A.tower) return A.tower;
  const cm = TODAY().slice(0, 7),
    cy = cm.slice(0, 4),
    byM = {};
  for (const w of A.weeks) (byM[thuMonth(w)] = byM[thuMonth(w)] || []).push(w);
  const mdone = (mk) => S.goals.filter((g) => g.horizon === 'monthly' && g.period === mk && g.done).length;
  const months = Object.keys(byM)
    .sort()
    .map((mk) => {
      const ws = byM[mk],
        wins = ws.filter((w) => w.won).length,
        gd = mdone(mk),
        hp = weeksInMonth(mk),
        dmg = wins + gd;
      return { key: mk, ws, wins, gd, hp, dmg, won: dmg >= hp, past: mk < cm };
    });
  if (!months.some((m) => m.key === cm))
    months.push({
      key: cm,
      ws: [],
      wins: 0,
      gd: mdone(cm),
      hp: weeksInMonth(cm),
      dmg: mdone(cm),
      won: false,
      past: false,
    });
  const years = [...new Set(months.map((m) => m.key.slice(0, 4)))].sort().map((y) => {
    const ms = months.filter((m) => m.key.slice(0, 4) === y),
      gw = ms.filter((m) => m.won).length,
      ad = S.goals.filter((g) => g.horizon === 'annual' && g.period === y && g.done).length,
      dmg = gw + ad;
    return { key: y, gw, ad, hp: 10, dmg, won: dmg >= 10, past: y < cy };
  });
  return (A.tower = { months, years, curM: months.find((m) => m.key === cm), curY: years.find((y) => y.key === cy) });
}
const monthName = (mk) => fmt(new Date(+mk.slice(0, 4), +mk.slice(5, 7) - 1, 1), { month: 'long' });
const CROWN =
  '<rect x="5" y="-3" width="1" height="2" fill="#E8B83A"/><rect x="7" y="-4" width="2" height="3" fill="#E8B83A"/><rect x="10" y="-3" width="1" height="2" fill="#E8B83A"/><rect x="5" y="-1" width="6" height="1" fill="#C9962A"/><rect x="7" y="-3" width="2" height="1" fill="#E25B45"/>';
function bossSvg(key, crowns) {
  const m = monster(key);
  return m.svg
    .replace('viewBox="0 0 16 16"', 'viewBox="0 -5 16 21"')
    .replace(
      '">',
      crowns
        ? '">' +
            CROWN +
            (crowns > 1
              ? '<rect x="3" y="-2" width="1" height="1" fill="#E8B83A"/><rect x="12" y="-2" width="1" height="1" fill="#E8B83A"/>'
              : '')
        : '">'
    );
}
function guardianTitle(mk) {
  return L2(`Guardian of ${monthName(mk)}`, `حارس ${monthName(mk)}`);
}
function yearTitle(y) {
  return L2(`Overlord of ${y}`, `سيّد عام ${y}`);
}
function weekDots(m) {
  const cur = rpgAll().cur.key,
    n = weeksInMonth(m.key);
  let out = m.ws
    .map((w) => `<i class="wd ${w.won ? 'won' : w.key === cur ? 'cur' : 'lost'}" title="${w.key}"></i>`)
    .join('');
  for (let i = m.ws.length; i < n; i++) out += '<i class="wd"></i>';
  return out;
}
function towerCard() {
  if (!rpgOn()) return '';
  const T = rpgTower(),
    m = T.curM,
    y = T.curY,
    five = S.goals.filter((g) => g.horizon === 'five' && !g.done).sort((a, b) => b.period.localeCompare(a.period))[0];
  const gm = monster('M:' + m.key),
    ym = monster('Y:' + y.key),
    pf = five ? progress(five) : 0;
  return `<div class="card tower"><div class="rpg-lbl"><span>🏰 Tower</span><span>${T.months.filter((x) => x.won).length} guardians beaten</span></div>
    ${five ? `<div class="tw-row"><span class="tw-ico" aria-hidden="true">⛰</span><div class="grow"><b class="rpg-name">${esc(five.title)}</b><span class="rpg-sub">Final boss · your 5-year goal</span><div class="bar hp"><span style="width:${100 - pf}%"></span></div></div><b class="tw-n">${pf}%</b></div>` : ''}
    <div class="tw-row ${y.won ? 'won' : ''}"><span class="tw-spr">${bossSvg('Y:' + y.key, 2)}</span><div class="grow"><b class="rpg-name" translate="no">${ym.name}</b><span class="rpg-sub">${yearTitle(y.key)}</span><div class="bar hp"><span style="width:${Math.max(0, 100 - Math.round((y.dmg / y.hp) * 100))}%"></span></div>${rwLine('Y:' + y.key, y.won)}</div><b class="tw-n">${Math.min(y.dmg, y.hp)}/${y.hp}</b></div>
    <div class="tw-row ${m.won ? 'won' : ''}"><span class="tw-spr">${bossSvg('M:' + m.key, 1)}</span><div class="grow"><b class="rpg-name" translate="no">${gm.name}</b><span class="rpg-sub">${guardianTitle(m.key)}</span><div class="wdots" aria-label="Weekly bosses this month">${weekDots(m)}${m.gd ? `<span class="meta">+${m.gd} 🎯</span>` : ''}</div>${rwLine('M:' + m.key, m.won)}</div><b class="tw-n">${Math.min(m.dmg, m.hp)}/${m.hp}</b></div>
    <p class="meta" style="margin:8px 0 0">Beat weekly bosses and finish monthly goals to hit the guardian. Guardians and annual goals hit the annual boss.</p></div>`;
}
function viewBestiary() {
  const A = rpgAll(),
    L = heroLv(A.xp),
    past = A.weeks.slice(0, -1).reverse();
  const won = past.filter((w) => w.won).length,
    st = (v, a, b) => `<div><b>${1 + Math.floor(v)}</b><span>${a}</span><span style="display:block">${b}</span></div>`;
  return `<div class="arch-head"><button class="ghost" data-action="back-dash">← Home</button><h2 style="margin:0">Bestiary</h2></div>
  <div class="card"><div class="rpg-lbl"><span>Hero</span><span>Lv ${L}</span></div>
    <div class="meta"><span>${A.xp} / ${50 * L * L} XP</span><span>🛡 ${A.shields}/3</span><span>❤ ${A.morale}%</span><span title="Counterattacks blocked">🛡✓ ${A.blocked}</span><span title="Knocked out">💫 ${A.kos}</span></div>
    <div class="stats4">${st(A.totT / 100, 'STR', 'Tasks')}${st(A.totH / 100, 'VIT', 'Habits')}${st(A.totS / 100, 'INT', 'Study')}${st(A.clean / 7, 'DEF', 'Clean days')}</div></div>
  <div class="bar-row" style="margin:14px 0 8px"><span class="meta" style="margin:0">${won} beaten · ${past.length - won} escaped</span></div>
  ${
    past.length
      ? `<div class="goals">${past
          .map((w) => {
            const m = monster(w.key);
            return `<div class="card bst ${w.won ? 'won' : 'esc'}">${m.svg}<div class="grow"><b class="rpg-name" translate="no">${m.name}</b><span class="rpg-sub">${m.title}</span>
    <div class="meta"><span class="pill ${w.won ? 'ok' : ''}">${w.won ? 'Defeated' : 'Escaped'}</span><span>${fmtDate(w.keys[0])} – ${fmtDate(w.keys[6])}</span><span>${w.total} / ${w.hp} damage</span>${w.best ? `<span>Best hit ${w.best}</span>` : ''}</div></div></div>`;
          })
          .join('')}</div>`
      : `<div class="empty">No monsters yet. Beat this week's boss to start your collection.</div>`
  }
  ${(() => {
    const L = elites()
      .filter((x) => x.state === 'won' || x.state === 'lost')
      .sort((a, b) => b.e.date.localeCompare(a.e.date));
    if (!L.length) return '';
    return `<h2 style="margin-top:22px">Elites</h2><div class="goals">${L.map((x) => {
      const m = monster('E:' + x.e.id);
      return `<div class="card bst ${x.state === 'won' ? 'won' : 'esc'}">${m.svg}<div class="grow"><b class="rpg-name" translate="no">${m.name}</b><span class="rpg-sub">${esc(x.e.title || '')}${x.e.subject ? ' · ' + esc(x.e.subject) : ''}</span><div class="meta"><span class="pill ${x.state === 'won' ? 'ok' : ''}">${x.state === 'won' ? 'Defeated' : 'Escaped'}</span><span>${fmtDate(x.e.date)}</span><span>${x.pct}%</span></div></div></div>`;
    }).join('')}</div>`;
  })()}
  ${(() => {
    const T = rpgTower(),
      pm = T.months.filter((m) => m.past).reverse(),
      py = T.years.filter((y) => y.past).reverse();
    if (!pm.length && !py.length) return '';
    const row = (key, crowns, title, won, n, hp) => {
      const m = monster(key);
      return `<div class="card bst ${won ? 'won' : 'esc'}">${bossSvg(key, crowns)}<div class="grow"><b class="rpg-name" translate="no">${m.name}</b><span class="rpg-sub">${title}</span><div class="meta"><span class="pill ${won ? 'ok' : ''}">${won ? 'Defeated' : 'Escaped'}</span><span>${Math.min(n, hp)}/${hp}</span></div></div></div>`;
    };
    return `<h2 style="margin-top:22px">Guardians</h2><div class="goals">${py.map((y) => row('Y:' + y.key, 2, yearTitle(y.key), y.won, y.dmg, y.hp)).join('')}${pm.map((m) => row('M:' + m.key, 1, guardianTitle(m.key) + ' ' + m.key.slice(0, 4), m.won, m.dmg, m.hp)).join('')}</div>`;
  })()}`;
}
