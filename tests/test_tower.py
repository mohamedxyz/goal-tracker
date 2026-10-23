import os, asyncio,sys
from helpers import *
SEED=r"""(async()=>{const now=Date.now(),D=864e5;
 // 90 days of history: high-priority tasks done most days so many weeks are won
 for(let i=1;i<90;i++){if(i%7===3)continue;for(let j=0;j<3;j++){const t={id:uid(),title:'P'+i+'-'+j,notes:'',repeat:'',tag:'',items:[],due:ds(addDays(new Date(),-i)),priority:'high',goalId:null,done:true,doneAt:now-i*D,created:now-(i+3)*D};S.tasks.push(t);await DB.put('tasks',t)}}
 const mk=async(o)=>{const g={id:uid(),title:o.t,horizon:o.h,period:o.p,kind:'check',parentId:null,notes:'',created:now,done:!!o.d,doneAt:o.d?now:null};S.goals.push(g);await DB.put('goals',g);return g};
 await mk({t:'Become a developer',h:'five',p:currentPeriod('five')});await mk({t:'Sept goal',h:'monthly',p:ds(addDays(new Date(),-35)).slice(0,7),d:1});
 await mk({t:'Year goal',h:'annual',p:currentPeriod('annual'),d:1});
 S.cfg.rpg=true;saveCfg();render()})()"""
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      await pg.evaluate(SEED);await pg.wait_for_timeout(400)
      T=await pg.evaluate("(()=>{const T=rpgTower();return {months:T.months.map(m=>[m.key,m.wins,m.gd,m.hp,m.won]),years:T.years.map(y=>[y.key,y.dmg,y.hp,y.won])}})()")
      print(sc,T)
      print(sc,'weeksIn',await pg.evaluate("['2026-10','2026-11','2026-12','2026-03'].map(weeksInMonth)"))
      await pg.screenshot(path=f'{SHOTS}/tower-dash-{sc}.png')
      await pg.click('[data-action=open-tower]');await pg.wait_for_timeout(300)
      print(sc,'tower rows',await pg.locator('.tw-row').count(),'ov',await overflow(pg))
      await pg.screenshot(path=f'{SHOTS}/tower-{sc}.png')
      await pg.evaluate("S.view='bestiary';render()");await pg.wait_for_timeout(200)
      print(sc,'bestiary guardians',await pg.locator('h2:has-text("Guardians") + .goals .bst').count())
      await pg.screenshot(path=f'{SHOTS}/tower-best-{sc}.png',full_page=True)
      # defeat current guardian by adding monthly goals done
      before=await pg.evaluate("rpgTower().curM.won")
      await pg.evaluate("S.view='dash';render()")
      await pg.evaluate("(async()=>{for(let i=0;i<5;i++){const g={id:uid(),title:'MG'+i,horizon:'monthly',period:currentPeriod('monthly'),kind:'check',parentId:null,notes:'',created:Date.now(),done:true,doneAt:Date.now()};S.goals.push(g);await DB.put('goals',g)}render()})()")
      await pg.wait_for_timeout(1300);print(sc,'guardian',before,'->',await pg.evaluate("rpgTower().curM.won"),'toast',await pg.inner_text('#toast'))
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();S.view='goals';S.horizon='ladder';render()");await pg.wait_for_timeout(250)
      print(sc,'ar latin',[x for x in await latin(pg) if not x.startswith('P') and 'MG' not in x and x not in ('Become a developer','Year goal')],'ov',await overflow(pg))
      await pg.screenshot(path=f'{SHOTS}/tower-ar-{sc}.png')
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
