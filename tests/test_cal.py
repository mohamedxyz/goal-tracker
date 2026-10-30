import os, asyncio,sys
from helpers import *
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      await pg.evaluate(SEED_AR)
      # 120 extra tasks across the month
      await pg.evaluate("(async()=>{for(let i=0;i<120;i++){const o=(i%40)-15,dn=i%3===0;const t={id:uid(),title:'T'+i,notes:'',repeat:'',tag:'',items:[],due:ds(addDays(new Date(),o)),priority:['low','med','high'][i%3],goalId:null,done:dn&&o<=0,doneAt:dn&&o<=0?Date.now()+o*864e5:null,created:Date.now()-40*864e5};S.tasks.push(t);await DB.put('tasks',t)}S.view='tasks';render()})()")
      await pg.wait_for_timeout(300);await pg.click('[data-action=tasks-cal]');await pg.wait_for_timeout(300)
      print(sc,'cells',await pg.locator('.tcd').count(),'late',await pg.locator('.tcd.late').count(),'ov',await overflow(pg))
      await pg.screenshot(path=f'{SHOTS}/cal-{sc}.png',full_page=True)
      tgt=await pg.evaluate("ds(addDays(new Date(),3))")
      moved=not await pg.locator(f'[data-action=tcal-day][data-date="{tgt}"]').count()
      if moved:await pg.click('[data-action=tcal-month][data-d="1"]')  # day +3 can fall in next month
      await pg.click(f'[data-action=tcal-day][data-date="{tgt}"]');await pg.wait_for_timeout(200)
      await pg.fill('form[data-form=caltask] input','Dentist !high');await pg.press('form[data-form=caltask] input','Enter');await pg.wait_for_timeout(300)
      print(sc,'added',await pg.evaluate(f"(({{title,due,priority}})=>[title,due,priority])(S.tasks.at(-1))"),'focus kept',await pg.evaluate("document.activeElement.closest('form[data-form=caltask]')!==null"))
      if moved:await pg.click('[data-action=tcal-month][data-d="-1"]')
      await pg.click('[data-action=toggle-task]:not(:checked) >> nth=0');await pg.wait_for_timeout(200)
      await pg.click('[data-action=tcal-month][data-d="1"]');await pg.click('[data-action=tcal-month][data-d="-1"]');await pg.click('[data-action=tcal-month][data-d="-1"]')
      print(sc,'today chip',await pg.locator('[data-action=tcal-today]').count());await pg.click('[data-action=tcal-today]')
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
      print(sc,'ar latin',[x for x in await latin(pg) if not x.startswith('T') and 'Dentist' not in x],'ov',await overflow(pg))
      await pg.screenshot(path=f'{SHOTS}/cal-ar-{sc}.png')
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
