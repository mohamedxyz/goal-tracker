import os, asyncio,sys,json
from helpers import *
CASES=[('Essay tomorrow !high #uni','Essay','2026-10-24','high','uni'),('Read today\'s news','Read today\'s news',None,None,None),
('Call mom fri','Call mom','2026-10-23',None,None),('Gym on monday !m','Gym','2026-10-26','med',None),('Report in 3 days','Report','2026-10-26',None,None),
('Plan next week','Plan','2026-10-26',None,None),('Exam 25 oct','Exam','2026-10-25',None,None),('Exam nov 3','Exam','2026-11-03',None,None),
('Pay bill 2/11','Pay bill','2026-11-02',None,None),('Read 1/2 of book','Read 1/2 of book',None,None,None),('Make money moves','Make money moves',None,None,None),
('SAT prep','SAT prep',None,None,None),('مراجعة الفصل باچر !عالي #جامعة','مراجعة الفصل','2026-10-24','high','جامعة'),('واجب بعد غد','واجب','2026-10-25',None,None),
('امتحان الخميس','امتحان','2026-10-29',None,None),('تقرير بعد 3 أيام','تقرير','2026-10-26',None,None),('اجتماع اليوم','اجتماع','2026-10-23',None,None),
('tomorrow','tomorrow','2026-10-24',None,None),('Old 2026-02-30','Old 2026-02-30',None,None,None),('Thursday thing 2026-12-01','thing 2026-12-01','2026-10-29',None,None)]
async def m():
  async with async_playwright() as p:
    b,pg,errs=await page(p);bad=0
    # The expected dates below assume today is Friday 23 Oct 2026, so freeze the clock.
    await pg.clock.set_fixed_time('2026-10-23T10:00:00')
    for raw,title,due,pri,tag in CASES:
      r=await pg.evaluate("x=>parseQuick(x)",raw)
      ok=r['title']==title and r['due']==due and r['priority']==pri and r['tag']==tag
      if not ok:bad+=1;print('FAIL',raw,'=>',r)
    print(len(CASES)-bad,'/',len(CASES),'pass')
    # UI flow
    await pg.evaluate("S.view='tasks';render()");await pg.fill('form[data-form=task] input[name=title]','Essay tomorrow !high #uni')
    await pg.wait_for_timeout(100);print('hint:',await pg.inner_text('.qa-hint'))
    await pg.press('form[data-form=task] input[name=title]','Enter');await pg.wait_for_timeout(300)
    print('saved:',await pg.evaluate("(({title,due,priority,tag})=>({title,due,priority,tag}))(S.tasks.at(-1))"))
    await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.fill('form[data-form=task] input[name=title]','واجب باچر !عالي');await pg.wait_for_timeout(150)
    print('ar hint:',await pg.inner_text('.qa-hint'),'ov',await overflow(pg));await pg.screenshot(path=SHOTS+'/qa-ar.png',clip={'x':0,'y':0,'width':390,'height':300})
    print('errors',errs);await b.close()
asyncio.run(m())
