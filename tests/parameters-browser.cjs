const {checkPickerShadows}=require('./helpers/picker-shadows.cjs');
const {choosePreset}=require('./helpers/preset-picker.cjs');
// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Offline production-view regression, never real-host acceptance evidence.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'evidence','preset-parameters');fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[];
async function chooseEffort(modal, value) {
 const labels={auto:'自动',min:'极低',low:'低',medium:'中',high:'高',max:'极高'};
 await modal.getByRole('combobox',{name:'推理强度',exact:true}).click();
 await modal.getByRole('option',{name:labels[value],exact:true}).click();
}
(async()=>{const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
try {for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:844}});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(path.join(root,'delivery','preview.html')).href+'?binding=1');
 const ready=()=>page.waitForFunction(()=>window.__MieMieBindingDemo.binding.state.status==='ready');await ready();await page.locator('.mm-card').first().waitFor();
 const get=()=>page.evaluate(()=>structuredClone(window.__MieMieBindingDemo.controller.state.snapshot.raw));
 const before=await get(),entry=page.getByRole('button',{name:'预设参数设置',exact:true});
 const openParameters=async()=>{await entry.click();await page.waitForFunction(()=>{const layer=document.querySelector('.mm-parameters-dialog')?.parentElement;return layer&&!layer.dataset.parameterMotion;});};
 assert.equal(await entry.count(),1);assert.equal(await entry.locator('svg').count(),1);
 assert(await entry.evaluate(e=>e.parentElement.classList.contains('mm-scroll')&&!e.closest('.mm-list')&&!e.hasAttribute('data-id')&&!e.draggable&&e.getBoundingClientRect().height<document.querySelector('.mm-card').getBoundingClientRect().height));checks.push(`${width}: flat SVG entry at scroll top, outside prompt ordering`);
 assert(await entry.evaluate(e=>getComputedStyle(e).justifyContent==='center'&&getComputedStyle(e).textAlign==='center'));checks.push(`${width}: gear and title are centered as a single clickable group`);
 const y=await entry.evaluate(e=>e.getBoundingClientRect().top);await page.locator('.mm-scroll').evaluate(e=>{e.scrollTop=150;});assert((await entry.evaluate(e=>e.getBoundingClientRect().top))<y-100);await page.locator('.mm-scroll').evaluate(e=>{e.scrollTop=0;});checks.push(`${width}: entry scrolls away rather than sticking`);
 await page.getByRole('button',{name:'更多预设操作',exact:true}).click();for(const name of ['导出操作前备份','此对话跟随默认','重新协调对话预设'])assert.equal(await page.locator('.mm-menu').getByRole('button',{name,exact:true}).count(),0);await page.getByRole('button',{name:'更多预设操作',exact:true}).click();checks.push(`${width}: three duplicate menu items removed`);
 await openParameters();let modal=page.getByRole('dialog',{name:'预设参数设置',exact:true});
 assert.equal(await modal.locator('.mm-dialog-head button').count(),0);
 assert(await modal.locator('.mm-dialog-body').evaluate(e=>e.scrollTop===0));
 assert(await modal.locator('.mm-dialog-actions').evaluate(e=>{const [cancel,save]=e.children,c=cancel.getBoundingClientRect(),s=save.getBoundingClientRect(),r=e.getBoundingClientRect();return Math.abs(c.width-s.width)<1&&c.left<s.left&&c.width+s.width>=r.width-48&&c.height>=44&&s.height>=44;}));checks.push(`${width}: opens at top, no header close, equal full-width bottom Cancel/Save`);
 assert.equal(await modal.locator('select').count(),0);
 const picker=modal.getByRole('combobox',{name:'推理强度',exact:true});
 await picker.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');
 assert.equal(await picker.getAttribute('data-value'),'max');assert.equal(await picker.getAttribute('aria-expanded'),'false');
 await picker.click();await page.keyboard.press('Escape');assert(await modal.isVisible());assert.equal(await picker.getAttribute('aria-expanded'),'false');
 await chooseEffort(modal,'auto');checks.push(`${width}: custom reasoning list supports arrows/End/Enter and Escape closes only the list`);
 const list=modal.getByRole('listbox',{name:'推理强度选项',exact:true});
 const settleList=()=>list.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished));});
 const geometry=()=>modal.evaluate(e=>{
  const menu=e.querySelector('.mm-reasoning-options'),field=e.querySelector('[role=combobox]'),body=e.querySelector('.mm-dialog-body'),selected=menu.querySelector('[aria-selected=true]');
  const m=menu.getBoundingClientRect(),f=field.getBoundingClientRect(),b=body.getBoundingClientRect(),r=selected.getBoundingClientRect();
  return {within:m.top>=b.top+7&&m.bottom<=b.bottom-7,aligned:Math.abs(r.top+r.height/2-f.top-f.height/2)<2,edge:Math.abs(m.top-b.top-8)<2||Math.abs(m.bottom-b.bottom+8)<2,upward:m.top<f.top,height:m.height,visibleCount:[...menu.children].filter(n=>{const o=n.getBoundingClientRect();return o.top>=m.top&&o.bottom<=m.bottom;}).length,visible:r.top>=m.top&&r.bottom<=m.bottom,width:Math.abs(m.width-f.width)<1,overlay:menu.parentElement===e&&!body.contains(menu),scrollHeight:body.scrollHeight,scrollTop:body.scrollTop};
 });
 await chooseEffort(modal,'medium');
 const bodyBefore=await modal.locator('.mm-dialog-body').evaluate(e=>({height:e.scrollHeight,top:e.scrollTop}));
 await picker.click();await settleList();
 let g=await geometry();assert(g.within&&(g.aligned||g.edge)&&g.visibleCount>0&&g.visible&&g.width&&g.overlay,JSON.stringify(g));
 const middleHeight=g.height;
 assert.equal(g.scrollHeight,bodyBefore.height);assert.equal(g.scrollTop,bodyBefore.top);
 assert.deepEqual(await list.getByRole('option').allTextContents(),['自动','极低','低','中','高','极高']);
 assert.equal(await list.getByRole('option',{name:'中',exact:true}).getAttribute('aria-selected'),'true');
 await modal.screenshot({path:path.join(out,`reasoning-anchored-middle-${width}.png`)});
 checks.push(`${width}: middle selection uses field anchor or edge fit, adaptive height and visible selection in source order with no form layout shift`);
 await page.keyboard.press('Escape');
 for(const value of ['auto','max']){
  await chooseEffort(modal,value);await picker.click();await settleList();g=await geometry();assert(g.within&&g.visibleCount>0&&g.visible&&g.width,JSON.stringify({value,...g}));
  if(value==='auto'){assert(g.height<middleHeight,JSON.stringify({autoHeight:g.height,middleHeight}));assert(g.upward,JSON.stringify(g));await checkPickerShadows(page,list);checks.push(`${width}: reasoning shades indicate more above/below, vanish at ends, preserve geometry and do not block clicking`);await modal.screenshot({path:path.join(out,`reasoning-auto-shadow-menu-${width}.png`)});}
  await page.keyboard.press('Escape');
 }checks.push(`${width}: Owner reference adaptive height and placement preserve visible first and last selections`);
 assert(await picker.evaluate(e=>{const group=e.closest('.mm-parameters-section'),toggles=[...group.querySelectorAll('[role=switch]')];return toggles.length===2&&toggles.every(n=>Boolean(n.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING));}));checks.push(`${width}: original order preserved: streaming and thoughts switches before reasoning`);
 await chooseEffort(modal,'medium');await picker.click();await settleList();
 await page.setViewportSize({width,height:420});
 await page.waitForFunction(()=>{const menu=document.querySelector('.mm-reasoning-options'),panel=menu?.closest('.miemie-pm');if(panel?.dataset.short!=='true')return false;if(menu.hidden)return true;const m=menu.getBoundingClientRect(),b=menu.parentElement.querySelector('.mm-dialog-body').getBoundingClientRect();return m.top>=b.top+7&&m.bottom<=b.bottom-7;});
 if(!await list.isVisible())await picker.click();await settleList();g=await geometry();assert(g.within&&g.visible,JSON.stringify(g));
 await picker.press('End');
 assert(await list.getByRole('option',{name:'极高',exact:true}).evaluate(e=>{const r=e.getBoundingClientRect(),m=e.parentElement.getBoundingClientRect();return r.top>=m.top&&r.bottom<=m.bottom;}));
 await page.keyboard.press('Home');await page.keyboard.press('Escape');checks.push(`${width}: short viewport keeps menu within form and keyboard can scroll to final choice`);
 await page.setViewportSize({width,height:844});await page.waitForFunction(()=>document.querySelector('.miemie-pm')?.dataset.short==='false');if(await list.isVisible())await page.keyboard.press('Escape');
 await picker.click();await settleList();
 await modal.locator('.mm-dialog-body').evaluate(e=>{e.scrollTop=0;});await list.waitFor({state:'hidden'});
 await picker.click();await settleList();await modal.locator('.mm-dialog-head').click();assert.equal(await list.isVisible(),false);
 await picker.click();await settleList();
 assert(await modal.getByRole('button',{name:'取消',exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===e;}));
 assert(await modal.getByRole('button',{name:'保存',exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===e;}));
 await modal.getByRole('button',{name:'取消',exact:true}).click();await modal.waitFor({state:'hidden'});assert.equal(await page.locator('.mm-reasoning-options').count(),0);assert.equal(await page.locator('.mm-parameters-dialog .mm-picker-scroll-shadows').count(),0);assert.deepEqual(await get(),before);
 await openParameters();assert.equal(await list.isVisible(),false);
 await chooseEffort(modal,'auto');checks.push(`${width}: resize, scroll away, outside click and dialog cancel leave no stale popup; Save/Cancel remain unobstructed`);

 for(const label of ['流式传输','请求思维链']){
  const toggle=modal.getByRole('switch',{name:label,exact:true});
  assert(await toggle.evaluate(e=>{const wrap=e.closest('.mm-parameter-switch'),title=wrap.querySelector('.mm-parameter-label').getBoundingClientRect(),track=wrap.querySelector('.mm-parameter-switch-track').getBoundingClientRect(),r=wrap.getBoundingClientRect();return title.right<track.left&&Math.abs(track.right-r.right)<1&&r.height>=44;}));
  await toggle.uncheck();await toggle.check();
  await page.waitForFunction(label=>{const e=[...document.querySelectorAll('.mm-parameter-switch input')].find(n=>n.getAttribute('aria-label')===label);return e.checked&&getComputedStyle(e.nextElementSibling).backgroundColor==='rgb(193, 148, 255)';},label);
  assert(await toggle.evaluate(e=>getComputedStyle(e.nextElementSibling,'::after').transitionProperty.includes('transform')));
 }checks.push(`${width}: full-row switches have left labels, right animated tracks and preserve checked state`);
 await page.addStyleTag({content:'input[type=range] {appearance:none;background:transparent;border:0} input[type=range]::-webkit-slider-runnable-track {height:0;background:transparent} input[type=range]::-webkit-slider-thumb {appearance:none;background:none;border:2px solid white}'});
 const slider=modal.getByLabel('温度滑块',{exact:true});
 assert(await slider.evaluate(e=>{const s=getComputedStyle(e),rules=[...document.querySelectorAll('style')].flatMap(n=>[...n.sheet.cssRules]).filter(r=>r.selectorText?.includes('.mm-parameter-sampling')&&r.selectorText.includes('::-webkit-slider-runnable-track'));return parseFloat(s.height)>=44&&rules.some(r=>r.style.height==='5px'&&r.style.background.includes('linear-gradient'));}));
 await slider.press('ArrowRight');assert.equal(await modal.getByLabel('温度',{exact:true}).inputValue(),'0.81');assert.equal(await slider.evaluate(e=>e.style.getPropertyValue('--mm-range-progress')),'40.5%');checks.push(`${width}: isolated slider track and thumb survive native-style reset, keyboard value and fill stay in sync`);
 await modal.locator('.mm-dialog-body').evaluate(e=>{e.scrollTop=0;});await modal.screenshot({path:path.join(out,`parameters-polished-top-${width}.png`)});
 await modal.getByLabel('流式传输',{exact:true}).scrollIntoViewIfNeeded();await modal.screenshot({path:path.join(out,`parameters-polished-switches-${width}.png`)});
 await picker.click();await settleList();await modal.screenshot({path:path.join(out,`parameters-polished-picker-${width}.png`)});await page.keyboard.press('Escape');
 await modal.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await get(),before);
 await openParameters();
 for(const name of ['上下文长度 (Token)','最大回复长度 (Token)','每次生成多个备选回复','温度','频率惩罚','存在惩罚','Top P','流式传输','请求思维链','推理强度'])assert.equal(await modal.getByLabel(name,{exact:true}).count(),1);
 await modal.getByLabel('最大回复长度 (Token)',{exact:true}).fill('30000');await modal.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await get(),before);assert(await page.getByRole('button',{name:'保存修改',exact:true}).isDisabled());checks.push(`${width}: cancel parameter draft causes no host writes`);
 await openParameters();modal=page.getByRole('dialog',{name:'预设参数设置',exact:true});
 await modal.getByLabel('上下文长度 (Token)',{exact:true}).fill('250000');await modal.getByLabel('最大回复长度 (Token)',{exact:true}).fill('30000');await modal.getByLabel('温度',{exact:true}).fill('1.2');await modal.getByLabel('流式传输',{exact:true}).uncheck();await modal.getByLabel('请求思维链',{exact:true}).uncheck();await chooseEffort(modal,'max');
 assert.deepEqual(await get(),before);assert.equal(await page.evaluate(()=>window.__MieMieBindingDemo.controller.state.dirty),true);
 await page.screenshot({path:path.join(out,`parameters-${width}.png`)});
 assert(await modal.evaluate(e=>e.scrollWidth<=e.clientWidth));assert(await modal.getByRole('button',{name:'保存',exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.bottom<=innerHeight;}));
 await modal.getByRole('button',{name:'保存',exact:true}).click();await modal.waitFor({state:'hidden'});assert.deepEqual(await get(),before);checks.push(`${width}: parameter dialog stages locally, 44px actions and no overflow`);
 await page.getByRole('button',{name:'保存修改',exact:true}).click();await ready();const saved=await get();assert.equal(saved.openai_max_tokens,30000);assert.equal(saved.temperature,1.2);assert.equal(saved.stream_openai,false);assert.equal(saved.show_thoughts,false);assert.equal(saved.reasoning_effort,'max');for(const key of ['prompts','prompt_order','future_setting'])assert.deepEqual(saved[key],before[key]);checks.push(`${width}: global Save patches parameters and preserves unrelated trees`);
 await openParameters();await modal.getByLabel('温度',{exact:true}).fill('1.5');await modal.getByRole('button',{name:'保存',exact:true}).click();await page.getByRole('button',{name:'重新读取实际状态',exact:true}).click();await page.getByRole('dialog',{name:'重新读取实际状态',exact:true}).getByRole('button',{name:'重新读取',exact:true}).click();await ready();assert.deepEqual(await get(),saved);checks.push(`${width}: reload discards local parameter changes and reconciles binding`);
 await openParameters();await modal.getByLabel('温度',{exact:true}).fill('1.9');await modal.getByRole('button',{name:'取消',exact:true}).click();await choosePreset(page,'轻量 · 示例预设');await ready();await openParameters();assert.equal(await modal.getByLabel('温度',{exact:true}).inputValue(),'0.8');await modal.getByRole('button',{name:'取消',exact:true}).click();checks.push(`${width}: each preset retains its own parameters`);
 await page.evaluate(async()=>{const c=window.__MieMieBindingDemo.controller,raw=structuredClone(c.state.snapshot.raw);for(const key of ['openai_max_context','openai_max_tokens','temperature','frequency_penalty','presence_penalty','top_p','stream_openai','show_thoughts','reasoning_effort'])delete raw[key];await c.importText('参数默认检查.json',JSON.stringify(raw));});await ready();const missing=await get();
 await openParameters();for(const [label,value] of [['上下文长度 (Token)','2000000'],['最大回复长度 (Token)','30000'],['温度','1'],['频率惩罚','0'],['存在惩罚','0'],['Top P','0.9']])assert.equal(await modal.getByLabel(label,{exact:true}).inputValue(),value);
 assert.equal(await modal.getByLabel('流式传输',{exact:true}).isChecked(),false);assert.equal(await modal.getByLabel('请求思维链',{exact:true}).isChecked(),false);assert.equal(await modal.getByRole('combobox',{name:'推理强度',exact:true}).getAttribute('data-value'),'auto');
 await modal.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await get(),missing);checks.push(`${width}: absent values display exact Owner defaults; cancel keeps native raw unchanged`);
 await openParameters();await page.screenshot({path:path.join(out,`parameters-defaults-${width}.png`)});await modal.getByRole('button',{name:'保存',exact:true}).click();assert.deepEqual(await get(),missing);await page.getByRole('button',{name:'保存修改',exact:true}).click();await ready();const defaults=await get();assert.equal(defaults.openai_max_context,2000000);assert.equal(defaults.openai_max_tokens,30000);assert.equal(defaults.temperature,1);assert.equal(defaults.frequency_penalty,0);assert.equal(defaults.presence_penalty,0);assert.equal(defaults.top_p,0.9);assert.equal(defaults.stream_openai,false);assert.equal(defaults.show_thoughts,false);assert.equal(defaults.reasoning_effort,'auto');assert.deepEqual(defaults.prompts,missing.prompts);assert.deepEqual(defaults.prompt_order,missing.prompt_order);checks.push(`${width}: confirm then global Save persists defaults only for absent fields`);
 await page.locator('.mm-scroll').evaluate(e=>{e.scrollTop=0;});await page.screenshot({path:path.join(out,`parameters-entry-${width}.png`)});await entry.screenshot({path:path.join(out,`parameters-entry-centered-${width}.png`)});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:420});await openParameters();
 assert(await modal.getByRole('button',{name:'保存',exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.bottom<=innerHeight;}));
 assert(await modal.locator('.mm-parameter-switch-track').first().evaluate(e=>getComputedStyle(e,'::after').transitionDuration==='0s'));assert(await modal.locator('.mm-picker-scroll-shadows').evaluate(e=>getComputedStyle(e,'::after').transitionDuration==='0s'));
 await modal.getByRole('button',{name:'取消',exact:true}).click();checks.push(`${width}: reduced motion honored and full-width bottom actions reachable with shortened viewport`);
 await page.close();
}assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({realHost:false,checks,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify({passed:checks.length,pageErrors:errors,checks},null,2));
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
