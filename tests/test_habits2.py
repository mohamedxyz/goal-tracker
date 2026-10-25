# Atomic-Habits release: never miss twice, half-ticks, stick fields, hints, ring, milestones, backup round trip.
import asyncio
from playwright.async_api import async_playwright
from helpers import *
def chk(name,ok):print(name,'ok' if ok else 'FAIL')
SETUP="""(async()=>{
 window.__mkh=async(o)=>{const h={id:uid(),name:o.name||'قراءة',kind:'',target:7,group:'',days:[],created:Date.now()-60*864e5,...o};S.habits.push(h);await DB.put('habits',h);return h};
 window.__log=async(h,off,mini)=>{const k=ds(addDays(new Date(),-off)),id=h.id+'|'+k;S.logs.add(id);if(mini)S.mini.add(id);await DB.put('logs',{id,habitId:h.id,date:k,...(mini?{mini:true}:{})})};
 window.__clr=async()=>{for(const h of [...S.habits])await DB.del('habits',h.id);for(const k of [...S.logs])await DB.del('logs',k);S.habits=[];S.logs=new Set();S.mini=new Set()};
})()"""
async def main():
  async with async_playwright() as p:
    for scheme,lang in [('light','en'),('dark','en'),('light','ar')]:
      b,pg,errs=await page(p,scheme);tag=f'{scheme} {lang}'
      await pg.evaluate("localStorage.setItem('gt-tips',JSON.stringify(['levels','game','quickadd','ladder','habits','study']))")
      if lang=='ar':await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang()")
      await pg.evaluate(SETUP)
      # streak rules: done days 6,5,4 ago, miss 3, done 2,1 ago -> one miss forgiven
      await pg.evaluate("(async()=>{const h=await __mkh({});window.__h=h;for(const o of [1,2,4,5,6])await __log(h,o)})()")
      s=await pg.evaluate("streak(__h)");chk(tag+' one miss forgiven '+str(s),s==5)
      await pg.evaluate("(async()=>{await __clr();const h=await __mkh({});window.__h=h;for(const o of [1,4,5,6])await __log(h,o)})()")
      s=await pg.evaluate("streak(__h)");chk(tag+' two misses break '+str(s),s==1)
      await pg.evaluate("(async()=>{await __clr();const h=await __mkh({});window.__h=h;for(const o of [0,1,2,3,5,6,7,8,9,10])await __log(h,o)})()")
      r=await pg.evaluate("[streak(__h),bestStreak(__h)]");chk(tag+' streak/best '+str(r),r[0]==10 and r[1]==10)
      # half tick counts
      await pg.evaluate("(async()=>{await __clr();const h=await __mkh({mini:'one page',ident:'a reader',at:'07:30',where:'bed',treat:'tea',env:'book on pillow'});window.__h=h;await __log(h,1);await __log(h,2);await __log(h,3);S.view='dash';render()})()")
      chk(tag+' mini chip shown',await pg.locator('[data-action=log-mini]').count()>=1)
      await pg.click('[data-action=log-mini] >> nth=0');await pg.wait_for_timeout(400)
      r=await pg.evaluate("[S.logs.has(__h.id+'|'+TODAY()),isMini(__h.id,TODAY()),streak(__h)]");chk(tag+' half tick counts '+str(r),r==[True,True,4])
      chk(tag+' ring shown',await pg.locator('.hring').count()==1)
      chk(tag+' perfect day text',await pg.evaluate("document.querySelector('.hring .title').textContent.length>0 && document.querySelector('.hring').classList.contains('full')"))
      # hints
      await pg.evaluate("S.view='habits';render()")
      t=await pg.inner_text('#app')
      chk(tag+' identity votes shown',('a reader' in t) and ('4' in t))
      if lang=='ar':chk(tag+' habits latin '+str(await latin(pg)),await latin(pg)==[])
      # full tick overrides mini; untick removes
      await pg.evaluate("toggleLog(__h.id,TODAY())");await pg.wait_for_timeout(200)
      chk(tag+' untick mini',await pg.evaluate("!S.logs.has(__h.id+'|'+TODAY())"))
      await pg.evaluate("toggleLog(__h.id,TODAY())");await pg.wait_for_timeout(200)
      chk(tag+' full tick not mini',await pg.evaluate("S.logs.has(__h.id+'|'+TODAY()) && !isMini(__h.id,TODAY())"))
      # missed yesterday message
      await pg.evaluate("(async()=>{await __clr();const h=await __mkh({});window.__h=h;await __log(h,2);await __log(h,3);S.view='dash';render()})()")
      chk(tag+' missed-yesterday nudge',await pg.locator('.hint.miss').count()==1)
      # stacking order
      await pg.evaluate("(async()=>{await __clr();const a=await __mkh({name:'Coffee'});const c=await __mkh({name:'Third'});const d=await __mkh({name:'Stacked',after:a.id});S.view='habits';render()})()")
      names=await pg.evaluate("[...document.querySelectorAll('#app .goals .card .title')].map(e=>e.textContent.trim().replace(' ›',''))")
      chk(tag+' stacked under anchor '+str(names),names[:3]==['Coffee','Stacked','Third'])
      # milestone toast once
      await pg.evaluate("(async()=>{await __clr();S.cfg.mile='';const h=await __mkh({ident:'a reader'});window.__h=h;await __log(h,1);await __log(h,2);S.view='dash';render()})()")
      await pg.evaluate("toggleLog(__h.id,TODAY())");await pg.wait_for_timeout(300)
      chk(tag+' milestone toast',await pg.evaluate("document.querySelector('#toast').textContent.includes('3')") and await pg.evaluate("S.cfg.mile.includes(__h.id+':3')"))
      # form save of stick fields
      await pg.evaluate("openEdit('habit',__h.id)")
      await pg.fill('#editDlg [name=ident]','a runner');await pg.fill('#editDlg [name=mini]','put shoes on');await pg.fill('#editDlg [name=afterTxt]','morning coffee')
      await pg.evaluate("document.querySelector('#editDlg form').requestSubmit()");await pg.wait_for_timeout(300)
      r=await pg.evaluate("[__h.ident,__h.mini,__h.after]");chk(tag+' stick fields saved '+str(r),r==['a runner','put shoes on','morning coffee'])
      # backup round trip keeps mini
      await pg.evaluate("(async()=>{await __log(__h,5,true)})()")
      r=await pg.evaluate("(()=>{const d=backupData();return d.logs.filter(x=>x.mini).length})()");chk(tag+' backup has mini '+str(r),r==1)
      await pg.evaluate("(async()=>{window.__bk=JSON.stringify(backupData())})()")
      await pg.evaluate("window.__noAuto=false")
      await pg.evaluate("(()=>{window.__rp=restore(__bk,'test',true)})()");await pg.wait_for_timeout(800)
      r=await pg.evaluate("[S.mini.size,S.habits[0].mini]");chk(tag+' restore keeps mini '+str(r),r[0]==1 and r[1]=='put shoes on')
      # info sheet + easier card
      await pg.evaluate("openInfo('habits')");chk(tag+' info sheet',await pg.evaluate("document.getElementById('editDlg').open"))
      if lang=='ar':chk(tag+' info latin '+str(await latin(pg)),await latin(pg)==[])
      await pg.evaluate("document.getElementById('editDlg').close()")
      await pg.evaluate("(async()=>{await __clr();const h=await __mkh({name:'Hard one'});await __log(h,3);S.view='habits';render()})()")
      chk(tag+' easier card',await pg.locator('[data-action=easier]').count()==1)
      await pg.screenshot(path=f'{SHOTS}/habits2-{scheme}-{lang}.png')
      print(tag,'ov',await overflow(pg),'errors',errs)
      await b.close()
asyncio.run(main())
