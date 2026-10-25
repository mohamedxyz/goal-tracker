# Data-loss protection: safety copies, trash for goals/exams/topics, bulk undo, typed erase, edit history, data check.
import asyncio
from playwright.async_api import async_playwright
from helpers import *
SETUP="""(async()=>{
 const now=Date.now();
 window.__g={id:uid(),title:'Big goal',horizon:'weekly',period:currentPeriod('weekly'),kind:'check',parentId:null,notes:'',created:now,done:false,value:0,target:0,unit:'',expected:0};
 S.goals.push(__g);await DB.put('goals',__g);
 for(let i=0;i<4;i++){const t={id:uid(),title:'task'+i,notes:'n'+i,repeat:'',tag:'',items:[],due:TODAY(),priority:'med',goalId:i<2?__g.id:null,done:false,created:now};S.tasks.push(t);await DB.put('tasks',t)}
 const h={id:uid(),name:'Run',kind:'',target:7,group:'',days:[],created:now-20*864e5};S.habits.push(h);await DB.put('habits',h);window.__h=h;
 for(let i=0;i<9;i++){const k=ds(addDays(new Date(),-i));S.logs.add(h.id+'|'+k);await DB.put('logs',{id:h.id+'|'+k,habitId:h.id,date:k})}
 const e={id:uid(),subject:'Math',title:'Midterm',kind:'exam',date:ds(addDays(new Date(),5)),time:'09:00',created:now};S.exams.push(e);await DB.put('exams',e);window.__e=e;
 const tp={id:uid(),subject:'Math',name:'Limits',sessions:[],created:now};S.topics.push(tp);await DB.put('topics',tp);window.__tp=tp;
 S.cfg.cGoal=false;render()})()"""
