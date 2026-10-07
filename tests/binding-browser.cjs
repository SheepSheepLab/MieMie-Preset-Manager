// SPDX-License-Identifier: GPL-3.0-or-later
// Synthetic offline browser review. No ST/Hub real-host acceptance claim.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'evidence','perchat-phase-a');
const url=pathToFileURL(path.join(root,'delivery','preview.html')).href+'?binding=1';
const {hubCode}=require('./helpers/hub-binding-browser.cjs');
const checks=[],screenshots=[],errors=[];fs.mkdirSync(out,{recursive:true});
function pass(label){checks.push(label);}
(async()=>{
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('.mm-card').first().waitFor();
  const ready=()=>page.waitForFunction(()=>window.__MieMieBindingDemo.binding.state.status==='ready');await ready();
  const shot=async name=>{const filename='binding-'+name+'.png';await page.screenshot({path:path.join(out,filename)});screenshots.push(filename);};
  const select=page.getByRole('combobox',{name:'当前使用预设',exact:true});
  const indicator=()=>page.locator('.mm-default');
  assert.equal(await page.locator('.mm-preset-control select').count(),1);
  assert.equal(await page.locator('.mm-preset-control .mm-default').count(),1);
  assert(await indicator().evaluate(e=>{const s=getComputedStyle(e),frame=e.closest('.mm-preset-control'),f=frame.getBoundingClientRect(),r=e.getBoundingClientRect();return s.backgroundColor!==getComputedStyle(frame).backgroundColor&&s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.borderTopLeftRadius==='0px'&&s.borderBottomLeftRadius==='0px'&&parseFloat(s.borderTopRightRadius)>0&&Math.abs(r.top-f.top)<=1.1&&Math.abs(r.bottom-f.bottom)<=1.1;}));pass('默认按钮常驻色块，左侧平直、右侧贴合外框且填满高度');
  await page.locator('.mm-preset-control').screenshot({path:path.join(out,'binding-default-segment.png')});screenshots.push('binding-default-segment.png');
  await select.focus();
  assert(await select.evaluate(e=>{const frame=e.closest('.mm-preset-control'),r=e.getBoundingClientRect(),outer=frame.getBoundingClientRect();return Math.abs(r.left-outer.left)<=1.1&&Math.abs(r.right-outer.right)<=1.1&&getComputedStyle(frame).outlineStyle==='none'&&getComputedStyle(e).outlineStyle==='none';}));pass('完整外框宽度原生选择，不因保留焦点留下常亮边框');
  await shot('preset-full-frame');
  await select.focus();await page.keyboard.press('Tab');assert(await indicator().evaluate(e=>e===document.activeElement));assert(await indicator().evaluate(e=>getComputedStyle(e.closest('.mm-preset-control')).outlineStyle==='solid'));pass('选择框与默认按钮共用外框，键盘分别可达且保留焦点提示');
  assert.equal(await page.locator('.mm-actions > [aria-label="导出完整预设"],.mm-actions > [aria-label="复制当前预设"]').count(),0);
  await page.getByRole('button',{name:'更多预设操作',exact:true}).click();
  for(const name of ['导出完整预设','复制当前预设'])assert(await page.locator('.mm-menu').getByRole('button',{name,exact:true}).isVisible());
  await shot('preset-menu');
  await page.getByRole('button',{name:'更多预设操作',exact:true}).click();pass('导出与复制当前预设只在更多菜单显示');
  assert.equal(await indicator().getAttribute('aria-pressed'),'true');assert(await indicator().locator('svg circle').isVisible());pass('默认预设中心点和 aria-pressed');
  assert((await page.locator('.mm-preset-label').innerText()).includes('跟随默认'));pass('inherit badge');await shot('inherit');
  await page.evaluate(()=>window.__MieMieBindingDemo.chat(null));await ready();await shot('no-chat-default');
  assert((await page.locator('.mm-preset-label').innerText()).includes('无对话'));pass('无对话 Default');
  await page.evaluate(()=>window.__MieMieBindingDemo.chat('one'));await ready();
  await select.selectOption('轻量 · 示例预设');await ready();
  assert(await select.evaluate(e=>getComputedStyle(e.closest('.mm-preset-control')).outlineStyle==='none'));pass('选择预设后共享边框立即恢复普通状态');
  await page.locator('.mm-preset-control').screenshot({path:path.join(out,'binding-selector-confirmed.png')});screenshots.push('binding-selector-confirmed.png');
  assert.equal(await indicator().getAttribute('aria-pressed'),'false');assert(!(await indicator().locator('svg circle').isVisible()));
  assert((await page.locator('.mm-preset-label').innerText()).includes('此对话'));pass('Override 空心 Default Indicator');await shot('override');
  await indicator().focus();await page.keyboard.press('Enter');await ready();
  assert.equal(await indicator().getAttribute('aria-pressed'),'true');assert((await page.locator('.mm-preset-label').innerText()).includes('跟随默认'));pass('键盘 Set Default 清除匹配 override');await shot('set-default');
  await select.selectOption('星夜 · 示例预设');await ready();await page.getByRole('button',{name:'更多预设操作',exact:true}).click();
  assert.equal(await page.locator('.mm-menu').getByRole('button',{name:'此对话跟随默认',exact:true}).count(),0);
  await page.getByRole('button',{name:'更多预设操作',exact:true}).click();await select.selectOption('轻量 · 示例预设');await ready();
  assert((await page.locator('.mm-preset-label').innerText()).includes('跟随默认'));pass('删除重复菜单，通过选择默认预设恢复跟随');
  await page.evaluate(()=>window.__MieMieBindingDemo.missing());await ready();
  assert((await page.locator('.mm-preset-label').innerText()).includes('绑定缺失'));assert((await page.locator('.mm-footer .mm-hint').innerText()).includes('不存在'));pass('Missing fallback badge/footer');await shot('missing');
  await page.evaluate(()=>window.__MieMieBindingDemo.external());await ready();
  assert.equal(await select.inputValue(),'轻量 · 示例预设');pass('Native deviation restores binding fallback, no temporary state');await shot('native-reconciled');
  await page.locator('.mm-card[data-id="demo-0"]').getByRole('button',{name:'编辑条目',exact:true}).click();
  await page.getByRole('dialog',{name:'编辑条目',exact:true}).getByLabel('标题',{exact:true}).fill('合成未保存草稿');
  await page.evaluate(()=>window.__MieMieBindingDemo.chat('two'));
  await page.waitForFunction(()=>window.__MieMieBindingDemo.binding.state.status==='paused-dirty');
  assert((await page.locator('.mm-footer .mm-hint').innerText()).includes('处理后'));pass('Dirty 原会话保留与 footer 提示');await shot('dirty-editor');
  await page.getByRole('dialog',{name:'编辑条目',exact:true}).getByRole('button',{name:'保存',exact:true}).click();
  assert.equal(await page.evaluate(()=>__MieMieBindingDemo.binding.state.status),'paused-dirty');await shot('dirty-paused');
  await page.getByRole('button',{name:'重新读取实际状态',exact:true}).click();
  await page.getByRole('dialog',{name:'重新读取实际状态',exact:true}).getByRole('button',{name:'重新读取',exact:true}).click();await ready();pass('Dirty 重读确认后只协调最新聊天');
  for(const size of [{width:600,height:840},{width:390,height:844},{width:320,height:640},{width:600,height:360}]){
   await page.setViewportSize(size);await page.waitForTimeout(60);
   const layout=await page.evaluate(()=>{const panel=document.querySelector('.miemie-pm'),toolbar=document.querySelector('.mm-toolbar');
    const p=panel.getBoundingClientRect();return{overflow:toolbar.scrollWidth>toolbar.clientWidth+1,controls:[...toolbar.querySelectorAll('button,select')].filter(e=>!e.closest('[hidden]')).map(e=>{const r=e.getBoundingClientRect();return{name:e.getAttribute('aria-label'),presetControl:e.closest('.mm-preset-control')!==null,w:r.width,h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,inside:r.left>=p.left&&r.right<=p.right+1};})};});
   assert.equal(layout.overflow,false,JSON.stringify(layout));for(const control of layout.controls){assert(control.inside,JSON.stringify(control));assert(control.w>=43.9&&control.h>=43.9,JSON.stringify(control));}
   assert(await indicator().evaluate(e=>{const outer=e.closest('.mm-preset-control').getBoundingClientRect(),r=e.getBoundingClientRect();return r.left>=outer.left&&r.right<=outer.right&&r.top>=outer.top&&r.bottom<=outer.bottom;}),'Default remains inside the unified preset border');
   for(let i=0;i<layout.controls.length;i++)for(let j=i+1;j<layout.controls.length;j++){const a=layout.controls[i],b=layout.controls[j];if(a.presetControl&&b.presetControl)continue;assert(!(Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1),JSON.stringify({overlap:[a,b]}));}
   assert(await select.evaluate(e=>{const frame=e.closest('.mm-preset-control'),button=frame.querySelector('.mm-default'),r=e.getBoundingClientRect(),outer=frame.getBoundingClientRect(),b=button.getBoundingClientRect();const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return Math.abs(r.right-outer.right)<=1.1&&parseFloat(getComputedStyle(e).paddingRight)>=b.width+24&&(hit===button||button.contains(hit))&&document.elementFromPoint(b.left-16,b.top+b.height/2)===e;}),'Full-width selector retains distinct reachable selection and default hit regions');
   await indicator().focus();assert(await indicator().evaluate(e=>e===document.activeElement));pass(`响应式 ${size.width}×${size.height}: 无溢出/重叠，44px，焦点`);
   if(size.width===390||size.width===320)await shot('mobile-'+size.width);
  }
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button',{name:'关闭预设管理',exact:true}).click();await page.locator('.miemie-pm').waitFor({state:'hidden'});
  await page.evaluate(()=>__MieMieBindingDemo.chat('one'));await ready();
  assert.equal(await page.evaluate(()=>__MieMieBindingDemo.binding.state.chat.filename),'one');pass('Panel closed: binding remains active');
  await page.addScriptTag({content:hubCode()});
  await page.evaluate(async()=>{
    window.presentationTest=__MieMieBindingDemo;window.pinnedHub=createPinnedHub();window.__MieMieHub=pinnedHub.hub;
    dispatchEvent(new CustomEvent('miemie:hub-ready'));await __MieMieBindingDemo.source.settled();
    window.bindingRefs={controller:__MieMieBindingDemo.controller,binding:__MieMieBindingDemo.binding,panel:__MieMieBindingDemo.view.panel};
    await pinnedHub.honeycomb();
  });
  await page.locator('.miemie-pm').waitFor({state:'visible'});
  await page.locator('.mm-card[data-id="demo-0"]').getByRole('button',{name:'编辑条目',exact:true}).click();
  await page.getByRole('dialog',{name:'编辑条目',exact:true}).getByLabel('标题',{exact:true}).fill('Hub 合成草稿');
  await page.evaluate(()=>__MieMieBindingDemo.chat('two'));
  await page.waitForFunction(()=>__MieMieBindingDemo.binding.state.status==='paused-dirty');
  await page.evaluate(()=>pinnedHub.surface.close('panel:miemie.preset-manager'));
  await page.evaluate(()=>pinnedHub.honeycomb());
  assert.equal(await page.getByRole('dialog',{name:'编辑条目',exact:true}).getByLabel('标题',{exact:true}).inputValue(),'Hub 合成草稿');pass('Hub formal close/reopen preserves single dirty session');
  await page.evaluate(async()=>{await pinnedHub.dispose();delete window.__MieMieHub;dispatchEvent(new CustomEvent('miemie:hub-disposed',{detail:pinnedHub.hub}));await __MieMieBindingDemo.source.settled();});
  assert.equal(await page.evaluate(()=>__MieMieBindingDemo.binding.state.status),'paused-dirty');
  assert.equal(await page.locator('[data-miemie-preset-manager-standalone]').count(),1);
  await page.evaluate(async()=>{window.pinnedHub=createPinnedHub();window.__MieMieHub=pinnedHub.hub;dispatchEvent(new CustomEvent('miemie:hub-ready'));dispatchEvent(new CustomEvent('miemie:hub-ready'));await __MieMieBindingDemo.source.settled();await pinnedHub.honeycomb();});
  assert(await page.evaluate(()=>bindingRefs.controller===__MieMieBindingDemo.controller&&bindingRefs.binding===__MieMieBindingDemo.binding&&bindingRefs.panel===__MieMieBindingDemo.view.panel));
  assert.equal(await page.locator('.miemie-pm').count(),1);assert.equal(await page.locator('[data-miemie-preset-manager-standalone]').count(),0);
  assert.deepEqual(await page.evaluate(()=>pinnedHub.counts()),{factoryCount:1,attachCount:1,closeCount:0,paused:true});
  assert.equal(await page.getByRole('dialog',{name:'编辑条目',exact:true}).getByLabel('标题',{exact:true}).inputValue(),'Hub 合成草稿');pass('Hub dispose/ready/repeated-ready: binding and draft survive, one instance');
  await page.getByRole('dialog',{name:'编辑条目',exact:true}).getByRole('button',{name:'取消',exact:true}).click();await ready();
  await page.getByRole('button',{name:'关闭预设管理',exact:true}).click();
  await page.waitForFunction(()=>pinnedHub.surface.state==='menu');assert.equal(await page.evaluate(()=>pinnedHub.counts().closeCount),1);assert.equal(await page.evaluate(()=>pinnedHub.counts().paused),false);pass('Hub UI closes through closePanel and restores Launcher');
  await page.evaluate(()=>__MieMieBindingDemo.chat('one'));await ready();assert.equal(await page.evaluate(()=>__MieMieBindingDemo.binding.state.chat.filename),'one');
  await page.evaluate(async()=>{await pinnedHub.dispose();delete window.__MieMieHub;dispatchEvent(new CustomEvent('miemie:hub-disposed',{detail:pinnedHub.hub}));await __MieMieBindingDemo.source.settled();});
  assert.equal(await page.locator('.miemie-pm').count(),1);assert.equal(await page.locator('[data-miemie-preset-manager-standalone]').count(),1);pass('Standalone 单面板与正式 PNG');
  assert.deepEqual(errors,[]);pass('零页面错误');
  const report={kind:'offline synthetic binding preview',realHost:false,passed:checks.length,pageErrors:errors,checks,screenshots};
  fs.writeFileSync(path.join(out,'binding-browser-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
