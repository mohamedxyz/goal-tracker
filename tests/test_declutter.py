import asyncio,sys
from playwright.async_api import async_playwright
from helpers import *
sys.path.insert(0,'.')
import importlib.util,os
spec=importlib.util.spec_from_file_location('shots',os.path.join(os.path.dirname(__file__),'screenshots.py'))
src=open(os.path.join(os.path.dirname(__file__),'screenshots.py')).read()
import re
DEMO=re.search(r'DEMO=r"""(.*?)"""',src,re.S).group(1)
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for scheme in ['light','dark']:
      for lang in ['en','ar']:
        ctx=await b.new_context(viewport={'width':390,'height':844},color_scheme=scheme);pg=await ctx.new_page();errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)));natives=[]
        pg.on('dialog',lambda d:(natives.append(d.type),asyncio.ensure_future(d.dismiss())))
        await pg.goto(URL);await pg.wait_for_timeout(400)
        if await pg.locator('[data-action=intro-done]').count():await pg.click('[data-action=intro-done] >> nth=0')
        await pg.evaluate(DEMO);await pg.wait_for_timeout(500)
        if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()")
        res={}
        for v in ['dash','tasks','goals','habits','study','data']:
          await pg.evaluate(f"S.view='{v}';render()");await pg.wait_for_timeout(250)
          h=await pg.evaluate("document.documentElement.scrollHeight");ov=await overflow(pg)
          extra=''
          if v=='dash':extra=await pg.evaluate("(()=>{const e=document.querySelector('#app .list .item');return e?Math.round(e.getBoundingClientRect().top+scrollY):-1})()")
          res[v]=(h,ov,extra)
        print(scheme,lang,res,'errors',errs,'natives',natives)
        if lang=='en':
          # native pop-up replaced: deleting a habit/clearing sample must open the in-app sheet
          await pg.evaluate("S.view='data';S.setOpen=new Set(['Templates and sample data']);render()");await pg.wait_for_timeout(200)
          await pg.evaluate("S.view='tasks';render()");await pg.wait_for_timeout(150)
          print(scheme,'done collapsed',await pg.evaluate("!document.querySelector('#app .item.done')"),'chip',await pg.evaluate("!!document.querySelector('[data-action=toggle-done-list]')"))
          await pg.click('[data-action=toggle-done-list]');await pg.wait_for_timeout(150)
          print(scheme,'done expanded',await pg.evaluate("!!document.querySelector('#app .item.done')"))
          await pg.evaluate("(askConfirm('Sure?').then(v=>{window.__r=v}),0)");await pg.wait_for_timeout(100)
          print(scheme,'ask open',await pg.evaluate("document.getElementById('askDlg').open"))
          await pg.click('#askNo');await pg.wait_for_timeout(100)
          print(scheme,'ask result',await pg.evaluate("window.__r"),'natives',natives)
          await pg.screenshot(path=f'{SHOTS}/decl-{scheme}.png')
        await ctx.close()
    await b.close()
asyncio.run(m())
