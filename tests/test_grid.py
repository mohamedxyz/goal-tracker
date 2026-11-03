# 0.87.0 habit grid: 4 day columns (today nearest the name), cell toggles the right date, colours stored, RTL order (dev only).
import asyncio
from playwright.async_api import async_playwright
from helpers import *
def chk(name,ok):print(name,'ok' if ok else 'FAIL')
async def m():
  async with async_playwright() as p:
    for scheme,ar in [('light',0),('dark',0),('dark',1)]:
      tag=scheme+(' ar' if ar else ' en')
      b,pg,errs=await page(p,scheme,legacy=False)
      if ar:await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang()")
      await pg.evaluate("S.view='habits';render()")
      # add two habits through the add sheet
      for n in ['Read','Walk']:
        await pg.click('#fab');await pg.wait_for_timeout(150)
        await pg.click('[data-action=add-kind][data-v=habit]');await pg.wait_for_timeout(100)
        await pg.fill('#editDlg input[name=name]',n);await pg.click('#editDlg form button.btn');await pg.wait_for_timeout(300)
      cols=await pg.evaluate("S.habits.slice(-2).map(h=>h.color)")
      chk(tag+' colours stored and distinct '+str(cols),len(set(cols))==2 and all(cols))
      await pg.reload();await pg.wait_for_function("S.booted");await pg.evaluate("S.view='habits';render()")
      chk(tag+' colour survives reload',await pg.evaluate("S.habits.slice(-2).map(h=>h.color).join()")==','.join(cols))
      chk(tag+' header has 4 days',await pg.locator('.hg-head .hg-h').count()==4)
      xs=await pg.evaluate("[...document.querySelectorAll('.hg-row')[0].querySelectorAll('.hg-cell')].map(c=>c.getBoundingClientRect().x)")
      who=await pg.evaluate("document.querySelector('.hg-row .hg-who').getBoundingClientRect().x")
      chk(tag+' today is the cell nearest the name '+str([round(x) for x in xs]),(xs[0]>xs[1]>xs[2]>xs[3]) if ar else (xs[0]<xs[1]<xs[2]<xs[3]))
      chk(tag+' name on the correct side',(who>xs[0]) if ar else (who<xs[0]))
      sz=await pg.evaluate("[...document.querySelectorAll('.hg-cell')].every(c=>{const r=c.getBoundingClientRect();return r.width>=44&&r.height>=48})")
      chk(tag+' cells at least 44x48',sz)
      # tap yesterday's cell for the first habit, then today's
      hid=await pg.evaluate("S.habits[S.habits.length-2].id")
      yk=await pg.evaluate("ds(addDays(new Date(),-1))");tk=await pg.evaluate("TODAY()")
      await pg.click(f'.hg-cell[data-id="{hid}"][data-date="{yk}"]');await pg.wait_for_timeout(250)
      r=await pg.evaluate(f"[S.logs.has('{hid}|{yk}'),S.logs.has('{hid}|{tk}')]")
      chk(tag+' cell toggles its own date '+str(r),r==[True,False])
      await pg.click(f'.hg-cell[data-id="{hid}"][data-date="{yk}"]');await pg.wait_for_timeout(250)
      chk(tag+' second tap undoes',await pg.evaluate(f"!S.logs.has('{hid}|{yk}')"))
      # name opens the row menu with Edit (and the half-tick when set)
      await pg.click(f'.hg-row >> nth=0 >> .hg-who');await pg.wait_for_timeout(200)
      chk(tag+' name opens menu with edit',await pg.evaluate("!!document.querySelector('#editDlg [data-do=edit-habit]')"))
      await pg.evaluate("dlg.close()")
      # colour on the Today list too
      await pg.evaluate("S.view='dash';S.dashHab=true;render()")
      chk(tag+' grid on Today',await pg.locator('.hg-row').count()>=2)
      chk(tag+' no overflow, no errors',not await overflow(pg) and not errs)
      await b.close()
asyncio.run(m())
