import os, asyncio,sys,json,os
from helpers import *
async def m():
  async with async_playwright() as p:
    for sc in ['light','dark']:
      b,pg,errs=await page(p,sc)
      await pg.evaluate(SEED_AR);await pg.wait_for_timeout(300)
      await pg.evaluate("S.cfg.lang='en';saveCfg();applyLang();S.view='data';render()")
      async with pg.expect_download() as dl:
        await pg.click('[data-action=backup-now] >> nth=0')
      d=await dl.value;path=f'{SHOTS}/bk-{sc}.json';await d.save_as(path)
      data=json.load(open(path));print(sc,'file',d.suggested_filename,'tasks',len(data['tasks']),'appVersion',data.get('appVersion'),'marked',await pg.evaluate("daysSince(lastBackup())"))
      # add more items, then restore older backup -> preview shows warning
      await pg.evaluate("(async()=>{for(let i=0;i<3;i++)await mkTask({t:'extra '+i});render()})()")
      await pg.set_input_files('#importFile',path);await pg.wait_for_timeout(400)
      print(sc,'preview open',await pg.locator('#editDlg[open] table.rp').count(),'less rows',await pg.locator('table.rp tr.less').count(),'warn',await pg.locator('#editDlg .rpg-warn').count())
      await pg.screenshot(path=f'{SHOTS}/restore-{sc}.png')
      before=await pg.evaluate("S.tasks.length")
      await pg.click('[data-rp="0"] >> nth=1');await pg.wait_for_timeout(300)
      print(sc,'cancel keeps',await pg.evaluate("S.tasks.length")==before)
      await pg.set_input_files('#importFile',path);await pg.wait_for_timeout(400)
      await pg.click('[data-rp="1"]');await pg.wait_for_timeout(800)
      print(sc,'restored tasks',await pg.evaluate("S.tasks.length"),'==',len(data['tasks']),'toast',await pg.inner_text('#toast'))
      # escalation
      await pg.evaluate("localStorage.setItem('gt-last-backup',String(Date.now()-40*864e5));localStorage.removeItem('gt-backup-snooze');S.view='dash';render()");await pg.wait_for_timeout(200)
      print(sc,'urgent card',await pg.locator('.backup-cta.urgent').count())
      await pg.evaluate("S.cfg.lang='ar';saveCfg();applyLang();render()");await pg.wait_for_timeout(200)
      print(sc,'ar latin',await latin(pg),'ov',await overflow(pg))
      await pg.set_input_files('#importFile',path);await pg.wait_for_timeout(400);print(sc,'ar preview latin',await latin(pg))
      await pg.screenshot(path=f'{SHOTS}/restore-ar-{sc}.png');await pg.click('[data-rp="0"] >> nth=1')
      print(sc,'errors',errs);await b.close()
asyncio.run(m())
