import asyncio,sys
sys.path.insert(0,'/home/claude/goal-tracker/tests')
from playwright.async_api import async_playwright
from helpers import *
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for sch in ['light','dark']:
      ctx=await b.new_context(viewport={'width':390,'height':844},color_scheme=sch,has_touch=True,is_mobile=True);pg=await ctx.new_page();errs=[]
      pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(URL);await pg.wait_for_timeout(400)
      if await pg.locator('[data-action=intro-done]').count():await pg.click('[data-action=intro-done] >> nth=0')
      await pg.evaluate("localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']));S.tcalOn=true;S.view='tasks';render()");await pg.wait_for_timeout(300)
      sel="input[placeholder*='on this day']"
      await pg.evaluate('window.scrollTo(0,150)');y0=await pg.evaluate('scrollY')
      await pg.tap(sel);await pg.set_viewport_size({'width':390,'height':520});await pg.wait_for_timeout(700)
      await pg.keyboard.type('Buy milk');await pg.wait_for_timeout(200)
      print(sch,await pg.evaluate("(()=>{const r=document.activeElement.getBoundingClientRect();return {y0:%d,sy:Math.round(scrollY),top:Math.round(r.top),bottom:Math.round(r.bottom),vh:visualViewport.height,docked:!!document.querySelector('form.kbdock'),val:document.activeElement.value}})()"%y0))
      await pg.click('form.kbdock button');await pg.wait_for_timeout(500)
      print(sch,'after add: docked',await pg.evaluate("!!document.querySelector('form.kbdock')"),'task added',await pg.evaluate("S.tasks.some(t=>t.title==='Buy milk')"))
      await pg.set_viewport_size({'width':390,'height':844});await pg.wait_for_timeout(500)
      await pg.evaluate('document.activeElement.blur()');await pg.wait_for_timeout(600);print(sch,'undocked',await pg.evaluate("!document.querySelector('form.kbdock')"),'spacer gone',await pg.evaluate('document.querySelectorAll("#app div[style*=height]").length'),'tabbar',await pg.evaluate("getComputedStyle(document.getElementById('tabbar')).display"),'ov',await overflow(pg),errs)
      await ctx.close()
    await b.close()
asyncio.run(main())
