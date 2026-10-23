import os, asyncio,sys
from helpers import *
SEED=r"""(async()=>{const now=Date.now(),D=864e5;S.cfg.student=true;S.cfg.rpg=true;saveCfg();
 const tp={id:uid(),subject:'Math',name:'Calculus',sessions:[1,2,4,6].map((o,i)=>({d:ds(addDays(new Date(),-o)),c:[1,2,3,3][i]})),created:now-30*D};S.topics.push(tp);await DB.put('topics',tp);
 const ex=[{t:'Math final',s:'Math',o:5,k:'exam'},{t:'Physics quiz',s:'Physics',o:-2,k:'quiz'},{t:'Math midterm',s:'Math',o:-10,k:'exam',sc:70,mx:100},{t:'Bio test',s:'Bio',o:-20,k:'exam',sc:4,mx:10}];
 for(const x of ex){const e={id:uid(),kind:x.k,title:x.t,subject:x.s,date:ds(addDays(new Date(),x.o)),time:'',notes:'',score:x.sc??null,max:x.mx??null,created:now};S.exams.push(e);await DB.put('exams',e)}
 render()})()"""
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      await pg.evaluate(SEED);await pg.wait_for_timeout(300)
      print(sc,await pg.evaluate("elites().map(x=>[x.e.title,x.state,x.prep,x.hp,x.pct,x.bonus])"))
      print(sc,'dash line',await pg.inner_text('.tw-mini.elite'))
      xp1=await pg.evaluate("rpgAll().xp")
      # log score on awaiting quiz -> won
      await pg.evaluate("(async()=>{const e=S.exams.find(x=>x.title==='Physics quiz');e.score=9;e.max=10;await DB.put('exams',e);render()})()");await pg.wait_for_timeout(900)
      print(sc,'toast',await pg.inner_text('#toast'),'xp gain',await pg.evaluate("rpgAll().xp")-xp1)
      print(sc,'dash line now',await pg.inner_text('.tw-mini.elite'))
      await pg.screenshot(path=f'{SHOTS}/elite-{sc}.png')
      await pg.evaluate("S.view='bestiary';render()");await pg.wait_for_timeout(200)
      print(sc,'elites in bestiary',await pg.locator('h2:has-text("Elites") + .goals .bst').count(),'ov',await overflow(pg))
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
      print(sc,'ar latin',[x for x in await latin(pg) if not any(w in x for w in ['Math','Physics','Bio','quiz','final','midterm','test'])],'ov',await overflow(pg))
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
