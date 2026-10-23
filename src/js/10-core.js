/* ---------- Database (IndexedDB) ---------- */
const STORES=['tasks','goals','habits','logs','topics','exams','trash'];
let DBV=0;
const DB={
  db:null, mem:null,
  open(){
    return new Promise(res=>{
      try{
        const r=indexedDB.open('goal-tracker-db',4);
        r.onupgradeneeded=()=>{const d=r.result;STORES.forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'})})};
        r.onsuccess=()=>{this.db=r.result;res(true)};
        r.onerror=()=>{this.useMemory();res(false)};
      }catch(e){this.useMemory();res(false)}
    });
  },
  useMemory(){this.mem={};STORES.forEach(s=>this.mem[s]=new Map())},
  req(store,mode,fn){
    if(this.mem){return Promise.resolve(fn(null))}
    return new Promise((res,rej)=>{
      const t=this.db.transaction(store,mode);const r=fn(t.objectStore(store));
      t.oncomplete=()=>res(r&&'result' in r?r.result:undefined);t.onerror=()=>rej(t.error);
    });
  },
  all(s){return this.mem?Promise.resolve([...this.mem[s].values()]):this.req(s,'readonly',st=>st.getAll())},
  put(s,v){DBV++;if(this.mem){this.mem[s].set(v.id,v);return Promise.resolve()}return this.req(s,'readwrite',st=>st.put(v))},
  del(s,id){DBV++;if(this.mem){this.mem[s].delete(id);return Promise.resolve()}return this.req(s,'readwrite',st=>st.delete(id))},
  clear(s){DBV++;if(this.mem){this.mem[s].clear();return Promise.resolve()}return this.req(s,'readwrite',st=>st.clear())}
};

/* ---------- Helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad=n=>String(n).padStart(2,'0');
const ds=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const TODAY=()=>ds(new Date());
function isoWeek(d){
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);
  const y=t.getUTCFullYear();const w=Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7);
  return `${y}-W${pad(w)}`;
}
const HORIZONS={weekly:'Weekly',monthly:'Monthly',annual:'Annual',five:'5-Year'};
const PARENT={weekly:'monthly',monthly:'annual',annual:'five',five:null};
function currentPeriod(h){
  const d=new Date(),y=d.getFullYear();
  return h==='weekly'?isoWeek(d):h==='monthly'?ds(d).slice(0,7):h==='annual'?String(y):`${y}-${y+4}`;
}
let LOCALE;
const _fmts={};
// Creating a formatter is the slow part of toLocale*String, so build each one once and reuse it.
const fmt=(d,o)=>{const k=LOCALE+JSON.stringify(o);return(_fmts[k]||(_fmts[k]=new Intl.DateTimeFormat(LOCALE,o))).format(d)};
const fmtDate=s=>{if(!s)return'';const d=new Date(s+'T00:00');return fmt(d,{month:'short',day:'numeric'})};

/* ---------- State ---------- */
const S={tasks:[],goals:[],habits:[],topics:[],exams:[],logs:new Set(),view:'dash',horizon:'ladder',goalScope:'current',taskFilter:'open',persistent:true,trash:[],sel:new Set(),selMode:null};

const TRASH_DAYS=30;
async function load(){
  S.persistent=await DB.open();
  const [t,g,h,l,tp,ex,tr]=await Promise.all(STORES.map(s=>DB.all(s)));
  const cut=Date.now()-TRASH_DAYS*864e5;S.trash=(tr||[]).filter(r=>r&&r.data&&(r.at||0)>=cut);
  for(const r of (tr||[]))if(!S.trash.includes(r))DB.del('trash',r.id);
  S.exams=ex;S.topics=tp;S.tasks=t;S.goals=g;S.habits=h;S.logs=new Set(l.map(x=>x.id));
}

/* ---------- Logic ---------- */
const goalById=id=>S.goals.find(g=>g.id===id);
/* Goal kinds:
   check  – done when ticked, or automatically when all linked tasks are done
   number – target + unit (e.g. 40 hours); done automatically at 100%
   rollup – built from sub-goals; progress = sum of children ÷ EXPECTED count (not just the ones created so far),
            so one finished week can't complete a whole month */
const CHILD={monthly:'weekly',annual:'monthly',five:'annual'};
function goalKind(g){return g.kind||(S.goals.some(c=>c.parentId===g.id)?'rollup':'check')}
function periodEnd(h,p){let m;
  if(h==='weekly'&&(m=/^(\d{4})-W(\d{2})$/.exec(p))){const jan4=new Date(+m[1],0,4);const mon=addDays(jan4,-((jan4.getDay()+6)%7)+(+m[2]-1)*7);return ds(addDays(mon,6))}
  if(h==='monthly'&&(m=/^(\d{4})-(\d{2})$/.exec(p)))return ds(new Date(+m[1],+m[2],0));
  if(h==='annual'&&(m=/^(\d{4})$/.exec(p)))return m[1]+'-12-31';
  if(h==='five'&&(m=/^(\d{4})-(\d{4})$/.exec(p)))return m[2]+'-12-31';
  return null;}
function defaultExpected(g){
  if(g.horizon==='monthly'){const m=/^(\d{4})-(\d{2})$/.exec(g.period||'');if(!m)return 4;let n=0;const days=new Date(+m[1],+m[2],0).getDate();
    for(let d=1;d<=days;d++)if(new Date(+m[1],+m[2]-1,d).getDay()===4)n++;return n} // ISO weeks whose Thursday is in the month
  return{annual:12,five:5}[g.horizon]||1;}
const expectedOf=g=>Math.max(1,+g.expected||defaultExpected(g));
const fmtNum=n=>String(+(+n||0).toFixed(2));
function progressRaw(g,seen=new Set()){
  if(seen.has(g.id))return 0;seen.add(g.id);
  const k=goalKind(g);
  if(k==='number'){const t=+g.target||0;const v=+g.value||0;return t<=0?0:v>=t?100:Math.min(99,Math.floor(v/t*100))}
  if(k==='rollup'){const kids=S.goals.filter(c=>c.parentId===g.id);const n=Math.max(expectedOf(g),kids.length);
    const sum=kids.reduce((a,c)=>a+progress(c,seen),0);return sum>=n*100?100:Math.min(99,Math.floor(sum/n))}
  const t=S.tasks.filter(x=>x.goalId===g.id);if(!t.length)return 0;const d=t.filter(x=>x.done).length;return d===t.length?100:Math.min(99,Math.floor(d/t.length*100));
}
function progress(g,seen=new Set()){return g.done?100:progressRaw(g,seen)}
function goalDetail(g){
  const k=goalKind(g);
  if(k==='number')return'';
  if(k==='rollup'){const kids=S.goals.filter(c=>c.parentId===g.id),n=Math.max(expectedOf(g),kids.length),d=kids.filter(c=>c.done).length;
    const lbl=CHILD[g.horizon]?HORIZONS[CHILD[g.horizon]].toLowerCase():'sub';
    return`${d} of ${n} ${lbl} goals done${kids.length<n?` · ${n-kids.length} still to plan`:''}`}
  const t=S.tasks.filter(x=>x.goalId===g.id);return t.length?`${t.filter(x=>x.done).length}/${t.length} linked tasks done`:'tick ✓ when done';
}
const needsReview=g=>{if(g.done||g.status==='missed')return false;const e=periodEnd(g.horizon,g.period);return!!e&&e<TODAY()};
// Auto-complete goals that reached 100% (cascading upward); reopen auto-completed ones that dropped below.
function syncGoals(){
  const changed=new Set(),newly=new Set();
  for(let pass=0,dirty=true;dirty&&pass<10;pass++){dirty=false;
    for(const g of S.goals){
      if(g.status==='missed')continue;
      const raw=progressRaw(g);
      if(g.manualOpen&&raw<100){g.manualOpen=false;changed.add(g)}
      if(!g.done&&!g.manualOpen&&raw>=100){g.done=true;g.autoDone=true;g.doneAt=Date.now();changed.add(g);newly.add(g);dirty=true}
      else if(g.done&&g.autoDone&&raw<100){g.done=false;g.autoDone=false;g.doneAt=null;changed.add(g);newly.delete(g);dirty=true}
    }}
  for(const g of changed)DB.put('goals',g);
  return[...newly].filter(g=>g.done);
}
const logged=(hid,date)=>S.logs.has(hid+'|'+date);
// "Avoid" habits: a logged day is a SLIP; every day from creation until today is clean unless slipped.
const isNeg=h=>h.kind==='avoid';
const bornK=h=>ds(new Date(h.created||Date.now()));
const slipMode=h=>isNeg(h)&&h.mode!=='confirm';
const good=(h,k)=>slipMode(h)?(k>=bornK(h)&&k<=TODAY()&&!S.logs.has(h.id+'|'+k)):S.logs.has(h.id+'|'+k);
const hname=h=>(isNeg(h)?'🚫 ':'')+esc(h.name);
// Schedules: h.days = weekdays it's due (0=Sun…6=Sat); empty/missing = every day.
const hasSched=h=>Array.isArray(h.days)&&h.days.length>0&&h.days.length<7;
const isDue=(h,d)=>!hasSched(h)||h.days.includes(d.getDay());
const dueToday=h=>isDue(h,new Date());
const weekTarget=h=>hasSched(h)?h.days.length:(h.target||7);
const DOW_ORDER=[1,2,3,4,5,6,0];
const schedText=h=>hasSched(h)?DOW_ORDER.filter(n=>h.days.includes(n)).map(n=>fmt(new Date(2024,0,n||7),{weekday:'short'})).join(' · '):'';
// Streak = consecutive DUE days done; days off neither break nor add to it (a check-in on a day off still counts).
let _rest=null;const isRest=k=>(_rest||(_rest=new Set((S.cfg.restDays||'').split(',').filter(Boolean)))).has(k);
function streak(h){
  if(slipMode(h)){let n=0,d=new Date();for(let i=0;i<4000;i++){const k=ds(d);if(good(h,k))n++;else if(!isRest(k)||k<bornK(h))break;d=addDays(d,-1)}return n}
  let d=new Date();if(!good(h,ds(d)))d=addDays(d,-1);
  let n=0;for(let i=0;i<1100;i++){if(good(h,ds(d)))n++;else if(isDue(h,d)&&!isRest(ds(d)))break;d=addDays(d,-1)}return n;
}
function weekCount(h){
  const d=new Date();const dow=(d.getDay()+6)%7;let n=0;
  for(let i=0;i<=dow;i++)if(good(h,ds(addDays(d,-i))))n++;return n;
}
function rate30(h){let due=0,n=0;for(let i=0;i<30;i++){const d=addDays(new Date(),-i);if(isNeg(h)&&ds(d)<bornK(h))continue;if(isDue(h,d)){due++;if(good(h,ds(d)))n++}}return due?Math.min(100,Math.round(n/due*100)):0}

