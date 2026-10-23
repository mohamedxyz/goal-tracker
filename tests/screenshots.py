# Regenerates the README screenshots in docs/images from demo data (dev only).
import asyncio,sys,os
from playwright.async_api import async_playwright
from helpers import *
IMG=os.path.join(ROOT,'docs','images')
DEMO=r"""(async()=>{const now=Date.now(),D=864e5;S.cfg.student=true;S.cfg.rpg=true;S.cfg.rpgSince=ds(addDays(new Date(),-30));saveCfg();
 await addSample();for(const k of ['tasks','goals','habits','topics','exams'])for(const x of S[k]){if(x.sample){delete x.sample;await DB.put(k,x)}}
 for(let i=2;i<40;i++){const n=i%7===0?1:2+(i%3);for(let j=0;j<n;j++)await mkTask({t:['Read chapter','Gym session','Reply to emails','Lab report','Practice guitar','Groceries'][(i+j)%6],due:ds(addDays(new Date(),-i)),pr:['low','med','high'][(i+j)%3],done:true,doneAt:now-i*D,created:now-(i+3)*D})}
 const t=S.tasks.find(x=>!x.done);(t.focusLog=[{at:now-D,m:25},{at:now-2*D,m:50}]);t.focus=75;await DB.put('tasks',t);
 const subs=[['Biology',['Cell structure','Genetics','Ecology']],['Chemistry',['Bonding','Moles','Acids and bases']],['Math',['Limits','Derivatives','Integrals']]];
 for(const [s,ns] of subs)for(const [i,n] of ns.entries()){const tp={id:uid(),subject:s,name:n,sessions:[...Array(4)].map((_,k)=>({d:ds(addDays(new Date(),-(k*3+i+1))),c:1+((k+i)%3)})),created:now-20*D};S.topics.push(tp);await DB.put('topics',tp)}
 const ex={id:uid(),kind:'quiz',title:'Chemistry quiz',subject:'Chemistry',date:ds(addDays(new Date(),3)),time:'10:00',notes:'',score:null,max:null,created:now};S.exams.push(ex);await DB.put('exams',ex);
 const td=new Date().getDay();setClasses([{id:uid(),subject:'Biology',day:td,start:'08:00',end:'09:30',room:'Lab 2'},{id:uid(),subject:'Math',day:td,start:'11:00',end:'12:30',room:'B14'},{id:uid(),subject:'Chemistry',day:(td+1)%7,start:'09:00',end:'10:30',room:'Lab 1'}]);
 const h=S.habits[0];for(let i=0;i<40;i++){if(i%5===2)continue;const k=ds(addDays(new Date(),-i));S.logs.add(h.id+'|'+k);await DB.put('logs',{id:h.id+'|'+k,habitId:h.id,date:k})}
 const g=await mkHabit({n:'Drink water',created:now-40*D});for(let i=1;i<30;i++){if(i%6===0)continue;const k=ds(addDays(new Date(),-i));S.logs.add(g.id+'|'+k);await DB.put('logs',{id:g.id+'|'+k,habitId:g.id,date:k})}
 localStorage.setItem('gt-last-backup',String(now));render()})()"""
async def shot(pg,name,full=False,clip=None):
  await pg.wait_for_timeout(700);await pg.screenshot(path=os.path.join(IMG,name),full_page=full,clip=clip);print('saved',name)
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      await pg.evaluate(DEMO);await pg.wait_for_timeout(500)
      if sc=='dark':
        await pg.evaluate("S.view='dash';render();scrollTo(0,0)");await shot(pg,'dashboard-dark.png')
        await pg.evaluate("S.view='study';render();scrollTo(0,0)");await shot(pg,'study-dark.png')
        await b.close();continue
      for v,n in [('dash','dashboard.png'),('tasks','tasks.png'),('habits','habits.png'),('study','study.png'),('data','settings.png'),('bestiary','bestiary.png')]:
        await pg.evaluate(f"S.view='{v}';S.tcalOn=false;render();scrollTo(0,0)");await shot(pg,n)
      await pg.evaluate("S.view='goals';S.horizon='ladder';render();scrollTo(0,0)");await shot(pg,'goals.png')
      await pg.evaluate("S.view='tasks';S.tcalOn=true;render();scrollTo(0,0)");await shot(pg,'calendar.png')
      await pg.evaluate("S.tcalOn=false;S.view='dash';render();scrollTo(0,0)");await pg.evaluate("document.querySelector('.rpg').scrollIntoView({block:'start'});scrollBy(0,-70)");await shot(pg,'game.png')
      await pg.evaluate("S.view='study';render();document.querySelector('.scard .title').scrollIntoView();scrollBy(0,-70)")
      await pg.evaluate("[...document.querySelectorAll('.scard')].find(e=>e.textContent.includes(\"Today's picks\")).scrollIntoView({block:'start'});scrollBy(0,-70)");await shot(pg,'study-picks.png')
      await pg.evaluate("S.view='tasks';render();scrollTo(0,0);ftStart(S.tasks.find(t=>!t.done).id,'focus')");await shot(pg,'focus.png')
      await pg.evaluate("ftStop()");await pg.wait_for_timeout(300)
      await pg.evaluate("S.view='dash';render();rep_.off=0;drawReport();dlg.showModal()");await shot(pg,'weekly-report.png')
      await pg.evaluate("dlg.close();mrev.off=0;drawMonth();dlg.showModal()");await shot(pg,'monthly-review.png')
      await pg.evaluate("dlg.close();openShare()");await shot(pg,'share.png')
      await pg.evaluate("dlg.close();S.cfg.lang='ar';saveCfg();applyLang();S.view='dash';render();scrollTo(0,0)");await shot(pg,'dashboard-arabic.png')
      await pg.evaluate("S.view='study';render();scrollTo(0,0)");await shot(pg,'study-arabic.png')
      print('errors',errs);await b.close()
asyncio.run(m())
