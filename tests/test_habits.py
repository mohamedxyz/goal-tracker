import os, asyncio,sys
from helpers import *
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      await pg.evaluate(SEED_AR);await pg.wait_for_timeout(300)
      await pg.evaluate("(async()=>{const h={id:uid(),name:'Gym',kind:'',target:3,group:'Health',days:[],created:Date.now()};S.habits.push(h);await DB.put('habits',h);const h2={id:uid(),name:'No soda',kind:'avoid',mode:'',target:7,group:'Health',days:[],created:Date.now()};S.habits.push(h2);await DB.put('habits',h2);S.view='habits';render()})()")
      await pg.wait_for_timeout(300)
      secs=await pg.eval_on_selector_all('.hsec','e=>e.map(x=>x.innerText.replace(/\\n/g," "))')
      # check order: no avoid card before the Avoid header
      order=await pg.evaluate("(()=>{const app=document.querySelector('#app');const hdr=[...app.querySelectorAll('.hsec')];const avoidHdr=hdr[1];let bad=0;app.querySelectorAll('.habit .title').forEach(t=>{const avoidName=/بلا سكر|No soda/.test(t.textContent);const after=avoidHdr&&(avoidHdr.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING);if(avoidName&&!after)bad++;if(!avoidName&&after)bad++});return bad})()")
      print(sc,secs,'misplaced',order,'ov',await overflow(pg))
      await pg.screenshot(path=f'{SHOTS}/habits-{sc}.png',full_page=True)
      await pg.reload();await pg.wait_for_timeout(400);await pg.evaluate("S.view='habits';S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
      print(sc,'ar',await pg.eval_on_selector_all('.hsec','e=>e.map(x=>x.innerText.replace(/\\n/g," "))'),'ov',await overflow(pg),'latin',[x for x in await latin(pg) if not any(w in x for w in ['Health','Gym','soda'])])
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
