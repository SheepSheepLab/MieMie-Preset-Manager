// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Real production UI, synthetic preview transport; not Safari/ST acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=process.env.PREVIEW_LAYER_OUT||path.join(root,'evidence/migration-preview-layer');
fs.mkdirSync(out,{recursive:true});const checks=[],errors=[],geometry=[];
const settle=locator=>locator.evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
const snapshot=page=>page.evaluate(()=>JSON.stringify({raw:__MieMieBindingDemo.controller.state.snapshot.raw,pending:__MieMieBindingDemo.controller.state.pendingRaw,dirty:__MieMieBindingDemo.controller.state.dirty,selected:__MieMieBindingDemo.controller.migration.state.selectedIds}));
async function setup(browser,width,reducedMotion='no-preference'){
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'delivery/preview.html')).href+'?binding=1');await page.waitForFunction(()=>__MieMieBindingDemo.binding.state.status==='ready');
 await page.evaluate(async()=>{const c=__MieMieBindingDemo.controller;await c.toggle('demo-1');await c.migration.open();await c.migration.load('轻量 · 示例预设');});
 const parent=page.locator('.mm-migration-dialog:not(.mm-migration-child):not(.mm-migration-preview)'),preview=page.locator('.mm-migration-preview');await settle(parent);
 return {page,parent,preview};
}
async function bounds(parent,preview,side){
 const p=await parent.boundingBox(),c=await preview.boundingBox(),stacked=await parent.getAttribute('data-stacked')==='true',region=p.width/(stacked?1:2);
 assert(Math.abs(c.width/region-.95)<.0001);assert(Math.abs(c.height/p.height-.95)<.0001);
 const center=p.x+region/2+(!stacked&&side==='target'?region:0);
 assert(Math.abs(c.x+c.width/2-center)<1&&Math.abs(c.y+c.height/2-p.y-p.height/2)<1);
 assert(c.x>p.x&&c.y>p.y&&c.x+c.width<p.x+p.width&&c.y+c.height<p.y+p.height);
 assert(await parent.evaluate(e=>e.inert&&getComputedStyle(e).filter==='blur(3px)'));
 assert(await preview.evaluate(e=>getComputedStyle(e).outlineStyle==='none'&&e.scrollWidth<=e.clientWidth));
 assert(await preview.getByRole('button',{name:'返回迁移'}).evaluate(e=>{const r=e.getBoundingClientRect(),d=e.closest('dialog').getBoundingClientRect();return r.bottom<=d.bottom&&r.height>=44;}));
 geometry.push({side,stacked,parent:p,preview:c});
}
async function motion(preview,opening){
 const m=await preview.evaluate(e=>{const shell=e.querySelector('.mm-migration-motion-shell'),a=shell.getAnimations()[0];return {duration:a.effect.getTiming().duration,frames:a.effect.getKeyframes(),origin:getComputedStyle(shell).transformOrigin,box:{w:shell.offsetWidth,h:shell.offsetHeight}};});
 assert.equal(m.duration,opening?260:180);assert.equal(m.frames[0].transform,opening?'scale(0.86)':'scale(1)');assert.equal(m.frames.at(-1).transform,opening?'scale(1)':'scale(0.9)');
 const [x,y]=m.origin.split(' ').map(parseFloat);assert(Math.abs(x-m.box.w/2)<1&&Math.abs(y-m.box.h/2)<1);
}
(async()=>{const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chromium',headless:true});try{
 for(const width of [1280,800,780,390,360]){
  const {page,parent,preview}=await setup(browser,width);const before=await snapshot(page);
  for(const side of ['source','target']){
   const icon=parent.locator(`[aria-label=${side==='source'?'来源条目':'目标条目'}] [data-id=demo-0] .mm-migration-view`);
   await icon.evaluate(e=>e.click());await motion(preview,true);await settle(preview);
   assert(await preview.evaluate(e=>document.activeElement===e));assert.equal(await preview.getByRole('button',{name:'返回迁移'}).evaluate(e=>document.activeElement===e||e.matches(':focus-visible')),false);
   await bounds(parent,preview,side);assert.equal(await preview.getAttribute('data-preview-side'),side);
   assert(await preview.locator('input,textarea').evaluateAll(nodes=>nodes.every(e=>e.readOnly||e.disabled)));assert(await preview.getByRole('combobox').isDisabled());
   await page.mouse.move(0,0);await page.screenshot({path:path.join(out,`preview-${side}-${width}.png`)});
   await preview.getByRole('button',{name:'返回迁移'}).evaluate(e=>e.click());await motion(preview,false);await preview.waitFor({state:'detached'});assert.equal(await parent.evaluate(e=>e.inert||getComputedStyle(e).filter!=='none'),false);assert.equal(await snapshot(page),before);
   checks.push(`${width} ${side}: neutral initial focus, correct 95% region, visible parent, matching center motion, read-only and Pending preserved`);
  }
  const icon=parent.locator('[aria-label=来源条目] [data-id=demo-0] .mm-migration-view');await icon.focus();await icon.press('Enter');await settle(preview);await page.keyboard.press('Tab');assert(await preview.evaluate(e=>e.contains(document.activeElement)&&document.activeElement!==e&&document.activeElement.matches(':focus-visible')));await page.keyboard.press('Escape');await preview.waitFor({state:'detached'});await page.waitForTimeout(50);assert(await icon.evaluate(e=>document.activeElement===e));assert.equal(await snapshot(page),before);checks.push(`${width}: Tab navigation and Escape focus return preserve selection/Dirty/Pending`);
  await icon.click();await settle(preview);const input=preview.locator('textarea');await input.evaluate(e=>{e.focus();e.setSelectionRange(2,6);window.previewInput=e;});
  await page.setViewportSize({width:width<760?1280:390,height:600});await page.waitForTimeout(100);await bounds(parent,preview,'source');assert(await input.evaluate(e=>e===window.previewInput&&document.activeElement===e&&e.selectionStart===2&&e.selectionEnd===6));await page.setViewportSize({width:390,height:450});await page.waitForTimeout(100);await bounds(parent,preview,'source');assert.equal(await snapshot(page),before);checks.push(`${width}: desktop/mobile rotation and short viewport update against current root without losing text selection`);
  await page.evaluate(()=>__MieMieBindingDemo.view.close());await page.waitForFunction(()=>!document.querySelector('.mm-migration-dialog'));assert.equal(await page.locator('.mm-floating-layer:visible').count(),0);assert.equal(await snapshot(page),before);checks.push(`${width}: host close removes preview and parent, retains existing Pending`);await page.close();
 }
 const {page,parent,preview}=await setup(browser,1280);const icon=parent.locator('[aria-label=来源条目] [data-id=demo-0] .mm-migration-view');
 await page.evaluate(()=>{const icon=document.querySelector('[aria-label=来源条目] [data-id=demo-0] .mm-migration-view');for(let i=0;i<8;i++){icon.click();document.querySelector('.mm-migration-preview .mm-migration-footer button').click();}icon.click();});await settle(preview);assert.equal(await preview.count(),1);assert.equal(await parent.evaluate(e=>e.inert),true);await preview.getByRole('button',{name:'返回迁移'}).click();await preview.waitFor({state:'detached'});assert.equal(await parent.evaluate(e=>e.inert),false);checks.push('Rapid preview close/reopen cancels obsolete callbacks without orphan dialog or inert parent');
 // A preview from the duplicate-name target selector must restore that immediate parent only.
 await page.evaluate(async()=>{const c=__MieMieBindingDemo.controller;await c.migration.close(true);c.cancelChanges();const raw=structuredClone(c.state.snapshot.raw);raw.prompts.push({...raw.prompts.find(p=>p.identifier==='demo-0'),identifier:'duplicate-target'});raw.prompt_order[1].order.push({identifier:'duplicate-target',enabled:true});await c.importText('Duplicate target.json',JSON.stringify(raw));await c.migration.open();await c.migration.load('轻量 · 示例预设');c.migration.select('demo-0');c.migration.bridge();});
 const candidates=page.getByRole('dialog',{name:'选择同名目标',exact:true,includeHidden:true});await settle(candidates);await candidates.locator('.mm-migration-view').first().click();await settle(preview);assert.equal(await preview.getAttribute('data-preview-side'),'target');assert.equal(await candidates.evaluate(e=>e.inert),true);await page.keyboard.press('Escape');await preview.waitFor({state:'detached'});assert.equal(await candidates.evaluate(e=>e.inert),false);assert.equal(await parent.evaluate(e=>e.inert),true);await page.keyboard.press('Escape');await candidates.waitFor({state:'detached'});assert.equal(await parent.evaluate(e=>e.inert),false);checks.push('Duplicate target preview restores candidate layer; next Escape restores migration, one layer at a time');
 await icon.click();await page.evaluate(()=>__MieMieBindingDemo.view.dispose());await page.waitForFunction(()=>!document.querySelector('.mm-migration-dialog'));await page.setViewportSize({width:390,height:600});checks.push('Dispose removes preview, animations and owned dialogs; subsequent resize is safe');await page.close();
 const reduced=await setup(browser,390,'reduce');await reduced.parent.locator('[aria-label=来源条目] [data-id=demo-0] .mm-migration-view').click();assert.equal(await reduced.preview.evaluate(e=>e.getAnimations({subtree:true}).length),0);await reduced.preview.getByRole('button',{name:'返回迁移'}).click();assert.equal(await reduced.preview.count(),0);assert.equal(await reduced.parent.evaluate(e=>e.inert),false);checks.push('Reduced motion opens/closes synchronously and restores parent');await reduced.page.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:checks.length,checks,geometry,pageErrors:errors,realHost:false},null,2));console.log(JSON.stringify({passed:checks.length,pageErrors:errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
