# Game fixes: a beaten boss stays beaten, no counterattacks after it dies, overkill bonus, capped boss growth, streak, badges, how-it-works sheet.
import asyncio
from playwright.async_api import async_playwright
from helpers import *
SETUP="""(async()=>{
 window.__mk=async(day,n,pri,undated)=>{for(let i=0;i<n;i++){const t={id:uid(),title:'g'+day+i,notes:'',repeat:'',tag:'',items:[],due:undated?null:day,priority:pri||'high',goalId:null,done:true,doneAt:new Date(day+'T12:00:00').getTime()+i*60000,created:new Date(day+'T08:00:00').getTime(),dmg:30};S.tasks.push(t);await DB.put('tasks',t)}};
 window.__wk=(off)=>ds(addDays(mondayOf(new Date()),7*off));
 window.__reset=async()=>{for(const t of [...S.tasks]){await DB.del('tasks',t.id)}S.tasks=[];_rpgKey='';_rpg=null};
 S.cfg.rpg=true;saveCfg();
})()"""
async def main():
  async with async_playwright() as p:
    for scheme,lang in [('light','en'),('dark','en'),('light','ar')]:
      b,pg,errs=await page(p,scheme)
      await pg.evaluate("localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']))")
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang()")
      await pg.evaluate(SETUP)
      # 1. the boss dies on Monday of each of the last two weeks (3 x 30 >= 60), then six empty days: those weeks get no attacks and no knockout; the open week does
      await pg.evaluate("(async()=>{await __reset();S.cfg.rpgSince=__wk(-2);await __mk(__wk(-2),3);await __mk(__wk(-1),3);_rpgKey='';})()")
      r=await pg.evaluate("(()=>{const A=rpgAll(),w=A.weeks.slice(-3);return [w[0].won,w[0].ko||0,w[1].won,w[1].ko||0,w[2].ko||0,A.overXp]})()")
      print(scheme,lang,'dead bosses stay dead',r[0],r[2],'no knockouts on them',r[1]==0 and r[3]==0,'open week attacked',r[4]>0,'overkill bonus',r[5]>0)
      # 2. contrast: nothing done that week, so the boss attacks
      await pg.evaluate("(async()=>{await __reset();S.cfg.rpgSince=__wk(-1);_rpgKey='';})()")
      print(scheme,lang,'idle week is attacked',await pg.evaluate("rpgAll().hits>0"))
      # 3. growth cap: an unplanned monster week (30 x 30 = 900 vs 60 HP) raises next week's boss by at most 25% of that HP
      await pg.evaluate("(async()=>{await __reset();S.cfg.rpgSince=TODAY();for(let i=0;i<3;i++)await __mk(ds(addDays(mondayOf(new Date()),-7+i)),10,'high',true);_rpgKey='';})()")
      print(scheme,lang,'next boss capped',await pg.evaluate("(()=>{const A=rpgAll();return [A.cur.hp<=80,A.cur.hp]})()"))
      # 4. streak and badges: two won weeks in a row, first badge seeded silently then earned
      await pg.evaluate("(async()=>{await __reset();S.cfg.ach=null;S.cfg.rpgSince=__wk(-2);_rpgKey='';rpgTick();})()")
      print(scheme,lang,'seeded silently',await pg.evaluate("S.cfg.ach===''||S.cfg.ach!=null"),await pg.evaluate("!document.querySelector('#toast.show')||!document.querySelector('#toast').textContent.includes('🏅')"))
      await pg.evaluate("(async()=>{await __mk(__wk(-2),3);await __mk(__wk(-1),3);_rpgKey='';rpgTick();})()");await pg.wait_for_timeout(1500)
      print(scheme,lang,'streak',await pg.evaluate("rpgAll().streak"),'badge toast',await pg.evaluate("document.querySelector('#toast').textContent.includes('🏅')"),'earned',await pg.evaluate("[...earned()].sort().join(',')"))
      await pg.evaluate("(async()=>{await __reset();rpgTick()})()")
      print(scheme,lang,'badge kept after history is gone',await pg.evaluate("earned().has('first')"))
      # 5. how-it-works sheet
      await pg.evaluate("S.view='dash';render();openInfo('game')");await pg.wait_for_timeout(250)
      print(scheme,lang,'sheet',await pg.evaluate("[document.getElementById('editDlg').open,document.querySelectorAll('#editDlg .badge').length,document.querySelectorAll('#editDlg .badge.on').length]"))
      if lang=='ar':print(scheme,lang,'latin',[x for x in await latin(pg)][:6])
      print(scheme,lang,'ov',await overflow(pg),'errors',errs)
      if scheme=='dark':await pg.screenshot(path=f'{SHOTS}/game-sheet-dark.png')
      await b.close()
asyncio.run(main())
