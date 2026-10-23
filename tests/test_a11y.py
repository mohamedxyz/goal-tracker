import os, asyncio,sys
from helpers import *
JS=r"""()=>{const out=[];document.querySelectorAll('button,[role=button],input:not([type=hidden]),select,textarea').forEach(e=>{if(e.offsetParent===null&&!e.closest('dialog[open]'))return;
  const name=(e.getAttribute('aria-label')||e.getAttribute('title')||'').trim();const txt=(e.innerText||'').replace(/[^\p{L}\p{N}]/gu,'').trim();
  const lab=e.id&&document.querySelector(`label[for="${e.id}"]`)||e.closest('label');const ph=e.getAttribute('placeholder');
  if(!name&&!txt&&!lab&&!ph)out.push(e.outerHTML.slice(0,110))});return [...new Set(out)]}"""
async def m():
  async with async_playwright() as p:
    b,pg,errs=await page(p)
    await pg.evaluate(SEED_AR);await pg.wait_for_timeout(300)
    res={}
    for v in ['dash','tasks','goals','habits','study','data','bestiary']:
      await pg.evaluate(f"S.view='{v}';render()");await pg.wait_for_timeout(100)
      for x in await pg.evaluate(JS):res.setdefault(x,v)
    await pg.evaluate("ftStart(S.tasks[0].id,'focus')");await pg.wait_for_timeout(200)
    for x in await pg.evaluate(JS):res.setdefault(x,'focus')
    for k,v in res.items():print(v,'|',k)
    print('count',len(res));await b.close()
asyncio.run(m())
