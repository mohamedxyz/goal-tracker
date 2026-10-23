# Mock-native test: fakes window.Capacitor so the Android bridge code paths run in Chromium.
import asyncio,sys,os,json
from playwright.async_api import async_playwright
from helpers import *
MOCK=r"""window.__calls=[];window.__listeners={};
window.Capacitor={isNativePlatform:()=>true,registerPlugin:(name)=>new Proxy({},{get:(t,m)=>(...a)=>{__calls.push([name,m,JSON.parse(JSON.stringify(a[0]||null))]);
  if(m==='addListener'){(__listeners[name+':'+a[0]]=__listeners[name+':'+a[0]]||[]).push(a[1]);return Promise.resolve({remove(){}})}
  if(m==='checkPermissions'||m==='requestPermissions')return Promise.resolve({display:'granted'});
  if(m==='checkExactNotificationSetting')return Promise.resolve({exact_alarm:'denied'});
  if(m==='writeFile')return Promise.resolve({uri:'file:///storage/emulated/0/Documents/'+a[0].path});
  return Promise.resolve({})}})};"""
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844});await ctx.add_init_script(MOCK)
    pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    await pg.goto(URL);await pg.wait_for_timeout(500)
    print('native',await pg.evaluate("NATIVE&&!!window.GTNative"),'listeners',await pg.evaluate("Object.keys(__listeners)"))
    if await pg.locator('[data-action=intro-done]').count():await pg.click('[data-action=intro-done] >> nth=0')
    await pg.evaluate(SEED_AR);await pg.wait_for_timeout(300)
    await pg.evaluate("(()=>{const td=new Date().getDay();setClasses([{id:'c1',subject:'Bio',day:(td+1)%7,start:'09:00',end:'10:00',room:'Lab'}]);render()})()")
    await pg.wait_for_timeout(2200)
    sch=await pg.evaluate("__calls.filter(c=>c[0]==='LocalNotifications'&&c[1]==='schedule').map(c=>c[2].notifications.map(n=>n.title+' | '+n.body+' | '+new Date(n.schedule.at).toISOString()))")
    print('scheduled batches',len(sch),'items',len(sch[-1]) if sch else 0);print('\n'.join(sch[-1][:8]) if sch else '')
    print('exact false on reminders',await pg.evaluate("__calls.filter(c=>c[1]==='schedule').every(c=>c[2].notifications.every(n=>n.isExactNotification===false))"))
    # backup now -> writeFile to Documents + share
    await pg.evaluate("__calls.length=0;S.view='data';render()");await pg.click('[data-action=backup-now] >> nth=0');await pg.wait_for_timeout(400)
    print('backup calls',await pg.evaluate("__calls.map(c=>c[0]+'.'+c[1]+' '+(c[2]&&(c[2].path||c[2].directory||c[2].title)||''))"),'toast',await pg.inner_text('#toast'),'marked',await pg.evaluate("daysSince(lastBackup())"))
    # notifications card visible
    print('notif card',await pg.locator('text=Notifications').count(),'test btn',await pg.locator('[data-action=n-test]').count())
    # focus timer -> schedule focus
    await pg.evaluate("__calls.length=0;ftStart(S.tasks.find(t=>!t.done).id,'focus')");await pg.wait_for_timeout(300)
    print('focus schedule',await pg.evaluate("__calls.filter(c=>c[1]==='schedule').map(c=>c[2].notifications[0].title)"))
    await pg.evaluate("ftStop()");await pg.wait_for_timeout(200)
    # back button: dialog close, then view->dash, then exitApp
    await pg.evaluate("S.view='tasks';render();openLevels()");await pg.wait_for_timeout(200)
    await pg.evaluate("__listeners['App:backButton'][0]()");op=await pg.evaluate("dlg.open")
    await pg.evaluate("__listeners['App:backButton'][0]()");v=await pg.evaluate("S.view")
    await pg.evaluate("__calls.length=0;__listeners['App:backButton'][0]()");ex=await pg.evaluate("__calls.some(c=>c[1]==='exitApp')")
    print('back: dialog open after',op,'view',v,'exit',ex)
    # share friends: send uses Share plugin
    await pg.evaluate("__calls.length=0;openShare()");await pg.wait_for_timeout(200)
    has=await pg.locator('[data-sh=send]').count();print('share button',has)
    # theme -> bars
    await pg.evaluate("__calls.length=0;setTheme('dark')");print('bars',await pg.evaluate("__calls.filter(c=>c[0]==='SystemBars').map(c=>c[2].style)"))
    await pg.evaluate("setTheme('light')");print('bars',await pg.evaluate("__calls.filter(c=>c[0]==='SystemBars').map(c=>c[2].style)"))
    await pg.evaluate("dlg.close();S.cfg.lang='ar';saveCfg();applyLang();S.view='data';render()");await pg.wait_for_timeout(200)
    import re as _re
    print('ar latin',[x for x in await latin(pg) if _re.search(r'[A-Za-z]{2,}',_re.sub(r'\b(GoalTerra|JSON|OLED|IndexedDB|Language)\b','',x))],'ov',await overflow(pg))
    print('errors',errs);await b.close()
asyncio.run(m())
