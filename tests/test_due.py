import os, asyncio, sys
from playwright.async_api import async_playwright
from helpers import *
OUT=SHOTS
async def run(scheme):
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844},color_scheme=scheme)
    pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('dialog',lambda d:asyncio.ensure_future(d.accept('x') if d.type=='prompt' else d.accept()))
    await pg.goto(URL);await pg.wait_for_timeout(500)
    if await pg.locator('[data-action=intro-done]').count(): await pg.click('[data-action=intro-done] >> nth=0')
    await pg.evaluate("""(async()=>{for(const [n,o] of [['Late two',-2],['Late one',-1],['Due today',0],['Tomorrow one',1],['Three left',3],['Six left',6],['Far one',20]]){const t={id:uid(),title:n,notes:'',repeat:'',tag:'',items:[],due:ds(addDays(new Date(),o)),priority:'med',goalId:'',done:false,created:Date.now()};S.tasks.push(t);await DB.put('tasks',t)}S.view='tasks';render()})()""")
    await pg.reload();await pg.wait_for_timeout(500)
    await pg.evaluate("S.view='tasks';render()");await pg.wait_for_timeout(200)
    pills=await pg.eval_on_selector_all('.trow2 .pill','e=>e.map(x=>x.textContent)')
    print(scheme,pills,'ov',await pg.evaluate("document.documentElement.scrollWidth>innerWidth"))
    await pg.screenshot(path=f'{OUT}/due-{scheme}.png')
    await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
    print(scheme,'ar',await pg.eval_on_selector_all('.trow2 .pill','e=>e.map(x=>x.textContent)'),'ov',await pg.evaluate("document.documentElement.scrollWidth>innerWidth"))
    await pg.screenshot(path=f'{OUT}/due-ar-{scheme}.png')
    print(scheme,'errors',errs);await b.close()
async def main():
  for s in ['light','dark']: await run(s)
asyncio.run(main())
