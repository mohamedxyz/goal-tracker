// Runs the web app's buildNotifications (the oracle) for several settings, with the clock frozen at 2026-10-23 10:00 local.
// Usage: TZ=<zone> GT_SRC=<path to src/js> node rust-app/tools/gen_notify_fixture.mjs
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.GT_SRC || path.join(HERE, '..', '..', 'src', 'js');
const load = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const pick = (src, re) => src.match(re)[0];
const coach = load('50-coach-goals-ladder.js');
const study = load('91-study.js');
const parts = [
  load('10-core-data-state.js'),
  pick(coach, /const lvlAt = [^\n]*\n/) + pick(coach, /const tierOf = \(n\) => \{[\s\S]*?\n\};\n/),
  pick(study, /const daysTo = [^\n]*\n/),
  load('30-game-rpg.js'),
  pick(load('20-item-components.js'), /function fmtDay\(s\) \{[\s\S]*?\n\}\n/),
  pick(study, /function getClasses\(\) \{[\s\S]*?\n\}\n/) + pick(study, /const classesOn = [\s\S]*?\n    \.sort[^\n]*\n/),
  (() => { const t = load('74-time-blocks.js'); return t.slice(t.indexOf('const toMin'), t.indexOf('const isBlock')); })(),
  (() => { const n = load('45-templates-native-notifications.js'); return n.slice(n.indexOf('function buildNotifications'), n.indexOf('function notifCard')); })(),
];
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(2026, 9, 23, 10, 0, 0); }
  static now() { return new Date(2026, 9, 23, 10, 0, 0).getTime(); }
}
const run = `${parts.join('\n')}
let BACKUP = false; const backupDue = () => BACKUP;
const D = 864e5, now = Date.now(), day = (n) => ds(addDays(new Date(), n));
S.tasks = [
 {id:'t1',title:'Report',due:day(0),priority:'high',created:now-3*D},
 {id:'t2',title:'Late one',due:day(-2),priority:'low',created:now-5*D},
 {id:'t3',title:'Gym',due:day(1),start:'18:30',dur:90,created:now},
 {id:'t4',title:'Call',due:day(1),start:'09:00',created:now},
 {id:'t5',title:'Done',due:day(0),done:true,doneAt:now,created:now},
 {id:'t6',title:'Arch',due:day(2),archived:true,created:now},
 {id:'t7',title:'Block 75',due:day(3),start:'07:15',dur:75,created:now},
];
S.habits = [
 {id:'h1',name:'Read',kind:'',days:[],created:now-30*D,at:'07:30',where:'the sofa',icon:'📖'},
 {id:'h2',name:'Stretch',kind:'',days:[1,3,5],created:now-30*D,at:'21:00',mini:'one pose'},
 {id:'h3',name:'Water',kind:'',days:[],created:now-30*D,at:'bad'},
 {id:'h4',name:'No sugar',kind:'avoid',days:[],created:now-20*D},
 {id:'h5',name:'Late',kind:'',days:[],created:now+2*D},
];
S.logs = new Set(['h1|'+day(0)]);
S.exams = [{id:'e1',title:'Maths',kind:'exam',subject:'M',date:day(1),time:'09:00',created:now},{id:'e2',title:'Quiz',kind:'quiz',subject:'M',date:day(0),created:now},{id:'e3',title:'Scored',kind:'exam',subject:'M',date:day(2),score:5,created:now}];
const base = { student:true, rpg:true, rpgSince:day(-5), restDays:'', classes:JSON.stringify([
 {id:'c1',subject:'Physics',day:new Date().getDay(),start:'10:30',end:'11:30',room:'B2'},
 {id:'c2',subject:'Chem',day:new Date().getDay(),start:'08:00',end:'09:00',room:''},
 {id:'c3',subject:'Art',day:(new Date().getDay()+2)%7,start:'13:00',end:'14:00',room:'A1'}]) };
const SCEN = [
 { name:'en default', cfg:{ lang:'en' }, backup:false },
 { name:'ar 24h with backup', cfg:{ lang:'ar', timeFmt:'24', abOn:true, abTime:'22:15' }, backup:true },
 { name:'en 12h no extras', cfg:{ lang:'en', timeFmt:'12', nClasses:false, nExams:false, nBlocks:true, nBlockLead:'15', student:false, nMorning:'06:45' }, backup:false },
 { name:'rest day, rpg off', cfg:{ lang:'en', rpg:false, restDays:day(0), nEvening:'19:30' }, backup:false },
 { name:'bad times', cfg:{ lang:'en', nMorning:'', nEvening:'x', nBlockLead:'abc' }, backup:true },
];
const scen = SCEN.map((sc) => {
  S.cfg = { ...CFG_DEF_LOCAL, ...base, ...sc.cfg }; BACKUP = sc.backup;
  LOCALE = S.cfg.lang === 'ar' ? 'ar-u-nu-latn' : undefined;
  return { name: sc.name, cfg: S.cfg, backup: sc.backup, notifs: buildNotifications() };
});
({ today: ds(new Date()), nowMs: now, tzName: process_tz, state: { tasks: S.tasks, habits: S.habits, exams: S.exams, logs: [...S.logs] }, scen })
`;
const CFG_DEF_LOCAL = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'core', 'src', 'cfg.rs'), 'utf8').match(/r#"(\{[\s\S]*?\})"#/)[1]);
const out = vm.runInNewContext(run, { Date: FakeDate, Intl, Math, JSON, Set, Map, console, CFG_DEF_LOCAL, process_tz: Intl.DateTimeFormat().resolvedOptions().timeZone, localStorage: { getItem: () => null, setItem() {} }, document: {}, window: {}, navigator: {} });
fs.writeFileSync(path.join(HERE, '..', 'core', 'tests', 'fixtures', 'notify.json'), JSON.stringify(out, null, 1));
console.log('scenarios', out.scen.map((x) => x.name + ':' + x.notifs.length).join(', '), 'tz', out.tzName);
