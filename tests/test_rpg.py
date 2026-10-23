import os, asyncio, sys
from playwright.async_api import async_playwright
from helpers import *
OUT=SHOTS
SEED="""(async()=>{const now=Date.now(),D=864e5;
 const h={id:uid(),name:'Read 20 min',kind:'build',created:now-40*D};S.habits.push(h);await DB.put('habits',h);
 for(let i=1;i<35;i++){if(i%3===0)continue;const k=ds(addDays(new Date(),-i));S.logs.add(h.id+'|'+k);await DB.put('logs',{id:h.id+'|'+k,habitId:h.id,date:k})}
 const pr=['low','med','high'];
 for(let i=1;i<35;i++){const n=i%7===0?0:(i%4)+1;for(let j=0;j<n;j++){const t={id:uid(),title:'Past '+i+'-'+j,notes:'',repeat:'',tag:'',items:[],due:ds(addDays(new Date(),-i)),priority:pr[(i+j)%3],goalId:'',done:i%5!==0,doneAt:i%5!==0?now-i*D:null,created:now-(i+2)*D};S.tasks.push(t);await DB.put('tasks',t)}}
 for(let j=0;j<6;j++){const t={id:uid(),title:'This week '+j,notes:'',repeat:'',tag:'',items:[],due:ds(addDays(new Date(),j%3)),priority:pr[j%3],goalId:'',done:false,created:now-3*D};S.tasks.push(t);await DB.put('tasks',t)}
 S.cfg.rpg=true;saveCfg();render()})()"""
async def run(scheme):
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844},color_scheme=scheme)
    pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('dialog',lambda d:asyncio.ensure_future(d.accept('x') if d.type=='prompt' else d.accept()))
    await pg.goto(URL);await pg.wait_for_timeout(500)
    if await pg.locator('[data-action=intro-done]').count(): await pg.click('[data-action=intro-done] >> nth=0')
    assert await pg.locator('.rpg').count()==0,'rpg shown while off'
    await pg.evaluate(SEED);await pg.wait_for_timeout(300)
    await pg.reload();await pg.wait_for_timeout(600)
    ov="document.documentElement.scrollWidth>innerWidth"
    info=await pg.evaluate("(()=>{const A=rpgAll();return {weeks:A.weeks.length,cur:A.cur,xp:A.xp,won:A.weeks.filter(w=>w.won).length}})()")
    print(scheme,info)
    await pg.screenshot(path=f'{OUT}/rpg-{scheme}.png')
    # tick a task on dashboard
    cb=pg.locator('[data-action=toggle-task]:not(:checked)').first
    await cb.click();await pg.wait_for_timeout(250)
    print(scheme,'hit',await pg.locator('.rpg-dmg').count(),await pg.inner_text('.rpg-dmg') if await pg.locator('.rpg-dmg').count() else '')
    await pg.screenshot(path=f'{OUT}/rpg-hit-{scheme}.png')
    frozen=await pg.evaluate("S.tasks.filter(t=>t.dmg!=null).length")
    # tick remaining until defeated
    for i in range(8):
      if await pg.locator('.rpg.won').count():break
      c=pg.locator('[data-action=toggle-task]:not(:checked)')
      if not await c.count():break
      await c.first.click();await pg.wait_for_timeout(200)
    await pg.wait_for_timeout(700)
    print(scheme,'frozen',frozen,'won',await pg.locator('.rpg.won').count(),'toast',await pg.inner_text('#toast'),'ov',await pg.evaluate(ov))
    await pg.screenshot(path=f'{OUT}/rpg-won-{scheme}.png')
    await pg.reload();await pg.wait_for_timeout(500)
    print(scheme,'persist dmg',await pg.evaluate("S.tasks.filter(t=>t.dmg!=null).length"))
    await pg.click('[data-action=open-bestiary]');await pg.wait_for_timeout(300)
    print(scheme,'bestiary cards',await pg.locator('.bst').count(),'ov',await pg.evaluate(ov))
    await pg.screenshot(path=f'{OUT}/best-{scheme}.png',full_page=False)
    await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
    print(scheme,'ar best ov',await pg.evaluate(ov))
    await pg.screenshot(path=f'{OUT}/best-ar-{scheme}.png')
    await pg.click('[data-action=back-dash]');await pg.wait_for_timeout(200)
    print(scheme,'ar dash ov',await pg.evaluate(ov))
    await pg.screenshot(path=f'{OUT}/rpg-ar-{scheme}.png')
    # turn off
    await pg.evaluate("S.cfg.rpg=false;saveCfg();S.view='bestiary';render()")
    print(scheme,'off view',await pg.evaluate("S.view"),await pg.locator('.rpg').count())
    print(scheme,'errors',errs);await b.close()
async def main():
  for s in ['light','dark']: await run(s)
asyncio.run(main())
