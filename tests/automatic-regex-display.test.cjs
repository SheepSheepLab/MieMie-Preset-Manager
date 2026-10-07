// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {automaticRegexDisplay}=require('../.test-build/automatic-regex-display.js');
const fixtures=require('./fixtures/st-regex-contracts.json');
function setup(baseline){
 const notices=[],html=[],timers=new Map();let allowed=true,permissions=0,loads=0,reloads=0,valid=true;
 const name="测试<&'Preset",chat=[{mes:'old text',name:'synthetic',is_user:false,extra:{keep:true}}];
 const t=(strings,...values)=>strings.reduce((s,v,i)=>s+v+(values[i]??''),'');
 const reloadCurrentChat=()=>{reloads++;};
 const original=(...args)=>notices.push(args),toast={info:original};
 const mes={find:()=>({html:value=>html.push(value)})};
 const deps={toastr:toast,t,reloadCurrentChat,getCurrentPresetAPI:()=> 'openai',getCurrentPresetName:()=>name,
 getCurrentChatId:()=> 'one',getScriptsByType:()=>[{disabled:false}],SCRIPT_TYPES:{PRESET:1},isPresetScriptsAllowed:()=>allowed,
 accountStorage:{getItem:()=>null,setItem:()=>{}},renderExtensionTemplateAsync:async()=>'<synthetic permission>',
 callGenericPopup:async()=>{permissions++;return true;},POPUP_TYPE:{CONFIRM:1},allowPresetScripts:()=>{allowed=true;},
 loadRegexScripts:async()=>{loads++;},escapeHtml:s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'),
 chatElement:{find:()=>mes},messageFormatting:text=>text.replace('old','new'),updateReasoningUI:()=>{},addCopyToCodeBlocks:()=>{},appendMediaToMessage:message=>{message.extra.nativeNormalization=true;}};
 const source=baseline.sources.flatMap(s=>Object.values(s.snippets)).map(s=>s.text.replace(/^export /,'')).join('\n');
 const native=vm.runInNewContext(source+'\n({checkPresetEmbeddedRegexScripts,notifyReloadCurrentChat,updateMessageBlock})',deps);
 const ctx={chat,t,reloadCurrentChat,updateMessageBlock:native.updateMessageBlock};
 const root={querySelectorAll:selector=>selector.includes('textarea')?[]:[{getAttribute:()=> '0'}]};
 const host={toastr:toast,document:{querySelector:()=>root},setTimeout:(fn,delay)=>{const id=timers.size+1;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)};
 const run=action=>automaticRegexDisplay(host,()=>ctx,name,()=>valid,action??native.checkPresetEmbeddedRegexScripts);
 return {host,ctx,toast,notices,html,chat,native,run,original,timers,name, get permissions(){return permissions;},get loads(){return loads;},get reloads(){return reloads;},invalidate(){valid=false;},unauthorized(){allowed=false;}};
}
for(const baseline of fixtures.baselines){
 const label=`Regex native ${baseline.version} (mocked dependencies): `;
 test(label+'auto switch defers exact authorized notice, redraws without chat reload or raw mutation',async()=>{
  const f=setup(baseline),before=structuredClone(f.chat);await f.run();assert.equal(f.notices.length,0);assert.deepEqual(f.html,['new text']);assert.deepEqual(f.chat,before);assert.equal(f.loads,1);assert.equal(f.reloads,0);assert.equal(f.toast.info,f.original);assert.equal(f.timers.size,0);
 });
 test(label+'manual selection preserves native notice',async()=>{const f=setup(baseline);await f.native.checkPresetEmbeddedRegexScripts();assert.equal(f.notices.length,1);assert.deepEqual(f.html,[]);});
 test(label+'first permission remains native including accepted reload',async()=>{const f=setup(baseline);f.unauthorized();await f.run();assert.equal(f.permissions,1);assert.equal(f.reloads,1);assert.equal(f.loads,1);});
 test(label+'unrelated info and another preset notification are not swallowed',async()=>{const f=setup(baseline);await f.run(async()=>{f.toast.info('unrelated','title',{});f.native.notifyReloadCurrentChat('another');});assert.equal(f.notices.length,2);assert.deepEqual(f.html,[]);});
 test(label+'changed chat/session restores notice without redrawing',async()=>{const f=setup(baseline);await f.run(async()=>{await f.native.checkPresetEmbeddedRegexScripts();f.invalidate();});assert.equal(f.notices.length,1);assert.deepEqual(f.html,[]);assert.equal(f.toast.info,f.original);});
 test(label+'unsupported host and active message editor retain notice',async()=>{for(const mode of ['unsupported','editor']){const f=setup(baseline);if(mode==='unsupported')delete f.ctx.updateMessageBlock;else f.host.document.querySelector=()=>({querySelectorAll:()=>[{getClientRects:()=>[{}]}]});await f.run();assert.equal(f.notices.length,1);assert.equal(f.toast.info,f.original);}});
 test(label+'display failure replays notice without failing a confirmed preset selection',async()=>{const f=setup(baseline);f.ctx.updateMessageBlock=()=>{throw Error('display failed');};const result=await f.run(async()=>{await f.native.checkPresetEmbeddedRegexScripts();return 42;});assert.equal(result,42);assert.equal(f.notices.length,1);assert.equal(f.toast.info,f.original);});
 test(label+'selection reject restores notice and original toast',async()=>{const f=setup(baseline);await assert.rejects(f.run(async()=>{await f.native.checkPresetEmbeddedRegexScripts();throw Error('select failed');}));assert.equal(f.notices.length,1);assert.equal(f.toast.info,f.original);});
 test(label+'dispose detaches pending hook immediately',async()=>{const f=setup(baseline),lifetime=new AbortController();await automaticRegexDisplay(f.host,()=>f.ctx,f.name,()=>true,async()=>{await f.native.checkPresetEmbeddedRegexScripts();lifetime.abort();assert.equal(f.toast.info,f.original);},lifetime.signal);assert.equal(f.notices.length,1);assert.deepEqual(f.html,[]);});
 test(label+'timeout detaches hook and forwards subsequent notice',async()=>{const f=setup(baseline);await f.run(async()=>{await f.native.checkPresetEmbeddedRegexScripts();[...f.timers.values()].find(t=>t.delay===20000).fn();f.native.notifyReloadCurrentChat(f.name);});assert.equal(f.notices.length,2);assert.equal(f.toast.info,f.original);assert.deepEqual(f.html,[]);});
}
