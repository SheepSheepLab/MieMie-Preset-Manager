// SPDX-License-Identifier: GPL-3.0-or-later
const test = require('node:test');
const assert = require('node:assert/strict');
const { bindingNativeHost, NS } = require('./helpers/binding-native-host.cjs');
const { createBindingHost } = require('../.test-build/chat-binding-host.js');
const { createPresetBinding } = require('../.test-build/chat-preset-coordinator.js');
const { createSTAdapter } = require('../.test-build/st-adapter.js');
const { createController } = require('../.test-build/controller.js');
const core = require('../.test-build/preset-binding.js');
const turn = () => new Promise(resolve => setImmediate(resolve));
async function until(fn) { for(let i=0;i<1000;i++){ if(fn())return; await turn(); } throw Error('Fixture did not settle'); }
async function setup(t,version,preconfigure) {
  const f = await bindingNativeHost(version); preconfigure?.(f);
  const adapter = await createSTAdapter(f.host), host = createBindingHost(f.host);
  let controller; const binding = createPresetBinding(adapter,host,()=>controller?.state??{dirty:false,busy:false});
  controller=createController(binding.adapter,binding); const off=controller.subscribe(()=>binding.workChanged());
  t.after(()=>{off();binding.dispose();controller.dispose();f.cleanup();});
  await binding.start(); await controller.refresh();
  const settle=async()=>{await until(()=>['ready','error','paused-dirty'].includes(binding.state.status));await turn();await controller.refresh();};
  return {...f,adapter,hostAdapter:host,binding,controller,settle};
}

for(const version of ['1.18.0','1.19.0'])test('Same-chat reload must supersede canceled old read '+version,async t=>{
 const f=await setup(t,version);const original=f.host.fetch;let entered=false,release;const wait=new Promise(r=>release=r);
 f.host.fetch=async(url,init)=>{if(new URL(url).pathname==='/api/chats/get'&&JSON.parse(init.body).file_name==='two'&&!entered){entered=true;await wait;}return original(url,init)};
 await f.changeChat('single','two');await until(()=>entered);
 await f.changeChat('single','two');release();await f.settle();
 const state=structuredClone(f.binding.state),file=structuredClone(f.files.get('single:two'));
 let generateOutcome;try{await f.generate();generateOutcome='sent'}catch(e){generateOutcome=e.message}
 console.log(JSON.stringify({version,state,file,generateOutcome,afterGenerate:f.binding.state}));
 assert.equal(state.status,'ready','latest same-chat lifecycle must not be stranded by canceled previous read');
});

