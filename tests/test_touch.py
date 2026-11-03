# Touch-target and legibility audit at 390x844: Today, Tasks, Habits, Goals, Settings in light, dark and Arabic (dev only).
import asyncio,re,os
from playwright.async_api import async_playwright
from helpers import *
DEMO=re.search(r'DEMO=r"""(.*?)"""',open(os.path.join(HERE,'screenshots.py'),encoding='utf-8').read(),re.S).group(1)
FLOOR=44
APP='#app *,header *,#tabbar *,#fab'
AUDIT=r"""([floor,roots])=>{
 const vis=e=>{const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return false;const cs=getComputedStyle(e);
  if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)return false;
  if(e.closest('[hidden],[inert],details:not([open]) > :not(summary)'))return false;
  if(cs.clip!=='auto'&&/rect\(0/.test(cs.clip))return false;
  if(cs.position==='absolute'&&r.width<=1)return false;
  return true};
 const sel='button,a[href],input:not([type=hidden]),select,textarea,summary,[data-action],[role=button],[role=checkbox]';
 const bad=[];const seen=new Set();
 document.querySelectorAll(roots).forEach(e=>{
  if(!e.matches(sel)||!vis(e))return;
  if(e.closest('#nav')&&getComputedStyle(document.querySelector('#nav')).display==='none')return;
  const r=e.getBoundingClientRect();
  // a control may be hit through its label or a wrapping tap row
  let w=r.width,h=r.height;
  const lab=e.closest('label');if(lab&&lab!==e){const lr=lab.getBoundingClientRect();w=Math.max(w,lr.width);h=Math.max(h,lr.height)}
  if(w<floor-0.5||h<floor-0.5){const k=e.tagName+'.'+(e.className&&e.className.baseVal===undefined?e.className:'')+'|'+(e.getAttribute('data-action')||'');
   if(!seen.has(k)){seen.add(k);bad.push(k+' '+Math.round(w)+'x'+Math.round(h)+' "'+(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,18)+'"')}}});
 const small=[];const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;const sseen=new Set();
 while(n=tw.nextNode()){const p=n.parentElement;if(!p||!n.nodeValue.trim()||p.closest('script,style,[hidden],dialog:not([open])'))continue;
  const r=p.getBoundingClientRect();if(r.width<1||r.height<1)continue;const cs=getComputedStyle(p);if(cs.visibility==='hidden'||cs.display==='none')continue;
  if(p.closest('details:not([open]) > :not(summary)'))continue;
  const fs=parseFloat(cs.fontSize);if(fs<12-0.01){const k=p.tagName+'.'+p.className+' '+fs;if(!sseen.has(k)){sseen.add(k);small.push(k+' "'+n.nodeValue.trim().slice(0,14)+'"')}}}
 const last=document.querySelector('#app').lastElementChild;let pad=getComputedStyle(document.querySelector('main')).paddingBottom;
 const fab=document.querySelector('#fab');
 return {bad,small,ov:document.documentElement.scrollWidth>innerWidth+1,pad:parseFloat(pad),fab:!!fab&&fab.getBoundingClientRect().width>0}}"""
