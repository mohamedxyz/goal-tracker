/**
 * Completion sounds and the default settings (CFG_DEF) with saveCfg().
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Completion sounds (synthesised, no audio files) ---------- */
/* A short vibration with the tick sounds, where the phone lets the web view do it. */
function buzz(kind) {
  try {
    if (S.cfg && S.cfg.haptics !== false && navigator.vibrate && ['task', 'habit', 'goal'].includes(kind))
      navigator.vibrate(kind === 'goal' ? [12, 40, 12] : 10);
  } catch (e) {}
}
const Sound = {
  ctx: null,
  on: true,
  load() {
    try {
      this.on = localStorage.getItem('gt-sound') !== 'off';
    } catch (e) {}
  },
  set(v) {
    this.on = v;
    try {
      localStorage.setItem('gt-sound', v ? 'on' : 'off');
    } catch (e) {}
  },
  play(kind) {
    buzz(kind);
    if (!this.on) return;
    try {
      const C = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
      if (C.state === 'suspended') C.resume();
      // task: bright rising C–E–G · habit: softer two-note "pop" · undo: falling G–E♭–C "womp", last note sags
      const S_ =
        {
          task: {
            n: [
              [1046.5, 0],
              [1318.5, 0.07],
              [1568, 0.14],
            ],
            len: 0.38,
            vol: 0.16,
          },
          habit: {
            n: [
              [784, 0],
              [1174.7, 0.08],
            ],
            len: 0.38,
            vol: 0.16,
          },
          undo: {
            n: [
              [392, 0],
              [311.1, 0.16],
              [261.6, 0.32],
            ],
            len: 0.5,
            vol: 0.13,
            sag: true,
          },
          goal: {
            n: [
              [784, 0],
              [1046.5, 0.1],
              [1318.5, 0.2],
              [1568, 0.3],
              [2093, 0.42],
            ],
            len: 0.55,
            vol: 0.15,
          },
          hit: {
            n: [
              [196, 0],
              [147, 0.06],
            ],
            len: 0.12,
            vol: 0.06,
            sq: true,
          },
        }[kind] || null;
      if (!S_) return;
      const t0 = C.currentTime + 0.01;
      S_.n.forEach(([f, dt], i) => {
        const o = C.createOscillator(),
          g = C.createGain();
        o.type = S_.sq ? 'square' : 'triangle';
        o.frequency.setValueAtTime(f, t0 + dt);
        const last = i === S_.n.length - 1,
          len = last && S_.sag ? S_.len * 1.6 : S_.len;
        if (last && S_.sag) o.frequency.exponentialRampToValueAtTime(f * 0.82, t0 + dt + len);
        g.gain.setValueAtTime(0.0001, t0 + dt);
        g.gain.exponentialRampToValueAtTime(S_.vol, t0 + dt + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + len);
        o.connect(g).connect(C.destination);
        o.start(t0 + dt);
        o.stop(t0 + dt + len + 0.05);
      });
    } catch (e) {}
  },
};
Sound.load();
const CFG_DEF = {
  nOn: true,
  abOn: false,
  abTime: '21:00',
  abAsked: false,
  habitFx: true,
  mile: '',
  nMorning: '08:00',
  nEvening: '20:00',
  nClasses: true,
  nExams: true,
  timeFmt: 'auto',
  weekStart: 'mon',
  planSwipe: true,
  ach: null,
  planFrom: '06:00',
  planTo: '24:00',
  nBlocks: true,
  nBlockLead: '10',
  classes: '',
  ttStart: 'sun',
  restDays: '',
  rewards: '',
  rpgSince: '',
  eliteTarget: '60',
  focusLen: '25',
  breakLen: '5',
  rpg: false,
  coachTone: 'off',
  mTime: false,
  dStats: false,
  mig84: false,
  haptics: true,
  lvl2: '3',
  lvl3: '5',
  stuCompact: false,
  avoidHide: true,
  cTask: true,
  cGoal: true,
  cHabit: true,
  dCharts: true,
  dTasks: true,
  dGoals: true,
  dHabits: true,
  prio: 'low',
  showDone: true,
  dueDef: 'today',
  sortBy: 'due',
  groupTags: true,
  autoArch: '0',
  defFilter: 'all',
  showSubs: true,
  showNotes: true,
  dOverdue: false,
  avoidMode: 'clean',
  student: false,
  lang: 'en',
  srOn: true,
  srWeak: '1',
  srOk: '3',
  srLadder: '1,3,7,14,30',
};
try {
  S.cfg = { ...CFG_DEF, ...JSON.parse(localStorage.getItem('gt-settings') || '{}') };
} catch (e) {
  S.cfg = { ...CFG_DEF };
}
S.taskFilter = S.cfg.defFilter;
const saveCfg = () => {
  try {
    localStorage.setItem('gt-settings', JSON.stringify(S.cfg));
  } catch (e) {}
};
