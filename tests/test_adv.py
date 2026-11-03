# Advanced (Settings) and the Timetable fold stay open when something inside them is opened (0.87.1).
import asyncio
from playwright.async_api import async_playwright
from helpers import *
def chk(name,ok):print(name,'ok' if ok else 'FAIL')
async def main():
  async with async_playwright() as p:
    for scheme,lang in [('light','en'),('dark','en'),('light','ar')]:
      tag=f'{scheme} {lang}'
      b,pg,errs=await page(p,scheme)
      await pg.evaluate("window.__manualDetails=true")
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang()")
      await pg.evaluate("S.view='data';S.setOpen=new Set();render()");await pg.wait_for_timeout(300)
      r=await pg.evaluate("document.querySelector('details.adv').open")
      chk(tag+' advanced starts closed',r==False)
      await pg.evaluate("document.querySelector('details.adv > summary').click()");await pg.wait_for_timeout(200)
      r=await pg.evaluate("document.querySelector('details.adv').open")
      chk(tag+' advanced opens',r)
      await pg.evaluate("document.querySelector('details.adv [data-action=set-acc]').click()");await pg.wait_for_timeout(300)
      r=await pg.evaluate("[document.querySelector('details.adv').open,!!document.querySelector('details.adv .setacc.open')]")
      chk(tag+' advanced stays open after opening a section '+str(r),r==[True,True])
      await pg.evaluate("document.querySelector('details.adv > summary').click()");await pg.wait_for_timeout(200)
      await pg.evaluate("render()");await pg.wait_for_timeout(200)
      r=await pg.evaluate("document.querySelector('details.adv').open")
      chk(tag+' closing it sticks',r==False)
      chk(tag+' no errors '+str(errs),not errs)
      await b.close()
asyncio.run(main())
