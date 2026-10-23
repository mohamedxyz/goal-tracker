import os, asyncio,sys
from playwright.async_api import async_playwright
from helpers import *
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for scheme in ['light','dark']:
      errs=[];ctx=await b.new_context(viewport={'width':390,'height':844},color_scheme=scheme);pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
      pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
      await pg.goto(URL);await pg.wait_for_timeout(400)
      await pg.click('[data-action=intro-done] >> nth=0')
      await pg.evaluate(open(os.path.join(FIX,'seed_goals.js')).read());await pg.wait_for_timeout(300)
      # add task via + Task
      await pg.click('[data-action=ladd-open] >> nth=0');await pg.wait_for_timeout(100)
      foc=await pg.evaluate("document.activeElement&&document.activeElement.closest('.ladd')!==null")
      await pg.keyboard.type('Added via ladder');await pg.keyboard.press('Enter');await pg.wait_for_timeout(300)
      foc2=await pg.evaluate("document.activeElement&&document.activeElement.closest('.ladd')!==null")
      print(scheme,'focus',foc,foc2,'added',await pg.evaluate("S.tasks.some(t=>t.title==='Added via ladder'&&t.goalId)"))
      await pg.click('[data-action=ladd-close]')
      for pal in ['terra','ocean','grape','rose','graphite']:
        await pg.evaluate(f"setPalette('{pal}');S.view='dash';render()");await pg.wait_for_timeout(120)
        await pg.screenshot(path=f'{SHOTS}/pal-{pal}-{scheme}.png',clip={'x':0,'y':0,'width':390,'height':420})
      await pg.evaluate("setTheme('black');setPalette('terra');S.view='goals';render()");await pg.wait_for_timeout(150)
      await pg.screenshot(path=f'{SHOTS}/black-{scheme}.png',clip={'x':0,'y':0,'width':390,'height':640})
      await pg.reload();await pg.wait_for_timeout(400)
      print(scheme,'persist',await pg.evaluate("[getTheme(),getPalette(),getComputedStyle(document.body).backgroundColor]"))
      await pg.evaluate("S.view='data';S.setOpen=new Set(['General']);render()");await pg.wait_for_timeout(100)
      await pg.click('[data-action=palette][data-v=rose]');await pg.wait_for_timeout(100)
      print(scheme,'rose click',await pg.evaluate("getPalette()"),'pressed',await pg.get_attribute('[data-action=palette][data-v=rose]','aria-pressed'))
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();S.view='goals';render()");await pg.wait_for_timeout(200)
      print(scheme,'ar ov',await pg.evaluate("document.documentElement.scrollWidth>innerWidth"))
      await pg.screenshot(path=f'{SHOTS}/goals-ar-{scheme}.png')
      await pg.evaluate("S.goalScope='all';S.cfg.lang='en';saveCfg();applyLang();render()");await pg.wait_for_timeout(150)
      print(scheme,'all ov',await pg.evaluate("document.documentElement.scrollWidth>innerWidth"),'errors',errs)
      await ctx.close()
    await b.close()
asyncio.run(m())
