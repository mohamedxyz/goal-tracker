(async()=>{const now=Date.now();const P=h=>currentPeriod(h);
 const mk=async(o)=>{const g={id:uid(),title:o.t,horizon:o.h,period:P(o.h),kind:o.k||'check',parentId:o.p||null,notes:'',created:now,done:false,value:o.v||0,target:o.tg||0,unit:o.u||'',expected:o.e||0};S.goals.push(g);await DB.put('goals',g);return g};
 const f=await mk({t:'Become a full-stack developer',h:'five',k:'rollup'});
 const a=await mk({t:'Ship 3 real projects',h:'annual',k:'rollup',p:f.id});
 const a2=await mk({t:'Read 24 books',h:'annual',k:'number',tg:24,v:9,u:'books',p:f.id});
 const m=await mk({t:'Finish GoalTerra v1',h:'monthly',k:'rollup',p:a.id});
 const m2=await mk({t:'Learn React basics',h:'monthly',k:'rollup',p:a.id});
 const w=await mk({t:'Polish Goals tab',h:'weekly',p:m.id});
 const w2=await mk({t:'Finish React course module 4',h:'weekly',p:m2.id});
 const w3=await mk({t:'Study 10 hours',h:'weekly',k:'number',tg:10,v:4,u:'hours',p:m2.id});
 for(const [g,ts] of [[w,['Redesign ladder rows','Test on phone','Write changelog']],[w2,['Watch lessons 1-3','Build todo exercise']]])for(const [i,t] of ts.entries()){const x={id:uid(),title:t,notes:'',repeat:'',tag:'',items:[],due:ds(addDays(new Date(),i)),priority:'med',goalId:g.id,done:i===0,doneAt:i===0?now:null,created:now-864e5};S.tasks.push(x);await DB.put('tasks',x)}
 S.view='goals';render()})()
