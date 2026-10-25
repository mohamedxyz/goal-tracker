# Time blocking: Plan view, scheduling from the tray, new block, overlap layout, edit dialog, unschedule.
import asyncio
from playwright.async_api import async_playwright
from helpers import *
async def main():
  async with async_playwright() as p:
    for scheme,lang in [('light','en'),('dark','en'),('light','ar')]:
      b,pg,errs=await page(p,scheme)
      await pg.evaluate("localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']))")
      await pg.evaluate("""(async()=>{const mk=async(o)=>{const t={id:uid(),title:o.t,notes:'',repeat:'',tag:'',items:[],due:TODAY(),priority:o.p||'med',goalId:null,done:false,created:Date.now(),start:o.s||null,dur:o.d||null};S.tasks.push(t);await DB.put('tasks',t);return t};
        window.__a=await mk({t:'Deep work',s:'09:00',d:120,p:'high'});window.__b=await mk({t:'Email',s:'09:30',d:30});window.__c=await mk({t:'Lunch',s:'12:00',d:60,p:'low'});window.__u=await mk({t:'Call bank'});S.view='tasks';S.planOn=true;render()})()""")
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()")
      await pg.wait_for_timeout(300)
      print(scheme,lang,'blocks',await pg.evaluate("document.querySelectorAll('.pl-b').length"),'tray',await pg.evaluate("document.querySelectorAll('.pl-chips .chip').length"))
      # undated tasks can be scheduled too; the visible hours follow Settings
      print(scheme,lang,'undated in tray',await pg.evaluate("(async()=>{const t={id:uid(),title:'Someday',notes:'',repeat:'',tag:'',items:[],due:null,priority:'low',goalId:null,done:false,created:Date.now()};S.tasks.push(t);render();const n=document.querySelectorAll('.pl-chips .chip').length;S.tasks.pop();render();return n})()"))
      print(scheme,lang,'hours default 6-24',await pg.evaluate("document.querySelectorAll('.pl-hr').length"))
      await pg.evaluate("S.cfg.planFrom='08:00';S.cfg.planTo='18:00';render()")
      print(scheme,lang,'hours 8-18 (blocks inside)',await pg.evaluate("document.querySelectorAll('.pl-hr').length"))
      await pg.evaluate("S.cfg.planFrom='06:00';S.cfg.planTo='24:00';render()")
      # overlap: Deep work (9-11) and Email (9:30-10) share the row in two columns
      print(scheme,lang,'overlap side by side',await pg.evaluate("(()=>{const r=[...document.querySelectorAll('.pl-b')].slice(0,2).map(e=>e.getBoundingClientRect());return Math.abs(r[0].left-r[1].left)>20&&r[0].width<250})()"))
      # schedule 'Call bank' from the tray into 14:00
      await pg.click('.pl-chips .chip');await pg.wait_for_timeout(100)
      await pg.click('.pl-slot[data-min="840"]');await pg.wait_for_timeout(250)
      print(scheme,lang,'scheduled',await pg.evaluate("(()=>{const t=S.tasks.find(x=>x.title==='Call bank');return [t.start,t.dur,document.querySelectorAll('.pl-chips .chip').length]})()"))
      # new block by tapping an empty slot (dialog is auto-answered)
      await pg.click('.pl-slot[data-min="1020"]');await pg.wait_for_timeout(400)
      print(scheme,lang,'new block',await pg.evaluate("(()=>{const t=S.tasks.find(x=>x.start==='17:00');return t?[t.title.length>0,t.due===TODAY(),t.dur]:null})()"))
      # block opens info sheet, shows the time, unschedule works
      await pg.click('.pl-b >> nth=0');await pg.wait_for_timeout(200)
      print(scheme,lang,'block selected, toolbar',await pg.evaluate("[!!document.querySelector('.pl-b.sel'),document.querySelectorAll('.pl-bar .chip').length]"))
      st=await pg.evaluate("S.tasks.find(x=>x.id===PLAN.pick).start");du=await pg.evaluate("S.tasks.find(x=>x.id===PLAN.pick).dur||60")
      await pg.click('.pl-bar [data-action=plan-nudge][data-d="15"]');await pg.wait_for_timeout(150)
      await pg.click('.pl-bar [data-action=plan-len][data-d="15"]');await pg.wait_for_timeout(150)
      print(scheme,lang,'nudge+resize',await pg.evaluate("(()=>{const t=S.tasks.find(x=>x.id===PLAN.pick);return [t.start,t.dur]})()"),'from',st,du)
      await pg.click('.pl-slot[data-min="780"]');await pg.wait_for_timeout(200)
      print(scheme,lang,'moved by tap',await pg.evaluate("S.tasks.filter(t=>t.start==='13:00').length"))
      await pg.click('.pl-b >> nth=0');await pg.wait_for_timeout(150)
      await pg.click('.pl-bar [data-action=info-task]');await pg.wait_for_timeout(200)
      print(scheme,lang,'info has unschedule',await pg.evaluate("!!document.querySelector('#editDlg [data-do=plan-unset]')"))
      await pg.click('#editDlg [data-do=plan-unset]');await pg.wait_for_timeout(250)
      print(scheme,lang,'unscheduled',await pg.evaluate("S.tasks.filter(t=>!t.start&&t.due===TODAY()).length>=1"))
      await pg.evaluate("S.tasks.forEach(t=>{if(t.id===__a.id){t.start='09:00';t.dur=120}});render()");await pg.wait_for_timeout(150)
      # quick-add parsing
      print(scheme,lang,'parse',await pg.evaluate("[parseQuick('Gym at 6pm for 1h tomorrow'),parseQuick('Call 18:30 for 45 min'),parseQuick('Report in 3 days'),parseQuick('Read for 2 hours'),parseQuick('اجتماع الساعة 6م لمدة ساعة')].map(q=>[q.title,q.start,q.dur,!!q.due])"))
      # reminders are built for future blocks
      print(scheme,lang,'reminder',await pg.evaluate("(async()=>{const t={id:uid(),title:'Standup',notes:'',repeat:'',tag:'',items:[],due:ds(addDays(new Date(),1)),start:'09:00',dur:30,priority:'med',goalId:null,done:false,created:Date.now()};S.tasks.push(t);const n=buildNotifications().filter(x=>x.key==='b'+t.due+t.id);S.cfg.nBlocks=false;const off=buildNotifications().filter(x=>x.key==='b'+t.due+t.id).length;S.cfg.nBlocks=true;return [n.length,n[0]&&n[0].title,n[0]&&Math.round((new Date(t.due+'T09:00').getTime()-n[0].at)/60000),off]})()"))
      # edit dialog sets start and length
      await pg.evaluate("openEdit('task',__a.id)");await pg.wait_for_timeout(200)
      await pg.fill('#editDlg input[name=start]','08:15');await pg.select_option('#editDlg select[name=dur]','45');await pg.click('#editDlg button[value=save]');await pg.wait_for_timeout(300)
      print(scheme,lang,'edit saved',await pg.evaluate("(()=>{const t=S.tasks.find(x=>x.id===__a.id);return [t.start,t.dur]})()"))
      # complete from the block, day navigation, list badge, reload persistence
      await pg.click('.pl-ck >> nth=0');await pg.wait_for_timeout(250)
      print(scheme,lang,'done from block',await pg.evaluate("S.tasks.filter(t=>t.start&&t.done).length>=1"))
      await pg.click('[data-action=plan-day][data-d="1"]');await pg.wait_for_timeout(200)
      print(scheme,lang,'next day shows its own block',await pg.evaluate("document.querySelectorAll('.pl-b').length===1"))
      await pg.click('[data-action=plan-today]');await pg.wait_for_timeout(200)
      await pg.evaluate("S.planOn=false;render()");await pg.wait_for_timeout(150)
      print(scheme,lang,'list badge',await pg.evaluate("[...document.querySelectorAll('#app .meta span')].some(s=>s.textContent.includes('🕐'))"))
      await pg.reload();await pg.wait_for_timeout(500)
      print(scheme,lang,'persist',await pg.evaluate("S.tasks.some(t=>t.start==='17:00')"))
      await pg.evaluate("S.view='tasks';S.planOn=true;render()");await pg.wait_for_timeout(200)
      if lang=='ar':print(scheme,lang,'latin',[x for x in await latin(pg) if x not in ('Deep work','Email','Lunch','Call bank','test reason')])
      print(scheme,lang,'ov',await overflow(pg),'errors',errs)
      if scheme=='light' and lang=='en':await pg.screenshot(path=f'{SHOTS}/plan-light.png')
      await b.close()
asyncio.run(main())
