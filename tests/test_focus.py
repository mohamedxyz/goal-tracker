import os, asyncio,sys
from helpers import *
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      await pg.evaluate("(async()=>{const t={id:'tf1',title:'Write chapter 3 notes',notes:'',repeat:'',tag:'',items:[],due:TODAY(),priority:'high',goalId:null,done:false,created:Date.now()-864e5};S.tasks.push(t);await DB.put('tasks',t);S.cfg.rpg=true;saveCfg();S.view='tasks';render()})()")
      await pg.wait_for_timeout(200)
      await pg.click('[data-action=task-menu] >> nth=0');await pg.click('[data-do=ft-start]');await pg.wait_for_timeout(1300)
      t1=await pg.inner_text('#focusBar .ft-time');print(sc,'bar',(await pg.inner_text('#focusBar')).replace('\n',' | '))
      await pg.screenshot(path=f'{SHOTS}/focus-{sc}.png')
      # pause/resume
      await pg.click('[data-action=ft-toggle]');await pg.wait_for_timeout(1200);a=await pg.inner_text('#focusBar .ft-time');await pg.wait_for_timeout(1200);b2=await pg.inner_text('#focusBar .ft-time')
      print(sc,'paused stays',a==b2,a);await pg.click('[data-action=ft-toggle]')
      # reload keeps session
      await pg.reload();await pg.wait_for_timeout(1200);print(sc,'after reload visible',await pg.is_visible('#focusBar'))
      # simulate time passing (screen lock): move start back 26 min
      await pg.evaluate("FT.start-=26*60000;ftSave()");await pg.wait_for_timeout(1500)
      st=await pg.evaluate("[FT&&FT.phase,S.tasks.find(t=>t.id==='tf1').focus,rpgAll().cur.fD]");print(sc,'after finish',st,await pg.inner_text('#toast'))
      await pg.evaluate("S.view='dash';render()");await pg.wait_for_timeout(200)
      print(sc,'rpg meta',await pg.inner_text('.rpg .meta >> nth=1'))
      await pg.click('[data-action=ft-skip]');await pg.wait_for_timeout(200);print(sc,'skip hides',await pg.is_hidden('#focusBar'))
      # stop with partial
      await pg.evaluate("ftStart('tf1','focus');FT.start-=7*60000;ftSave()");await pg.wait_for_timeout(300)
      await pg.click('[data-action=ft-stop]');await pg.wait_for_timeout(300);print(sc,'stop',await pg.evaluate("S.tasks.find(t=>t.id==='tf1').focus"),await pg.inner_text('#toast'))
      await pg.evaluate("S.view='tasks';render()");print(sc,'row',await pg.inner_text('.trow2 .meta'))
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();ftStart('tf1','focus');ftToggle();render()");await pg.wait_for_timeout(300)
      print(sc,'ar bar',(await pg.inner_text('#focusBar')).replace('\n',' | '),'latin',[x for x in await latin(pg) if 'Write' not in x],'ov',await overflow(pg))
      await pg.screenshot(path=f'{SHOTS}/focus-ar-{sc}.png')
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