async def m():
  async with async_playwright() as p:
    fails=0
    for sc,ar in [('light',0),('dark',0),('light',1)]:
      b,pg,errs=await page(p,sc,legacy=True)
      await pg.evaluate(DEMO);await pg.wait_for_timeout(400)
      if ar:await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()")
      tag=sc+('-ar' if ar else '')
      for v in ['dash','tasks','habits','goals','data']:
        ar_=ar
        await pg.evaluate(f"S.view='{v}';S.tcalOn=false;render();scrollTo(0,0)");await pg.wait_for_timeout(350)
        r=await pg.evaluate(AUDIT,[FLOOR,APP])
        await pg.evaluate("document.querySelectorAll('details.moremenu').forEach(d=>d.open=true)")
        r2=await pg.evaluate(AUDIT,[FLOOR,APP])
        await pg.evaluate("document.querySelectorAll('details.moremenu').forEach(d=>d.open=false)")
        r['bad']+=[x for x in r2['bad'] if x not in r['bad']];r['small']+=[x for x in r2['small'] if x not in r['small']]
        # bottom clearance: scroll to the end, the FAB must not overlap the last row's controls
        await pg.evaluate("scrollTo(0,document.documentElement.scrollHeight)");await pg.wait_for_timeout(200)
        cover=await pg.evaluate(r"""()=>{const f=document.querySelector('#fab');if(!f||!f.getBoundingClientRect().width)return 0;const fr=f.getBoundingClientRect();let c=0;
          document.querySelectorAll('#app button,#app input,#app [data-action],#app a').forEach(e=>{const r=e.getBoundingClientRect();if(r.width<1||e.closest('[hidden],details:not([open]) > :not(summary)'))return;
           if(r.left<fr.right&&r.right>fr.left&&r.top<fr.bottom&&r.bottom>fr.top)c++});return c}""")
        fab=await pg.evaluate("(()=>{const f=document.querySelector('#fab');if(!f)return null;const r=f.getBoundingClientRect();return {w:r.width,h:r.height,right:r.right>innerWidth/2}})()")
        if v=='data':
          if fab and fab['w']>0:r['bad'].append('FAB shown on Settings')
        else:
          ok=fab and fab['w']>=48 and fab['h']>=48 and fab['right']==(not ar_)
          if not ok:r['bad'].append('FAB missing, <48px or on the wrong side (%s)'%fab)
          if r['pad']<120:r['bad'].append('page bottom padding %s too small for the FAB'%r['pad'])
        line=f"[{tag} {v}] offenders {len(r['bad'])} small {len(r['small'])} ov {r['ov']} fab-cover {cover}"
        print(line)
        if r['bad'] or r['small'] or r['ov'] or cover:
          fails+=1;print('  FAIL touch',r['bad'][:25],r['small'][:6])
      # sheets and menus: add sheet (3 kinds), task menu, habit menu, in-app confirm
      await pg.evaluate("S.view='tasks';render();scrollTo(0,0)")
      for name,js in [('add task',"openAddSheet('task')"),('add habit',"openAddSheet('habit')"),('add goal',"openAddSheet('goal')"),
                      ('task menu',"actions['task-menu']({dataset:{id:S.tasks.find(t=>!t.done).id}})"),('habit menu',"habitMenu(S.habits[0].id)"),('goal menu',"goalMenu(S.goals[0].id)"),
                      ('edit task',"openEdit('task',S.tasks.find(t=>!t.done).id)"),('confirm',"window.__noAuto=true;void askConfirm('Sure?')")]:
        await pg.evaluate("try{dlg.close();document.getElementById('askDlg').close()}catch(e){}")
        await pg.evaluate(js);await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelectorAll('#editDlg details').forEach(d=>d.open=true)")
        r=await pg.evaluate(AUDIT,[FLOOR,'#editDlg *,#askDlg *'])
        # a sheet hugs the bottom edge and never leaves the screen
        box=await pg.evaluate("(()=>{const d=document.querySelector('dialog[open]');const r=d.getBoundingClientRect();return [Math.round(r.bottom),r.left>=0&&r.right<=innerWidth,innerHeight]})()")
        bad=list(r['bad'])
        if box[0]!=box[2] or not box[1]:bad.append('sheet not anchored at the bottom %s'%box)
        print(f"[{tag} sheet: {name}] offenders {len(bad)} small {len(r['small'])}")
        if bad or r['small']:fails+=1;print('  FAIL touch',bad[:20],r['small'][:6])
      await pg.evaluate("try{dlg.close();document.getElementById('askDlg').close()}catch(e){}")
      print(tag,'errors',errs);await b.close()
    print('COUNT',fails)
asyncio.run(m())