async function rename(f,kind,from,to,active=true) {
 const old=kind+':'+from,newKey=kind+':'+to;
 f.files.set(newKey,structuredClone(f.files.get(old)));f.files.delete(old);
 f.metadata.set(newKey,structuredClone(f.files.get(newKey)));f.metadata.delete(old);
 if(active)await f.changeChat(kind,to);
 await f.events.emit('chat-renamed',{avatarId:'synthetic.png',groupId:kind==='group'?'group-1':null,oldFileName:from+'.jsonl',newFileName:to+'.jsonl'});
}
for(const version of ['1.18.0','1.19.0']) {
 for(const kind of ['single','group'])test(`R-01 ${version} ${kind}: native rename retains binding, copy and new chat independent`,async t=>{
  const f=await setup(t,version);if(kind==='group'){await f.changeChat(kind,'one');await f.settle();}
  await f.controller.select('B');await f.settle();
  const original=structuredClone(f.files.get(kind+':one')),id=original[NS].presetBindingId;
  await rename(f,kind,'one','renamed');await f.settle();
  assert.equal(f.binding.state.status,'ready');assert.equal(f.live.preset_settings_openai,'B');
  const saved=f.files.get(kind+':renamed');assert.equal(saved[NS].presetBindingId,id);assert.equal(JSON.parse(saved[NS].chatKey)[2],'renamed');
  assert.deepEqual({...saved,[NS]:null},{...original,[NS]:null});assert(!f.diskGlobal()[NS].chatRenames);
  await f.generate();assert.equal(f.controls.sent.length,1);
  // Reopen and reload never uses the default A.
  await f.changeChat(kind,'two');await f.settle();await f.changeChat(kind,'renamed');await f.settle();
  assert.equal(f.live.preset_settings_openai,'B');
  f.files.set(kind+':copy',structuredClone(saved));f.metadata.set(kind+':copy',structuredClone(saved));
  await f.changeChat(kind,'copy');await f.settle();assert.equal(f.live.preset_settings_openai,'A');
  assert.notEqual(f.files.get(kind+':copy')[NS].presetBindingId,id);
  await f.changeChat(kind,'three');await f.settle();assert.equal(f.live.preset_settings_openai,'A');
 });
 test(`R-01 ${version}: inactive rename chain durable receipt, retained until target opens`,async t=>{
  const f=await setup(t,version);await f.controller.select('B');await f.settle();const id=f.files.get('single:one')[NS].presetBindingId;
  await f.changeChat('single','two');await f.settle();const other=structuredClone(f.files.get('single:two'));
  await rename(f,'single','one','new1',false);await rename(f,'single','new1','new2',false);
  assert.equal(Object.keys(f.diskGlobal()[NS].chatRenames).length,1);assert.deepEqual(f.files.get('single:two'),other);
  await f.binding.reconcile();await f.changeChat('single','new2');await f.settle();
  assert.equal(f.live.preset_settings_openai,'B');assert.equal(f.files.get('single:new2')[NS].presetBindingId,id);assert(!f.diskGlobal()[NS].chatRenames);
 });
 test(`R-01 ${version}: missing source without native receipt cannot overwrite or inherit`,async t=>{
  const f=await setup(t,version);await f.controller.select('B');await f.settle();const saved=structuredClone(f.files.get('single:one'));
  f.files.set('single:orphan',structuredClone(saved));f.metadata.set('single:orphan',structuredClone(saved));f.files.delete('single:one');
  await f.changeChat('single','orphan');await f.settle();assert.equal(f.binding.state.status,'error');assert.deepEqual(f.files.get('single:orphan'),saved);
  await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);
 });
 test(`N-02 ${version}: repeated native completions share outstanding application's absolute deadline`,async t=>{
  const f=await setup(t,version);const original=f.host.setTimeout;const originalNow=Date.now;
  let now=originalNow(),timers=[];Date.now=()=>now;t.after(()=>{Date.now=originalNow});
  f.host.setTimeout=(fn,ms)=>{if(ms>100&&ms<=20000){timers.push({fn,ms});return 123456;}return original(fn,ms)};
  await f.events.emit('before',{presetName:'A'});await until(()=>timers.length===1);
  now+=1000;for(let i=0;i<6;i++){await f.events.emit('before',{presetName:'B'});await f.events.emit('changed',{apiId:'openai',name:'B'});}
  now+=19000;timers[0].fn();await until(()=>f.binding.state.status==='error');
  assert.equal(timers.length,1,'expired operation must not create a fresh 20s deadline');assert.match(f.binding.state.error,/持续应用|连续变化/);
  await f.events.emit('changed',{apiId:'openai',name:'A'});await f.settle();assert.equal(f.binding.state.status,'ready');
 });
}

for(const version of ['1.18.0','1.19.0'])test(`No-chat ${version}: retained previous metadata is not a copy identity`,async t=>{
 const f=await setup(t,version);await f.controller.select('B');await f.settle();
 const before=structuredClone([...f.files]),metadata=f.host.SillyTavern.getContext().chatMetadata,original=f.host.SillyTavern.getContext;
 f.host.SillyTavern.getContext=()=>{const c=original();return c.chatId?c:{...c,chatMetadata:metadata}};
 await f.changeChat('none');await f.settle();assert.equal(f.binding.state.status,'ready');assert.equal(f.live.preset_settings_openai,'A');
 assert.deepEqual([...f.files],before);await f.manual('B');await f.settle();assert.equal(f.binding.state.defaultName,'B');
});
