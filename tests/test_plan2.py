# Plan view part 2: undo, overlap warnings, swipe between days/months, clock format, week start.
import asyncio,sys
from playwright.async_api import async_playwright
from helpers import *
SWIPE="""([sel,x1,y1,x2,y2])=>{const el=document.querySelector(sel);const T=(x,y)=>new Touch({identifier:1,target:el,clientX:x,clientY:y});
 const mk=(type,x,y)=>new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[T(x,y)],changedTouches:[T(x,y)]});
 el.dispatchEvent(mk('touchstart',x1,y1));el.dispatchEvent(mk('touchend',x2,y2))}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for scheme,lang in [('light','en'),('dark','en'),('light','ar')]:
      ctx=await b.new_context(viewport={'width':390,'height':844},color_scheme=scheme,has_touch=True,is_mobile=True);pg=await ctx.new_page();errs=[]
      pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{const a=document.getElementById('askDlg');if(a&&a.open&&!a.dataset.busy){a.dataset.busy=1;const i=a.querySelector('#askIn');if(!i.hidden)i.value='test reason';setTimeout(()=>{a.querySelector('#askYes').click();delete a.dataset.busy},0)}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open']})})")
      await pg.goto(URL);await pg.wait_for_timeout(500)
      if await pg.locator('#editDlg[open] [data-action=intro-done]').count():await pg.click('[data-action=intro-done] >> nth=0');await pg.wait_for_timeout(100)
      await pg.evaluate("S.cfg.mTime=true;saveCfg()")
      await pg.evaluate("localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']))")
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()")
      await pg.evaluate("""(async()=>{const mk=async(o)=>{const t={id:uid(),title:o.t,notes:'',repeat:'',tag:'',items:[],due:TODAY(),priority:'med',goalId:null,done:false,created:Date.now(),start:o.s,dur:o.d};S.tasks.push(t);await DB.put('tasks',t);return t};
        window.__a=await mk({t:'AAA',s:'10:00',d:60});window.__b=await mk({t:'BBB',s:'10:30',d:60});window.__c=await mk({t:'CCC',s:'14:00',d:60});S.view='tasks';S.planOn=true;render()})()""")
      await pg.wait_for_timeout(300)
      print(scheme,lang,'clash marked',await pg.evaluate("[document.querySelectorAll('.pl-b.clash').length,document.querySelector('.pl-sum').textContent.includes('⚠')]"))
      # nudge then undo
      await pg.click('.pl-b >> nth=2');await pg.wait_for_timeout(150)   # the lone block (sorted by start: AAA, BBB, CCC)
      print(scheme,lang,'lone block no warning',await pg.evaluate("!document.querySelector('.pl-warn')"))
      await pg.click('.pl-bar [data-action=plan-nudge][data-d="15"]');await pg.wait_for_timeout(200)
      print(scheme,lang,'nudged',await pg.evaluate("S.tasks.find(t=>t.id===__c.id).start"),'undo btn',await pg.evaluate("!!document.querySelector('#toast [data-undo]')"))
      await pg.click('#toast [data-undo]');await pg.wait_for_timeout(250)
      print(scheme,lang,'undone',await pg.evaluate("S.tasks.find(t=>t.id===__c.id).start"))
      # overlap named in the toolbar
      await pg.click('.pl-b >> nth=0');await pg.wait_for_timeout(150)
      print(scheme,lang,'toolbar names overlap',await pg.evaluate("(document.querySelector('.pl-warn')||{}).textContent||''"))
      # unschedule then undo
      await pg.click('.pl-bar [data-action=plan-unset]');await pg.wait_for_timeout(200)
      gone=await pg.evaluate("!S.tasks.find(t=>t.id===__a.id).start")
      await pg.click('#toast [data-undo]');await pg.wait_for_timeout(250)
      print(scheme,lang,'unschedule+undo',gone,await pg.evaluate("S.tasks.find(t=>t.id===__a.id).start"))
      # new block then undo
      await pg.click('.pl-slot[data-min="1080"]');await pg.wait_for_timeout(400)
      added=await pg.evaluate("S.tasks.some(t=>t.start==='18:00')")
      await pg.click('#toast [data-undo]');await pg.wait_for_timeout(250)
      print(scheme,lang,'new block+undo',added,await pg.evaluate("S.tasks.some(t=>t.start==='18:00')"))
      # swipe: a long sideways swipe changes the day; a mostly vertical drag does not
      d0=await pg.evaluate("PLAN.day||TODAY()");fwd=1 if True else 0
      sx=(300,100) if lang=='en' else (100,300)
      await pg.evaluate(SWIPE,['.pl-grid',sx[0],400,sx[1],410]);await pg.wait_for_timeout(250)
      d1=await pg.evaluate("PLAN.day||TODAY()")
      await pg.evaluate(SWIPE,['.pl-grid',200,300,230,600]);await pg.wait_for_timeout(200)
      d2=await pg.evaluate("PLAN.day||TODAY()")
      print(scheme,lang,'swipe next day',d1>d0,'vertical ignored',d2==d1)
      await pg.evaluate(SWIPE,['.pl-grid',sx[1],400,sx[0],410]);await pg.wait_for_timeout(250)
      print(scheme,lang,'swipe back',await pg.evaluate("(PLAN.day||TODAY())")==d0)
      await pg.evaluate("S.cfg.planSwipe=false;saveCfg()");await pg.evaluate(SWIPE,['.pl-grid',sx[0],400,sx[1],410]);await pg.wait_for_timeout(200)
      print(scheme,lang,'swipe off',await pg.evaluate("(PLAN.day||TODAY())")==d0);await pg.evaluate("S.cfg.planSwipe=true;saveCfg()")
      # month swipe in the calendar
      await pg.evaluate("S.planOn=false;S.tcalOn=true;render()");await pg.wait_for_timeout(200)
      m0=await pg.evaluate("tcal.m");await pg.evaluate(SWIPE,['.tcal .cal:last-of-type',sx[0],100,sx[1],105]);await pg.wait_for_timeout(250)
      print(scheme,lang,'month swipe',await pg.evaluate("tcal.m")!=m0)
      # week start: Sunday-first puts the first of the month in the right column
      for ws in ['mon','sun','sat']:
        await pg.evaluate(f"S.cfg.weekStart='{ws}';render()");await pg.wait_for_timeout(120)
        r=await pg.evaluate("(()=>{const f=new Date(tcal.y,tcal.m,1).getDay(),want={mon:1,sun:0,sat:6}[S.cfg.weekStart],exp=(f-want+7)%7;const cal=document.querySelectorAll('.tcal .cal')[1];let n=0;for(const c of cal.children){if(c.tagName==='SPAN'&&!c.className)n++;else break}return [exp,n]})()")
        print(scheme,lang,'week start',ws,r[0]==r[1])
      # clock format
      if lang=='en':
        await pg.evaluate("S.cfg.timeFmt='24';S.cfg.planFrom='06:00';S.planOn=true;S.tcalOn=false;render()");await pg.wait_for_timeout(150)
        t24=await pg.evaluate("document.querySelector('.pl-lab').textContent");await pg.evaluate("S.cfg.timeFmt='12';render()");await pg.wait_for_timeout(150)
        t12=await pg.evaluate("document.querySelector('.pl-lab').textContent")
        print(scheme,lang,'clock',t24,'|',t12,'ok',('AM' not in t24) and ('AM' in t12))
      await pg.evaluate("S.cfg.timeFmt='auto';S.cfg.weekStart='mon';render()")
      print(scheme,lang,'ov',await overflow(pg),'errors',errs)
      await ctx.close()
    await b.close()
asyncio.run(main())
