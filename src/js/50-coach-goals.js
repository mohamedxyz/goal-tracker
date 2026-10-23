/* ---------- Coach ---------- */
const TIERS=[{n:'Spark',i:'⚡',k:'friend'},{n:'Blaze',i:'🔥',k:'coach'},{n:'Titan',i:'⚔️',k:'beast'}];
const lvlAt=()=>[0,Math.max(1,+S.cfg.lvl2||3),Math.max(2,+S.cfg.lvl3||5)];
const tierOf=n=>{const L=lvlAt();return n>=L[2]?2:n>=L[1]?1:0};
const coachTone=()=>S.cfg.coachTone==='off'?'off':'on';
const beastOn=()=>coachTone()!=='off'&&tierOf(coachStats().today)===2;
const quotaOf=st=>Math.min(12,Math.max(lvlAt()[2],Math.ceil(st.avg)+1));
function dayBanner(){
  if(coachTone()==='off'||!S.tasks.length)return'';
  const st=coachStats(),T=tierOf(st.today),L=lvlAt(),d=st.today,tr=TIERS[T],nx=TIERS[T+1];
  const pct=nx?Math.min(100,Math.round(d/L[T+1]*100)):100;
  const tn=x=>L2(x.n,AR[x.n]),sub=nx?L2(`${d} done · ${L[T+1]-d} more to reach ${nx.n}`,`${d} منجزة · ${L[T+1]-d} أخرى للوصول إلى ${tn(nx)}`):L2(`${d} done · top level, defend it`,`${d} منجزة · أعلى مستوى، حافظ عليه`);
  return `<div class="card daymode t${T}" data-action="open-levels" role="button" tabindex="0" aria-label="Open level calendar"><div class="dm-top"><span class="dm-ico">${tr.i}</span><div class="grow"><b>${L2(`Today you're in ${tr.n} mode`,`أنت اليوم في وضع ${tn(tr)}`)}</b><small>${sub}</small></div><span class="dm-streak">${st.streak?L2('🔥 '+st.streak+'-day streak','🔥 سلسلة '+st.streak+' '+AYAM(st.streak)):L2('Start a streak','ابدأ سلسلة')}</span></div><div class="bar"><span style="width:${pct}%"></span></div><small class="dm-hint">📅 Tap for your level calendar</small></div>`;
}

/* ---------- In-app dialogs (replace confirm / prompt / alert) ---------- */
function askUI(msg,o={}){return new Promise(res=>{
  const d=document.getElementById('askDlg'),inp=d.querySelector('#askIn'),no=d.querySelector('#askNo'),yes=d.querySelector('#askYes');
  d.querySelector('#askMsg').textContent=String(msg);inp.hidden=!o.input;inp.value=o.def==null?'':String(o.def);no.hidden=!!o.alertOnly;
  let out=o.input?null:false;if(o.alertOnly)out=true;
  const fin=()=>{d.removeEventListener('close',fin);res(out)};d.addEventListener('close',fin);
  yes.onclick=()=>{out=o.input?inp.value:true;d.close()};no.onclick=()=>{out=o.input?null:false;d.close()};
  inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();yes.click()}};
  if(!d.open)d.showModal();if(o.input)setTimeout(()=>{inp.focus();inp.select()},40)})}
