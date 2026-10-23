/* ---------- Student mode: retrospective revision timetable ---------- */
const CONF_LABEL=['Not started','Weak','OK','Strong'];
const subjList=id=>`<datalist id="${id}">${[...new Set(S.topics.map(t=>t.subject))].sort().map(n=>`<option value="${esc(n)}">`).join('')}</datalist>`;
const lastSess=t=>(t.sessions||[]).reduce((a,x)=>!a||x.d>a.d?x:a,null);
const topicConf=t=>{const l=lastSess(t);return l?l.c:0};
function agoDays(d){const n=Math.round((new Date(TODAY()+'T00:00')-new Date(d+'T00:00'))/864e5);return n<=0?'today':n===1?'yesterday':n+' days ago'}
const daysTo=d=>Math.round((new Date(d+'T00:00')-new Date(TODAY()+'T00:00'))/864e5);
const examIcon=e=>e.kind==='quiz'?'❓':'📝';
const whenText=n=>n<0?Math.abs(n)+' day'+(Math.abs(n)>1?'s':'')+' ago':n===0?'Today':n===1?'Tomorrow':'in '+n+' days';
const needsResult=e=>daysTo(e.date)<0&&e.score==null;
const upcomingExams=()=>S.exams.filter(e=>daysTo(e.date)>=0).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
const urgentSubjects=()=>{const m=new Map();for(const e of upcomingExams()){const n=daysTo(e.date);if(n<=14&&e.subject&&!m.has(e.subject))m.set(e.subject,n)}return m};
function examRow(e){const n=daysTo(e.date);const pct=e.score!=null&&e.max>0?Math.round(e.score/e.max*100):null;const tone=e.score!=null||n<0?'':n<=3?'hot':n<=7?'warm':'';const d=new Date(e.date+'T00:00');
  const pill=e.score!=null?`<span class="pill ok">${e.score}${e.max?'/'+e.max:''}${pct!=null?' · '+pct+'%':''}</span>`:n>=0?`<span class="pill ${tone}">${whenText(n)}</span>`:`<button type="button" class="pill warn" data-action="edit-exam" data-id="${e.id}">Log result</button>`;
  return `<div class="exrow ${tone}"><div class="datebox"><small>${fmt(d,{month:'short'})}</small><b>${d.getDate()}</b></div>
    <div class="grow"><b>${examIcon(e)} ${esc(e.title)}</b><div class="meta">${e.subject?`<span>${esc(e.subject)}</span>`:''}${e.time?`<span>${esc(e.time)}</span>`:''}</div>${e.notes?`<div class="tnotes">${esc(e.notes)}</div>`:''}</div>
    <div class="exr">${pill}<div class="mini">${shareBtn('exam',e.id)}<button class="icon" data-action="edit-exam" data-id="${e.id}" aria-label="Edit ${esc(e.title)}">✎</button><button class="icon" data-action="del-exam" data-id="${e.id}" aria-label="Delete ${esc(e.title)}">✕</button></div></div></div>`}
function examsCard(){
  const up=upcomingExams(),past=S.exams.filter(e=>daysTo(e.date)<0).sort((a,b)=>b.date.localeCompare(a.date));
  const open=S.examsPast;
  return `<div class="card scard"><div class="shead"><div class="title">Exams &amp; quizzes</div><button class="chip" data-action="add-exam">+ Add</button></div>
    ${up.length?up.map(examRow).join(''):'<div class="empty">Nothing coming up. Add your exams and quizzes so you never miss one.</div>'}
    ${past.length?`<button class="chip" style="margin-top:8px" data-action="toggle-past-exams">${open?'Hide':'Show'} past (${past.length}${past.some(needsResult)?' · result missing':''})</button>${open?past.map(examRow).join(''):''}`:''}</div>`}
