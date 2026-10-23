import os, asyncio,sys
from helpers import *
CNT="({t:S.tasks.length,g:S.goals.length,h:S.habits.length,l:S.logs.size,tp:S.topics.length,e:S.exams.length})"
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc,fresh=False)
      # intro last step offers template + sample
      for i in range(5):await pg.click('[data-action=intro-step][data-d="1"]')
      print(sc,'intro buttons',await pg.locator('#editDlg [data-action=tpl-open],#editDlg [data-action=sample-add]').count())
      await pg.click('#editDlg [data-action=tpl-open]');await pg.wait_for_timeout(150);print(sc,'templates',await pg.locator('#editDlg .tpl').count())
      await pg.click('#editDlg [data-action=tpl-use][data-k=school]');await pg.wait_for_timeout(300)
      own=await pg.evaluate(CNT);print(sc,'after school template',own,'student',await pg.evaluate("S.cfg.student"),'view',await pg.evaluate("S.view"))
      await pg.evaluate("(async()=>{await mkTask({t:'My own task',due:TODAY()});S.view='data';render()})()");await pg.wait_for_timeout(200)
      mine=await pg.evaluate(CNT)
      await pg.click('[data-action=sample-add]');await pg.wait_for_timeout(500)
      withs=await pg.evaluate(CNT);print(sc,'with sample',withs,'banner',await pg.locator('.sample-cta').count())
      await pg.screenshot(path=f'{SHOTS}/sample-{sc}.png')
      await pg.reload();await pg.wait_for_timeout(500);print(sc,'banner after reload',await pg.locator('.sample-cta').count())
      await pg.click('.sample-cta [data-action=sample-clear]');await pg.wait_for_timeout(500)
      after=await pg.evaluate(CNT);print(sc,'after clear',after,'== mine',after==mine,'toast',await pg.inner_text('#toast'))
      # empty goals state shows templates
      await pg.evaluate("(async()=>{for(const g of [...S.goals]){await DB.del('goals',g.id)}S.goals=[];S.view='goals';S.horizon='ladder';render()})()");await pg.wait_for_timeout(200)
      print(sc,'empty goals templates',await pg.locator('#app .tpl').count())
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
      print(sc,'ar latin',await latin(pg),'ov',await overflow(pg))
      await pg.evaluate("openTemplates()");await pg.wait_for_timeout(200);print(sc,'ar dlg latin',await latin(pg))
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
