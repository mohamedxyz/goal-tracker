import os, asyncio,sys
from helpers import *
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      # A: no avoid habits, damage only 10 days ago, rpgSince 9 days ago -> 9 empty days: hits 4 -> KO, then 4 more hits (mor 0 again? 100-100) -> second KO at hit 8, 1 more hit -> mor 75
      r=await pg.evaluate("""(async()=>{const now=Date.now(),D=864e5;S.cfg.rpg=true;S.cfg.rpgSince=ds(addDays(new Date(),-9));saveCfg();
        const t={id:uid(),title:'old',notes:'',repeat:'',tag:'',items:[],due:null,priority:'high',goalId:null,done:true,doneAt:now-10*D,created:now-12*D};S.tasks.push(t);await DB.put('tasks',t);render();
        const A=rpgAll();return {sh:A.shields,mor:A.morale,kos:A.kos,hits:A.hits,blocked:A.blocked,ko:A.weeks.filter(w=>w.ko).map(w=>[w.key,w.ko,w.hp])}})()""")
      print(sc,'A',r)
      # B: add an avoid habit born 9 days ago, clean every day -> shields every day; each empty day: +1 shield then blocked -> no hits
      r=await pg.evaluate("""(async()=>{const h={id:uid(),name:'No soda',kind:'avoid',mode:'',target:7,group:'',days:[],created:Date.now()-9*864e5};S.habits.push(h);await DB.put('habits',h);render();const A=rpgAll();return {sh:A.shields,mor:A.morale,kos:A.kos,hits:A.hits,blocked:A.blocked}})()""")
      print(sc,'B',r)
      await pg.evaluate("S.view='dash';render()");await pg.wait_for_timeout(200)
      print(sc,'card def',await pg.inner_text('.rpg-def'),'warn',await pg.locator('.rpg-warn').count())
      await pg.screenshot(path=f'{SHOTS}/shield-{sc}.png')
      await pg.evaluate("S.view='bestiary';render()");print(sc,'hero',await pg.inner_text('.card .meta >> nth=0'))
      # turning on sets rpgSince
      r=await pg.evaluate("(()=>{S.cfg.rpg=false;S.cfg.rpgSince='';const el={dataset:{k:'rpg'},type:'checkbox',checked:true};actions.set(el);return S.cfg.rpgSince===TODAY()})()")
      print(sc,'rpgSince set on toggle',r)
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();S.view='dash';render()");await pg.wait_for_timeout(200)
      print(sc,'ar latin',[x for x in await latin(pg) if 'soda' not in x and 'old' not in x],'ov',await overflow(pg))
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
