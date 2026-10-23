import os, asyncio,sys,json
from helpers import *
VIEWS=['dash','tasks','goals','habits','study','data','archive','trash','bestiary']
async def m():
  found={}
  async with async_playwright() as p:
    b,pg,errs=await page(p)
    async def grab(tag):
      await pg.wait_for_timeout(150)
      for t in await latin(pg): found.setdefault(t,tag)
    # empty-data pass first
    await pg.evaluate("S.cfg.lang='ar';S.cfg.rpg=true;S.cfg.student=true;saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
    for v in VIEWS:
      await pg.evaluate(f"S.view='{v}';render()");await grab('empty-'+v)
    await pg.evaluate("(async()=>{const t={id:uid(),title:'مهمة',notes:'',repeat:'',tag:'',items:[],due:TODAY(),priority:'low',goalId:null,done:false,created:Date.now()};S.tasks.push(t);await DB.put('tasks',t);S.view='dash';render()})()");await grab('one-task-dash')
    await pg.evaluate(SEED_AR);await pg.wait_for_timeout(300)
    await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
    for v in VIEWS:
      await pg.evaluate(f"S.view='{v}';render()");await grab(v)
    for hz in ['weekly','monthly','annual','five']:
      await pg.evaluate(f"S.view='goals';S.horizon='{hz}';render()");await grab('goals-'+hz)
    await pg.evaluate("S.view='goals';S.horizon='ladder';S.goalScope='all';render()");await grab('ladder-all')
    await pg.evaluate("S.goalScope='current';S.view='dash';render()")
    # dialogs
    for name,js in [('levels','openLevels()'),('report',"rep_.off=0;drawReport();dlg.showModal()"),('plan','openPlan()'),('intro','openIntro()'),
                    ('search','openSearch()'),('share','openShare()'),('shareimp','openShareImport()'),
                    ('edit-task',"openEdit('task',S.tasks[0].id)"),('edit-goal',"openEdit('goal',S.goals[0].id)"),('edit-habit',"openEdit('habit',S.habits[0].id)"),
                    ('habit-hist',"openHabit(S.habits[0].id)"),('review','openReview()')]:
      try:
        await pg.evaluate(f"try{{dlg.close()}}catch(e){{}};{js}");await grab(name)
        for i in range(5):
          if name!='intro' or not await pg.locator('[data-action=intro-step][data-d="1"]').count():break
          await pg.click('[data-action=intro-step][data-d="1"]');await grab(name+str(i))
      except Exception as e: found.setdefault('!!'+name+': '+str(e)[:80],name)
    await pg.evaluate("try{dlg.close()}catch(e){}")
    # task menu
    try:
      await pg.evaluate("S.view='tasks';render()");await pg.click('[data-action=task-menu] >> nth=0');await grab('task-menu')
    except Exception as e: found.setdefault('!!task-menu '+str(e)[:60],'x')
    import re as _re
    ALLOW=_re.compile(r'\b(JSON|OLED|IndexedDB|GoalTerra|Language|English|json)\b')
    found={k:v for k,v in found.items() if _re.search(r'[A-Za-z]{2,}',ALLOW.sub('',k))}
    print(json.dumps(found,ensure_ascii=False,indent=0));print('COUNT',len(found),'errors',errs)
    await b.close()
asyncio.run(m())
