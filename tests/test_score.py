# 0.85 GoalTerra Score: bounded 0..1000, perfect run = 1000, nothing done = 0, shown on Today, explained in a sheet.
import asyncio
from playwright.async_api import async_playwright
from helpers import *
def chk(name,ok):print(name,'ok' if ok else 'FAIL')
SEED="""(async()=>{const now=Date.now();
 for(let i=0;i<6;i++){const h={id:uid(),name:'habit'+i,kind:'',target:7,group:'',days:[],created:now-40*864e5};S.habits.push(h);await DB.put('habits',h)}
 localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']));render()})()"""
FILL="""(async()=>{for(let i=0;i<14;i++){const k=ds(addDays(new Date(),-i));for(const h of S.habits){S.logs.add(h.id+'|'+k)}}})()"""
async def main():
  async with async_playwright() as p:
    for scheme,lang in [('light','en'),('dark','en'),('light','ar')]:
      tag=f'{scheme} {lang}'
      b,pg,errs=await page(p,scheme,legacy=False)
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang()")
      await pg.evaluate(SEED);await pg.wait_for_timeout(300)
      r=await pg.evaluate("perfScore(0)")
      chk(tag+' nothing done scores 0 '+str(r),r==0)
      await pg.evaluate(FILL);await pg.evaluate("render()");await pg.wait_for_timeout(200)
      r=await pg.evaluate("perfScore(0)")
      chk(tag+' perfect 14 days scores 1000 '+str(r),r==1000)
      r=await pg.evaluate("document.querySelector('.perf-score b').textContent")
      chk(tag+' shown on Today '+r,r=='1000')
      await pg.evaluate("for(const h of S.habits.slice(0,3))S.logs.delete(h.id+'|'+TODAY());render()")
      r=await pg.evaluate("perfScore(0)")
      chk(tag+' missing half today lowers it '+str(r),0<r<1000)
      await pg.evaluate('window.__noAuto=true');await pg.click('[data-action=score-info]');await pg.wait_for_timeout(300)
      r=await pg.evaluate("document.getElementById('askDlg').open")
      chk(tag+' explainer opens',r)
      if lang=='ar':
        L=[x for x in await latin(pg) if 'GoalTerra' not in x and x!='English'];chk(tag+' latin '+str(L),L==[])
      await pg.screenshot(path=f'tests/out/score-{scheme}-{lang}.png')
      await pg.evaluate("document.getElementById('askDlg').close();window.__noAuto=false")
      ov=await pg.evaluate("document.documentElement.scrollWidth>innerWidth")
      chk(tag+' no overflow',not ov);chk(tag+' no errors '+str(errs),not errs)
      await b.close()
asyncio.run(main())
