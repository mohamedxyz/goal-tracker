# 0.85 GoalTerra scores: habit, task and overall (0..1000), shown on Today, explained in a sheet.
import asyncio
from playwright.async_api import async_playwright
from helpers import *
def chk(name,ok):print(name,'ok' if ok else 'FAIL')
SEED="""(async()=>{const now=Date.now();
 for(let i=0;i<6;i++){const h={id:uid(),name:'habit'+i,kind:'',target:7,group:'',days:[],created:now-100*864e5};S.habits.push(h);await DB.put('habits',h)}
 localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']));render()})()"""
FILL="""(()=>{for(let i=0;i<90;i++){const k=ds(addDays(new Date(),-i));for(const h of S.habits){S.logs.add(h.id+'|'+k)}}})()"""
TASKS="""(()=>{const now=Date.now();
 for(let i=0;i<2;i++)S.tasks.push({id:uid(),title:'hard'+i,notes:'',repeat:'',tag:'',items:[],due:TODAY(),priority:'high',dur:120,goalId:null,done:true,doneAt:now,created:now});
 })()"""
LOW="""(()=>{const now=Date.now();
 for(let i=0;i<10;i++)S.tasks.push({id:uid(),title:'tiny'+i,notes:'',repeat:'',tag:'',items:[],due:TODAY(),priority:'low',goalId:null,done:true,doneAt:now,created:now});
 })()"""
async def main():
  async with async_playwright() as p:
    for scheme,lang in [('light','en'),('dark','en'),('light','ar')]:
      tag=f'{scheme} {lang}'
      b,pg,errs=await page(p,scheme,legacy=False)
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang()")
      await pg.evaluate(SEED);await pg.wait_for_timeout(300)
      r=await pg.evaluate("[habitScore(0),taskScore(0),overallScore(0)]")
      chk(tag+' nothing done scores 0 '+str(r),r==[0,None,0])
      await pg.evaluate(FILL);await pg.evaluate("render()");await pg.wait_for_timeout(200)
      r=await pg.evaluate("[habitScore(0),overallScore(0)]")
      chk(tag+' perfect habits score 1000 '+str(r),r==[1000,1000])
      r=await pg.evaluate("document.querySelector('.perf-score b').textContent")
      chk(tag+' shown on Today '+r,r=='1000')
      await pg.evaluate("for(const h of S.habits.slice(0,3))S.logs.delete(h.id+'|'+TODAY());render()")
      r=await pg.evaluate("habitScore(0)")
      chk(tag+' one isolated miss lowers it a little '+str(r),900<r<1000)
      await pg.evaluate("for(const h of S.habits)S.logs.add(h.id+'|'+TODAY())")
      await pg.evaluate(TASKS);r=await pg.evaluate("taskScore(0)")
      chk(tag+' two hard tasks cap at 1000 '+str(r),r==1000)
      await pg.evaluate("S.tasks.length=0");await pg.evaluate(LOW);r=await pg.evaluate("[taskScore(0),overallScore(0)]")
      chk(tag+' ten tiny tasks capped at 3 points '+str(r),r==[500,707])
      await pg.evaluate("render()");await pg.wait_for_timeout(200)
      n=await pg.evaluate("document.querySelectorAll('.sub-scores b').length")
      chk(tag+' sub-scores shown '+str(n),n==2)
      await pg.evaluate('window.__noAuto=true');await pg.click('[data-action=score-info]');await pg.wait_for_timeout(300)
      r=await pg.evaluate("document.getElementById('askDlg').open")
      chk(tag+' explainer opens',r)
      if lang=='ar':
        L=[x for x in await latin(pg) if 'GoalTerra' not in x and x!='English'];chk(tag+' latin '+str(L),L==[])
      await pg.screenshot(path=f'{SHOTS}/score-{scheme}-{lang}.png')
      await pg.evaluate("document.getElementById('askDlg').close();window.__noAuto=false")
      ov=await pg.evaluate("document.documentElement.scrollWidth>innerWidth")
      chk(tag+' no overflow',not ov);chk(tag+' no errors '+str(errs),not errs)
      await b.close()
asyncio.run(main())
