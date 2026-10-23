import os, asyncio,sys
from helpers import *
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      await pg.evaluate("""(async()=>{S.cfg.student=true;saveCfg();const now=Date.now();
        for(const [sub,n] of [['Math','Limits'],['Physics','Waves'],['Chemistry','Bonds']]){const t={id:uid(),subject:sub,name:n,sessions:[],created:now};S.topics.push(t);await DB.put('topics',t)}
        S.view='study';render()})()""")
      await pg.wait_for_timeout(200)
      td=await pg.evaluate("new Date().getDay()")
      for sub,day,st,en in [('Physics',td,'08:00','09:30'),('Math',(td+1)%7,'10:00','11:30'),('Chemistry',(td+3)%7,'12:00','13:00'),('Physics',(td+2)%7,'09:00','10:00')]:
        await pg.fill('form[data-form=cls] input[name=subject]',sub);await pg.select_option('form[data-form=cls] select[name=day]',str(day))
        await pg.fill('form[data-form=cls] input[name=start]',st);await pg.fill('form[data-form=cls] input[name=end]',en)
        await pg.click('form[data-form=cls] button.btn');await pg.wait_for_timeout(200)
        if not await pg.is_visible('form[data-form=cls]'):await pg.click('.tt-add summary')
      await pg.select_option('select[data-k=ttStart]','sat');await pg.wait_for_timeout(200)
      order=await pg.eval_on_selector_all('.tt-dn','e=>e.map(x=>x.textContent.trim())');print(sc,'order',order)
      print(sc,'first pick',await pg.evaluate("topicPicks()[0].subject"))
      await pg.screenshot(path=f'{SHOTS}/tt-{sc}.png',full_page=True)
      await pg.reload();await pg.wait_for_timeout(400);print(sc,'persist classes',await pg.evaluate("getClasses().length"))
      await pg.evaluate("S.view='dash';render()");print(sc,'dash line',await pg.inner_text('.tt-line'))
      await pg.evaluate("S.view='study';render()");await pg.click('[data-action=cls-del] >> nth=0');await pg.wait_for_timeout(200);print(sc,'after delete',await pg.evaluate("getClasses().length"))
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
      print(sc,'ar latin',[x for x in await latin(pg) if not any(w in x for w in ['Math','Physics','Chemistry','Limits','Waves','Bonds'])],'ov',await overflow(pg))
      await pg.screenshot(path=f'{SHOTS}/tt-ar-{sc}.png')
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
