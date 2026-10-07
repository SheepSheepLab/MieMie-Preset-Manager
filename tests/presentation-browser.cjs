// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Offline Chromium + real pinned Hub contracts. No real ST or physical phone claim.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const webpack=require('webpack'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'evidence/presentation-review');fs.mkdirSync(out,{recursive:true});
const fixture=require('./fixtures/hub-v1-contracts.json'),code=n=>fixture.excerpts.find(x=>x.name===n).code.replace(/^export /,'');
const shortcut=fs.readFileSync(path.join(__dirname,'fixtures/hub-v1-shortcut-launchers.js'),'utf8').replace(/^export /m,'');
const receipts=[],errors=[],requests=[],screenshots=[];
function bundle(){return new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,context:root,entry:path.join(__dirname,'helpers/presentation-browser-harness.ts'),output:{path:out,filename:'harness.js'},resolve:{extensions:['.ts','.js']},module:{rules:[{test:/\.png$/,type:'asset/inline'},{test:/\.ts$/,use:{loader:require.resolve('ts-loader'),options:{transpileOnly:true,configFile:path.join(root,'tsconfig.json'),compilerOptions:{noEmit:false}}}}]},performance:{hints:false}},(e,s)=>e||s.hasErrors()?reject(e||Error(s.toString({all:false,errors:true}))):resolve()));}
const native='[data-miemie-preset-manager-native]',standalone='[data-miemie-preset-manager-standalone]';
async function ready(page){await page.waitForFunction(()=>!!window.presentationTest && window.reorderTest.controller.state.snapshot);await page.evaluate(()=>window.presentationTest.source.settled());}
async function openNative(page){await page.locator(standalone).click();await page.waitForFunction(()=>document.querySelector('.miemie-pm').dataset.surfaceState==='open'&&!document.querySelector('.miemie-pm').inert);}
async function returnWindow(page){await page.getByRole('button',{name:'关闭预设管理',exact:true}).click();await page.locator('.miemie-pm').waitFor({state:'hidden'});}
async function shot(page,name){await page.screenshot({path:path.join(out,name),fullPage:false});screenshots.push(name);}
async function hit(locator){return locator.evaluate(n=>{const r=n.getBoundingClientRect(),el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return (el===n||n.contains(el))&&r.width>=43.9&&r.height>=43.9;});}
function hubCode(){return `window.createPinnedHub=function(){
const host=window,doc=document,HUB_PRODUCT={englishName:'MieMie Hub'},HUB_COPY={extensionCenter:'Center',settings:'Settings'},NATIVE_PRESENTATION_TIMEOUT_MS=5000;
const SURFACE_TUNING={fallbackOffset:12,fallbackScale:.9,contentEnterStart:.2,contentEnterEnd:.8,contentExitEnd:.6,faceEnterEnd:.7,faceExitStart:.2,faceExitEnd:.8};
const shell={root:doc.createElement('div'),orb:doc.createElement('button')},root=doc.createElement('nav'),honeycomb=doc.createElement('button');
shell.root.style.cssText='--mie-motion-surface-open:180ms;--mie-motion-surface-close:160ms;--mie-motion-hero:200ms;--mie-z-surface:2147483500';
honeycomb.style.cssText='position:fixed;left:24px;top:24px;width:64px;height:64px';honeycomb.innerHTML='<span>预设</span>';root.hidden=true;shell.root.append(shell.orb,root,honeycomb);doc.body.append(shell.root);
const panels=new Set(),extensionPanels=new Map(),warnings=[],sources=new Map(),withdrawing=new Set(),bundledPolicies=new Map(),savedHubState={extensions:{}};
let disposed=false,hubDisposed=false,menuButtons=[],lastError='',factoryCount=0,attachCount=0,closeCount=0,paused=false,surface,shortcuts,extensionRuntime,runtime,hubUI;
const onError=e=>warnings.push(String(e)),launcher={capture:()=>({kind:'launcher',rect:honeycomb.getBoundingClientRect()}),originRect:()=>honeycomb.getBoundingClientRect(),originElement:()=>honeycomb,resume(){paused=false;},suspend(){paused=true;},highlight(){honeycomb.focus();},open:async()=>{root.hidden=false;},close:async()=>{root.hidden=true;},setItems(items){this.items=items;}};
${['createSurfaceMotion','createSurfaceController','createExtensionRuntime','registerSource','provide','renderMenu'].map(code).join('\n')}
${shortcut}
function place(){const entry=extensionPanels.get(surface?.state);if(entry&&!surface.placeNative(entry.panel))window.presentationTest.view.setPresentation('hub');}
surface=createSurfaceController({host,shell,root,launcher,panels,resolve:key=>extensionPanels.get(key),place,onState(){},onError});
const methods={${['attachPanel','showPanel','closePanel'].map(code).join(',')}};
hubUI={...methods,refresh(){renderMenu();shortcuts?.sync();}};
shortcuts=createShortcutLaunchers({host,runtime:{get:id=>extensionRuntime.get(id),open:id=>extensionRuntime.open(id)},launch:(...args)=>surface.launch(...args),onError});
extensionRuntime=createExtensionRuntime({onChange:()=>hubUI.refresh(),onPanel(id,title,p,opts){attachCount++;return hubUI.attachPanel(id,title,p,opts);},onShowPanel:id=>hubUI.showPanel(id),onClosePanel:id=>{closeCount++;return hubUI.closePanel(id);},onShortcut:(id,mount)=>shortcuts.register(id,mount)});
runtime=extensionRuntime;const go=(...args)=>surface.go(...args);const hub={apiVersion:1,extensions:{provide(m,f){return provide(m,api=>{factoryCount++;return f(api);});}}};
const resize=()=>{surface.resize();place();};host.addEventListener('resize',resize);
return {hub,surface,shortcuts,runtime:extensionRuntime,warnings,panels,launcher,shell,root,
counts:()=>({factoryCount,attachCount,closeCount,paused}),honeycomb:()=>surface.launch('miemie.preset-manager',()=>extensionRuntime.open('miemie.preset-manager')),
async dispose(){hubDisposed=true;await extensionRuntime.dispose();surface.dispose();shortcuts.dispose();host.removeEventListener('resize',resize);shell.root.remove();}};
};`;}
(async()=>{
await bundle();fs.writeFileSync(path.join(out,'preview.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>咩咩预设管理 · Presentation Review</title><style>body{margin:0;background:#100d19;font-family:system-ui;color:#c5b8d6}body>p{padding:20px;max-width:40em}</style><p>Presentation 候选 · 全部为 synthetic 演示数据，修改仅保存于本页内存。</p><script src="harness.js"></script></html>');
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chromium-headless-shell',headless:true});
async function pageAt(size={width:1512,height:859},options={}){const context=await browser.newContext({viewport:size,...Object.fromEntries(Object.entries(options).filter(([key])=>key!=='mockViewport'))});if(options.mockViewport)await context.addInitScript(()=>{const v=Object.assign(new EventTarget(),{width:390,height:844,offsetTop:0,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:v,configurable:true});window.mockViewport=v;});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.error('browser:',m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await page.goto(require('node:url').pathToFileURL(path.join(out,'preview.html')).href);await ready(page);return page;}
try{
// Owner regression: repeated launch of an already-open Hub Surface is a focus
// request, not a new presentation entry. Exercise the production source and the
// pinned Hub Runtime/Shortcut/Surface without substituting any open handler.
const panelGeometry = page => page.locator('.miemie-pm').evaluate(p => {
  const r = p.getBoundingClientRect();
  return {mode:p.dataset.presentation,left:r.left,top:r.top,width:r.width,height:r.height};
});
const panelPlacement = page => page.locator('.miemie-pm').evaluate(p =>
  Object.fromEntries(['left','top','right','bottom','width','height','max-height','transform-origin','will-change'].map(k=>[k,p.style.getPropertyValue(k)])));
async function installShortcut(page) {
  await returnWindow(page);
  await page.addScriptTag({content:hubCode()});
  await page.evaluate(async()=>{
    window.pinnedHub=createPinnedHub();window.__MieMieHub=pinnedHub.hub;
    dispatchEvent(new CustomEvent('miemie:hub-ready'));await presentationTest.source.settled();
    pinnedHub.shortcuts.set('miemie.preset-manager',true);
    window.shortcutRefs={panel:presentationTest.view.panel,controller:presentationTest.controller};
    window.shortcutMotionCount=0;const animate=Element.prototype.animate;
    Element.prototype.animate=function(...args){shortcutMotionCount++;return animate.apply(this,args);};
  });
}
async function shortcutOpen(page) {
  await page.locator(native).click();
  await page.waitForFunction(()=>presentationTest.view.panel.dataset.surfaceState==='open'&&!presentationTest.view.panel.inert);
}
async function checkShortcutIdentity(page) {
  assert(await page.evaluate(()=>presentationTest.view.panel===shortcutRefs.panel&&presentationTest.controller===shortcutRefs.controller));
  assert.equal(await page.locator('.miemie-pm').count(),1);
  assert.equal(await page.locator(native).count(),1);
  assert.deepEqual(await page.evaluate(()=>pinnedHub.counts()),{factoryCount:1,attachCount:1,closeCount:0,paused:true});
  assert.equal(await page.evaluate(()=>pinnedHub.surface.state),'panel:miemie.preset-manager');
  assert.equal(await page.evaluate(()=>reorderTest.writes),0);
  assert.deepEqual(await page.evaluate(()=>pinnedHub.warnings),[]);
}

// Local SVG must preserve the real launcher lifecycle in both ownership modes.
for(const mode of ['standalone','shortcut'])for(const motion of ['no-preference','reduce']){
  const p=await pageAt({width:390,height:844},{reducedMotion:motion});
  if(mode==='shortcut')await installShortcut(p);else await returnWindow(p);
  await p.waitForFunction(()=>{const i=document.querySelector('[data-miemie-preset-manager-native] img');return i?.complete&&i.naturalWidth>0;});
  assert.equal(await p.locator(`${native} svg`).count(),0);
  const bounds=await p.locator(native).evaluate(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,label:n.getAttribute('aria-label'),imageWidth:n.querySelector('img').getBoundingClientRect().width,imageHeight:n.querySelector('img').getBoundingClientRect().height}));
  assert.equal(bounds.width,64);assert.equal(bounds.height,64);assert.equal(bounds.label,'打开咩咩预设管理');
  receipts.push(`${mode}/${motion}: successful official PNG remains visible, no fallback, accessible 64px native entry`);
  await p.evaluate(()=>{window.fallbackRefs={panel:presentationTest.view.panel,controller:presentationTest.controller,image:document.querySelector('[data-miemie-preset-manager-native] img')};fallbackRefs.image.src='data:image/png;base64,AA==';});
  await p.locator(`${native} [data-preset-manager-icon-fallback]`).waitFor();
  assert.equal(await p.locator(`${native} img`).count(),0);
  assert.deepEqual(await p.locator(`${native} svg`).evaluate(n=>({hidden:n.getAttribute('aria-hidden'),focus:n.getAttribute('focusable'),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})),{hidden:'true',focus:'false',width:bounds.imageWidth,height:bounds.imageHeight});
  await p.locator(native).evaluate(n=>{
    const r=n.getBoundingClientRect();const e=(t,x,y)=>n.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:71,pointerType:'mouse',button:0,isPrimary:true,clientX:x,clientY:y}));
    e('pointerdown',r.left+20,r.top+20);e('pointermove',30,220);e('pointerup',30,220);n.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));
  });
  assert.equal(await p.locator('.miemie-pm').isVisible(),false);
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('miemie_preset_manager_dock_v1')).side),'left');
  for(let i=0;i<2;i++){
    await p.locator(native).click();await p.waitForFunction(()=>presentationTest.view.panel.dataset.surfaceState==='open'&&!presentationTest.view.panel.inert);
    await p.locator(native).evaluate(n=>n.click());
    await p.evaluate(()=>presentationTest.source.settled());
    assert(await p.evaluate(()=>fallbackRefs.panel===presentationTest.view.panel&&fallbackRefs.controller===presentationTest.controller));
    assert.equal(await p.locator('.miemie-pm').count(),1);assert.equal(await p.locator(native).count(),1);
    await returnWindow(p);
  }
  assert.equal(await p.evaluate(()=>reorderTest.writes),0);
  if(mode==='shortcut'){assert.equal(await p.evaluate(()=>pinnedHub.counts().factoryCount),1);assert.deepEqual(await p.evaluate(()=>pinnedHub.warnings),[]);}
  await p.evaluate(async()=>{await presentationTest.source.dispose();fallbackRefs.image.dispatchEvent(new Event('error'));dispatchEvent(new Event('resize'));});
  assert.equal(await p.locator(native).count(),0);assert.equal(await p.locator('[data-preset-manager-icon-fallback]').count(),0);
  receipts.push(`${mode}/${motion}: real PNG decode error uses local SVG; drag/Dock, repeated open/close, same instance and dispose/late error remain safe`);
  await p.close();
}