const askConfirm=m=>askUI(m),askPrompt=(m,def)=>askUI(m,{input:true,def}),askAlert=m=>askUI(m,{alertOnly:true});
async function askWhy(what){const r=await askPrompt(`Titan day: why are you ${what}? Type a reason.`);return r&&r.trim()?r.trim():null}
function coachStats(){
  const cnt={};for(const t of S.tasks)if(t.done&&t.doneAt){const k=ds(new Date(t.doneAt));cnt[k]=(cnt[k]||0)+1}
  const dn=i=>cnt[ds(addDays(new Date(),-i))]||0;
  let sum=0,best=0;for(let i=1;i<=7;i++)sum+=dn(i);for(let i=0;i<30;i++)best=Math.max(best,dn(i));
  let st=0,i=dn(0)?0:1;while(i<400){const r=isRest(ds(addDays(new Date(),-i)));if(!dn(i)&&!r)break;if(dn(i))st++;i++}
  return{today:dn(0),yday:dn(1),avg:sum/7,best,streak:st}
}
function coachCard(){
  if(coachTone()==='off'||!S.tasks.length)return'';
  const st=coachStats(),today=TODAY(),hr=new Date().getHours(),tier=tierOf(st.today),tone=TIERS[tier].k;
  const live=S.tasks.filter(t=>!t.done&&!t.archived);
  const left=live.filter(t=>t.due&&t.due<=today).length,overdue=live.filter(t=>t.due&&t.due<today).length;
  const next=live.filter(t=>t.due&&t.due>today).sort((a,b)=>a.due.localeCompare(b.due)||(a.created||0)-(b.created||0))[0];
  const avg=Math.round(st.avg*10)/10,h=[...today].reduce((a,c)=>a+c.charCodeAt(0),0),d=st.today,best=st.best;
  const pk=a=>a[h%a.length];
  const M={
   friend:{
    empty:[`Nothing due today. If you've got energy, a task from later could be a nice head start.`,`Quiet day! Want to get ahead? Pulling one task forward would feel good.`],
    none:`Nothing planned yet. Add a task whenever you're ready, I'm here.`,
    zeroLate:`Evening already, and ${left} still waiting. No pressure. One small one would still make today count.`,
    zero:[`${left} on the list today. Start with the easiest one, you've got this.`,`Ready when you are. ${left} to do, and the first step is the hardest.`],
    behind:`${d} done, ${left} to go. Nice start, keep it rolling.`,
    ahead:`${d} done already, above your usual ${avg}. ${left} left, you're doing great.`,
    record:`${d} done: your best day in a month! If you're feeling it, pull one more forward.`,
    clear:[`List cleared, ${d} done. Proud of you. Want to get ahead a little?`,`All done for today (${d}). Take a breath, or pull one in if you're on a roll.`],
    done:`All done: ${d}. Enjoy the rest of your day.`,
    over:`${overdue} overdue are waiting whenever you're ready.`},
   coach:{
    empty:[`Zero on the board today, and your usual day is ${avg}. Pick a fight with the future: pull one in.`,`An empty today is a choice. Your average day is ${avg}. Steal a task from later and prove it.`],
    none:`Nothing planned at all. An empty list isn't rest, it's a plan you haven't made yet.`,
    zeroLate:`It's evening and you've finished nothing. ${left} waiting. Do one. Right now.`,
    zero:[`${left} on the list, 0 done. Make the first one tiny and start.`,`${left} waiting and 0 finished. Your average is ${avg} a day. Don't start behind yourself.`],
    behind:`${d} done, ${left} to go. Your normal day is ${avg}. Don't settle below yourself.`,
    ahead:`${d} done, ${left} to go. You're already above your average (${avg}). Finish what's left.`,
    record:`${d} done: that's your best day in a month. Think you can do more? Pull one from the future.`,
    clear:[`Today's list is clear, but your best day is ${best} and you're at ${d}. Steal one from the future.`,`${d} done and nothing left? Then why stop. Pull one in.`],
    done:`Clean sheet: ${d} done. That's earned. Now plan tomorrow so it doesn't plan you.`,
    over:`Overdue: ${overdue}. They aren't getting younger.`},
   beast:{
    empty:[`Zero tasks. Your average is ${avg}. Comfort is not a plan. Pull one in.`,`The day is empty because you left it empty. Take a task from later. Begin.`],
    none:`Nothing is planned. Whoever has no plan has chosen drift. Write the first task.`,
    zeroLate:`Night approaches. ${left} undone, none finished. Mood is irrelevant. Do one.`,
    zero:[`${left} tasks. Zero done. Motivation is a rumour. Act, and it follows.`,`${left} waiting. You do not need to feel ready. Start the smallest one.`],
    behind:`${d} done, ${left} remain. Your standard is ${avg}. You are below it. Correct that.`,
    ahead:`${d} done, above ${avg}. Do not stop to admire it. ${left} remain.`,
    record:`${d}: your best day in a month. That is the new floor, not the ceiling. Pull one in.`,
    clear:[`The list is empty. ${d} done, your best is ${best}. Discipline is what you do after it is finished. Pull one in.`,`Done. Do not celebrate. The future has tasks. Take one.`],
    done:`${d} done. Nothing left. Rest without guilt, then plan tomorrow before you sleep.`,
    over:`Overdue: ${overdue}. Debts do not shrink by being ignored.`}
  }[tone]||{};
  const MA={
   friend:{
    empty:[`لا شيء مستحق اليوم. إن كان لديك طاقة، فمهمة من الأيام القادمة بداية جميلة.`,`يوم هادئ! تريد أن تسبق؟ سحب مهمة واحدة للأمام شعور رائع.`],
    none:`لا شيء مخطط بعد. أضف مهمة متى كنت مستعدًا، أنا هنا.`,
    zeroLate:`حلّ المساء، و${left} ما زالت تنتظر. لا ضغط. مهمة صغيرة واحدة تجعل اليوم محسوبًا.`,
    zero:[`${left} على القائمة اليوم. ابدأ بأسهلها، أنت قادر.`,`جاهز متى شئت. ${left} للإنجاز، والخطوة الأولى هي الأصعب.`],
    behind:`${d} منجزة، و${left} متبقية. بداية جميلة، استمر.`,
    ahead:`${d} منجزة بالفعل، أكثر من معدلك ${avg}. ${left} متبقية، أنت رائع.`,
    record:`${d} منجزة: أفضل يوم لك هذا الشهر! إن كنت متحمسًا، اسحب مهمة أخرى للأمام.`,
    clear:[`القائمة فارغة، ${d} منجزة. فخور بك. تريد أن تسبق قليلًا؟`,`انتهى كل شيء اليوم (${d}). خذ نفسًا، أو اسحب مهمة إن كنت في أوج نشاطك.`],
    done:`انتهى كل شيء: ${d}. استمتع ببقية يومك.`,
    over:`${overdue} متأخرة تنتظرك متى كنت مستعدًا.`},
   coach:{
    empty:[`صفر مهام اليوم، ويومك المعتاد ${avg}. تحدَّ المستقبل: اسحب مهمة.`,`اليوم الفارغ اختيار. معدل يومك ${avg}. خذ مهمة من الأيام القادمة وأثبت نفسك.`],
    none:`لا شيء مخطط إطلاقًا. القائمة الفارغة ليست راحة، بل خطة لم تضعها بعد.`,
    zeroLate:`إنه المساء ولم تنجز شيئًا. ${left} تنتظر. أنجز واحدة. الآن.`,
    zero:[`${left} على القائمة، 0 منجزة. اجعل الأولى صغيرة وابدأ.`,`${left} تنتظر و0 منجزة. معدلك ${avg} يوميًا. لا تبدأ متأخرًا عن نفسك.`],
    behind:`${d} منجزة، و${left} متبقية. يومك العادي ${avg}. لا ترضَ بأقل من نفسك.`,
    ahead:`${d} منجزة، و${left} متبقية. أنت فوق معدلك (${avg}). أنهِ ما تبقى.`,
    record:`${d} منجزة: أفضل يوم لك هذا الشهر. تظن أنك تستطيع المزيد؟ اسحب مهمة من المستقبل.`,
    clear:[`قائمة اليوم فارغة، لكن أفضل يوم لك ${best} وأنت عند ${d}. خذ مهمة من المستقبل.`,`${d} منجزة ولا شيء متبقٍ؟ فلماذا تتوقف. اسحب مهمة.`],
    done:`صفحة نظيفة: ${d} منجزة. هذا مستحق. الآن خطّط للغد قبل أن يخطط لك.`,
    over:`متأخرة: ${overdue}. لن تصغر بالانتظار.`},
   beast:{
    empty:[`صفر مهام. معدلك ${avg}. الراحة ليست خطة. اسحب مهمة.`,`اليوم فارغ لأنك تركته فارغًا. خذ مهمة من الأيام القادمة. ابدأ.`],
    none:`لا شيء مخطط. من لا خطة له اختار الانجراف. اكتب المهمة الأولى.`,
    zeroLate:`الليل يقترب. ${left} غير منجزة، ولا شيء منتهٍ. المزاج لا يهم. أنجز واحدة.`,
    zero:[`${left} مهام. صفر منجزة. الحافز إشاعة. تحرّك، وسيلحق بك.`,`${left} تنتظر. لا تحتاج أن تشعر بالاستعداد. ابدأ بأصغرها.`],
    behind:`${d} منجزة، و${left} متبقية. معيارك ${avg}. أنت دونه. صحّح ذلك.`,
    ahead:`${d} منجزة، فوق ${avg}. لا تتوقف لتعجب بها. ${left} متبقية.`,
    record:`${d}: أفضل يوم لك هذا الشهر. هذا هو الحد الأدنى الجديد، لا السقف. اسحب مهمة.`,
    clear:[`القائمة فارغة. ${d} منجزة، وأفضل يوم لك ${best}. الانضباط هو ما تفعله بعد الانتهاء. اسحب مهمة.`,`انتهيت. لا تحتفل. المستقبل فيه مهام. خذ واحدة.`],
    done:`${d} منجزة. لا شيء متبقٍ. استرح بلا ذنب، ثم خطّط للغد قبل أن تنام.`,
    over:`متأخرة: ${overdue}. الديون لا تصغر بتجاهلها.`}
  }[tone]||{};
  if(S.cfg.lang==='ar')Object.assign(M,MA);
  let msg,pull=false;
  if(d===0&&left===0){pull=!!next;msg=next?pk(M.empty):M.none}
  else if(d===0)msg=hr>=18?M.zeroLate:pk(M.zero);
  else if(left>0)msg=d<st.avg?M.behind:M.ahead;
  else{pull=!!next;msg=next?(d>=best&&d>1?M.record:pk(M.clear)):M.done}
  let pullN=0;const quota=quotaOf(st);
  if(tone==='beast'){const gap=quota-d-left,fut=live.filter(t=>t.due&&t.due>today).length;
    if(gap>0&&fut>0){pullN=Math.min(gap,fut);msg+=L2(` Quota is ${quota}; you have ${d+left} lined up. Fill the gap.`,` الحصة ${quota}؛ لديك ${d+left} مصطفّة. املأ الفجوة.`)}
    else if(d>=quota&&left===0)msg=L2(`Quota met: ${d}/${quota}. A Titan raises it.`+(next?' Pull one more in.':''),`تحققت الحصة: ${d}/${quota}. الجبّار يرفعها.`+(next?' اسحب مهمة أخرى.':''))}
  if(overdue>0&&tone!=='friend')msg+=' '+M.over;else if(overdue>0&&d>0)msg+=' '+M.over;
  const stat=(n,l)=>`<div><b>${n}</b><span>${l}</span></div>`;
  return `<div class="card coach"><div class="cmsg" data-action="open-levels" role="button" tabindex="0" title="Open level calendar">${esc(msg)}</div>
    <div class="cstats">${tone==='beast'?stat(d+'/'+quota,L2('Quota','الحصة')):stat(d+'/'+lvlAt()[tier+1],L2('to '+TIERS[tier+1].n,'حتى '+AR[TIERS[tier+1].n]))}${stat(avg,'7-day avg')}${stat(st.best,'Best day')}${stat('🔥 '+st.streak,'Day streak')}</div>
 ${pullN?`<button class="btn" data-action="coach-pull-n" data-n="${pullN}">${L2(`⚡ Fill quota: pull in ${pullN} task${pullN===1?'':'s'}`,`⚡ املأ الحصة: اسحب ${pullN} ${pullN===1?'مهمة':'مهام'}`)}</button>`:pull?`<button class="btn" data-action="coach-pull" data-id="${next.id}">${L2('⚡ Pull in:','⚡ اسحب:')} <span translate="no">${esc(next.title.length>34?next.title.slice(0,33)+'…':next.title)}</span> <small>(${fmtDate(next.due)})</small></button>`:''}</div>`;
}
const HRANK={five:0,annual:1,monthly:2,weekly:3};
function weekSummary(){
  const ids=new Set(S.goals.filter(g=>g.horizon==='weekly'&&g.period===currentPeriod('weekly')).map(g=>g.id));
  const ts=S.tasks.filter(t=>ids.has(t.goalId)&&!t.archived),n=ts.length,d=ts.filter(t=>t.done).length;
  if(!n)return'';
  return `<div class="wsum ${d===n?'all':''}"><b>${d===n?'🎉 All '+n+' tasks done this week':(n-d)+' task'+(n-d===1?'':'s')+' left this week'}</b><span>${d}/${n} done</span><div class="bar"><span style="width:${Math.round(d/n*100)}%"></span></div></div>`;
}
function ladderView(){
  const cur=S.goalScope==='current';
  const V=S.goals.filter(g=>!cur||g.period===currentPeriod(g.horizon)||needsReview(g)),ids=new Set(V.map(g=>g.id));
  const ord=(a,b)=>(a.done-b.done)||b.period.localeCompare(a.period)||a.title.localeCompare(b.title);
  const roots=V.filter(g=>!g.parentId||!ids.has(g.parentId)).sort((a,b)=>HRANK[a.horizon]-HRANK[b.horizon]||ord(a,b));
  const seen=new Set();
  return roots.map(g=>ladderNode(g,ids,seen,ord,0)).join('');
}
const LV_SHORT={five:'5 Yr',annual:'Year',monthly:'Month',weekly:'Week'};
function ladderNode(g,ids,seen,ord,depth){
  if(seen.has(g.id))return'';seen.add(g.id);
  const kids=S.goals.filter(c=>c.parentId===g.id&&ids.has(c.id)).sort(ord);
  const tasks=S.tasks.filter(t=>t.goalId===g.id&&!t.archived).sort((a,b)=>(a.done-b.done)||(a.due||'9').localeCompare(b.due||'9'));
  const key='goal:'+g.id,col=S.collapsed.has(key),p=progress(g),k=goalKind(g),rv=needsReview(g),det=goalDetail(g);
  const can=g.horizon==='weekly'&&!g.done,has=kids.length||tasks.length||can,adding=S.ladAdd===g.id;
  const trow=t=>`<label class="ltask ${t.done?'sdone':''}"><input type="checkbox" data-action="toggle-task" data-id="${t.id}" ${t.done?'checked':''}><span>${esc(t.title)}</span>${t.due&&!t.done?dueLeft(t.due).replace('class="pill','class="pill sm'):''}</label>`;
  const showDet=det&&k!=='number'&&!(k!=='rollup'&&tasks.length&&!col);
  const meta=(showDet?`<span>${det}</span>`:'')+(S.goalScope!=='current'?`<span>${esc(g.period)}</span>`:'')+(rv?'<span class="tag t-warn">Needs review</span>':'')+(g.status==='missed'?'<span class="tag t-bad">Missed</span>':'');
  const num=k==='number'?`<div class="lnum"><button class="ghost" data-action="goal-dec" data-id="${g.id}" aria-label="Decrease">−</button><button class="numval" data-action="goal-set" data-id="${g.id}" title="Set exact value">${fmtNum(g.value)} <span>/ ${fmtNum(g.target)} ${esc(g.unit||'')}</span></button><button class="ghost" data-action="goal-inc" data-id="${g.id}" aria-label="Increase">+</button></div>`:'';
  const add=can?(adding?`<form class="ladd" data-form="ltask" data-goal="${g.id}"><input type="text" name="title" placeholder="New task for this goal" required autocomplete="off"><button class="chip">Add</button><button type="button" class="chip" data-action="ladd-close" aria-label="Close">✕</button></form>`:`<button type="button" class="ladd-btn" data-action="ladd-open" data-id="${g.id}">+ Task</button>`):'';
  return `<div class="lnode ${depth?'sub':''} ${g.done?'isdone':''} ${g.status==='missed'?'ismissed':''}">
    <div class="lrow">${has?`<button type="button" class="lchev" data-action="toggle-folder" data-name="${key}" aria-expanded="${!col}" aria-label="${col?'Expand':'Collapse'}">${col?'▸':'▾'}</button>`:'<span class="lchev"></span>'}
      <div class="grow" data-action="edit-goal" data-id="${g.id}" role="button" tabindex="0"><div class="ltitle"><span class="lv">${LV_SHORT[g.horizon]}</span> <span class="title">${esc(g.title)}</span></div>${meta?`<div class="meta">${meta}</div>`:''}</div>
      ${k!=='rollup'&&!tasks.length?`<button class="icon lck" data-action="done-goal" data-id="${g.id}" aria-label="${g.done?'Reopen':'Mark complete'}">${g.done?'↺':'✓'}</button>`:''}<b class="lpct">${g.done?'✓':p+'%'}</b></div>
    <div class="bar lbar"><span style="width:${p}%"></span></div>${num}
    ${col||!(tasks.length||kids.length||can)?'':`<div class="lkids">${tasks.map(trow).join('')}${add}${kids.map(c=>ladderNode(c,ids,seen,ord,depth+1)).join('')}</div>`}</div>`;
}
function goalCard(g){
  const p=progress(g),k=goalKind(g),parent=g.parentId&&goalById(g.parentId),rv=needsReview(g),missed=g.status==='missed';
  const tags=[`<span class="tag">${esc(g.period)}</span>`];
  if(g.done)tags.push(`<span class="tag t-ok">✓ Done${g.autoDone?' · auto':''}</span>`);
  if(missed)tags.push('<span class="tag t-bad">Missed</span>');
  if(rv)tags.push('<span class="tag t-warn">Needs review</span>');
  if(parent)tags.push(`<span>↑ ${esc(parent.title)}</span>`);
  if(g.carried&&g.carried.length)tags.push(`<span>↪ carried from ${esc(g.carried[g.carried.length-1])}</span>`);
  const det=goalDetail(g);
  const num=k==='number'?`<div class="numrow"><button class="ghost" data-action="goal-dec" data-id="${g.id}" aria-label="Decrease">−</button>
    <button class="numval" data-action="goal-set" data-id="${g.id}" title="Set exact value">${fmtNum(g.value)} <span>/ ${fmtNum(g.target)} ${esc(g.unit||'')}</span></button>
    <button class="ghost" data-action="goal-inc" data-id="${g.id}" aria-label="Increase">+</button></div>`:'';
  return `<div class="card goal ${g.done?'isdone':''} ${missed?'ismissed':''}">
    <div class="row"><div class="grow"><div class="title">${esc(g.title)}</div>
      <div class="meta">${tags.join('')}</div></div>
      ${k==='number'&&!g.done?'':`<button class="icon" data-action="done-goal" data-id="${g.id}" title="${g.done?'Reopen':'Mark complete'}" aria-label="${g.done?'Reopen':'Mark complete'}">${g.done?'↺':'✓'}</button>`}
      <button class="icon" data-action="edit-goal" data-id="${g.id}" title="Edit" aria-label="Edit">✎</button>
      <button class="icon" data-action="del-goal" data-id="${g.id}" title="Delete" aria-label="Delete">✕</button></div>
    <div class="bar"><span style="width:${p}%"></span></div>
    <div class="meta"><span><b>${p}%</b></span>${det?`<span>${det}</span>`:''}</div>
    ${num}
    ${rv?`<button class="chip" style="margin-top:10px" data-action="open-review">Review now →</button>`:''}
    ${g.lesson?`<div class="notes">💬 ${esc(g.lesson)}</div>`:''}
    ${g.notes?`<div class="notes">${esc(g.notes)}</div>`:''}
  </div>`;
}
const goalOptions=(sel,filter=()=>true)=>`<option value="">— No goal —</option>`+
  S.goals.filter(g=>!g.done&&filter(g)).map(g=>`<option value="${g.id}" ${g.id===sel?'selected':''}>${HORIZONS[g.horizon]} · ${esc(g.title)}</option>`).join('');

