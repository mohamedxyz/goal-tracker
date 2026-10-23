import os, asyncio,sys
from helpers import *
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      await pg.evaluate(SEED_AR);await pg.wait_for_timeout(300)
      await pg.evaluate("(async()=>{const t=S.tasks.find(x=>x.done);(t.focusLog=t.focusLog||[]).push({at:Date.now(),m:25});t.focus=25;await DB.put('tasks',t);S.cfg.lang='en';saveCfg();applyLang();(async()=>{const g={id:uid(),title:'Weekly goal x',horizon:'weekly',period:currentPeriod('weekly'),kind:'check',parentId:null,notes:'',created:Date.now(),done:false};S.goals.push(g);await DB.put('goals',g);render()})()})()")
      await pg.wait_for_timeout(300)
      r=await pg.evaluate("""(()=>{const w=weekData(0),A=rpgAll(),by=doneByDay();let n=0;for(const d of w.days)n+=(by[ds(d)]||[]).length;
        return {reportDone:w.done.length,dashDone:n,lv:w.lv,focus:w.focus,bossTotal:w.boss&&w.boss.total,cardTotal:A.cur.total,bossHp:w.boss&&w.boss.hp,cardHp:A.cur.hp}})()""");print(sc,r)
      await pg.click('[data-action=open-report]');await pg.wait_for_timeout(200);txt=await pg.inner_text('#editDlg');print(sc,'report has levels',('Day levels' in txt),'focus','Focus time' in txt,'boss','Week boss' in txt)
      await pg.screenshot(path=f'{SHOTS}/report-{sc}.png');await pg.keyboard.press('Escape')
      await pg.click('[data-action=open-month]');await pg.wait_for_timeout(200);txt=await pg.inner_text('#editDlg');print(sc,'month', 'Monthly review' in txt,'guardian','Guardian' in txt)
      mo=await pg.evaluate("(()=>{const m=monthData(0);return {done:m.done.length,lv:m.lv,best:m.best}})()");print(sc,'month data',mo)
      await pg.click('[data-action=mrev-nav][data-d="-1"]');await pg.wait_for_timeout(150);print(sc,'prev month ok',await pg.locator('#editDlg h3').inner_text())
      await pg.screenshot(path=f'{SHOTS}/month-{sc}.png')
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render();drawMonth()");await pg.wait_for_timeout(200);print(sc,'ar month latin',[x for x in await latin(pg) if 'W4' not in x and 'W3' not in x and 'Weekly goal x' not in x])
      await pg.evaluate("rep_.off=0;drawReport()");await pg.wait_for_timeout(200);print(sc,'ar report latin',[x for x in await latin(pg) if 'Weekly goal x' not in x],'ov',await overflow(pg))
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
