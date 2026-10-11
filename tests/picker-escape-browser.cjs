// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Offline component regression. Safari real-host acceptance is a separate Computer Use run.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {activeMigrationDialog}=require('./helpers/migration-dialog.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.ESCAPE_EVIDENCE||path.join(root,'evidence','picker-escape');
fs.mkdirSync(out,{recursive:true});const checks=[],errors=[];
const state=page=>page.evaluate(()=>{const c=__MieMieBindingDemo.controller,m=c.migration;return structuredClone({left:m.state.leftPrompt,right:m.state.rightPrompt,draft:c.state.migrationDraft,dirty:c.state.dirty,pending:c.state.pendingRaw,saved:c.state.snapshot.raw,source:m.state.source.raw,calls:escapeCalls});});
async function pointerOpen(picker){
  // Safari pointer activation can leave focus on the dialog or preceding text field.
  // Preserve that focus rather than explicitly focusing the combobox as older tests did.
  await picker.evaluate(e=>e.addEventListener('mousedown',e=>e.preventDefault(),{once:true}));
  await picker.click();assert.equal(await picker.getAttribute('aria-expanded'),'true');
}
async function settled(dialog){await dialog.evaluate(async e=>await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));}
(async()=>{const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chromium',headless:true});try{
  for(const width of [1280,390,360]){
    const page=await browser.newPage({viewport:{width,height:844}});page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,entries=[];
      const capture=o=>typeof o==='boolean'?o:!!o?.capture;
      EventTarget.prototype.addEventListener=function(type,fn,options){if(this===document&&['keydown','cancel'].includes(type)&&!entries.some(e=>e.type===type&&e.fn===fn&&e.capture===capture(options)))entries.push({type,fn,capture:capture(options)});return add.call(this,type,fn,options);};
      EventTarget.prototype.removeEventListener=function(type,fn,options){if(this===document){const i=entries.findIndex(e=>e.type===type&&e.fn===fn&&e.capture===capture(options));if(i>=0)entries.splice(i,1);}return remove.call(this,type,fn,options);};
      window.escapeListenerCount=()=>entries.length;
    });
    await page.goto(pathToFileURL(path.join(root,'delivery/preview.html')).href+'?binding=1');await page.waitForFunction(()=>__MieMieBindingDemo.binding.state.status==='ready');
    await page.evaluate(async()=>{
      const c=__MieMieBindingDemo.controller,target=structuredClone(c.state.snapshot.raw),source=structuredClone(target);source.prompts.find(p=>p.identifier==='demo-0').content='SOURCE ESCAPE AUDIT';delete source.prompts.find(p=>p.identifier==='demo-0').future_prompt_option;
      await c.importText('Escape Source.json',JSON.stringify(source));await c.importText('Escape Target.json',JSON.stringify(target));
      window.escapeCalls={back:0,cancelBatch:0,close:0,cancelChanges:0};
      for(const [object,key] of [[c.migration,'back'],[c.migration,'cancelBatch'],[c.migration,'close'],[c,'cancelChanges']]){const original=object[key];object[key]=(...args)=>{escapeCalls[key]++;return original(...args);};}
      window.nativeCancels=0;document.addEventListener('cancel',()=>nativeCancels++,true);
      await c.migration.open();await c.migration.load('Escape Source');c.migration.select('demo-0');c.migration.bridge();
      c.migration.patchLeft({name:'Source draft title',role:'assistant',content:'LEFT UNCONFIRMED BODY',injection_position:1,injection_depth:6,injection_order:8,injection_trigger:['quiet','continue']});
      c.migration.patchRight({name:'Target draft title',role:'user',content:'RIGHT UNCONFIRMED BODY',injection_position:0,injection_depth:9,injection_order:17,injection_trigger:['normal','swipe']});
    });
    const active=activeMigrationDialog(page),child=page.getByRole('dialog',{name:'对比与合并',exact:true});await child.waitFor();await settled(child);
    for(const name of ['来源身份','目标身份']){
      const picker=child.getByRole('combobox',{name,exact:true});await picker.scrollIntoViewIfNeeded();await child.evaluate(e=>e.focus());
      const before=await state(page),listeners=await page.evaluate(()=>escapeListenerCount());await pointerOpen(picker);
      assert(await child.evaluate(e=>document.activeElement===e));await page.keyboard.press('Escape');
      assert.equal(await picker.getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>__MieMieBindingDemo.controller.migration.state.step),'compare');assert(await picker.evaluate(e=>document.activeElement===e));
      assert.deepEqual(await state(page),before);assert.equal(await page.evaluate(()=>nativeCancels),0);assert.equal(await page.evaluate(()=>escapeListenerCount()),listeners);
      checks.push(`${width}: ${name} pointer Escape consumes one layer, prevents native cancel, restores trigger focus and preserves all seven draft fields/Dirty/Pending`);
    }
    for(const side of ['来源','目标']){
      await child.locator('details').nth(side==='来源'?0:1).evaluate(e=>e.open=true);
      const picker=child.getByRole('combobox',{name:side+'插入位置（Position）',exact:true});await picker.scrollIntoViewIfNeeded();await child.evaluate(e=>e.focus());const before=await state(page);await pointerOpen(picker);await page.keyboard.press('Escape');assert(await child.isVisible());assert(await picker.evaluate(e=>document.activeElement===e));assert.deepEqual(await state(page),before);
      checks.push(`${width}: ${side} advanced Position Escape leaves comparison and both edited drafts intact`);
    }
    const role=child.getByRole('combobox',{name:'来源身份',exact:true});await role.scrollIntoViewIfNeeded();await child.evaluate(e=>e.focus());const beforeCancel=await state(page);await pointerOpen(role);
    const consumed=await child.evaluate(e=>!e.dispatchEvent(new Event('cancel',{cancelable:true})));assert(consumed);assert(await child.isVisible());assert.equal(await role.getAttribute('aria-expanded'),'false');assert.deepEqual(await state(page),beforeCancel);
    checks.push(`${width}: native dialog cancel fallback also dismisses only the expanded picker`);
    await role.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');const selected=await page.evaluate(()=>document.activeElement.dataset.value);await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>__MieMieBindingDemo.controller.migration.state.leftPrompt.role),selected);assert.equal(await role.getAttribute('aria-expanded'),'false');assert(await role.evaluate(e=>document.activeElement===e));
    await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');assert.equal(await role.getAttribute('aria-expanded'),'false');assert(await child.isVisible());
    await pointerOpen(role);await child.getByRole('option',{name:'用户',exact:true}).click();assert.equal(await page.evaluate(()=>__MieMieBindingDemo.controller.migration.state.leftPrompt.role),'user');
    checks.push(`${width}: arrows/Enter/Tab and pointer option selection retain normal keyboard semantics`);
    const listeners=await page.evaluate(()=>escapeListenerCount());for(let i=0;i<10;i++){await child.evaluate(e=>e.focus());await pointerOpen(role);await page.keyboard.press('Escape');assert(await child.isVisible());}assert.equal(await page.evaluate(()=>escapeListenerCount()),listeners);assert.equal(await page.locator('.mm-floating-layer:visible').count(),0);
    checks.push(`${width}: ten rapid picker cycles leave no open layers or extra document listeners`);
    await pointerOpen(role);await page.keyboard.down('Escape');await page.keyboard.down('Escape');await page.keyboard.up('Escape');assert(await child.isVisible());assert.equal(await page.evaluate(()=>escapeCalls.back),0);
    checks.push(`${width}: holding Escape does not let repeat keydown discard the next interaction layer`);
    await page.keyboard.press('Escape');await child.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>escapeCalls.back),1);assert.equal(await page.evaluate(()=>__MieMieBindingDemo.controller.migration.state.step),'list');
    checks.push(`${width}: next Escape with no picker performs the original comparison cancellation exactly once`);
    // Source picker has the same priority, even if the modal itself remains focused.
    const main=page.getByRole('dialog',{name:'预设条目迁移',exact:true}),sourcePicker=main.getByRole('combobox',{name:'来源预设（已保存）',exact:true});await settled(main);await main.evaluate(e=>e.focus());await pointerOpen(sourcePicker);await page.keyboard.press('Escape');assert(await main.isVisible());assert.equal(await sourcePicker.getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>escapeCalls.close),0);
    checks.push(`${width}: source preset Escape returns focus without closing migration or manager`);
    await page.evaluate(()=>{const m=__MieMieBindingDemo.controller.migration;m.select('demo-1');m.bridge();m.editItem('demo-0');});await child.waitFor();await settled(child);const batch=page.getByRole('dialog',{name:'批量迁移确认',exact:true});const batchRole=child.getByRole('combobox',{name:'目标身份',exact:true});await batchRole.scrollIntoViewIfNeeded();await child.evaluate(e=>e.focus());await pointerOpen(batchRole);await page.keyboard.press('Escape');assert(await child.isVisible());assert.equal(await page.evaluate(()=>escapeCalls.cancelBatch),0);await page.keyboard.press('Escape');await child.waitFor({state:'detached'});assert(await batch.isVisible());await page.keyboard.press('Escape');await batch.waitFor({state:'detached'});assert(await main.isVisible());assert.equal(await page.evaluate(()=>escapeCalls.cancelBatch),1);
    checks.push(`${width}: nested batch sequence closes picker, comparison, then batch on three separate Escapes`);
    await main.locator('[aria-label=来源条目] [data-id=demo-0] .mm-migration-view').click();const preview=page.getByRole('dialog',{name:'查看条目内容',exact:true});await preview.waitFor();await page.keyboard.press('Escape');await preview.waitFor({state:'detached'});assert(await main.isVisible());
    checks.push(`${width}: readonly preview retains Escape return without discarding the migration session`);
    await main.getByRole('button',{name:'返回预设管理',exact:true}).click();await main.waitFor({state:'detached'});
    await page.locator('.mm-card[data-id=demo-0]').getByRole('button',{name:'编辑条目',exact:true}).click();const editor=page.getByRole('dialog',{name:'编辑条目',exact:true});await editor.locator('textarea').fill('ORDINARY EDITOR ESCAPE DRAFT');const editorRole=editor.getByRole('combobox',{name:'身份',exact:true});const draft=await page.evaluate(()=>structuredClone(__MieMieBindingDemo.controller.state.draft));await pointerOpen(editorRole);await page.keyboard.press('Escape');assert(await editor.isVisible());assert.deepEqual(await page.evaluate(()=>structuredClone(__MieMieBindingDemo.controller.state.draft)),draft);assert(await editorRole.evaluate(e=>document.activeElement===e));await page.keyboard.press('Escape');await editor.waitFor({state:'hidden'});
    checks.push(`${width}: ordinary Prompt editor retains draft on first Escape and cancels on the next`);
    await page.getByRole('button',{name:'预设参数设置',exact:true}).click();const parameters=page.getByRole('dialog',{name:'预设参数设置',exact:true});await settled(parameters);const effort=parameters.getByRole('combobox',{name:'推理强度',exact:true});await effort.scrollIntoViewIfNeeded();await parameters.locator('input').first().focus();const parameterDraft=await page.evaluate(()=>structuredClone(__MieMieBindingDemo.controller.state.parametersDraft));await pointerOpen(effort);await page.keyboard.press('Escape');assert(await parameters.isVisible());assert.deepEqual(await page.evaluate(()=>structuredClone(__MieMieBindingDemo.controller.state.parametersDraft)),parameterDraft);assert.equal(await effort.getAttribute('aria-expanded'),'false');assert(await effort.evaluate(e=>document.activeElement===e));await page.keyboard.press('Escape');await parameters.waitFor({state:'hidden'});
    checks.push(`${width}: parameter reasoning picker shares topmost priority and preserves its parameter draft`);
    const preset=page.getByRole('combobox',{name:'当前使用预设',exact:true});await page.getByRole('button',{name:'预设参数设置',exact:true}).focus();await pointerOpen(preset);await page.keyboard.press('Escape');assert.equal(await preset.getAttribute('aria-expanded'),'false');assert(await preset.isVisible());assert(await preset.evaluate(e=>document.activeElement===e));assert.equal(await page.evaluate(()=>escapeCalls.cancelChanges),0);
    checks.push(`${width}: current preset popup consumes Escape without cancelling or closing the preset manager`);
    assert.equal(await page.locator('dialog.mm-migration-dialog').count(),0);assert.equal(await page.locator('.mm-floating-layer:visible').count(),0);await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({realSafari:false,passed:checks.length,checks,pageErrors:errors},null,2));console.log(JSON.stringify({passed:checks.length,pageErrors:errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
