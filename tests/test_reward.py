import os, asyncio,sys
from helpers import *
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      pg.remove_listener('dialog',pg.listeners('dialog')[0]) if False else None
      # history: 3 weeks won (lots of high tasks), habit logged daily except yesterday
      await pg.evaluate("""(async()=>{const now=Date.now(),D=864e5;S.cfg.rpg=true;S.cfg.rpgSince=ds(addDays(new Date(),-20));saveCfg();
        for(let i=8;i<29;i++)for(let j=0;j<4;j++){const t={id:uid(),title:'H'+i+j,notes:'',repeat:'',tag:'',items:[],due:ds(addDays(new Date(),-i)),priority:'high',goalId:null,done:true,doneAt:now-i*D,created:now-(i+2)*D};S.tasks.push(t);await DB.put('tasks',t)}
        const h={id:'hb',name:'Read',kind:'',target:7,group:'',days:[],created:now-30*D};S.habits.push(h);await DB.put('habits',h);
        for(let i=0;i<30;i++){if(i===1)continue;const k=ds(addDays(new Date(),-i));S.logs.add('hb|'+k);await DB.put('logs',{id:'hb|'+k,habitId:'hb',date:k})}
        render()})()""")
      await pg.wait_for_timeout(300)
      r=await pg.evaluate("(()=>{const A=rpgAll();return {tokens:A.tokens,streak:streak(S.habits[0]),won:A.weeks.filter(w=>w.won).length,hits:A.hits}})()");print(sc,'before',r)
      await pg.click('[data-action=rest-day]');await pg.wait_for_timeout(150)
      await pg.click('[data-action=rest-use] >> nth=0');await pg.wait_for_timeout(300)
      r=await pg.evaluate("(()=>{const A=rpgAll();return {tokens:A.tokens,streak:streak(S.habits[0]),rest:S.cfg.restDays,hits:A.hits}})()");print(sc,'after rest yesterday',r)
      # reward via prompt
      await pg.click('.rpg [data-action=rw-set]');await pg.wait_for_timeout(200)
      print(sc,'reward line',await pg.inner_text('.rpg .rw'))
      # checklist partial damage
      r=await pg.evaluate("""(async()=>{const t={id:'ck',title:'Big task',notes:'',repeat:'',tag:'',items:[{text:'a',done:false},{text:'b',done:false},{text:'c',done:false}],due:TODAY(),priority:'high',goalId:null,done:false,created:Date.now()-864e5};S.tasks.push(t);await DB.put('tasks',t);render();
        const t0=rpgAll().cur.total;await actions['toggle-sub']({dataset:{id:'ck',i:'0'}});render();const t1=rpgAll().cur.total;
        await actions['toggle-sub']({dataset:{id:'ck',i:'1'}});render();const t2=rpgAll().cur.total;
        await actions['toggle-task']({dataset:{id:'ck'}});render();const t3=rpgAll().cur.total;
        return {item1:t1-t0,item2:t2-t1,finish:t3-t2,total:t3-t0,full:taskDmgCalc(t,Date.now(),1).v}})()""");print(sc,'checklist',r)
      # edit keeps item dmg
      r=await pg.evaluate("(()=>{const t=S.tasks.find(x=>x.id==='ck');t.items=parseItems('a\\nb\\nc\\nd',t.items);return t.items.map(i=>i.dmg||0)})()");print(sc,'parse keeps',r)
      await pg.evaluate("S.view='goals';S.horizon='ladder';render()");await pg.wait_for_timeout(200);print(sc,'tower rw buttons',await pg.locator('.tower [data-action=rw-set]').count())
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();S.view='dash';render()");await pg.wait_for_timeout(200)
      print(sc,'ar latin',[x for x in await latin(pg) if not any(w in x for w in ['Read','Movie','Big','H'])],'ov',await overflow(pg))
      await pg.screenshot(path=f'{SHOTS}/reward-{sc}.png')
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