let _exMap=null,_srMemo=new Map();
function examDaysFor(subject){if(!_exMap){_exMap=new Map();for(const e of S.exams){if(!e.subject)continue;const n=daysTo(e.date);if(n>=0&&(!_exMap.has(e.subject)||n<_exMap.get(e.subject)))_exMap.set(e.subject,n)}}return _exMap.has(subject)?_exMap.get(subject):null}
function srNext(t){
  const sig=(t.sessions||[]).length+'|'+TODAY(),hit=_srMemo.get(t.id);if(hit&&hit.sig===sig)return hit.v;
  const v=srNextRaw(t);_srMemo.set(t.id,{sig,v});return v;
}
function srNextRaw(t){
  if(!S.cfg.srOn)return null;const ss=[...(t.sessions||[])].sort((a,b)=>a.d.localeCompare(b.d));if(!ss.length)return null;
  const last=ss[ss.length-1];let iv;
  if(last.c===1)iv=+S.cfg.srWeak||1;else if(last.c===2)iv=+S.cfg.srOk||3;
  else{let n=0;for(let i=ss.length-1;i>=0&&ss[i].c===3;i--)n++;const lad=String(S.cfg.srLadder).split(',').map(Number).filter(x=>x>0);iv=lad[Math.min(n-1,lad.length-1)]||7}
  const en=examDaysFor(t.subject);if(en!==null&&en<=14)iv=Math.min(iv,Math.max(1,Math.ceil(en/2)));
  return ds(addDays(new Date(last.d+'T00:00'),iv));
}
const srDue=t=>{const n=srNext(t);return n!==null&&n<=TODAY()};
const srBadge=t=>{const n=srNext(t);if(n===null)return '';return n<=TODAY()?'<span class="overdue">Due for review</span>':`<span>Next review: ${fmtDate(n)}</span>`};
function topicPicks(){
  const today=TODAY(),urg=urgentSubjects(),cls=todaySubjects();
  return S.topics.filter(t=>!(t.sessions||[]).some(x=>x.d===today)).map(t=>{const l=lastSess(t);return{t,cl:cls.has(t.subject)?0:1,due:srDue(t)?0:1,rank:{1:0,0:1,2:2,3:3}[l?l.c:0],urg:urg.get(t.subject)??99,last:l?l.d:''}})
    .sort((a,b)=>(a.cl-b.cl)||(a.due-b.due)||(a.rank-b.rank)||(a.urg-b.urg)||a.last.localeCompare(b.last)).map(x=>x.t)
}
function studiedToday(){const t=TODAY();return S.topics.filter(x=>(x.sessions||[]).some(s=>s.d===t)).length}
let cellEl=null,cellAt=0;
function hideCellMenu(){const m=$('#cellMenu');if(m)m.classList.remove('show');cellEl=null}
function showCellMenu(el){
  if(cellEl===el){hideCellMenu();return}
  let m=$('#cellMenu');if(!m){m=document.createElement('div');m.id='cellMenu';m.setAttribute('role','menu');document.body.appendChild(m)}
  const t=S.topics.find(x=>x.id===el.dataset.id);if(!t)return;const has=(t.sessions||[]).some(x=>x.d===el.dataset.d);
  const b=(c,l)=>`<button type="button" role="menuitem" class="rb c${c}" data-action="topic-set" data-id="${t.id}" data-d="${el.dataset.d}" data-c="${c}">${l}</button>`;
  m.innerHTML=b(1,'Weak')+b(2,'OK')+b(3,'Strong')+(has?b(0,'Clear'):'');
  m.classList.remove('show');m.style.visibility='hidden';m.classList.add('show');
  const r=el.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight;
  let x=Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8),y=r.bottom+6;if(y+h>innerHeight-70)y=r.top-h-6;
  m.style.left=x+'px';m.style.top=Math.max(8,y)+'px';m.style.visibility='';cellEl=el;cellAt=Date.now();
}
document.addEventListener('click',e=>{if(cellEl&&!e.target.closest('#cellMenu,[data-action=topic-cell]'))hideCellMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideCellMenu()});
addEventListener('scroll',()=>{if(cellEl&&Date.now()-cellAt>400)hideCellMenu()},{passive:true});
function topicCells(t,n=7){let out='';for(let i=n-1;i>=0;i--){const d=addDays(new Date(),-i),k=ds(d),se=(t.sessions||[]).find(x=>x.d===k);
  out+=`<button class="tc ${se?'c'+se.c:''} ${i===0?'today':''}" data-action="topic-cell" data-id="${t.id}" data-d="${k}" aria-label="${esc(t.name)} ${k}: ${se?CONF_LABEL[se.c]:'not studied'}" title="${k}">${fmt(d,{weekday:'narrow'})}<b>${d.getDate()}</b></button>`}
  return `<div class="tgrid">${out}</div>`}
