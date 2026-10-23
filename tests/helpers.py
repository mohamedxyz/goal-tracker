# Shared Playwright helpers for the GoalTerra test suite (dev only; not part of the app).
import asyncio, re, sys, json, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.dirname(HERE)
URL='file://'+os.path.join(ROOT,'goal-tracker.html')
SHOTS=os.path.join(HERE,'out');os.makedirs(SHOTS,exist_ok=True)
FIX=os.path.join(HERE,'fixtures')
SEED_AR=r"""(async()=>{const now=Date.now(),D=864e5,P=h=>currentPeriod(h);
 const mk=async(o)=>{const g={id:uid(),title:o.t,horizon:o.h,period:P(o.h),kind:o.k||'check',parentId:o.p||null,notes:'',created:now,done:false,value:o.v||0,target:o.tg||0,unit:o.u||'',expected:o.e||0};S.goals.push(g);await DB.put('goals',g);return g};
 const f=await mk({t:'هدف خمس سنوات',h:'five',k:'rollup'});const a=await mk({t:'هدف سنوي',h:'annual',k:'rollup',p:f.id});
 const a2=await mk({t:'قراءة كتب',h:'annual',k:'number',tg:24,v:9,u:'كتب',p:f.id});const m=await mk({t:'هدف شهري',h:'monthly',k:'rollup',p:a.id});
 const w=await mk({t:'هدف أسبوعي',h:'weekly',p:m.id});const w2=await mk({t:'ساعات دراسة',h:'weekly',k:'number',tg:10,v:4,u:'ساعات',p:m.id});
 const pr=['low','med','high'];
 for(let i=-3;i<30;i++){const n=i<0?1:(i%4);for(let j=0;j<n;j++){const t={id:uid(),title:'مهمة '+i+'-'+j,notes:i===1?'ملاحظة':'',repeat:'',tag:j===1?'جامعة':'',items:i===2?[{text:'بند',done:true},{text:'بند ٢',done:false}]:[],due:ds(addDays(new Date(),-i)),priority:pr[(i+j+3)%3],goalId:i===0?w.id:null,done:i>0&&i%5!==0,doneAt:i>0&&i%5!==0?now-i*D:null,created:now-(i+2)*D};S.tasks.push(t);await DB.put('tasks',t)}}
 const h={id:uid(),name:'قراءة',kind:'',target:7,group:'',days:[],created:now-40*D};S.habits.push(h);await DB.put('habits',h);
 const h2={id:uid(),name:'بلا سكر',kind:'avoid',mode:'',target:7,group:'',days:[],created:now-20*D};S.habits.push(h2);await DB.put('habits',h2);
 for(let i=0;i<30;i++){if(i%3===0)continue;const k=ds(addDays(new Date(),-i));S.logs.add(h.id+'|'+k);await DB.put('logs',{id:h.id+'|'+k,habitId:h.id,date:k})}
 const k2=ds(addDays(new Date(),-3));S.logs.add(h2.id+'|'+k2);await DB.put('logs',{id:h2.id+'|'+k2,habitId:h2.id,date:k2});
 S.cfg.student=true;S.cfg.rpg=true;saveCfg();
 const tp={id:uid(),subject:'رياضيات',name:'تفاضل',sessions:[{d:ds(addDays(new Date(),-1)),c:2},{d:ds(addDays(new Date(),-4)),c:1}],created:now-10*D};S.topics.push(tp);await DB.put('topics',tp);
 const ex={id:uid(),subject:'رياضيات',title:'امتحان',kind:'exam',date:ds(addDays(new Date(),5)),time:'09:00',created:now};S.exams.push(ex);await DB.put('exams',ex);
 render()})()"""
async def page(p,scheme='light',fresh=True,vw=390,vh=844):
  b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':vw,'height':vh},color_scheme=scheme)
  pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.on('dialog',lambda d:asyncio.ensure_future(d.accept('test reason') if d.type=='prompt' else d.accept()))
  await pg.goto(URL);await pg.wait_for_timeout(500)
  if fresh and await pg.locator('#editDlg[open] [data-action=intro-done]').count():
    await pg.click('[data-action=intro-done] >> nth=0');await pg.wait_for_timeout(100)
  return b,pg,errs
async def overflow(pg):
  return await pg.evaluate("document.documentElement.scrollWidth>innerWidth+1")
async def latin(pg):
  # English text left on screen in Arabic mode (ignores translate=no, scripts, inputs)
  return await pg.evaluate(r"""(()=>{const out=new Set();const roots=[document.querySelector('#app'),document.querySelector('#editDlg[open]'),document.querySelector('.top'),document.querySelector('#tabbar'),document.querySelector('#toast.show')].filter(Boolean);
   for(const r of roots){const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const p=n.parentElement;if(!p||p.closest('[translate=no],script,style,textarea,option[value=en]')||p.offsetParent===null&&p.tagName!=='OPTION')continue;const t=n.nodeValue.trim();if(/[A-Za-z]{2,}/.test(t))out.add(t.slice(0,90))}
   r.querySelectorAll('[placeholder],[title],[aria-label]').forEach(e=>{if(e.closest('[translate=no]'))return;for(const a of ['placeholder','title','aria-label']){const v=e.getAttribute(a);if(v&&/[A-Za-z]{2,}/.test(v))out.add('@'+a+': '+v.slice(0,80))}})}
   return [...out]})()""")