for (const width of [1512,390]) {
  const p=await pageAt({width,height:844},{reducedMotion:'reduce'});
  await installShortcut(p);await shortcutOpen(p);
  const original=await panelGeometry(p);assert.equal(original.mode,'native');
  if(width===1512) assert(original.left>width/2,'Desktop native entry must be beside its orb, not centered');
  await p.evaluate(async()=>{const c=presentationTest.controller;await c.move('c','a',c.revision());window.shortcutDirty=JSON.stringify(c.state.pendingRaw);});
  for(let i=0;i<6;i++) {
    await p.locator(native).click();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    assert.deepEqual(await panelGeometry(p),original,'Repeated native click must preserve Surface presentation and geometry');
  }
  await checkShortcutIdentity(p);
  assert.equal(await p.evaluate(()=>shortcutMotionCount),0);
  await p.locator('.mm-card[data-id=a]').getByRole('button',{name:'编辑条目',exact:true}).click();
  const draft=p.getByRole('dialog',{name:'编辑条目',exact:true}).getByLabel('内容',{exact:true});
  await draft.fill('Synthetic draft survives repeat Shortcut clicks');
  // The mobile editor intentionally shields the orb. Invoke its real button
  // handler directly to also cover an open request while a draft is active.
  await p.locator(native).evaluate(n=>{n.click();n.click();});
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.deepEqual(await panelGeometry(p),original);
  assert.equal(await draft.inputValue(),'Synthetic draft survives repeat Shortcut clicks');
  assert.equal(await p.evaluate(()=>JSON.stringify(presentationTest.controller.state.pendingRaw)),await p.evaluate(()=>shortcutDirty));
  receipts.push(`${width}px: six pointer Shortcut clicks plus two real-handler draft requests retain native placement, one panel/controller, dirty and draft, zero writes or new motion`);
  await p.evaluate(()=>pinnedHub.honeycomb());assert.deepEqual(await panelGeometry(p),original);
  receipts.push(`${width}px: Honeycomb focus of an already-open Shortcut Surface retains its current native origin`);
  await p.evaluate(()=>pinnedHub.surface.close('panel:miemie.preset-manager'));
  assert.equal(await p.evaluate(()=>pinnedHub.surface.state),'closed');
  await shortcutOpen(p);assert.deepEqual(await panelGeometry(p),original);
  assert.equal(await draft.inputValue(),'Synthetic draft survives repeat Shortcut clicks');
  await p.evaluate(()=>pinnedHub.surface.close('panel:miemie.preset-manager'));
  await p.evaluate(()=>pinnedHub.honeycomb());const hubGeometry=await panelGeometry(p);assert.equal(hubGeometry.mode,'hub');
  for(let i=0;i<4;i++){await p.evaluate(()=>pinnedHub.honeycomb());assert.deepEqual(await panelGeometry(p),hubGeometry);}
  await checkShortcutIdentity(p);
  receipts.push(`${width}px: formal close/reopen retains native origin; a fresh Honeycomb entry resets to Hub placement and repeated Hub opens stay stable`);
  await p.evaluate(async()=>{await presentationTest.source.dispose();await pinnedHub.dispose();});await p.close();
}
const flightPage=await pageAt();await installShortcut(flightPage);
await flightPage.locator(native).click();
await flightPage.waitForFunction(()=>presentationTest.view.panel.dataset.surfaceState==='opening');
const flightPlacement=await panelPlacement(flightPage);
const flightMotion=await flightPage.evaluate(()=>shortcutMotionCount);
await flightPage.evaluate(()=>{for(let i=0;i<8;i++)document.querySelector('[data-miemie-preset-manager-native]').click();});
assert.equal(await flightPage.locator('.miemie-pm').evaluate(p=>p.inert),true,'Repeat opens cannot unlock the active flight');
assert.deepEqual(await panelPlacement(flightPage),flightPlacement,'Repeat opens cannot clear the active flight placement');
await flightPage.waitForFunction(()=>presentationTest.view.panel.dataset.surfaceState==='open'&&!presentationTest.view.panel.inert);
assert.equal(await flightPage.evaluate(()=>shortcutMotionCount),flightMotion+2,'Only the original window motion and its two hero landing animations run');
assert.equal(await flightPage.locator('[data-preset-manager-surface-splash]').count(),0);
await checkShortcutIdentity(flightPage);
const settled=await panelGeometry(flightPage);
for(let i=0;i<3;i++)await flightPage.locator(native).click();
assert.deepEqual(await panelGeometry(flightPage),settled);
receipts.push('Normal motion: burst clicks during opening preserve geometry/inert and one flight; repeated clicks after landing do not move the panel');
await flightPage.getByRole('button',{name:'关闭预设管理',exact:true}).click();
await flightPage.waitForFunction(()=>presentationTest.view.panel.dataset.surfaceState==='closing');
const closingPlacement=await panelPlacement(flightPage);
await flightPage.evaluate(()=>{document.querySelector('[data-miemie-preset-manager-native]').click();document.querySelector('[data-miemie-preset-manager-native]').click();});
assert.equal(await flightPage.locator('.miemie-pm').evaluate(p=>p.inert),true,'Queued reopen cannot unlock the closing flight');
assert.deepEqual(await panelPlacement(flightPage),closingPlacement);
await flightPage.waitForFunction(()=>presentationTest.view.panel.dataset.surfaceState==='open'&&!presentationTest.view.panel.inert);
assert.deepEqual(await panelGeometry(flightPage),settled);
assert.equal(await flightPage.evaluate(()=>pinnedHub.counts().closeCount),1);
assert.equal(await flightPage.locator('.miemie-pm').count(),1);
assert.equal(await flightPage.locator('[data-preset-manager-surface-splash]').count(),0);
assert.deepEqual(await flightPage.evaluate(()=>pinnedHub.warnings),[]);
receipts.push('Formal closePanel with immediate repeated Shortcut reopen serializes both flights, retains one panel and restores native placement');
await flightPage.evaluate(async()=>{await presentationTest.source.dispose();await pinnedHub.dispose();});await flightPage.close();
// Owner regression: rect overlap alone must never move card actions. Use the
// real production view/orb and browser paint order, including stacking contexts.
async function clearanceState(page){return page.locator('.mm-card').evaluateAll(nodes=>nodes.map(n=>({side:n.dataset.orbClearance||'',left:n.style.getPropertyValue('--mm-orb-left'),right:n.style.getPropertyValue('--mm-orb-right')})));}
async function noClearance(page){await page.waitForFunction(()=>[...document.querySelectorAll('.mm-card')].every(n=>!n.dataset.orbClearance&&!n.style.getPropertyValue('--mm-orb-left')&&!n.style.getPropertyValue('--mm-orb-right')));}
async function overlapCard(page,above){await page.evaluate(above=>{const p=presentationTest.view.panel,o=document.querySelector('[data-miemie-preset-manager-native]'),r=p.querySelector('.mm-card[data-id=c]').getBoundingClientRect();p.style.setProperty('z-index',above?'2147483500':'2147483000','important');o.style.setProperty('left',`${r.right-64}px`,'important');o.style.setProperty('top',`${r.top+r.height/2-32}px`,'important');o.style.setProperty('transform','none','important');o.style.setProperty('transition','none','important');},above);}
for(const width of [1512,390]){
const p=await pageAt({width,height:844},{reducedMotion:'reduce'});
await overlapCard(p,true);await noClearance(p);
assert.deepEqual(await clearanceState(p),Array(4).fill({side:'',left:'',right:''}));
const aligned=await p.locator('.mm-card').evaluateAll(nodes=>nodes.map(n=>n.querySelector('button[aria-label="编辑条目"]').getBoundingClientRect().right));assert(Math.max(...aligned)-Math.min(...aligned)<.5);
// Numeric z-index is insufficient: the orb is inside a lower stacking context.
await p.evaluate(()=>{const o=document.querySelector('[data-miemie-preset-manager-native]'),wrapper=document.createElement('div');wrapper.id='orb-lower-context';wrapper.style.cssText='position:fixed;z-index:1';document.body.append(wrapper);wrapper.append(o);});
await overlapCard(p,false);await noClearance(p);
await p.evaluate(()=>{const wrapper=document.getElementById('orb-lower-context');document.body.append(wrapper.firstChild);wrapper.remove();});
await overlapCard(p,true);await noClearance(p);
receipts.push(`${width}px: overlapping orb behind panel or in lower stacking context adds no clearance; all card actions align`);
await overlapCard(p,false);await p.waitForFunction(()=>!!document.querySelector('.mm-card[data-id=c]').style.getPropertyValue('--mm-orb-right'));
for(const control of await p.locator('.mm-card[data-id=c] button').all())assert(await hit(control),'foreground orb leaves a real 44px card control reachable');
receipts.push(`${width}px: genuinely foreground orb permits bounded clearance and keeps card controls reachable`);
await overlapCard(p,true);await noClearance(p);
if(width===390){await p.screenshot({path:path.join(out,'13-mobile-panel-above-orb-aligned.png')});screenshots.push('13-mobile-panel-above-orb-aligned.png');}else{await p.screenshot({path:path.join(out,'14-desktop-panel-above-orb-aligned.png')});screenshots.push('14-desktop-panel-above-orb-aligned.png');}
await p.close();
}
let clearancePage=await pageAt({width:390,height:844},{reducedMotion:'reduce'});
for(const [name,hide,show]of [
['hidden',o=>{o.hidden=true;},o=>{o.hidden=false;}],
['display none',o=>{o.style.display='none';},o=>{o.style.removeProperty('display');}],
['visibility hidden',o=>{o.style.visibility='hidden';},o=>{o.style.removeProperty('visibility');}],
['opacity zero',o=>{o.style.opacity='0';},o=>{o.style.removeProperty('opacity');}],
]){
await overlapCard(clearancePage,false);await clearancePage.waitForFunction(()=>!!document.querySelector('.mm-card[data-id=c]').style.getPropertyValue('--mm-orb-right'));
await clearancePage.locator(native).evaluate(hide);await noClearance(clearancePage);
await clearancePage.locator(native).evaluate(show);await clearancePage.waitForFunction(()=>!!document.querySelector('.mm-card[data-id=c]').style.getPropertyValue('--mm-orb-right'));
receipts.push(`Orb ${name} clears existing clearance; visible foreground state restores only valid clearance`);
}
await clearancePage.evaluate(()=>{const o=document.querySelector('[data-miemie-preset-manager-native]'),wrapper=document.createElement('div');wrapper.id='orb-fade-parent';wrapper.style.cssText='position:fixed;z-index:2147483300;opacity:1;transition:opacity .05s linear';document.body.append(wrapper);wrapper.append(o);});
await clearancePage.waitForFunction(()=>!!document.querySelector('.mm-card[data-id=c]').style.getPropertyValue('--mm-orb-right'));
await clearancePage.evaluate(()=>{const wrapper=document.getElementById('orb-fade-parent');getComputedStyle(wrapper).opacity;wrapper.style.opacity='0';});await noClearance(clearancePage);
await clearancePage.evaluate(()=>{const wrapper=document.getElementById('orb-fade-parent');document.body.append(wrapper.firstChild);wrapper.remove();});await overlapCard(clearancePage,false);await clearancePage.waitForFunction(()=>!!document.querySelector('.mm-card[data-id=c]').style.getPropertyValue('--mm-orb-right'));
receipts.push('Ancestor opacity transition completion clears clearance; restoring a visible foreground orb reevaluates paint order');
await clearancePage.evaluate(()=>{const o=document.querySelector('[data-miemie-preset-manager-native]');window.savedClearanceOrb=o;o.remove();});await noClearance(clearancePage);
await clearancePage.evaluate(()=>document.body.append(savedClearanceOrb));await overlapCard(clearancePage,false);await clearancePage.waitForFunction(()=>!!document.querySelector('.mm-card[data-id=c]').style.getPropertyValue('--mm-orb-right'));
await clearancePage.evaluate(async()=>presentationTest.source.dispose());await noClearance(clearancePage);assert.equal(await clearancePage.locator(native).count(),0);
receipts.push('Detached/disposed native orb and no-orb mode clear previous card clearance');await clearancePage.close();
clearancePage=await pageAt({width:390,height:844},{reducedMotion:'reduce'});await overlapCard(clearancePage,false);await clearancePage.waitForFunction(()=>!!document.querySelector('.mm-card[data-id=c]').style.getPropertyValue('--mm-orb-right'));
await clearancePage.evaluate(()=>{const o=document.querySelector('[data-miemie-preset-manager-native]');o.style.setProperty('left','0px','important');o.style.setProperty('top','0px','important');});await noClearance(clearancePage);
await overlapCard(clearancePage,false);await clearancePage.waitForFunction(()=>!!document.querySelector('.mm-card[data-id=c]').style.getPropertyValue('--mm-orb-right'));
await clearancePage.setViewportSize({width:1512,height:859});await clearancePage.locator(native).evaluate(n=>{n.style.removeProperty('left');n.style.removeProperty('top');});await noClearance(clearancePage);
await returnWindow(clearancePage);await noClearance(clearancePage);await openNative(clearancePage);await overlapCard(clearancePage,true);await noClearance(clearancePage);
receipts.push('Dock position change, viewport resize, close/reopen do not leave stale clearance');await clearancePage.close();
// Read-only host header: no Prompt/chat-content access, writes or draft reset.
let headerPage=await pageAt();
await headerPage.addInitScript(()=>{
  const listeners=new Map();window.headerEvents={on(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeListener(name,fn){listeners.get(name)?.delete(fn);},emit(name){for(const fn of [...listeners.get(name)||[]])fn();},count(){return [...listeners.values()].reduce((n,set)=>n+set.size,0);}};
  window.headerContext={characters:[],eventTypes:{CHAT_CHANGED:'chat_id_changed',CHARACTER_EDITED:'character_edited',CHARACTER_RENAMED:'character_renamed'},eventSource:headerEvents};
  window.SillyTavern={getContext(){if(window.headerReadFailure)throw Error('synthetic host not ready');return headerContext;}};
});
await headerPage.reload();await ready(headerPage);
const subtitle=headerPage.locator('.mm-subtitle');assert.equal(await headerPage.locator('.mm-brand h2').textContent(),'咩咩预设管理 '+require('../manifest.json').version);assert.equal(await subtitle.textContent(),'请打开单人角色聊天');await shot(headerPage,'15-header-no-character.png');
await headerPage.evaluate(()=>{headerContext.characterId=0;headerContext.characters=[{name:'Synthetic Character A'},{name:'Synthetic Character B'}];headerEvents.emit('chat_id_changed');});assert.equal(await subtitle.textContent(),'当前角色：Synthetic Character A');
await headerPage.evaluate(()=>{headerContext.characterId='1';headerEvents.emit('chat_id_changed');});assert.equal(await subtitle.textContent(),'当前角色：Synthetic Character B');
await headerPage.evaluate(()=>{headerContext.characters[1].name='Synthetic Character Renamed';headerEvents.emit('character_renamed');});assert.equal(await subtitle.textContent(),'当前角色：Synthetic Character Renamed');await shot(headerPage,'16-header-current-character.png');
await headerPage.evaluate(()=>{headerContext.characters[1].name='<b>Synthetic literal name</b>';headerEvents.emit('character_edited');});assert.equal(await subtitle.locator('b').count(),0);assert.equal(await subtitle.textContent(),'当前角色：<b>Synthetic literal name</b>');
receipts.push('Official header: Chinese name/version once; current character follows CHAT_CHANGED/edit/rename, numeric 0 and string IDs; names render as text');
await headerPage.evaluate(()=>{headerContext.groupId='synthetic-group';headerEvents.emit('chat_id_changed');});assert.equal(await subtitle.textContent(),'请打开单人角色聊天');
await headerPage.evaluate(()=>{delete headerContext.groupId;headerContext.characterId=99;headerEvents.emit('chat_id_changed');});assert.equal(await subtitle.textContent(),'请打开单人角色聊天');
await headerPage.evaluate(()=>{window.headerReadFailure=true;presentationTest.view.open();});assert.equal(await subtitle.textContent(),'请打开单人角色聊天');
await headerPage.evaluate(()=>{window.headerReadFailure=false;headerContext.characterId=0;presentationTest.view.open();});assert.equal(await subtitle.textContent(),'当前角色：Synthetic Character A');assert.equal(await headerPage.evaluate(()=>headerEvents.count()),3);
receipts.push('No single-character context or unavailable host uses official fallback; reopen refreshes and binds exactly one header listener per event');
await headerPage.locator('.mm-card[data-id=a]').getByRole('button',{name:'编辑条目',exact:true}).click();const headerEditor=headerPage.getByRole('dialog',{name:'编辑条目',exact:true});await headerEditor.getByLabel('内容',{exact:true}).fill('Synthetic unsaved header-change draft');
const sessionBeforeHeader=await headerPage.evaluate(()=>JSON.stringify(presentationTest.controller.state));
await headerPage.evaluate(()=>{headerContext.characterId=1;headerEvents.emit('chat_id_changed');});assert.equal(await headerEditor.getByLabel('内容',{exact:true}).inputValue(),'Synthetic unsaved header-change draft');assert.equal(await headerPage.evaluate(()=>JSON.stringify(presentationTest.controller.state)),sessionBeforeHeader);assert.equal(await headerPage.evaluate(()=>reorderTest.writes),0);
await headerPage.evaluate(()=>{presentationTest.view.close();headerContext.characterId=0;presentationTest.view.open();});assert.equal(await subtitle.textContent(),'当前角色：Synthetic Character A');assert.equal(await headerEditor.getByLabel('内容',{exact:true}).inputValue(),'Synthetic unsaved header-change draft');
await headerPage.evaluate(async()=>{await presentationTest.source.dispose();presentationTest.view.dispose();headerEvents.emit('chat_id_changed');});assert.equal(await headerPage.evaluate(()=>headerEvents.count()),0);
receipts.push('Header changes leave dirty session/draft and host writes untouched; close/reopen preserves draft, dispose removes all header listeners');await headerPage.close();
let page=await pageAt();
const same=await page.evaluate(()=>{window.originalPresentationRefs={panel:window.presentationTest.view.panel,controller:window.presentationTest.controller};return document.querySelectorAll('.miemie-pm').length;});assert.equal(same,1);
await page.mouse.move(0,0);const geometry=await page.evaluate(()=>{const p=document.querySelector('.miemie-pm'),h=p.querySelector('.mm-brandline'),i=p.querySelector('[data-tool-icon]'),o=document.querySelector('[data-miemie-preset-manager-native]');return {panel:[p.offsetWidth,p.offsetHeight],orb:[o.offsetWidth,o.offsetHeight],header:h.offsetHeight,icon:[i.offsetWidth,i.offsetHeight],radius:getComputedStyle(p).borderRadius,headerSrc:i.src,orbSrc:o.querySelector('img').src,footer:p.querySelector('.mm-return').textContent};});
assert.deepEqual(geometry.panel,[600,780]);assert.deepEqual(geometry.orb,[64,64]);assert.equal(geometry.header,81);assert.deepEqual(geometry.icon,[52,52]);assert.equal(geometry.radius,'16px');assert.equal(geometry.footer,'返回');assert.equal(geometry.headerSrc,geometry.orbSrc);assert.deepEqual(Buffer.from(geometry.headerSrc.split(',')[1],'base64'),fs.readFileSync(path.join(root,'assets/preset-manager-icon.png')));receipts.push('Actual 600×780 application window, 81/52px official header, unchanged PNG and Footer Return; no full-screen overlay');
await shot(page,'01-desktop-main.png');await returnWindow(page);await shot(page,'07-standalone-orb.png');
await page.evaluate(()=>{window.originalPresentationRefs={panel:window.presentationTest.view.panel,controller:window.presentationTest.controller};window.motionLog=[];const animate=Element.prototype.animate;Element.prototype.animate=function(f,o){window.motionLog.push({panel:this===window.presentationTest.view.panel,hero:'presetManagerHeaderHero' in this.dataset,hubHero:'surfaceHero' in this.dataset,frames:f,options:o});return animate.call(this,f,o);};});
await page.locator(standalone).click();await page.waitForFunction(()=>document.querySelector('[data-preset-manager-header-hero]'));assert.equal(await page.locator('.miemie-pm').evaluate(n=>n.inert),true);
await page.waitForFunction(()=>document.querySelector('.miemie-pm').dataset.surfaceState==='open');assert.equal(await page.locator('[data-preset-manager-surface-splash]').count(),0);
const log=await page.evaluate(()=>window.motionLog);assert(log.some(x=>x.panel&&x.frames[0].transform.includes('scale(')&&x.frames[0].clipPath==='inset(0 round 50%)'));assert(log.some(x=>x.hero));assert.equal(await page.locator('.miemie-pm').evaluate(n=>n.style.willChange),'');assert.equal(await page.locator('.miemie-pm').evaluate(n=>n.getAnimations().length),0);receipts.push('Orb → Panel includes window transform/opacity/clip and official PNG Hero Landing; temporary DOM, will-change and animations clean');
await shot(page,'08-native-panel-open.png');await returnWindow(page);assert(await page.locator(standalone).evaluate(n=>document.activeElement===n));await page.locator(standalone).press('Enter');await page.waitForFunction(()=>document.querySelector('.miemie-pm').dataset.surfaceState==='open');receipts.push('Panel → current Orb origin, focus returns to launcher, keyboard Enter reopens same panel');
// Pointer threshold, mouse Dock and independent persistence.
await returnWindow(page);await page.locator(standalone).evaluate(n=>{function event(t,x,y){n.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:41,pointerType:'mouse',button:0,isPrimary:true,clientX:x,clientY:y}));}const r=n.getBoundingClientRect();event('pointerdown',r.left+20,r.top+20);event('pointermove',r.left+24,r.top+24);window.thresholdTransform=n.style.transform;event('pointermove',30,220);event('pointerup',30,220);n.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));});
assert.equal(await page.evaluate(()=>window.thresholdTransform),'none');assert.equal(await page.locator('.miemie-pm').isVisible(),false);
const dock=await page.evaluate(()=>JSON.parse(localStorage.getItem('miemie_preset_manager_dock_v1')));assert.equal(dock.side,'left');assert.equal(await page.locator(standalone).evaluate(n=>parseFloat(n.style.left)),10);assert.equal(await page.evaluate(()=>localStorage.getItem('miemie_polisher_dock_v1')),null);receipts.push('7px threshold, drag click suppression, left Dock persists side/ratio under product-only storage key');
await page.reload();await ready(page);await page.evaluate(()=>{window.originalPresentationRefs={panel:window.presentationTest.view.panel,controller:window.presentationTest.controller};window.motionLog=[];const animate=Element.prototype.animate;Element.prototype.animate=function(f,o){window.motionLog.push({panel:this===window.presentationTest.view.panel,hero:'presetManagerHeaderHero' in this.dataset,hubHero:'surfaceHero' in this.dataset,frames:f,options:o});return animate.call(this,f,o);};});assert.equal(await page.locator(standalone).evaluate(n=>parseFloat(n.style.left)),10);await returnWindow(page);
// Real mouse pointer path to right.
let r=await page.locator(standalone).boundingBox();await page.mouse.move(r.x+32,r.y+32);await page.mouse.down();await page.mouse.move(1470,400,{steps:12});await page.mouse.up();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('miemie_preset_manager_dock_v1')).side),'right');receipts.push('Actual browser mouse drag docks right; persisted Dock survives reload');
// Rotation and resize interruption settles fresh geometry.
await page.locator(standalone).click();await page.waitForFunction(()=>document.querySelector('.miemie-pm').dataset.surfaceState==='opening');await page.setViewportSize({width:390,height:844});await page.evaluate(()=>dispatchEvent(new Event('orientationchange')));await page.waitForFunction(()=>document.querySelector('.miemie-pm').dataset.surfaceState==='open');assert.equal(await page.locator('[data-preset-manager-surface-splash]').count(),0);assert.equal(await page.locator('.miemie-pm').evaluate(n=>n.getAnimations().length),0);receipts.push('Resize/rotation during native flight cancels old animation and settles current geometry without stale hero');
await page.setViewportSize({width:1512,height:859});
// B Plan local dirty and draft semantics (no adapter I/O).
await page.locator('.mm-card[data-id=a]').getByRole('button',{name:'编辑条目',exact:true}).click();let editor=page.getByRole('dialog',{name:'编辑条目',exact:true});await editor.getByLabel('标题',{exact:true}).fill('写作-Presentation local draft');await shot(page,'03-desktop-editor.png');await editor.getByRole('button',{name:'保存',exact:true}).click();
assert.equal(await page.evaluate(()=>window.reorderTest.writes),0);assert.equal(await page.evaluate(()=>window.reorderTest.calls.length),0);assert.equal(await page.getByRole('button',{name:'保存修改',exact:true}).isEnabled(),true);await shot(page,'02-desktop-dirty.png');await page.getByRole('button',{name:'关闭预设管理',exact:true}).click();let confirm=page.getByRole('dialog',{name:'关闭预设管理',exact:true});assert(await confirm.isVisible());await shot(page,'05-desktop-confirm.png');await confirm.getByRole('button',{name:'否',exact:true}).click();assert.equal(await page.evaluate(()=>window.presentationTest.controller.state.dirty),true);receipts.push('Footer Return retains dirty discard Yes/No protection; editor Save remains local only, no Host writes');
await page.getByRole('button',{name:'更多预设操作',exact:true}).click();await shot(page,'04-desktop-more.png');await page.keyboard.press('Escape');
// Dirty + editor draft crosses Standalone / Hub / Shortcut / Standalone.
await page.evaluate(async()=>{const c=presentationTest.controller;c.category('写作');await c.move('c','a',c.revision());window.sessionBeforeHandoff=JSON.stringify({pending:c.state.pendingRaw,revision:c.state.localRevision,category:c.state.category,preset:c.state.snapshot.name});});
await page.locator('.mm-card[data-id=a]').getByRole('button',{name:'编辑条目',exact:true}).click();editor=page.getByRole('dialog',{name:'编辑条目',exact:true});await editor.getByLabel('内容',{exact:true}).fill('Synthetic unsaved editor draft across Hub handoff.');
await page.addScriptTag({content:hubCode()});await page.evaluate(async()=>{window.pinnedHub=createPinnedHub();window.__MieMieHub=pinnedHub.hub;for(let i=0;i<5;i++)dispatchEvent(new CustomEvent('miemie:hub-ready'));await presentationTest.source.settled();});
assert.equal(await page.locator(standalone).count(),0,JSON.stringify(await page.evaluate(()=>pinnedHub.warnings)));assert.deepEqual(await page.evaluate(()=>pinnedHub.counts()),{factoryCount:1,attachCount:1,closeCount:0,paused:false});
await page.evaluate(()=>{window.motionLog=[];return pinnedHub.honeycomb();});assert.equal(await page.locator('[data-miemie-preset-manager-native]').count(),0);assert(await page.evaluate(()=>motionLog.some(x=>x.hubHero)&&!motionLog.some(x=>x.hero)));assert.equal(await page.evaluate(()=>pinnedHub.surface.state),'panel:miemie.preset-manager');assert.equal(await editor.getByLabel('内容',{exact:true}).inputValue(),'Synthetic unsaved editor draft across Hub handoff.');assert.equal(await page.evaluate(()=>presentationTest.controller.state.dirty),true);receipts.push('Pinned Hub validate/provide/Surface: repeated ready creates one factory/panel; Honeycomb uses only Hub motion; local Dirty and editor draft survive');
// Programmatic presentation close deliberately preserves dirty and draft, as Hub navigation does.
await page.evaluate(()=>pinnedHub.runtime.get('miemie.preset-manager').enabled);await page.evaluate(()=>pinnedHub.surface.close('panel:miemie.preset-manager'));assert.equal(await page.evaluate(()=>pinnedHub.surface.state),'menu');assert.equal(await page.evaluate(()=>pinnedHub.counts().paused),false);receipts.push('Formal Hub closePanel-equivalent Surface close restores Launcher state without disposing business');
await page.evaluate(()=>pinnedHub.shortcuts.set('miemie.preset-manager',true));assert.equal(await page.locator(native).count(),1);assert.equal(await page.locator(native).getAttribute('data-miemie-preset-manager-mode'),'shortcut');assert.equal(await page.locator(native).evaluate(n=>n.offsetWidth),64);
await page.evaluate(()=>{window.motionLog=[];});await page.locator(native).click();await page.waitForFunction(()=>document.querySelector('.miemie-pm').dataset.surfaceState==='open'&&!document.querySelector('.miemie-pm').inert);assert(await page.evaluate(()=>motionLog.some(x=>x.hero)&&!motionLog.some(x=>x.hubHero)));assert.equal(await page.evaluate(()=>pinnedHub.counts().factoryCount),1);assert.equal(await editor.getByLabel('内容',{exact:true}).inputValue(),'Synthetic unsaved editor draft across Hub handoff.');receipts.push('Actual pinned Shortcut registry preference on mounts shared Native Launcher; Hub open uses same panel/controller and Native motion only');
await page.evaluate(()=>pinnedHub.surface.close('panel:miemie.preset-manager'));assert.equal(await page.evaluate(()=>pinnedHub.surface.state),'menu');await page.evaluate(()=>pinnedHub.shortcuts.set('miemie.preset-manager',false));assert.equal(await page.locator(native).count(),0);await page.evaluate(()=>pinnedHub.honeycomb());assert(await page.evaluate(()=>document.querySelector('.miemie-pm').dataset.presentation==='hub'));receipts.push('Shortcut close returns to captured origin; preference off cleans native component; next Honeycomb open resets geometry and uses Hub presentation');
// Dispose while Native shortcut flight is in progress.
await page.evaluate(()=>pinnedHub.surface.close('panel:miemie.preset-manager'));await page.evaluate(()=>pinnedHub.surface.go('closed'));await page.evaluate(()=>pinnedHub.shortcuts.set('miemie.preset-manager',true));await page.locator(native).click();await page.waitForFunction(()=>document.querySelector('.miemie-pm').dataset.surfaceState==='opening');await page.evaluate(()=>pinnedHub.shortcuts.set('miemie.preset-manager',false));await page.waitForFunction(()=>document.querySelector('.miemie-pm').dataset.surfaceState==='open');assert.equal(await page.locator('[data-preset-manager-surface-splash]').count(),0);assert.equal(await page.locator(native).count(),0);receipts.push('Shortcut preference off during flight cancels visuals without hiding or duplicating Hub-owned panel');await page.evaluate(()=>pinnedHub.surface.close('panel:miemie.preset-manager'));assert.equal(await page.evaluate(()=>pinnedHub.surface.state),'closed');receipts.push('Shortcut opened from closed Hub returns to closed, rather than forcing honeycomb menu');
await page.evaluate(async()=>{const old=__MieMieHub;delete window.__MieMieHub;dispatchEvent(new CustomEvent('miemie:hub-disposed',{detail:old}));await presentationTest.source.settled();await pinnedHub.dispose();});assert.equal(await page.locator(standalone).count(),1);await openNative(page);assert.equal(await editor.getByLabel('内容',{exact:true}).inputValue(),'Synthetic unsaved editor draft across Hub handoff.');assert(await page.evaluate(()=>presentationTest.view.panel===originalPresentationRefs.panel&&presentationTest.controller===originalPresentationRefs.controller));assert.equal(await page.evaluate(()=>reorderTest.writes),0);assert.equal(await page.evaluate(()=>{const c=presentationTest.controller;return JSON.stringify({pending:c.state.pendingRaw,revision:c.state.localRevision,category:c.state.category,preset:c.state.snapshot.name});}),await page.evaluate(()=>sessionBeforeHandoff));receipts.push('Hub disposed restores Standalone after cleanup; same panel/controller, dirty/category and draft retained; no writes');
await page.evaluate(async()=>{window.nextHub=createPinnedHub();window.__MieMieHub=nextHub.hub;dispatchEvent(new CustomEvent('miemie:hub-ready'));await presentationTest.source.settled();await nextHub.honeycomb();});assert.equal(await page.locator(standalone).count(),0);assert.equal(await page.locator('.miemie-pm').count(),1);assert.deepEqual(await page.evaluate(()=>nextHub.warnings),[]);await page.evaluate(async()=>{await presentationTest.source.dispose();await nextHub.dispose();});assert.equal(await page.locator(native).count(),0);assert.equal(await page.locator('[data-preset-manager-surface-splash]').count(),0);receipts.push('Hub re-ready shares one view/controller; final disposal removes all native launcher, styles and animation DOM');await page.close();
// Touch, safe area, visual viewport and compact screenshots.
page=await pageAt({width:390,height:844},{hasTouch:true,isMobile:true});await shot(page,'09-mobile-main-390.png');await returnWindow(page);
const cdp=await page.context().newCDPSession(page);r=await page.locator(standalone).boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+32,y:r.y+32,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:30,y:250,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('miemie_preset_manager_dock_v1')).side),'left');assert.equal(await page.locator('.miemie-pm').isVisible(),false);receipts.push('CDP touch pointer drag docks left without activating panel');
await openNative(page);await page.locator('.mm-card[data-id=a]').getByRole('button',{name:'编辑条目',exact:true}).click();editor=page.getByRole('dialog',{name:'编辑条目',exact:true});await editor.getByLabel('标题',{exact:true}).fill('写作-Mobile synthetic edit');await shot(page,'10-mobile-editor-390.png');assert(await hit(editor.getByRole('button',{name:'保存',exact:true})));await editor.getByRole('button',{name:'保存',exact:true}).click();await shot(page,'11-mobile-dirty-390.png');
for(const size of [{width:320,height:740},{width:390,height:420},{width:844,height:390},{width:844,height:320}]){await page.setViewportSize(size);await page.waitForFunction(()=>{const r=document.querySelector('.miemie-pm').getBoundingClientRect();return r.width<=Math.min(600,innerWidth-20)+1&&r.height<=Math.min(780,innerHeight-20)+1;});const state=await page.evaluate(()=>{const p=document.querySelector('.miemie-pm'),r=p.getBoundingClientRect(),rows=p.querySelector('.mm-scroll');return {overflow:document.documentElement.scrollWidth>innerWidth,width:r.width,height:r.height,list:rows.offsetHeight};});assert.equal(state.overflow,false);assert(state.list>=44);for(const name of ['新增条目','保存修改','重新读取实际状态','关闭预设管理'])assert(await hit(page.getByRole('button',{name,exact:true})),name+' reachable');receipts.push(`${size.width}×${size.height}: clamped window, no overflow, 44px controls + Return reachable`);}
await page.setViewportSize({width:390,height:420});await page.locator('.mm-card[data-id=a]').getByRole('button',{name:'编辑条目',exact:true}).click();editor=page.getByRole('dialog',{name:'编辑条目',exact:true});await editor.getByLabel('内容',{exact:true}).fill('Synthetic keyboard-height draft');await shot(page,'12-mobile-keyboard-height.png');assert(await hit(editor.getByRole('button',{name:'保存',exact:true})));receipts.push('Keyboard-height editor keeps Save/Cancel reachable without page scale');await editor.getByRole('button',{name:'取消',exact:true}).click();await page.getByRole('button',{name:'关闭预设管理',exact:true}).click();await page.getByRole('dialog',{name:'关闭预设管理',exact:true}).getByRole('button',{name:'是',exact:true}).click();await page.locator('.miemie-pm').waitFor({state:'hidden'});assert(await page.locator(standalone).evaluate(n=>!n.inert&&document.activeElement===n));assert.equal(await page.evaluate(()=>reorderTest.writes),0);receipts.push('Mobile dirty Return confirms discard, completes native close and restores keyboard focus to previously shielded orb');await page.close();
page=await pageAt({width:390,height:844},{mockViewport:true});await returnWindow(page);await openNative(page);
await page.evaluate(()=>{const orb=document.querySelector('[data-miemie-preset-manager-native]'),panel=document.querySelector('.miemie-pm');for(const [side,value]of Object.entries({top:32,right:18,bottom:24,left:12})){orb.style.setProperty('--mm-native-safe-'+side,value+'px');panel.style.setProperty('--mm-safe-'+side,value+'px');}Object.assign(mockViewport,{height:340,offsetTop:100});mockViewport.dispatchEvent(new Event('resize'));mockViewport.dispatchEvent(new Event('scroll'));});
await page.mouse.move(0,0);await page.waitForFunction(()=>document.querySelector('.miemie-pm').offsetHeight===284&&Math.abs(document.querySelector('[data-miemie-preset-manager-native]').getBoundingClientRect().width-64)<.1);const vv=await page.evaluate(()=>{const p=document.querySelector('.miemie-pm').getBoundingClientRect(),o=document.querySelector('[data-miemie-preset-manager-native]').getBoundingClientRect();return {panel:[p.left,p.top,p.width,p.height],orb:{left:o.left,top:o.top,right:o.right,bottom:o.bottom}};});assert.deepEqual(vv.panel,[12,132,360,284]);assert(vv.orb.left>=11&&vv.orb.right<=373&&vv.orb.top>=131&&vv.orb.bottom<=417,JSON.stringify(vv));receipts.push('Native orb and actual panel both clamp safe-area and panned/reduced visualViewport; resize and scroll cancel old flights');await page.close();
page=await pageAt({width:1512,height:859},{reducedMotion:'reduce'});await returnWindow(page);await page.evaluate(()=>{window.animationCount=0;const a=Element.prototype.animate;Element.prototype.animate=function(...args){animationCount++;return a.apply(this,args);};});await openNative(page);assert.equal(await page.evaluate(()=>animationCount),0);await returnWindow(page);assert.equal(await page.evaluate(()=>animationCount),0);receipts.push('Reduced motion skips all window/hero animation and retains open/close/focus lifecycle');
await page.evaluate(async()=>{await presentationTest.source.dispose();window.isolatedOpenCount=0;window.isolated=presentationTest.isolatedLauncher(()=>isolatedOpenCount++);});await page.evaluate(()=>{isolated.dispose();dispatchEvent(new Event('resize'));dispatchEvent(new Event('orientationchange'));});assert.equal(await page.locator(native).count(),0);assert.equal(await page.locator('style').filter({hasText:'--mm-native-motion-open'}).count(),0);receipts.push('Dispose removes owned launcher/styles and viewport listeners; no animation residue on later resize');await page.close();
// Drag screenshot comes from the unchanged rAF/local reorder flow in production UI.
page=await pageAt();r=await page.locator('.mm-card[data-id=a] .mm-card-title').boundingBox();await page.mouse.move(r.x+5,r.y+5);await page.mouse.down();await page.mouse.move(r.x+8,r.y+90,{steps:5});await page.locator('.mm-drag-ghost').waitFor();await shot(page,'06-desktop-drag.png');assert.equal(await page.evaluate(()=>reorderTest.calls.length),0);await page.mouse.up();assert.equal(await page.evaluate(()=>reorderTest.calls.length),0);receipts.push('Drag Ghost / local rAF reorder persists, pointermove/drop perform zero adapter I/O');await page.close();
assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);receipts.push('No uncaught page errors, telemetry, CDN or remote asset requests in synthetic browser review');
const result={kind:'offline production UI with synthetic adapter and pinned real Hub contracts',realHost:false,physicalMobile:false,passed:receipts.length,pageErrors:errors.length,externalRequests:requests.length,receipts,screenshots,hubCommit:fixture.commit,shortcutSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'fixtures/hub-v1-shortcut-launchers.js'))).digest('hex')};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
