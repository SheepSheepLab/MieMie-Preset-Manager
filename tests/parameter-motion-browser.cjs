// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Offline production-view checks; never native Safari/SillyTavern acceptance.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'evidence', 'parameter-motion');
fs.mkdirSync(out, { recursive: true });
const checks = [], errors = [];
async function freeze(page, kind, time) {
  await page.waitForFunction(kind => document.querySelector('.mm-modal-layer[data-parameter-motion]')?.dataset.parameterMotion === kind, kind);
  return page.evaluate(time => {
    const layer = document.querySelector('.mm-modal-layer[data-parameter-motion]');
    for (const a of layer.getAnimations({ subtree: true })) { a.pause(); a.currentTime = time; }
    const shell = layer.querySelector('.mm-parameter-morph-shell'), dialog = layer.querySelector('.mm-parameters-dialog');
    const rect = e => { const r = e.getBoundingClientRect(); return { left:r.left,top:r.top,width:r.width,height:r.height }; };
    return { shell:shell && rect(shell), dialog:rect(dialog), inert:dialog.inert, focusInLayer:layer.contains(document.activeElement), shellBackground:shell && getComputedStyle(shell).backgroundColor, ghosts:layer.querySelectorAll('[aria-hidden=true]').length };
  }, time);
}
async function finish(page) {
  await page.evaluate(() => document.querySelector('.mm-modal-layer[data-parameter-motion]')?.getAnimations({ subtree:true }).forEach(a => a.finish()));
  await page.waitForFunction(() => !document.querySelector('[data-parameter-motion]'));
  assert.equal(await page.locator('.mm-parameter-morph-shell,.mm-parameter-morph-label,.mm-parameter-morph-veil').count(),0);
}
async function captureMotion(page, kind, duration) {
  const folder=path.join(out,'frames');fs.mkdirSync(folder,{recursive:true});
  for(let i=0;i<12;i++) {
    await page.evaluate(time=>document.querySelector('[data-parameter-motion]').getAnimations({subtree:true}).forEach(a=>{a.currentTime=time;}),duration*i/12);
    await page.screenshot({path:path.join(folder,`${kind}-${String(i).padStart(2,'0')}.png`)});
  }
}
async function launchPage(browser, width) {
  const page = await browser.newPage({ viewport:{width,height:844} });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root,'delivery','preview.html')).href+'?binding=1');
  await page.waitForFunction(() => window.__MieMieBindingDemo.binding.state.status === 'ready');
  return page;
}
(async () => {
  const browser = await chromium.launch({ channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true });
  try {
    for (const width of [1280,390]) {
      const page = await launchPage(browser,width), entry = page.getByRole('button',{name:'预设参数设置',exact:true});
      const modal = page.getByRole('dialog',{name:'预设参数设置',exact:true});
      const raw = await page.evaluate(() => structuredClone(window.__MieMieBindingDemo.controller.state.snapshot.raw));
      const entryRect = await entry.boundingBox();
      await entry.click(); const opening = await freeze(page,'opening',180);
      assert(opening.shellBackground.startsWith('rgb('));
      assert(opening.focusInLayer);
      assert(opening.inert && opening.shell.height > entryRect.height && opening.shell.height < opening.dialog.height);
      assert(opening.shell.width >= Math.min(entryRect.width,opening.dialog.width)-1 && opening.shell.width <= Math.max(entryRect.width,opening.dialog.width)+1);
      assert.equal(await page.locator('.mm-parameter-morph-shell input,.mm-parameter-morph-label').count(),0);
      const title=page.locator('.mm-parameters-dialog .mm-dialog-head h3');
      const titleGeometry=()=>title.evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,font:getComputedStyle(e).fontSize,transform:getComputedStyle(e).transform};});
      const titleAtStart=await titleGeometry();await freeze(page,'opening',300);assert.deepEqual(await titleGeometry(),titleAtStart);
      assert.equal(titleAtStart.transform,'none');await freeze(page,'opening',180);
      checks.push(`${width}: no cloned/moving title; dialog heading geometry and font stay unchanged while shell expands`);
      await page.screenshot({path:path.join(out,`expand-mid-${width}.png`)});if(width===390)await captureMotion(page,'opening',360);await finish(page);if(width===390)await page.screenshot({path:path.join(out,'frames','opened.png')});
      assert(await modal.isVisible());assert(await modal.evaluate(e=>!e.inert&&getComputedStyle(e).opacity==='1'));
      checks.push(`${width}: entry shell expands into dialog; form dimensions stay fixed; opening settles and removes ghosts`);

      await modal.getByLabel('温度',{exact:true}).fill('1.2');
      await modal.getByRole('button',{name:'取消',exact:true}).click(); const cancelling=await freeze(page,'closing',140);
      assert(cancelling.focusInLayer);
      assert(cancelling.inert&&cancelling.shell.height>entryRect.height&&cancelling.shell.height<cancelling.dialog.height);
      await page.screenshot({path:path.join(out,`cancel-mid-${width}.png`)});if(width===390)await captureMotion(page,'closing',280);
      await page.keyboard.press('Escape');assert(await page.locator('.miemie-pm').isVisible());
      await finish(page);await modal.waitFor({state:'hidden'});if(width===390)await page.screenshot({path:path.join(out,'frames','closed.png')});
      assert(await entry.evaluate(e=>document.activeElement===e&&getComputedStyle(e).visibility==='visible'));
      assert.deepEqual(await page.evaluate(()=>window.__MieMieBindingDemo.controller.state.snapshot.raw),raw);
      assert.equal(await page.evaluate(()=>window.__MieMieBindingDemo.controller.state.dirty),false);
      checks.push(`${width}: Cancel retracts to entry, restores focus, changes no data and repeated Escape cannot close manager`);

      await entry.click();await freeze(page,'opening',150);await finish(page);
      await modal.getByLabel('温度',{exact:true}).fill('1.3');await modal.getByRole('button',{name:'保存',exact:true}).click();
      const saving=await freeze(page,'closing',100);assert(saving.inert);
      assert.deepEqual(await page.evaluate(()=>window.__MieMieBindingDemo.controller.state.snapshot.raw),raw);
      assert.equal(await page.evaluate(()=>window.__MieMieBindingDemo.controller.state.pendingRaw.temperature),1.3);
      await finish(page);await modal.waitFor({state:'hidden'});
      checks.push(`${width}: Save retracts only after staging succeeds; native raw unchanged until global Save`);
      await page.evaluate(()=>window.__MieMieBindingDemo.controller.cancelChanges());

      await entry.click();await freeze(page,'opening',180);await finish(page);
      await modal.getByLabel('温度',{exact:true}).fill('3');await modal.getByRole('button',{name:'保存',exact:true}).click();
      assert(await modal.isVisible());assert.equal(await page.locator('[data-parameter-motion]').count(),0);
      assert(await page.evaluate(()=>!!window.__MieMieBindingDemo.controller.state.parametersDraft));
      await modal.getByLabel('温度',{exact:true}).fill('0.8');await modal.getByRole('button',{name:'取消',exact:true}).click();await freeze(page,'closing',140);await finish(page);
      checks.push(`${width}: invalid input stays in dialog and never starts a closing morph`);

      await entry.click();const interrupted=await freeze(page,'opening',130);
      await page.keyboard.press('Escape');const reverse=await freeze(page,'closing',0);
      assert(Math.abs(reverse.shell.height-interrupted.shell.height)<2);
      await page.keyboard.press('Escape');await finish(page);assert(await page.locator('.miemie-pm').isVisible());
      for(let i=0;i<3;i++){await entry.click();await freeze(page,'opening',120);await finish(page);await modal.getByRole('button',{name:'取消',exact:true}).click();await freeze(page,'closing',120);await finish(page);}
      assert.equal(await page.locator('.mm-parameters-dialog').count(),0);
      checks.push(`${width}: Escape reverses an interrupted expansion without jumping; repeated cycles leave one instance and no overlays`);

      await entry.click();await freeze(page,'opening',150);await page.setViewportSize({width,height:700});
      await page.waitForFunction(()=>!document.querySelector('[data-parameter-motion]'));
      assert(await modal.evaluate(e=>!e.inert&&e.scrollWidth<=e.clientWidth));
      await modal.getByRole('button',{name:'取消',exact:true}).click();await freeze(page,'closing',100);await page.setViewportSize({width,height:844});
      await modal.waitFor({state:'hidden'});assert.equal(await page.locator('.mm-parameter-morph-shell').count(),0);
      checks.push(`${width}: resize during open/close cancels stale geometry and settles correct visible/hidden endpoint`);

      await entry.click();await freeze(page,'opening',150);
      await page.evaluate(()=>window.__MieMieBindingDemo.view.setPresentation('hub'));
      await page.waitForFunction(()=>!document.querySelector('[data-parameter-motion]'));
      assert(await modal.isVisible());assert(await page.evaluate(()=>!!window.__MieMieBindingDemo.controller.state.parametersDraft));
      assert.equal(await page.locator('.mm-parameter-morph-shell').count(),0);
      await page.evaluate(()=>window.__MieMieBindingDemo.view.setPresentation('local'));
      await modal.getByRole('button',{name:'取消',exact:true}).click();await freeze(page,'closing',100);await finish(page);
      checks.push(`${width}: presentation handoff cancels motion, keeps the same dialog/draft and leaves no ghosts`);

      await entry.click();await freeze(page,'opening',150);await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>!document.querySelector('[data-parameter-motion]'));
      assert(await modal.evaluate(e=>!e.inert));await modal.getByRole('button',{name:'取消',exact:true}).click();await modal.waitFor({state:'hidden'});
      checks.push(`${width}: enabling reduced motion mid-expansion settles immediately without stale animations`);
      await entry.click();
      await page.waitForFunction(()=>document.querySelector('.mm-parameters-dialog')&&!document.querySelector('[data-parameter-motion]'));
      assert(await modal.evaluate(e=>!e.inert));await modal.getByRole('button',{name:'取消',exact:true}).click();await modal.waitFor({state:'hidden'});
      assert.equal(await page.locator('.mm-parameter-morph-shell').count(),0);
      checks.push(`${width}: reduced motion skips morph and preserves opening/cancel semantics`);
      await page.emulateMedia({reducedMotion:'no-preference'});

      await entry.click();await freeze(page,'opening',180);await finish(page);
      const listPosition=await page.locator('.mm-scroll').evaluate(e=>{e.scrollTop=400;return e.scrollTop;});
      await modal.getByRole('button',{name:'取消',exact:true}).click();const fallback=await freeze(page,'closing',100);assert.equal(fallback.shell,null);await finish(page);
      assert.equal(await page.locator('.mm-scroll').evaluate(e=>e.scrollTop),listPosition);
      checks.push(`${width}: off-screen origin uses a fade; background list does not jump to force a destination`);
      await entry.click();await freeze(page,'opening',180);await finish(page);
      await entry.evaluate(e=>e.remove());
      await modal.getByRole('button',{name:'取消',exact:true}).click();const detached=await freeze(page,'closing',100);
      assert.equal(detached.shell,null);await finish(page);await modal.waitFor({state:'hidden'});
      checks.push(`${width}: detached source falls back safely and does not leave a hidden/inert modal`);
      await page.close();

      const unsupported=await launchPage(browser,width);
      await unsupported.evaluate(()=>{HTMLElement.prototype.animate=undefined;});
      await unsupported.getByRole('button',{name:'预设参数设置',exact:true}).click();
      const unsupportedDialog=unsupported.getByRole('dialog',{name:'预设参数设置',exact:true});
      assert(await unsupportedDialog.isVisible());assert(await unsupportedDialog.evaluate(e=>!e.inert));
      await unsupportedDialog.getByRole('button',{name:'取消',exact:true}).click();await unsupportedDialog.waitFor({state:'hidden'});
      checks.push(`${width}: missing animation API preserves working open/cancel without a stranded overlay`);await unsupported.close();

      const disposedPage=await launchPage(browser,width);await disposedPage.getByRole('button',{name:'预设参数设置',exact:true}).click();await freeze(disposedPage,'opening',130);
      assert(await disposedPage.evaluate(()=>{const l=document.querySelector('[data-parameter-motion]'),a=l.getAnimations({subtree:true});window.__MieMieBindingDemo.view.dispose();return a.every(x=>x.playState==='idle');}));
      assert.equal(await disposedPage.locator('.miemie-pm,.mm-parameter-morph-shell').count(),0);
      checks.push(`${width}: disposal cancels owned animations and removes surface/ghosts`);await disposedPage.close();
    }
    assert.deepEqual(errors,[]);
    const result={realHost:false,passed:checks.length,pageErrors:errors,checks};
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
