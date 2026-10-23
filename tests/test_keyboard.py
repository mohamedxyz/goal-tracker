import asyncio,re,os
from playwright.async_api import async_playwright
from helpers import *
src=open(os.path.join(os.path.dirname(__file__),'screenshots.py')).read()
DEMO=re.search(r'DEMO=r"""(.*?)"""',src,re.S).group(1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for scheme in ['light','dark']:
      ctx=await b.new_context(viewport={'width':390,'height':844},color_scheme=scheme,has_touch=True,is_mobile=True);pg=await ctx.new_page();errs=[]
      pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(URL);await pg.wait_for_timeout(400)
      if await pg.locator('[data-action=intro-done]').count():await pg.click('[data-action=intro-done] >> nth=0')
      await pg.evaluate(DEMO);await pg.wait_for_timeout(500)
      await pg.evaluate("localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']));S.view='tasks';render()");await pg.wait_for_timeout(300)
      await pg.tap('input[name=title] >> nth=0');await pg.set_viewport_size({'width':390,'height':520});await pg.wait_for_timeout(700)
      print(scheme,'kb class',await pg.evaluate("document.documentElement.classList.contains('kb')"),'tabbar hidden',await pg.evaluate("getComputedStyle(document.getElementById('tabbar')).display==='none'"))
      await pg.keyboard.type('Buy milk');await pg.wait_for_timeout(300)
      print(scheme,'field visible',await pg.evaluate("(()=>{const r=document.activeElement.getBoundingClientRect();return r.top>=0&&r.bottom<=visualViewport.height})()"),'scrollY',await pg.evaluate("Math.round(scrollY)"))
      # field low on the page (Settings) must be scrolled into view
      await pg.evaluate("document.activeElement.blur()");await pg.set_viewport_size({'width':390,'height':844});await pg.wait_for_timeout(500)
      print(scheme,'kb class cleared',await pg.evaluate("!document.documentElement.classList.contains('kb')"),'tabbar back',await pg.evaluate("getComputedStyle(document.getElementById('tabbar')).display!=='none'"))
      print(scheme,'ov',await overflow(pg),'errors',errs)
      await ctx.close()
    await b.close()
asyncio.run(main())