/* ---------- Class timetable ---------- */
function getClasses(){try{const a=JSON.parse(S.cfg.classes||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function setClasses(a){S.cfg.classes=JSON.stringify(a);saveCfg()}
const ttOrder=()=>{const st={sat:6,sun:0,mon:1}[S.cfg.ttStart]??0;return[...Array(7)].map((_,i)=>(st+i)%7)};
const dayName=(i,o)=>fmt(new Date(2024,0,7+i),o||{weekday:'long'}); // 7 Jan 2024 was a Sunday
const classesOn=d=>getClasses().filter(c=>+c.day===d).sort((a,b)=>a.start.localeCompare(b.start));
const todaySubjects=()=>new Set(classesOn(new Date().getDay()).map(c=>c.subject));
function classRow(c,now){const live=now&&c.start<=now&&now<c.end,next=now&&c.start>now;
  return `<div class="cls ${live?'live':''}"><b class="cls-t" dir="ltr">${c.start}${c.end?'–'+c.end:''}</b><div class="grow"><b translate="no">${esc(c.subject)}</b>${c.room?` <span class="meta" style="display:inline" translate="no">· ${esc(c.room)}</span>`:''}${live?` <span class="pill sm ok">${L2('now','الآن')}</span>`:''}</div>
    <button class="icon" data-action="cls-del" data-id="${c.id}" aria-label="Delete ${esc(c.subject)}">✕</button></div>`}
function timetableCard(){
  const cls=getClasses(),now=new Date(),hm=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'),td=now.getDay();
  const days=ttOrder().filter(d=>classesOn(d).length);
  return `<div class="card scard"><div class="shead"><div class="title">🗓 Timetable</div><label class="tt-st"><span class="meta">Week starts</span><select data-action="set" data-k="ttStart" aria-label="Week starts">${[['sat',dayName(6)],['sun',dayName(0)],['mon',dayName(1)]].map(([v,l])=>`<option value="${v}" ${S.cfg.ttStart===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
    ${days.length?days.map(d=>`<div class="tt-day ${d===td?'today':''}"><div class="tt-dn">${dayName(d)}${d===td?` <span class="pill sm warm">${L2('Today','اليوم')}</span>`:''}</div>${classesOn(d).map(c=>classRow(c,d===td?hm:null)).join('')}</div>`).join(''):`<p class="meta">No classes yet. Add your weekly classes below.</p>`}
    <details class="tt-add" ${cls.length?'':'open'}><summary>+ Add class</summary>
    <form class="add" data-form="cls" style="margin-top:10px;border:0;padding:0;background:none">
      <input type="text" name="subject" list="subjListCls" placeholder="Subject" required autocomplete="off">${subjList('subjListCls')}
      <select name="day" aria-label="Day">${ttOrder().map(d=>`<option value="${d}" ${d===td?'selected':''}>${dayName(d)}</option>`).join('')}</select>
      <div class="two"><div><label>Starts</label><input type="time" name="start" required value="08:00" aria-label="Starts"></div><div><label>Ends</label><input type="time" name="end" value="09:30" aria-label="Ends"></div></div>
      <input type="text" name="room" placeholder="Room (optional)" autocomplete="off">
      <button class="btn">Add class</button></form></details></div>`;
}
function todayClassesLine(){
  const cs=classesOn(new Date().getDay());if(!cs.length)return'';const now=new Date(),hm=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const nx=cs.find(c=>c.start>hm),live=cs.find(c=>c.start<=hm&&hm<(c.end||c.start));
  return `<div class="tt-line"><span>🗓</span>${cs.map(c=>`<span class="tt-chip ${c===live?'live':c===nx?'next':''}"><b dir="ltr">${c.start}</b> <span translate="no">${esc(c.subject)}</span></span>`).join('')}</div>`;
}
function studyCard(){
  if(!S.cfg.student)return '';
  const weak=S.topics.filter(t=>topicConf(t)===1).length,fresh=S.topics.filter(t=>topicConf(t)===0).length;
  const soon=upcomingExams().filter(e=>daysTo(e.date)<=14).slice(0,3),miss=S.exams.filter(needsResult).length;
  return `<div class="card"><div class="title">📚 Study today</div>${todayClassesLine()}
    ${S.topics.length?`<div class="meta"><span>${studiedToday()} studied today</span><span>${weak} weak</span><span>${fresh} not started</span>${(()=>{const n=S.topics.filter(srDue).length;return n?`<span class="overdue">${n} due for review</span>`:''})()}</div>`:'<div class="meta">Add your subjects and topics to start your revision timetable.</div>'}
    ${soon.map(e=>`<div class="meta" style="margin-top:6px"><span>${examIcon(e)} <b>${esc(e.title)}</b></span><span class="${daysTo(e.date)<=3?'overdue':''}">${whenText(daysTo(e.date))}</span></div>`).join('')}
    ${miss?`<div class="meta" style="margin-top:6px"><span class="overdue">${miss} past exam${miss>1?'s':''}/quiz${miss>1?'zes':''} without a result</span></div>`:''}
    <button class="chip" style="margin-top:8px" data-action="goto-study">Open Study →</button></div>`;
}
function studyWeek(a,z){let sessions=0;const ids=new Set();for(const t of S.topics)for(const x of t.sessions||[])if(x.d>=a&&x.d<=z){sessions++;ids.add(t.id)}return{sessions,topics:ids.size}}
function insightsCard(){
  if(!S.topics.length)return '';
  const bySub=new Map();for(const t of S.topics){if(!bySub.has(t.subject))bySub.set(t.subject,[]);bySub.get(t.subject).push(t)}
  const rows=[...bySub.keys()].sort().map(name=>{const ts=bySub.get(name),n=ts.length,c=[0,0,0,0];ts.forEach(t=>c[topicConf(t)]++);
    const last=ts.reduce((a,t)=>{const l=lastSess(t);return l&&(!a||l.d>a)?l.d:a},null),due=ts.filter(srDue).length,ex=examDaysFor(name);
    const seg=(k,cls)=>c[k]?`<span class="${cls}" style="width:${c[k]/n*100}%"></span>`:'';
    return `<div class="trow"><div class="top"><div class="grow"><b>${esc(name)}</b><div class="meta"><span>${c[3]} strong</span><span>${c[2]} OK</span><span>${c[1]} weak</span><span>${c[0]} not started</span></div></div></div>
      <div class="stack">${seg(3,'s3')}${seg(2,'s2')}${seg(1,'s1')}${seg(0,'s0')}</div>
      <div class="meta" style="margin-top:4px"><span>${last?'Last studied: '+agoDays(last):'Not studied yet'}</span>${due?`<span class="overdue">${due} due for review</span>`:''}${ex!==null?`<span class="${ex<=3?'overdue':''}">Exam ${whenText(ex)}</span>`:''}</div></div>`}).join('');
  const days=[...Array(14)].map((_,i)=>{const d=addDays(new Date(),i-13),k=ds(d);let n=0;for(const t of S.topics)if((t.sessions||[]).some(x=>x.d===k))n++;return{d,n}});
  const mx=Math.max(1,...days.map(x=>x.n)),tot=days.reduce((a,x)=>a+x.n,0);
  return `<div class="card" style="margin-bottom:12px"><div class="title">Insights</div>${rows}
    <div class="h2row" style="margin-top:12px"><h2 style="margin:0;font-size:14px">Topics studied per day</h2><span class="meta">${tot} in 14 days</span></div>
    <div class="sbars" role="img" aria-label="Topics studied per day, last 14 days, ${tot} total">${days.map(x=>`<div class="sbar"><i style="height:${x.n?Math.max(6,x.n/mx*100):2}%" class="${x.n?'on':''}"></i><span>${fmt(x.d,{weekday:'narrow'})}</span></div>`).join('')}</div></div>`;
}
function pickRow(t){const c=topicConf(t),l=lastSess(t),due=srDue(t);
  return `<div class="pick ${due?'due':'c'+c}"><div class="pk-main"><b>${esc(t.name)}</b><div class="chips"><span class="chip2">${esc(t.subject)}</span>
    ${due?'<span class="chip2 due">Due for review</span>':`<span class="chip2"><i class="cdot c${c}"></i>${CONF_LABEL[c]}</span>`}${l?`<span class="chip2 mute">Last: ${agoDays(l.d)}</span>`:''}</div></div>
    <div class="rate" role="group" aria-label="${esc(t.name)}"><button type="button" class="rb c1" data-action="topic-rate" data-id="${t.id}" data-c="1">Weak</button><button type="button" class="rb c2" data-action="topic-rate" data-id="${t.id}" data-c="2">OK</button><button type="button" class="rb c3" data-action="topic-rate" data-id="${t.id}" data-c="3">Strong</button></div></div>`}
function viewStudy(){
  const picksAll=topicPicks(),picks=picksAll.slice(0,5);const bySub=new Map();
  for(const t of S.topics){if(!bySub.has(t.subject))bySub.set(t.subject,[]);bySub.get(t.subject).push(t)}
  const row=t=>`<div class="trow"><div class="top"><div class="grow"><b>${esc(t.name)}</b><div class="meta"><span><i class="cdot c${topicConf(t)}"></i>${CONF_LABEL[topicConf(t)]}</span><span>${lastSess(t)?'Last: '+agoDays(lastSess(t).d):'Never studied'}</span>${srBadge(t)}</div></div>
    <div class="mini">${shareBtn('topic',t.id)}<button class="icon" data-action="edit-topic" data-id="${t.id}" aria-label="Edit ${esc(t.name)}">✎</button><button class="icon" data-action="del-topic" data-id="${t.id}" aria-label="Delete ${esc(t.name)}">✕</button></div></div>${topicCells(t)}</div>`;
  let sections='';
  for(const name of [...bySub.keys()].sort()){const ts=bySub.get(name),key='sub:'+name,collapsed=!(S.subOpen&&S.subOpen.has(key));
    const c=[0,0,0,0];ts.forEach(t=>c[topicConf(t)]++);const seg=(k,cls)=>c[k]?`<span class="${cls}" style="width:${c[k]/ts.length*100}%"></span>`:'';
    sections+=`<section class="hfolder ${collapsed?'collapsed':''}"><div class="hf-head"><button type="button" class="hf-toggle" data-action="toggle-folder" data-name="${esc(key)}" aria-expanded="${!collapsed}">
      <span class="hf-chev">${collapsed?'▶':'▼'}</span><span class="hf-name">${esc(name)}</span></button><span class="hf-count">${L2(ts.length+' topics · '+ts.filter(srDue).length+' due',ts.length+' مواضيع · '+ts.filter(srDue).length+' للمراجعة')}</span></div>
      <div class="stack thin">${seg(3,'s3')}${seg(2,'s2')}${seg(1,'s1')}${seg(0,'s0')}</div>
      ${collapsed?'':ts.sort((a,b)=>a.name.localeCompare(b.name)).map(row).join('')}</section>`}
  const dueN=S.topics.filter(srDue).length,nx=upcomingExams()[0],nd=nx?daysTo(nx.date):null;
  const tile=(n,l,cls)=>`<div class="stile ${cls||''}"><b>${n}</b><span>${l}</span></div>`;
  return `<h2>Study</h2>
  <div class="stiles">${tile(dueN,'To review',dueN?'hot':'')}${tile(studiedToday(),'Studied today','ok')}${tile(nd===null?'—':nd,'Days to next exam',nd!==null&&nd<=3?'hot':'')}</div>
  ${examsCard()}
  ${timetableCard()}
  <div class="card scard"><div class="shead"><div class="title">Today's picks</div>${picksAll.length?`<span class="pill">${picksAll.length} to go</span>`:''}</div>
    ${picks.length?`<p class="meta" style="margin:0 0 6px">How did each topic feel today? Weak and untouched topics come first.</p>${picks.map(pickRow).join('')}`:`<div class="empty celebrate">${S.topics.length?'<span class="party">🎉</span> Everything has been studied today':'Add topics below to get daily picks.'}</div>`}</div>
  ${(()=>{const ins=insightsCard();return ins?`<details class="more" style="margin-top:12px"><summary>${L2('Insights','التحليلات')}</summary>${ins}</details>`:''})()}
  <details class="card scard addtopics" ${S.topics.length?'':'open'}><summary>Add subject or topics</summary>
  <form class="add" data-form="topics" style="margin-top:10px;border:0;padding:0;background:none">
    <input type="text" name="subject" list="subjListAdd" placeholder="Subject (e.g. Biochemistry)" required autocomplete="off">${subjList('subjListAdd')}
    <textarea name="names" placeholder="Topics, one per line" required style="min-height:70px"></textarea>
    <button class="btn">Add topics</button></form></details>
  <p class="meta legend">Tap a day to rate it: <i class="cdot c1"></i>Weak <i class="cdot c2"></i>OK <i class="cdot c3"></i>Strong. <span>Backfill past days to build your retrospective timetable.</span></p>
  ${sections||`<div class="empty">No subjects yet.</div>`}`;
}