def chk(name,ok):print(name,'ok' if ok else 'FAIL')
async def main():
  async with async_playwright() as p:
    for scheme,lang in [('light','en'),('dark','en'),('light','ar')]:
      b,pg,errs=await page(p,scheme);tag=f'{scheme} {lang}'
      await pg.evaluate("localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']))")
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang()")
      await pg.evaluate(SETUP)
      # goal -> trash -> restore relinks tasks
      await pg.evaluate("actions['del-goal']({dataset:{id:__g.id}})");await pg.wait_for_timeout(200)
      r=await pg.evaluate("[!goalById(__g.id),S.trash.some(x=>x.id==='goal:'+__g.id),S.tasks.filter(t=>t.goalId).length]")
      chk(tag+' goal in trash '+str(r),r==[True,True,0])
      await pg.evaluate("trashRestore('goal:'+__g.id)");
      r=await pg.evaluate("[!!goalById(__g.id),S.tasks.filter(t=>t.goalId===__g.id).length,S.trash.length]")
      chk(tag+' goal restored + relinked '+str(r),r==[True,2,0])
      # exam, topic
      await pg.evaluate("actions['del-exam']({dataset:{id:__e.id}})");await pg.wait_for_timeout(150)
      await pg.evaluate("actions['del-topic']({dataset:{id:__tp.id}})");await pg.wait_for_timeout(150)
      r=await pg.evaluate("[S.exams.length,S.topics.length,S.trash.length]");chk(tag+' exam/topic in trash '+str(r),r==[0,0,2])
      await pg.evaluate("S.view='trash';render()")
      if lang=='ar':chk(tag+' trash latin '+str(await latin(pg)),await latin(pg)==[])
      await pg.evaluate("trashRestore('exam:'+__e.id);trashRestore('topic:'+__tp.id)");await pg.wait_for_timeout(200)
      r=await pg.evaluate("[S.exams.length,S.topics.length,S.trash.length]");chk(tag+' exam/topic back '+str(r),r==[1,1,0])
      # snapshots
      rec=await pg.evaluate("snapSave('daily').then(r=>r&&r.n.tasks)");chk(tag+' snapshot saved '+str(rec),rec==4)
      await pg.evaluate("(async()=>{S.tasks=S.tasks.filter(t=>t.title!=='task3');await DB.del('tasks',S.tasks.length?'x':'x')})()")
      await pg.evaluate("(async()=>{const t=S.tasks.find(x=>x.title==='task0');S.tasks=S.tasks.filter(x=>x!==t);await DB.del('tasks',t.id)})()")
      await pg.evaluate("actions['open-safety']().then(()=>render())");await pg.wait_for_timeout(300)
      r=await pg.evaluate("[S.view,document.querySelectorAll('[data-action=snap-restore]').length]");chk(tag+' safety view '+str(r),r[0]=='safety' and r[1]>=1)
      if lang=='ar':chk(tag+' safety latin '+str(await latin(pg)),await latin(pg)==[])
      await pg.evaluate("(()=>{window.__sr=actions['snap-restore']({dataset:{id:S.snaps[0].id}})})()");await pg.wait_for_selector('#editDlg [data-rp="1"]');await pg.click('#editDlg [data-rp="1"]');await pg.wait_for_timeout(800)
      r=await pg.evaluate("[S.tasks.length,S.tasks.some(t=>t.title==='task0'),S.tasks.some(t=>t.title==='task3')]");chk(tag+' snapshot restored '+str(r),r==[4,True,True])
      r=await pg.evaluate("Snap.all().then(a=>a.some(x=>x.reason==='restore'))");chk(tag+' pre-restore copy kept',r)
      # erase needs the word
      await pg.evaluate("window.__noAuto=true")
      async def erase(word):
        await pg.evaluate("(()=>{window.__w=actions.wipe()})()");await pg.wait_for_timeout(150)
        if word is None:await pg.click('#askNo')
        else:
          await pg.fill('#askIn',word);await pg.click('#askYes')
        await pg.wait_for_timeout(500)
      await erase('nope');chk(tag+' wrong word keeps data',await pg.evaluate("S.tasks.length")==4)
      await erase(None);chk(tag+' cancel keeps data',await pg.evaluate("S.tasks.length")==4)
      await erase('ERASE' if lang=='en' else 'مسح')
      r=await pg.evaluate("[S.tasks.length,S.goals.length,S.habits.length]");chk(tag+' erased '+str(r),r==[0,0,0])
      await pg.click('#toast [data-undo]');await pg.wait_for_timeout(600)
      r=await pg.evaluate("[S.tasks.length,S.goals.length,S.habits.length,S.logs.size]");chk(tag+' erase undone '+str(r),r[0]==4 and r[2]==1 and r[3]==9)
      await pg.evaluate("window.__noAuto=false")
      # bulk undo
      await pg.evaluate("S.view='tasks';render()")
      await pg.evaluate("(()=>{S.sel=new Set(S.tasks.slice(0,2).map(t=>t.id));actions['bulk-done']()})()");await pg.wait_for_timeout(300)
      n=await pg.evaluate("S.tasks.filter(t=>t.done).length");await pg.click('#toast [data-undo]');await pg.wait_for_timeout(300)
      chk(tag+' bulk done undo '+str([n,await pg.evaluate("S.tasks.filter(t=>t.done).length")]),n==2 and await pg.evaluate("S.tasks.filter(t=>t.done).length")==0)
      await pg.evaluate("(()=>{S.sel=new Set(S.tasks.slice(0,2).map(t=>t.id));actions['bulk-archive']()})()");await pg.wait_for_timeout(300)
      n=await pg.evaluate("S.tasks.filter(t=>t.archived).length");await pg.click('#toast [data-undo]');await pg.wait_for_timeout(300)
      chk(tag+' bulk archive undo',n==2 and await pg.evaluate("S.tasks.filter(t=>t.archived).length")==0)
      # long-streak un-tick undo
      await pg.evaluate("toggleLog(__h.id,TODAY())");await pg.wait_for_timeout(300)
      gone=await pg.evaluate("!S.logs.has(__h.id+'|'+TODAY())");await pg.click('#toast [data-undo]');await pg.wait_for_timeout(300)
      chk(tag+' streak untick undo',gone and await pg.evaluate("S.logs.has(__h.id+'|'+TODAY())"))
      # edit history
      await pg.evaluate("(()=>{window.__tid=S.tasks.find(t=>t.title==='task0').id;window.TT=()=>S.tasks.find(t=>t.id===__tid)})()")
      await pg.evaluate("openEdit('task',__tid)");await pg.fill('#editDlg [name=title]','Renamed');await pg.evaluate("document.querySelector('#editDlg form').requestSubmit()");await pg.wait_for_timeout(400)
      chk(tag+' history kept '+str(await pg.evaluate("TT().hist&&TT().hist.length")),await pg.evaluate("TT().hist&&TT().hist[0].title")=='task0')
      await pg.evaluate("openEdit('task',__tid)");await pg.click('#editDlg summary');await pg.click('#editDlg [data-action=hist-use]')
      chk(tag+' history use',await pg.inner_text('#editDlg [name=title]') =='' or await pg.evaluate("document.querySelector('#editDlg [name=title]').value")=='task0')
      if lang=='ar':chk(tag+' history label in Arabic',await pg.evaluate("document.querySelector('#editDlg summary').textContent.includes('نسخ سابقة')"))
      await pg.evaluate("document.getElementById('editDlg').close()")
      # data check
      await pg.evaluate("(async()=>{const t=S.tasks[1];t.goalId='ghost';await DB.put('tasks',t);S.logs.add('gone|2024-01-01');await DB.put('logs',{id:'gone|2024-01-01',habitId:'gone',date:'2024-01-01'});})()")
      q=await pg.evaluate("(()=>{const q=dataIssues();return [q.tasks.length,q.logs.length]})()");chk(tag+' issues found '+str(q),q==[1,1])
      await pg.evaluate("dataCheck()");await pg.wait_for_timeout(600)
      q=await pg.evaluate("(()=>{const q=dataIssues();return [q.tasks.length,q.logs.length]})()");chk(tag+' issues fixed '+str(q),q==[0,0])
      # settings + dashboard
      await pg.evaluate("S.view='data';render()");chk(tag+' settings buttons',await pg.locator('[data-action=open-safety]').count()==1)
      print(tag,'ov',await overflow(pg),'errors',errs)
      await b.close()
asyncio.run(main())
