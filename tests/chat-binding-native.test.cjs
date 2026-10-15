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
// Closeout policies operate on prompt raw data, never on preset binding identity.
for (const version of ['1.18.0','1.19.0']) {
  for (const action of ['copy','detach','delete']) for (const finish of ['save','discard']) {
    test(`Prompt ${action} ${version}: binding identity unchanged, dirty switch gated, ${finish} resolves latest chat`, async t => {
      const f=await setup(t,version);
      await f.controller.select('B');await f.settle();
      await f.changeChat('single','two');await f.settle(); // editing A; one overrides B
      const registry=structuredClone(f.diskGlobal()[NS]), chats=structuredClone([...f.files]), b=structuredClone(f.records.get('B'));
      const writes=()=>f.controls.http.filter(x=>x.pathname==='/api/presets/save').length;
      const startWrites=writes(), settings=f.controls.settingsSaved, metadata=f.controls.metadataSaved.length;
      if(action==='copy')await f.controller.copyPrompt('custom');
      else {await f.controller.detach('custom');if(action==='delete')await f.controller.deletePrompt('custom');}
      assert.equal(f.controller.state.error,'');assert(f.controller.state.dirty);assert(f.controller.state.pendingRaw);
      const pending=structuredClone(f.controller.state.pendingRaw), anchor=structuredClone(f.controller.state.snapshot);
      assert.equal(writes(),startWrites);assert.equal(f.controls.settingsSaved,settings);assert.equal(f.controls.metadataSaved.length,metadata);
      assert.deepEqual(f.diskGlobal()[NS],registry);assert.deepEqual([...f.files],chats);assert.equal(f.binding.state.targetName,'A');
      await f.changeChat('single','three');await f.changeChat('single','one');await f.settle(); // latest B only
      assert.equal(f.binding.state.status,'paused-dirty');assert.deepEqual(f.controller.state.snapshot,anchor);
      assert.deepEqual(f.controller.state.pendingRaw,pending);assert.equal(f.live.preset_settings_openai,'A');
      await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);assert.equal(writes(),startWrites);
      if(finish==='save')await f.controller.saveChanges();else f.controller.cancelChanges();
      await f.settle();assert.equal(f.controller.state.dirty,false);assert.equal(f.binding.state.status,'ready');
      assert.equal(f.binding.state.chat.filename,'one');assert.equal(f.binding.state.targetName,'B');assert.equal(f.live.preset_settings_openai,'B');
      assert.deepEqual(f.records.get('B'),b);assert.deepEqual(f.diskGlobal()[NS],registry);assert.deepEqual([...f.files],chats);
      assert.equal(writes(),startWrites+(finish==='save'?1:0));
      assert.deepEqual(f.records.get('A'),finish==='save'?pending:anchor.raw);
      await f.generate();assert.equal(f.controls.sent.length,1);
    });
  }
  for(const attrs of [{marker:true},{identifier:'jailbreak'}]) {
    test(`Special detach ${version} ${JSON.stringify(attrs)}: native save/readback/apply and generation gate retained`,async t=>{
      const id=attrs.identifier??'custom';
      const f=await setup(t,version,f=>{
        const raw=structuredClone(f.records.get('A'));Object.assign(raw.prompts.find(p=>p.identifier==='custom'),attrs);
        for(const g of raw.prompt_order)for(const e of g.order)if(e.identifier==='custom')e.identifier=id;
        f.records.set('A',structuredClone(raw));f.presets[f.names.A]=structuredClone(raw);
        f.live.prompts=structuredClone(raw.prompts);f.live.prompt_order=structuredClone(raw.prompt_order);
      });
      const original=structuredClone(f.records.get('A')), registry=structuredClone(f.diskGlobal()[NS]);
      await f.controller.detach(id);assert.equal(f.controller.state.error,'');const pending=structuredClone(f.controller.state.pendingRaw);
      assert.deepEqual(pending.prompts,original.prompts);assert(f.controller.state.dirty);
      const held=f.gate('before');const saving=f.controller.saveChanges();await held.entered;
      await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);
      held.release();held.remove();await saving;await f.settle();
      assert.equal(f.controller.state.error,'');assert.equal(f.binding.state.status,'ready');assert.equal(f.binding.state.targetName,'A');
      assert.deepEqual(f.records.get('A'),pending);assert.deepEqual(f.controller.state.snapshot.raw,pending);
      assert.deepEqual(f.live.prompts,pending.prompts);assert.deepEqual(f.live.prompt_order,pending.prompt_order);assert.deepEqual(f.diskGlobal()[NS],registry);
      await f.generate();assert.equal(f.controls.sent.length,1);
    });
  }
}

