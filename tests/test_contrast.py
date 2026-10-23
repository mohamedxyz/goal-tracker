import os, asyncio,sys
from helpers import *
PAIRS=[('text','bg'),('text','card'),('muted','card'),('muted','bg'),('on-accent','accent'),('accent','card'),('accent','soft'),('on-ok','ok'),('banner-text','banner-bg')]
JS=r"""(pairs)=>{const cs=getComputedStyle(document.documentElement);const v=n=>cs.getPropertyValue('--'+n).trim();
 const rgb=h=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle=h;const x=c.fillStyle;if(x[0]==='#'){return [1,3,5].map(i=>parseInt(x.slice(i,i+2),16))}const m=x.match(/\d+(\.\d+)?/g).map(Number);return m.slice(0,3)};
 const L=c=>{const a=rgb(c).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
 const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 return pairs.map(([f,b])=>[f+'/'+b,Math.round(cr(v(f),v(b))*100)/100,v(f),v(b)])}"""
async def m():
  async with async_playwright() as p:
    b,pg,errs=await page(p)
    fails=[]
    for pal in ['clay','terra','ocean','grape','rose','graphite']:
      for th in ['light','dark','black']:
        await pg.evaluate(f"setPalette('{pal}');setTheme('{th}')")
        for name,r,f,bk in await pg.evaluate(JS,PAIRS):
          if r<4.5:fails.append((pal,th,name,r,f,bk))
    for x in fails:print('FAIL',x)
    print('fails',len(fails));await b.close()
asyncio.run(m())
