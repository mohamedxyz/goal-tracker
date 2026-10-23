/* ---------- Trash ---------- */
async function trashAdd(kind,data,logs){const r={id:kind+':'+data.id,kind,at:Date.now(),data,logs:logs||[]};S.trash=S.trash.filter(x=>x.id!==r.id);S.trash.push(r);await DB.put('trash',r)}
async function removeTasks(list){for(const t of list){S.tasks=S.tasks.filter(x=>x.id!==t.id);await DB.del('tasks',t.id);await trashAdd('task',t)}}
async function removeHabits(list){for(const h of list){const keys=[...S.logs].filter(k=>k.startsWith(h.id+'|'));
  S.habits=S.habits.filter(x=>x.id!==h.id);await DB.del('habits',h.id);for(const k of keys){S.logs.delete(k);await DB.del('logs',k)}await trashAdd('habit',h,keys)}}
async function trashRestore(id){const r=S.trash.find(x=>x.id===id);if(!r)return;
  if(r.kind==='task'){if(!S.tasks.some(x=>x.id===r.data.id)){S.tasks.push(r.data);await DB.put('tasks',r.data)}}
  else{if(!S.habits.some(x=>x.id===r.data.id)){S.habits.push(r.data);await DB.put('habits',r.data)}
    for(const k of r.logs||[]){const i=k.lastIndexOf('|');S.logs.add(k);await DB.put('logs',{id:k,habitId:k.slice(0,i),date:k.slice(i+1)})}}
  S.trash=S.trash.filter(x=>x.id!==id);await DB.del('trash',id)}