for(const version of ['1.18.0','1.19.0']) {
 const label=`v0.6 native contract ${version}: `;
 const bindingName=f=>f.diskGlobal()[NS].bindings[f.files.get(f.current().kind+':'+f.current().filename)[NS].presetBindingId].nativeName;
 test(label+'every chat persists default; choosing default keeps independent binding',async t=>{
  const f=await setup(t,version);assert.equal(f.binding.state.status,'ready');assert.equal(bindingName(f),'A');
  const id=f.files.get('single:one')[NS].presetBindingId;
  await f.controller.select('B');await f.settle();await f.controller.select('A');await f.settle();assert.equal(f.files.get('single:one')[NS].presetBindingId,id);
  await f.changeChat('none');await f.settle();await f.manual('B');await f.settle();assert.equal(f.binding.state.defaultName,'B');
  await f.changeChat('single','two');await f.settle();assert.equal(bindingName(f),'B');
  await f.changeChat('single','one');await f.settle();assert.equal(bindingName(f),'A');assert.equal(f.live.preset_settings_openai,'A');
  assert.deepEqual(f.diskGlobal().unrelated_extension,{preserved:true});assert.deepEqual(f.files.get('single:one').unrelated,{keep:'one'});
 });
 test(label+'native A B A updates chat even with panel closed; no redundant apply',async t=>{
  const f=await setup(t,version);const count=f.controls.changes.length;
  await f.manual('B');await f.settle();assert.equal(bindingName(f),'B');
  await f.manual('A');await f.settle();assert.equal(bindingName(f),'A');assert.equal(f.controls.changes.length,count+2);
 });
 test(label+'setting default never clears or edits any chat binding',async t=>{
  const f=await setup(t,version);await f.controller.select('B');await f.settle();const chats=structuredClone([...f.files]);
  await f.binding.setDefault();await f.settle();assert.equal(f.binding.state.defaultName,'B');assert.deepEqual([...f.files],chats);
 });
 test(label+'native auto select within chat lifecycle cannot overwrite saved target',async t=>{
  const f=await setup(t,version);await f.controller.select('B');await f.settle();
  // The native listener predates the extension; recreate that ordering using its API.
  f.events.makeFirst('chat',f.autoSelect);
  // Reinstall host lifecycle bracket ahead of native auto-selection, as startup does.
  const listeners=f.emitter.events.chat;const begin=listeners.find(fn=>String(fn).includes('transition = true'));
  const end=listeners.find(fn=>String(fn).includes('transition = false'));f.events.makeFirst('chat',begin);f.events.makeLast('chat',end);
  await f.changeChat('single','two');await f.settle();await f.changeChat('single','one');await f.settle();
  assert.equal(bindingName(f),'B');assert.equal(f.live.preset_settings_openai,'B');
 });
 test(label+'single/group identities and files keep separate persistent bindings',async t=>{
  const f=await setup(t,version);await f.controller.select('B');await f.settle();const one=structuredClone(f.files.get('single:one'));
  await f.changeChat('group','one');await f.settle();assert.equal(bindingName(f),'A');await f.controller.select('B');await f.settle();
  await f.changeChat('group','two');await f.settle();assert.equal(bindingName(f),'A');assert.deepEqual(f.files.get('single:one'),one);
 });
 test(label+'confirmed deletion persists fallback; later default does not move it',async t=>{
  const f=await setup(t,version);await f.controller.select('B');await f.settle();const old=f.files.get('single:one')[NS].presetBindingId;
  await f.controller.deletePreset();await f.settle();assert.equal(bindingName(f),'A');assert.notEqual(f.files.get('single:one')[NS].presetBindingId,old);assert(f.diskGlobal()[NS].bindings[old].tombstone);
  await f.changeChat('none');await f.settle();await f.controller.newPreset('C');await f.settle();await f.changeChat('single','one');await f.settle();assert.equal(bindingName(f),'A');
 });
 test(label+'no-chat rename keeps selected and default identity',async t=>{
  const f=await setup(t,version);await f.changeChat('none');await f.settle();await f.controller.select('B');await f.settle();const id=f.diskGlobal()[NS].defaultBindingId;
  await f.controller.renamePreset('B2');await f.settle();assert.equal(f.live.preset_settings_openai,'B2');assert.equal(f.diskGlobal()[NS].defaultBindingId,id);assert.equal(f.diskGlobal()[NS].bindings[id].nativeName,'B2');
 });
 test(label+'read failure is never deletion and retry recovers',async t=>{
  const f=await setup(t,version);const before=structuredClone(f.diskGlobal()[NS]);f.faults.globalRead=true;await f.binding.reconcile();assert.equal(f.binding.state.status,'error');assert.deepEqual(f.diskGlobal()[NS],before);
  f.faults.globalRead=false;await f.binding.reconcile();await f.settle();await f.generate();assert.equal(f.controls.sent.length,1);
 });
 test(label+'old schema namespace is ignored, not removed',async t=>{
  const old={schemaVersion:1,garbage:'retain'};const f=await setup(t,version,f=>{f.globals['miemie.preset-manager']=old;f.setDiskGlobal(f.globals);});
  assert.equal(f.binding.state.status,'ready');assert.deepEqual(f.diskGlobal()['miemie.preset-manager'],old);assert.equal(bindingName(f),'A');
 });
 test(label+'slash without END then three normal attempts remain healthy',async t=>{
  const f=await setup(t,version);await f.generate();f.controls.slash=true;await f.generate();f.controls.slash=false;
  for(let i=0;i<3;i++)await f.generate();assert.equal(f.controls.sent.length,4);
 });
 test(label+'legal continuation without END starts a fresh safety check',async t=>{
  const f=await setup(t,version);await f.generation.Generate('normal');await f.generation.Generate('normal',{depth:1});assert.equal(f.controls.sent.length,2);
 });
 test(label+'first generation waits for new-chat reconciliation',async t=>{
  const f=await setup(t,version);await f.controller.select('B');await f.settle();await f.changeChat('single','two');await f.generate();
  assert.equal(f.controls.sent.length,1);assert.equal(f.controls.sent[0].prompts[0].content,'A');assert.equal(bindingName(f),'A');
 });
 test(label+'prepared stale request canceled by native selection',async t=>{
  const f=await setup(t,version),{deferred}=require('./helpers/st-native-host.cjs'),held=deferred();f.controls.prepareGate=held;
  let reached=false;f.events.on('commands',()=>{reached=true;});const generating=f.generate();void generating.catch(()=>{});await until(()=>reached);await turn();
  await f.manual('B');await f.settle();held.resolve();await assert.rejects(generating);assert.equal(f.controls.sent.length,0);
 });
 test(label+'write metadata across chat switch cannot migrate old namespace',async t=>{
  const f=await setup(t,version),target=f.hostAdapter.currentChat(),before=structuredClone(f.files.get('single:one'));const held=f.metadataGate();
  const next={...target.binding,presetBindingId:'another'};const promise=f.hostAdapter.writeChat(target.identity,target.binding,next);void promise.catch(()=>{});
  await until(()=>f.metadata.get('single:one')[NS].presetBindingId==='another');f.setChat('single','two');held.resolve();
  await assert.rejects(promise,/对话已切换/);assert.equal(f.files.get('single:two')[NS],undefined);assert.deepEqual(f.files.get('single:one'),before);
 });
 for(const fault of ['chatMismatch','chatSave','globalMismatch','globalSave'])test(label+fault+' does not claim success',async t=>{
  const f=await setup(t,version);f.faults[fault]=true;
  if(fault.startsWith('chat')){const target=f.hostAdapter.currentChat();await assert.rejects(f.hostAdapter.writeChat(target.identity,target.binding,{...target.binding,presetBindingId:'another'}));}
  else{const old=f.diskGlobal()[NS],next=structuredClone(old);next.revision++;await assert.rejects(f.hostAdapter.writeGlobal(old,next));}
 });
 test(label+'namespace conflict never overwrites external configuration',async t=>{
  const f=await setup(t,version),old=f.diskGlobal()[NS],external=structuredClone(f.diskGlobal());external[NS].revision++;f.setDiskGlobal(external);
  await assert.rejects(f.hostAdapter.writeGlobal(old,old));assert.deepEqual(f.diskGlobal(),external);
 });
 test(label+'fresh file copied metadata initializes current default instead of inherited old ID',async t=>{
  const f=await setup(t,version);await f.controller.select('B');await f.settle();f.metadata.set('single:two',structuredClone(f.metadata.get('single:one')));f.files.set('single:two',structuredClone(f.files.get('single:one')));
  await f.changeChat('single','two');await f.settle();assert.equal(bindingName(f),'A');assert.notEqual(f.files.get('single:one')[NS].chatKey,f.files.get('single:two')[NS].chatKey);
 });
}

for(const version of ['1.18.0','1.19.0']) test(`v0.6 lifecycle ${version}: aborted old chat read cannot strand the latest chat`,async t=>{
 const f=await setup(t,version);const original=f.host.fetch;let entered=false,release;
 const wait=new Promise(resolve=>release=resolve);
 f.host.fetch=async(url,init)=>{if(new URL(url).pathname==='/api/chats/get'&&JSON.parse(init.body).file_name==='two'&&!entered){entered=true;await wait;}return original(url,init);};
 await f.changeChat('single','two');await until(()=>entered);
 await f.changeChat('single','three');release();await f.settle();
 assert.equal(f.binding.state.status,'ready');assert.equal(f.binding.state.chat.filename,'three');
 assert.equal(f.files.get('single:two')[NS],undefined);
 assert.equal(f.files.get('single:three')[NS].chatKey,JSON.stringify(['single','synthetic.png','three']));
 await f.generate();assert.equal(f.controls.sent.length,1);
});
