// Generates core/tests/fixtures/rpg.json by running the web app's own game code (the oracle) in Node.
// Usage: node rust-app/tools/gen_rpg_fixture.mjs   (no browser needed)
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', '..', 'src', 'js');
const load = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
// tierOf/lvlAt live in 50-coach-goals-ladder.js (which touches the DOM at load); copy only those two lines.
const coach = load('50-coach-goals-ladder.js');
const pick = (re) => coach.match(re)[0];
const tierSrc = pick(/const lvlAt = [^\n]*\n/) + pick(/const tierOf = \(n\) => \{[\s\S]*?\n\};\n/);
const study = load('91-study.js').match(/const daysTo = [^\n]*\n/)[0];
const body = `${load('10-core-data-state.js')}\n${tierSrc}\n${study}\n${load('30-game-rpg.js')}\n`;

const run = `${body}
const now=Date.now(),D=864e5,pr=['low','med','high'];
let seed=7;const R=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
LOCALE='en-US';
S.cfg={student:true,rpg:true,rpgSince:ds(addDays(new Date(),-25)),restDays:ds(addDays(new Date(),-9)),lvl2:'2',lvl3:'4',eliteTarget:'55'};
S.goals.push({id:'gw',title:'W',horizon:'weekly',period:currentPeriod('weekly'),kind:'check',created:now,done:false});
S.goals.push({id:'gm',title:'M',horizon:'monthly',period:ds(addDays(new Date(),-40)).slice(0,7),kind:'check',created:now,done:true});
S.goals.push({id:'ga',title:'A',horizon:'annual',period:String(new Date().getFullYear()),kind:'check',created:now,done:true});
let n=0;
for(let i=-4;i<60;i++){const c=i<0?2:(i>=3&&i<=13)?0:Math.floor(R()*7);
 for(let j=0;j<c;j++){const done=i>=0&&R()<0.8;
  const at=now-i*D-Math.floor(R()*10)*3600e3-j*60e3*7;
  const t={id:'t'+(n++),title:'x',priority:pr[Math.floor(R()*3)],due:R()<0.7?ds(addDays(new Date(),-i+Math.floor(R()*3)-1)):null,
   goalId:R()<0.15?'gw':null,done,doneAt:done?at:null,created:R()<0.2?at-60e3:at-3*D,items:[],pushes:R()<0.2?[{at:1}]:[]};
  if(done&&R()<0.25){t.dmg=Math.floor(R()*30)+1;if(R()<0.3)t.crit=true}
  if(R()<0.2)t.focusLog=[{at:at,m:Math.floor(R()*50)}];
  if(R()<0.2)t.items=[{text:'a',done:true,dmg:7,at:at}];
  S.tasks.push(t)}}
const mkh=(id,kind,days,age,mode)=>({id,name:id,kind,mode:mode||'',target:7,group:'',days,created:now-age*D});
S.habits.push(mkh('hb1','',[],70),mkh('hb2','',[1,3,5],50),mkh('hn1','avoid',[],45),mkh('hn2','avoid',[],30,'confirm'));
for(const h of S.habits)for(let i=0;i<70;i++){if(h.id!=='hn1'&&i>=3&&i<=13)continue;if(h.id==='hn1'&&i>=3&&i<=13){S.logs.add(h.id+'|'+ds(addDays(new Date(),-i)));continue}if(R()<(h.kind==='avoid'&&h.mode!=='confirm'?0.06:0.7)){S.logs.add(h.id+'|'+ds(addDays(new Date(),-i)))}}
S.topics.push({id:'tp1',subject:'Math',name:'a',sessions:[0,1,2,3,5,9,12,30].map((d,i)=>({d:ds(addDays(new Date(),-d)),c:i%4})),created:now});
S.exams.push({id:'e1',subject:'Math',title:'E',kind:'exam',date:ds(addDays(new Date(),-3)),score:70,max:100,created:now},
 {id:'e2',subject:'Math',title:'Q',kind:'quiz',date:ds(addDays(new Date(),-8)),score:20,max:100,created:now},
 {id:'e3',subject:'Math',title:'F',kind:'exam',date:ds(addDays(new Date(),6)),created:now},
 {id:'e4',subject:'Math',title:'G',kind:'exam',date:ds(addDays(new Date(),-1)),created:now});
const A=rpgAll(),T=rpgTower(),E=elites();
({today:TODAY(),tzName:Intl.DateTimeFormat().resolvedOptions().timeZone,
 state:{tasks:S.tasks,goals:S.goals,habits:S.habits,topics:S.topics,exams:S.exams,logs:[...S.logs],cfg:S.cfg},
 rpg:{weeks:A.weeks.map(w=>({key:w.key,keys:w.keys,tD:w.tD,hD:w.hD,sD:w.sD,fD:w.fD,total:w.total,hp:w.hp,best:w.best,won:w.won,ko:w.ko||0})),
  xp:A.xp,totT:A.totT,totH:A.totH,totS:A.totS,clean:A.clean,shields:A.shields,morale:A.morale,kos:A.kos,blocked:A.blocked,hits:A.hits,tokens:A.tokens,dayD:A.dayD},
 tower:{months:T.months.map(m=>({key:m.key,wins:m.wins,gd:m.gd,hp:m.hp,dmg:m.dmg,won:m.won,past:m.past})),years:T.years.map(y=>({key:y.key,gw:y.gw,ad:y.ad,hp:y.hp,dmg:y.dmg,won:y.won,past:y.past}))},
 elites:E.map(x=>({id:x.e.id,hp:x.hp,prep:x.prep,pct:x.pct,state:x.state,bonus:x.bonus}))})
`;
const out = vm.runInNewContext(run, { Intl, Date, Math, console, JSON, Set, Map, localStorage: { getItem: () => null, setItem() {} }, document: {}, window: {}, navigator: {} });
const file = path.join(HERE, '..', 'core', 'tests', 'fixtures', 'rpg.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log('wrote', file, 'weeks', out.rpg.weeks.length, 'today', out.today, 'tz', out.tzName);
