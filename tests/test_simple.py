# 0.84 simplify guard: Today stays calm, modules are opt-in, Settings stays short, first run is one screen, Study leads with picks.
import asyncio
from playwright.async_api import async_playwright
from helpers import *
def chk(name,ok):print(name,'ok' if ok else 'FAIL')
SEED="""(async()=>{const now=Date.now();
 for(let i=0;i<3;i++){const t={id:uid(),title:'task'+i,notes:'',repeat:'',tag:'',items:[],due:TODAY(),priority:'med',goalId:null,done:false,created:now};S.tasks.push(t);await DB.put('tasks',t)}
 for(let i=0;i<3;i++){const h={id:uid(),name:'habit'+i,kind:'',target:7,group:'',days:[],created:now-30*864e5};S.habits.push(h);await DB.put('habits',h)}
 const g={id:uid(),title:'goal',horizon:'weekly',period:currentPeriod('weekly'),kind:'check',parentId:null,notes:'',created:now,done:false,value:0,target:0,unit:'',expected:0};S.goals.push(g);await DB.put('goals',g);
 localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']));render()})()"""
async def main():
  async with async_playwright() as p:
    for scheme,lang in [('light','en'),('dark','en'),('light','ar')]:
      tag=f'{scheme} {lang}'
      # ---- first run
      b,pg,errs=await page(p,scheme,fresh=False,legacy=False)
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render();openIntro()");await pg.wait_for_timeout(300)
      r=await pg.evaluate("document.getElementById('editDlg').open && document.querySelectorAll('#editDlg [data-action=intro-pick]').length")
      chk(tag+' one-screen first run '+str(r),r==5)
      if lang=='ar':L=[x for x in await latin(pg) if x!='English'];chk(tag+' intro latin '+str(L),L==[])
      await pg.click('[data-action=intro-pick] >> nth=0');await pg.click('[data-action=intro-pick] >> nth=1')
      await pg.fill('#introOwn','Stretch');await pg.click('[data-action=intro-go]');await pg.wait_for_timeout(500)
      r=await pg.evaluate("[S.habits.length,document.getElementById('editDlg').open,S.view]")
      chk(tag+' starter habits created '+str(r),r==[3,False,'dash'])
      await b.close()
      # ---- Today and modules
      b,pg,errs=await page(p,scheme,legacy=False)
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang()")
      await pg.evaluate(SEED);await pg.wait_for_timeout(500)
      n=await pg.evaluate("[...document.querySelectorAll('#app > *')].filter(e=>e.offsetParent!==null).length")
      chk(tag+' Today blocks '+str(n),n<=6)
      r=await pg.evaluate("(()=>{const t=document.querySelector('.tcheck').getBoundingClientRect();return [t.top>0,t.bottom<innerHeight-70]})()")
      chk(tag+' first tick above the fold '+str(r),all(r))
      r=await pg.evaluate("(()=>{const a=document.querySelector('.backup-cta'),b=document.querySelector('.tcheck');return !a||!!(b.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING)})()")
      chk(tag+' backup card is below the tasks',r)
      r=await pg.evaluate("[document.querySelector('[data-view=study]').hidden,!document.querySelector('.daymode'),!!document.querySelector('.taskadd')]")
      chk(tag+' modules off, add field on Today '+str(r),r==[True,True,True])
      # add a task from Today
      await pg.fill('.taskadd input[name=title]','call mom tomorrow');await pg.click('.taskadd .btn');await pg.wait_for_timeout(400)
      r=await pg.evaluate("S.tasks.find(t=>t.title.startsWith('call mom'))&&S.tasks.find(t=>t.title.startsWith('call mom')).due===ds(addDays(new Date(),1))")
      chk(tag+' add from Today with a date',r)
      # Tasks view has no Plan chip until the module is on
      await pg.evaluate("S.view='tasks';render()")
      c0=await pg.locator('[data-action=tasks-plan]').count()
      # ---- Settings
      await pg.evaluate("S.view='data';render()");await pg.wait_for_timeout(300)
      n=await pg.evaluate("document.querySelectorAll('#app > .card.settings, #app > details.adv').length")
      chk(tag+' Settings top level '+str(n),n<=8)
      chk(tag+' Add-ons first',await pg.evaluate("document.querySelector('#app > .card.settings').classList.contains('addons')"))
      if lang=='ar':chk(tag+' settings addons latin',await pg.evaluate("!/[A-Za-z]{2,}/.test(document.querySelector('.addons').innerText.replace(/GoalTerra/g,''))"))
      await pg.click('[data-k=mTime]');await pg.click('[data-k=student]');await pg.wait_for_timeout(300)
      await pg.evaluate("S.view='tasks';render()")
      c1=await pg.locator('[data-action=tasks-plan]').count()
      chk(tag+' Plan chip follows the add-on '+str([c0,c1]),c0==0 and c1>=1)
      chk(tag+' Study tab appears',await pg.evaluate("!document.querySelector('[data-view=study]').hidden"))
      # ---- Study
      await pg.evaluate("""(async()=>{const now=Date.now();for(let i=0;i<7;i++){const t={id:uid(),subject:'Bio',name:'T'+i,sessions:[],created:now};S.topics.push(t);await DB.put('topics',t)}
        const e={id:uid(),subject:'Bio',title:'Quiz',kind:'quiz',date:ds(addDays(new Date(),-2)),created:now};S.exams.push(e);await DB.put('exams',e);S.view='study';render()})()""");await pg.wait_for_timeout(500)
      r=await pg.evaluate("(()=>{const b=document.querySelector('[data-action=topic-rate]').getBoundingClientRect();return [b.top>0,b.bottom<innerHeight-70]})()")
      chk(tag+' first rating button above the fold '+str(r),all(r))
      chk(tag+' results-to-log strip',await pg.locator('.backup-cta [data-action=edit-exam]').count()==1)
      chk(tag+' only 5 picks, then Show all',await pg.locator('.pick').count()==5 and await pg.locator('[data-action=picks-all]').count()==1)
      await pg.click('[data-action=picks-all]');await pg.wait_for_timeout(300)
      chk(tag+' show all',await pg.locator('.pick').count()==7)
      await pg.click('[data-action=topic-rate] >> nth=0');await pg.wait_for_timeout(700)
      rated=await pg.evaluate("S.topics.filter(t=>t.sessions.length).length")
      await pg.click('#toast [data-undo]');await pg.wait_for_timeout(500)
      chk(tag+' rating undone '+str([rated,await pg.evaluate("S.topics.filter(t=>t.sessions.length).length")]),rated==1 and await pg.evaluate("S.topics.filter(t=>t.sessions.length).length")==0)
      if lang=='ar':chk(tag+' study latin '+str([x for x in await latin(pg) if 'T' not in x and 'Bio' not in x and 'Quiz' not in x]),[x for x in await latin(pg) if 'T' not in x and 'Bio' not in x and 'Quiz' not in x]==[])
      # ---- nav dot
      await pg.evaluate("S.view='dash';render()")
      chk(tag+' settings dot when backup is due',await pg.evaluate("document.querySelector('#tabbar [data-view=data]').classList.contains('attn')==backupNudge()"))
      print(tag,'ov',await overflow(pg),'errors',errs)
      await pg.screenshot(path=f'{SHOTS}/simple-{scheme}-{lang}.png')
      await b.close()
asyncio.run(main())