function viewTrash(){
  const list=[...S.trash].sort((a,b)=>b.at-a.at);
  const row=r=>{const left=Math.max(0,Math.ceil(TRASH_DAYS-(Date.now()-r.at)/864e5));const name=r.kind==='task'?r.data.title:r.data.name;
    return `<div class="card trash-row"><div class="grow"><div class="title">${esc(name)}</div>
      <div class="meta"><span>${r.kind==='task'?'Task':'Habit'}</span><span>Deleted ${fmtWhen(r.at)}</span><span>${left} day${left===1?'':'s'} left</span></div></div>
      <button class="icon" data-action="trash-restore" data-id="${esc(r.id)}" title="Restore" aria-label="Restore">↩</button>
      <button class="icon" data-action="trash-del" data-id="${esc(r.id)}" title="Delete forever" aria-label="Delete forever">✕</button></div>`};
  return `<div class="arch-head"><button class="ghost" data-action="back-data">← Settings</button><h2 style="margin:0">Trash</h2></div>
    <div class="bar-row"><span class="meta" style="margin:0">${list.length} item${list.length===1?'':'s'} · deleted tasks and habits are kept ${TRASH_DAYS} days</span>
      ${list.length?`<button class="ghost danger" data-action="trash-empty">Empty trash</button>`:''}</div>
    ${list.length?`<div class="goals">${list.map(row).join('')}</div>`:`<div class="empty">Trash is empty.</div>`}`;
}
/* ---------- Select mode (bulk edit) ---------- */
const selOn=k=>S.selMode===k&&S.view===k;
const selBox=id=>`<input type="checkbox" class="selbox" data-action="sel-toggle" data-id="${id}" ${S.sel.has(id)?'checked':''} aria-label="Select">`;
function selBar(){
  const k=S.selMode;if(!k||S.view!==k)return'';
  const n=S.sel.size,dis=n?'':'disabled';
  return `<div class="selbar" role="toolbar" aria-label="Bulk actions"><div class="selrow"><b>${n?n+' selected':L2('Tap items to select','اضغط العناصر لتحديدها')}</b>
    <button class="chip" data-action="sel-all">All</button><button class="chip" data-action="sel-none">None</button><button class="chip" data-action="sel-exit">Cancel</button></div>
    <div class="selrow">${k==='tasks'?`<button class="chip act" data-action="bulk-done" ${dis}>✓ Done</button>`:''}<button class="chip act" data-action="bulk-edit" ${dis}>✎ Edit…</button>${k==='tasks'?`<button class="chip act" data-action="bulk-archive" ${dis}>Archive</button>`:''}<button class="chip act danger" data-action="bulk-del" ${dis}>🗑 Delete</button></div></div>`;
}
function openBulk(){
  const k=S.selMode,n=S.sel.size;if(!k||!n)return;
  let body='';
  if(k==='tasks'){
    const goals=`<option value="">Don't change</option><option value="-">— No goal —</option>`+S.goals.filter(g=>!g.done&&g.horizon==='weekly').map(g=>`<option value="${g.id}">${HORIZONS[g.horizon]} · ${esc(g.title)}</option>`).join('');
    body=`<label>Due date</label><select name="dmode"><option value="">Don't change</option><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="week">In 7 days</option><option value="plus1">Push back 1 day</option><option value="pick">Pick a date…</option><option value="none">No date</option></select>
      <input type="date" name="due" style="margin-top:6px">
      <label>Priority</label><select name="priority"><option value="">Don't change</option><option value="low">Low</option><option value="med">Medium</option><option value="high">High</option></select>
      <label>Tag folder</label><input type="text" name="tag" list="tagListBulk" placeholder="Don't change" autocomplete="off">${tagList('tagListBulk')}
      <label class="check"><input type="checkbox" name="notag"> Remove tag</label>
      <label>Weekly goal</label><select name="goalId">${goals}</select>`;
  }else{
    body=`<label>Folder</label><input type="text" name="group" list="folderListBulk" placeholder="Don't change" autocomplete="off">${folderList('folderListBulk')}
      <label class="check"><input type="checkbox" name="nogroup"> Remove from folder</label>
      <label>Target per week (build habits)</label><select name="target"><option value="">Don't change</option>${[7,6,5,4,3,2,1].map(x=>`<option value="${x}">${x}× per week</option>`).join('')}</select>
      <label class="check"><input type="checkbox" name="setdays"> Change schedule (build habits)</label>${dayPicker([])}`;
  }
  dlg.innerHTML=`<form method="dialog" data-edit="bulk${k}" data-id=""><h3>Edit ${n} ${k==='tasks'?'task':'habit'}${n===1?'':'s'}</h3>${body}
    <div class="dlg-actions"><button class="ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="save">Apply</button></div></form>`;
  dlg.showModal();
}
async function applyBulk(kind,f){
  const v=Object.fromEntries(new FormData(f)),ids=[...S.sel];let n=0;
  if(kind==='bulktasks'){
    const lat=t=>{const m=v.dmode;return m==='tomorrow'||m==='week'||m==='plus1'||m==='none'||(m==='pick'&&v.due&&v.due>(t.due||''))};
    let why=null;
    if(beastOn()&&ids.some(id=>{const t=S.tasks.find(x=>x.id===id);return t&&!t.done&&t.due&&t.due<=TODAY()&&lat(t)})){why=await askWhy('pushing these back');if(!why){toast('Not applied. Titan wants a reason.');return false}}
    for(const id of ids){const t=S.tasks.find(x=>x.id===id);if(!t)continue;
      const m=v.dmode;if(why&&!t.done&&t.due&&t.due<=TODAY()&&lat(t))(t.pushes=t.pushes||[]).push({at:Date.now(),from:t.due,to:null,why});
      if(m==='today')t.due=TODAY();else if(m==='tomorrow')t.due=ds(addDays(new Date(),1));else if(m==='week')t.due=ds(addDays(new Date(),7));
      else if(m==='plus1')t.due=ds(addDays(new Date((t.due||TODAY())+'T00:00'),1));
      else if(m==='pick'&&v.due)t.due=v.due;else if(m==='none')t.due=null;
      if(v.priority)t.priority=v.priority;
      if(v.notag)t.tag='';else if((v.tag||'').trim())t.tag=v.tag.trim();
      if(v.goalId==='-')t.goalId=null;else if(v.goalId)t.goalId=v.goalId;
      await DB.put('tasks',t);n++}
  }else{
    const days=v.setdays?readDays(f):null;
    for(const id of ids){const h=S.habits.find(x=>x.id===id);if(!h)continue;
      if(v.nogroup)h.group='';else if((v.group||'').trim())h.group=v.group.trim();
      if(!isNeg(h)){if(v.target)h.target=+v.target;if(days)h.days=days}
      await DB.put('habits',h);n++}
  }
  S.selMode=null;S.sel.clear();toast(`Updated ${n} ${kind==='bulktasks'?'task':'habit'}${n===1?'':'s'}.`);
}
const folderOf=h=>(h.group||'').trim();
const dayPicker=(sel=[])=>`<div class="daypick" role="group" aria-label="Days it's due (none = every day)"><span class="dp-lbl">Days</span>${DOW_ORDER.map(n=>`<label title="${fmt(new Date(2024,0,n||7),{weekday:'long'})}"><input type="checkbox" name="days" value="${n}" ${sel.includes(n)?'checked':''}><span>${fmt(new Date(2024,0,n||7),{weekday:'narrow'})}</span></label>`).join('')}<span class="dp-hint">none = every day</span></div>`;
const readDays=f=>{const d=new FormData(f).getAll('days').map(Number);return d.length&&d.length<7?d.sort():[]};
const folderNames=()=>[...new Set(S.habits.map(folderOf).filter(Boolean))];
const folderList=id=>`<datalist id="${id}">${folderNames().map(f=>`<option value="${esc(f)}"></option>`).join('')}</datalist>`;
function viewArchive(){
  const list=S.tasks.filter(t=>t.archived).sort((a,b)=>(b.archivedAt||0)-(a.archivedAt||0));
  const nDone=list.filter(t=>t.done).length;
  return `<div class="arch-head"><button class="ghost" data-action="back-data">← Settings</button><h2 style="margin:0">Archived tasks</h2></div>
    <div class="bar-row"><span class="meta" style="margin:0">${list.length} archived · ${nDone} completed</span>
      ${nDone?`<button class="ghost danger" data-action="purge-archived">Delete ${nDone} completed</button>`:''}</div>
    ${list.length?`<div class="goals">${list.map(archCard).join('')}</div>`:`<div class="empty">Nothing archived yet. Use the archive button on a task to move it here.</div>`}`;
}
function archCard(t){
  const g=t.goalId&&goalById(t.goalId);
  const kv=(k,v)=>`<div class="kv"><span>${k}</span><span>${v}</span></div>`;
  return `<div class="card arch ${t.done?'':'notdone'}">
    <div style="display:flex;gap:8px;align-items:flex-start"><div class="grow"><div class="title">${esc(t.title)}</div>
      <div class="meta">${t.done?`<span class="okc">✓ Completed${t.doneAt?' '+fmtWhen(t.doneAt):''}</span>`:'<span>Not completed</span>'}</div></div>
      <button class="icon" data-action="unarchive" data-id="${t.id}" title="Restore to tasks" aria-label="Restore">↩</button>
      <button class="icon" data-action="del-task" data-id="${t.id}" title="Delete" aria-label="Delete">✕</button></div>
    ${t.notes?`<div class="notes">${esc(t.notes)}</div>`:''}
    ${(t.items||[]).length?`<div class="notes">${t.items.map(i=>(i.done?'☑ ':'☐ ')+esc(i.text)).join('<br>')}</div>`:''}
    <div class="kvs">${kv('Due',fmtDay(t.due))}${kv('Priority',{high:'High',med:'Medium'}[t.priority]||'Low')}${kv('Goal',g?esc(g.title):'—')}${t.repeat?kv('Repeats',REPEAT_LABEL[t.repeat]):''}${t.tag?kv('Tag','#'+esc(t.tag)):''}
      ${kv('Created',fmtWhen(t.created)||'—')}${kv('Completed',t.done?(fmtWhen(t.doneAt)||'Yes'):'—')}${kv('Archived',fmtWhen(t.archivedAt)||'—')}</div></div>`;
}
const sw=(k,label,hint,on)=>`<label class="swrow"><span>${label}${hint?`<small>${hint}</small>`:''}</span><input type="checkbox" class="sw" data-action="set" data-k="${k}" ${on?'checked':''}></label>`;
const sel=(k,label,opts,cur)=>`<label class="swrow"><span>${label}</span><select data-action="set" data-k="${k}">${opts.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join('')}</select></label>`;
function settingsCard(){
  const c=S.cfg;
  return `<h2>Settings</h2>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('General')?'open':''}"><div class="title" data-action="set-acc" data-k="General" role="button" tabindex="0">General</div>
    ${sw('sound','Sound effects','Chimes when you finish or undo something',Sound.on)}
    ${sel('lang','Language / اللغة',[['en','English'],['ar','العربية']],c.lang)}
    ${sel('theme','Theme',[['auto','Auto'],['light','Light'],['dark','Dark'],['black','Black (OLED)']],getTheme())}
    <div class="swrow"><span>Colour</span><div class="pals">${PALS.map(([k,l,c])=>`<button type="button" class="pal ${getPalette()===k?'on':''}" style="background:${c}" data-action="palette" data-v="${k}" title="${l}" aria-label="${l}" aria-pressed="${getPalette()===k}"></button>`).join('')}</div></div>
    ${sel('prio','Default priority for new tasks',[['low','Low'],['med','Medium'],['high','High']],c.prio)}
    ${sw('showDone','Show completed tasks','The dimmed "Completed" list under your tasks',c.showDone)}
  </div>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Student mode')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Student mode" role="button" tabindex="0">Student mode</div>
    ${sw('srOn','Spaced repetition','Topics come back for review when their date arrives',c.srOn)}
    ${sel('srWeak','Review Weak topics after',[['1','1 day'],['2','2 days']],c.srWeak)}
    ${sel('srOk','Review OK topics after',[['2','2 days'],['3','3 days'],['4','4 days'],['5','5 days']],c.srOk)}
    ${sel('srLadder','Review Strong topics after',[['1,3,7,14,30','1, 3, 7, 14, 30 days'],['1,2,4,7,14','1, 2, 4, 7, 14 days (tight)'],['2,5,10,21,45','2, 5, 10, 21, 45 days (relaxed)']],c.srLadder)}
    ${sw('stuCompact','Compact layout','Student mode only: tighter spacing, smaller text, fewer extras, so more fits on a small screen',c.stuCompact)}
    ${sw('student','Student mode','Adds a Study tab: revision timetable, today\'s picks, and exams',c.student)}
  </div>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Coach')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Coach" role="button" tabindex="0">Coach</div>
    ${sel('coachTone','Day levels and coach',[['on','On'],['off','Off']],coachTone())}
    ${sel('lvl2','Blaze starts at',[['2','2 tasks a day'],['3','3 tasks a day'],['4','4 tasks a day']],c.lvl2)}
    ${sel('lvl3','Titan starts at',[['5','5 tasks a day'],['6','6 tasks a day'],['8','8 tasks a day'],['10','10 tasks a day']],c.lvl3)}
    <p class="meta">⚡ Spark is a slow start and the coach is gentle. 🔥 Blaze pushes. ⚔️ Titan raises the bar: a daily quota, and you must type a reason to push back, reschedule or delete work that is due. Nothing is ever changed without you.</p>
  </div>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Game mode')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Game mode" role="button" tabindex="0">Game mode</div>
    ${sel('eliteTarget','Exam elite is defeated at',[['50','50%'],['60','60%'],['70','70%'],['80','80%'],['90','90%']],c.eliteTarget)}
    ${sw('rpg','RPG game mode','A weekly pixel boss you beat by finishing tasks, habits and study. Shows damage, a hero level and a bestiary of beaten monsters',c.rpg)}
  </div>
  ${notifCard()}
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Tasks')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Tasks" role="button" tabindex="0">Tasks</div>
    ${sel('focusLen','Focus session length',[['15','15 min'],['25','25 min'],['45','45 min'],['50','50 min']],c.focusLen)}
    ${sel('breakLen','Break length',[['5','5 min'],['10','10 min'],['15','15 min']],c.breakLen)}
    ${sel('dueDef','Default due date for new tasks',[['today','Today'],['tomorrow','Tomorrow'],['none','No date']],c.dueDef)}
    ${sel('sortBy','Sort open tasks by',[['due','Due date'],['prio','Priority'],['new','Newest first'],['az','A to Z']],c.sortBy)}
    ${sel('defFilter','Tasks tab opens on',[['all','All'],['today','Due today'],['overdue','Overdue']],c.defFilter)}
    ${sel('autoArch','Auto-archive finished tasks',[['0','Never'],['1','After 1 day'],['7','After 7 days'],['30','After 30 days']],c.autoArch)}
    ${sw('groupTags','Group tasks into tag folders','Turn off for one flat list',c.groupTags)}
    ${sw('showNotes','Show notes on task rows','',c.showNotes)}
    ${sw('showSubs','Show checklist items on task rows','Off keeps just the 2/4 counter',c.showSubs)}
    ${sw('dOverdue','Overdue tasks on the Dashboard','Adds late tasks to Today\'s tasks',c.dOverdue)}
  </div>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Habits')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Habits" role="button" tabindex="0">Habits</div>
    ${sw('hideDone','Hide habits done today','Same as the chip in the Habits tab',S.hideDone)}
    ${sw('compact','Compact habit list','One tight row per habit',S.compact)}
    ${sel('avoidMode','New avoid habits: a day counts as',[['clean','Clean unless I log a slip'],['confirm','A slip unless I tick it clean']],c.avoidMode)}
    ${sw('avoidHide','Hide avoid habits while clean','Only matters when "Hide habits done today" is on',c.avoidHide)}
  </div>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Ask before deleting')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Ask before deleting" role="button" tabindex="0">Ask before deleting</div>
    ${sw('cTask','Tasks','',c.cTask)}${sw('cGoal','Goals','',c.cGoal)}${sw('cHabit','Habits','',c.cHabit)}
    <p class="meta">You always get a 6-second Undo after deleting.</p>
  </div>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Dashboard sections')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Dashboard sections" role="button" tabindex="0">Dashboard sections</div>
    ${sw('dCharts','Heatmap and charts','',c.dCharts)}${sw('dTasks',"Today's tasks",'',c.dTasks)}${sw('dGoals',"This week's goals",'',c.dGoals)}${sw('dHabits',"Today's habits",'',c.dHabits)}
  </div>`;
}
function viewData(){
  const lb=daysSince(lastBackup()),st=S.storage;
  return `${settingsCard()}
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Share with friends')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Share with friends" role="button" tabindex="0">Share with friends</div><p class="meta">Send habits, tasks or homework, exams and quizzes, and study topics to a friend as a small JSON file or text. Your history, check-ins and scores are never included.</p>
    <div class="row"><button class="ghost" data-action="open-share">Share items…</button><button class="ghost" data-action="open-share-import">Import shared items…</button></div></div>
    <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Templates and sample data')?'open':''}"><div class="title" data-action="set-acc" data-k="Templates and sample data" role="button" tabindex="0">Templates and sample data</div><p class="meta">Start a goal ladder from a template, or explore the app with sample data you can clear later.</p><div class="row"><button class="ghost" data-action="tpl-open">Templates</button>${hasSample()?'<button class="ghost" data-action="sample-clear">Clear sample data</button>':'<button class="ghost" data-action="sample-add">Load sample data</button>'}</div></div>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Storage & backup')?'open':''}"><div class="title" data-action="set-acc" data-k="Storage & backup" role="button" tabindex="0">Storage &amp; backup</div>
    <div class="row" style="margin:6px 0"><button class="btn" data-action="backup-now">Back up now</button><button class="ghost" data-action="import">Restore</button></div>
    ${sw('abOn',L2('Automatic daily backup','نسخ احتياطي يومي تلقائي'),window.GTNative?L2('Saved to Documents/GoalTerra (last 7 kept) when the app is open after this time, with a reminder at that time.','يُحفظ في مجلد المستندات (آخر 7 نسخ) عند فتح التطبيق بعد هذا الوقت، مع تذكير في ذلك الوقت.'):L2('A browser cannot save files silently, so you get a Back up now card at this time.','المتصفح لا يحفظ الملفات بصمت، فستظهر بطاقة نسخ احتياطي في هذا الوقت.'),S.cfg.abOn)}
    ${S.cfg.abOn?`<label class="swrow"><span>${L2('Backup time','وقت النسخ')}</span><input type="time" data-action="set" data-k="abTime" value="${S.cfg.abTime||'21:00'}"></label>`:''}
    <div class="meta">${S.tasks.length} tasks · ${S.goals.length} goals · ${S.habits.length} habits · ${S.logs.size} check-ins</div>
    <p class="meta">${window.GTNative?L2('Saved on this phone. Backups go to Documents/GoalTerra.','محفوظ على هذا الهاتف. النسخ الاحتياطية تُحفظ في مجلد المستندات.'):'Stored in this browser\'s IndexedDB. Export regularly to back up or move to another device.'}</p>
    <div class="kstat"><span><i class="dot ${lb===null?'bad':lb>BACKUP_STALE?'warn':'ok'}"></i>Last backup: <b>${agoText(lb)}</b></span>
      <span><i class="dot ${st==='protected'?'ok':st==='unprotected'?'warn':''}"></i>Storage: <b>${st==='protected'?'protected':st==='unprotected'?'not protected':st==='unsupported'?'unknown':'checking…'}</b></span></div>
    ${st==='unprotected'?`<p class="meta">The browser may clear this data if the phone runs low on space. Bookmarking the page or adding it to the home screen often lets it be protected. <button class="chip" data-action="storage-persist">Ask again</button></p>`:''}
    <p class="meta"><span>Version <b>${APP_VERSION}</b></span> <button class="chip" data-action="open-intro">Show intro again</button> <button class="chip" data-action="tips-reset">${L2('Show tips again','إظهار النصائح مجددًا')}</button></p>
    <details class="more"><summary>Advanced</summary><div class="row" style="margin-top:8px">
      <button class="ghost" data-action="export">Export JSON</button>
      <button class="ghost" data-action="backup-copy">Copy backup text</button>
      <button class="ghost" data-action="backup-paste">Paste backup text</button>
      <button class="ghost" data-action="wipe" style="color:var(--bad)">Erase everything</button>
    </div></details></div>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Archived tasks')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Archived tasks" role="button" tabindex="0">Archived tasks</div>
    <div class="meta">${S.tasks.filter(t=>t.archived).length} archived · ${S.tasks.filter(t=>t.archived&&t.done).length} completed</div>
    <div class="row"><button class="ghost" data-action="open-archive">View archived tasks →</button></div>
  </div>
  <div class="card settings setacc ${S.setOpen&&S.setOpen.has('Trash')?'open':''}" style="margin-top:12px"><div class="title" data-action="set-acc" data-k="Trash" role="button" tabindex="0">Trash</div>
    <div class="meta">${S.trash.length} deleted task${S.trash.length===1?'':'s'} and habits, kept ${TRASH_DAYS} days</div>
    <div class="row"><button class="ghost" data-action="open-trash">Open trash →</button></div>
  </div>`;
}

