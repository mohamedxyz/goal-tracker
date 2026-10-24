import os, asyncio, sys
from playwright.async_api import async_playwright
from helpers import *
OUT=SHOTS
async def run(scheme):
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={'width':390,'height':844},color_scheme=scheme)
    pg=await ctx.new_page()
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('dialog',lambda d:asyncio.ensure_future(d.accept('test reason') if d.type=='prompt' else d.accept()))
    await pg.goto(URL);await pg.wait_for_timeout(700)
    ov=lambda: pg.evaluate("document.documentElement.scrollWidth>innerWidth || [...document.querySelectorAll('dialog[open] *')].some(e=>e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX!=='auto'&&getComputedStyle(e).overflowX!=='hidden'&&e.tagName!=='SELECT')")
    assert await pg.locator('#editDlg[open] .intro').count()==1,'intro not shown'
    await pg.screenshot(path=f'{OUT}/intro0-{scheme}.png')
    # Arabic in intro
    await pg.click('[data-action=intro-lang][data-v=ar]');await pg.wait_for_timeout(200)
    assert await pg.evaluate("document.dir")=='rtl'
    print(scheme,'ar intro overflow',await ov())
    await pg.screenshot(path=f'{OUT}/intro0-ar-{scheme}.png')
    await pg.click('[data-action=intro-lang][data-v=en]')
    for i in range(4): await pg.click('[data-action=intro-step][data-d="1"]');await pg.wait_for_timeout(80)
    await pg.click('[data-action=intro-student]')
    await pg.click('[data-action=intro-step][data-d="1"]')
    await pg.screenshot(path=f'{OUT}/intro5-{scheme}.png')
    print(scheme,'intro overflow',await ov())
    await pg.click('[data-action=intro-done]:not([data-go])')
    # seed tasks done on several past days via IndexedDB put through app DB
    await pg.evaluate("""async()=>{const now=Date.now();const per=[1,3,6,0,2,5,4,8,1];
      for(let d=0;d<per.length;d++)for(let j=0;j<per[d];j++){const t={id:uid(),title:'Task '+d+'-'+j+' with a fairly long title to test wrapping',notes:'',repeat:'',tag:'',items:[],due:null,priority:'low',goalId:'',done:true,doneAt:now-d*864e5,created:now-d*864e5};S.tasks.push(t);await DB.put('tasks',t)}
      const t2={id:uid(),title:'Open one',notes:'',repeat:'',tag:'',items:[],due:TODAY(),priority:'low',goalId:'',done:false,created:now};S.tasks.push(t2);await DB.put('tasks',t2);render()}""")
    await pg.reload();await pg.wait_for_timeout(700)
    assert await pg.locator('#editDlg[open]').count()==0,'intro re-shown after reload'
    assert await pg.evaluate("S.tasks.length")==31, 'persistence'
    assert await pg.evaluate("S.cfg.student")==True
    await pg.click('.daymode');await pg.wait_for_timeout(200)
    assert await pg.locator('#editDlg[open] .cd.lc').count()>0,'level cal not open'
    print(scheme,'levels: lv3 cells',await pg.locator('.cd.lv3').count(),'lv2',await pg.locator('.cd.lv2').count(),'lv1',await pg.locator('.cd.lv1').count())
    await pg.click('.cd.lc.tod');await pg.wait_for_timeout(150)
    await pg.screenshot(path=f'{OUT}/levels-{scheme}.png')
    print(scheme,'levels overflow',await ov())
    await pg.click('[data-action=lvl-month][data-d="-1"]');await pg.click('[data-action=lvl-month][data-d="1"]')
    await pg.click('[data-action=dlg-close]')
    await pg.click('.coach .cmsg');await pg.wait_for_timeout(150)
    assert await pg.locator('#editDlg[open] .cd.lc').count()>0,'coach tap'
    await pg.click('[data-action=dlg-close]')
    # Arabic levels
    await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
    await pg.screenshot(path=f'{OUT}/dash-ar-{scheme}.png')
    print(scheme,'ar dash overflow',await ov())
    await pg.click('.daymode');await pg.wait_for_timeout(200)
    await pg.click('.cd.lc.tod');await pg.wait_for_timeout(150)
    await pg.screenshot(path=f'{OUT}/levels-ar-{scheme}.png')
    print(scheme,'ar levels overflow',await ov())
    await pg.click('[data-action=dlg-close]')
    # settings replay
    await pg.evaluate("S.view='data';render()");await pg.click('[data-action=open-intro]')
    assert await pg.locator('#editDlg[open] .intro').count()==1
    await pg.keyboard.press('Escape')
    print(scheme,'errors',errs)
    await b.close()
async def main():
  for s in ['light','dark']: await run(s)
asyncio.run(main())
