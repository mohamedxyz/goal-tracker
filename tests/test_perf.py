import os, asyncio,sys
from helpers import *
BIG=r"""(async()=>{const now=Date.now(),D=864e5,pr=['low','med','high'];S.cfg.rpg=true;S.cfg.student=true;S.cfg.rpgSince=ds(addDays(new Date(),-300));saveCfg();
 const tx=[];for(let i=0;i<5000;i++){const o=Math.floor(i/5000*1095);const dn=i%6!==0;tx.push({id:'t'+i,title:'Task '+i,notes:i%10?'':'note',repeat:'',tag:['','uni','home','work'][i%4],items:i%15?[]:[{text:'a',done:true},{text:'b',done:false}],due:ds(addDays(new Date(),-o+3)),priority:pr[i%3],goalId:null,done:dn,doneAt:dn?now-o*D:null,created:now-(o+2)*D,archived:dn&&o>60})}
 const hs=[];for(let j=0;j<12;j++)hs.push({id:'h'+j,name:'Habit '+j,kind:j%4===3?'avoid':'',mode:'',target:7,group:j%3?'G'+(j%3):'',days:[],created:now-1100*D});
 const logs=[];for(const h of hs)for(let i=0;i<1095;i++){if((i+h.id.length)%3===0)continue;logs.push(h.id+'|'+ds(addDays(new Date(),-i)))}
 const gs=[];for(let i=0;i<300;i++){const hz=['weekly','monthly','annual','five'][i%4];gs.push({id:'g'+i,title:'Goal '+i,horizon:hz,period:currentPeriod(hz),kind:'check',parentId:null,notes:'',created:now,done:i%5===0})}
 const tps=[];for(let i=0;i<300;i++)tps.push({id:'tp'+i,subject:'Sub '+(i%10),name:'Topic '+i,sessions:[...Array(20)].map((_,k)=>({d:ds(addDays(new Date(),-k*5-(i%5))),c:1+(k%3)})),created:now-200*D});
 const exs=[];for(let i=0;i<100;i++)exs.push({id:'e'+i,kind:i%2?'quiz':'exam',title:'Exam '+i,subject:'Sub '+(i%10),date:ds(addDays(new Date(),i-50)),time:'',notes:'',score:i<50?60+i%40:null,max:i<50?100:null,created:now});
 await DB.clear('tasks');for(const t of tx)await DB.put('tasks',t);for(const h of hs)await DB.put('habits',h);for(const g of gs)await DB.put('goals',g);for(const t of tps)await DB.put('topics',t);for(const e of exs)await DB.put('exams',e);
 for(const id of logs){const i=id.lastIndexOf('|');await DB.put('logs',{id,habitId:id.slice(0,i),date:id.slice(i+1)})}
 return [tx.length,logs.length]})()"""
async def m():
  async with async_playwright() as p:
    b,pg,errs=await page(p)
    print('seeded',await pg.evaluate(BIG))
    t0=await pg.evaluate("performance.now()");await pg.reload();await pg.wait_for_function("S.booted");t1=await pg.evaluate("performance.now()")
    print('load+first render ms (page time)',round(t1))
    res={}
    for v in ['dash','tasks','goals','habits','study','data','bestiary']:
      ms=await pg.evaluate(f"(()=>{{S.view='{v}';const a=performance.now();render();const b=performance.now();render();const c=performance.now();return [Math.round(b-a),Math.round(c-b)]}})()")
      res[v]=ms
    print('render ms [first,second]',res)
    ms=await pg.evaluate("(()=>{S.view='tasks';S.tcalOn=true;const a=performance.now();render();return Math.round(performance.now()-a)})()");print('calendar',ms)
    for name,js in [('levels','openLevels()'),('report','rep_.off=0;drawReport();dlg.showModal()'),('month','mrev.off=0;drawMonth();dlg.showModal()')]:
      ms=await pg.evaluate(f"(()=>{{try{{dlg.close()}}catch(e){{}};const a=performance.now();{js};return Math.round(performance.now()-a)}})()");print(name,ms)
    ms=await pg.evaluate("(async()=>{S.view='dash';render();const a=performance.now();await actions['toggle-task']({dataset:{id:'t0'}});render();return Math.round(performance.now()-a)})()");print('tick task + render',ms)
    print('errors',errs);await b.close()
asyncio.run(m())
