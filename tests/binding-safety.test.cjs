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
for(const version of ['1.18.0','1.19.0']){const label='RESTORED SAFETY '+version+': ';
  test(label+'migration source read leaves binding/selection unchanged; comparison Dirty blocks generation and chat auto-select',async t=>{
    const f=await setup(t,version), c=f.controller, migration=c.migration;
    const registry=structuredClone(f.diskGlobal()[NS]), chats=structuredClone([...f.files]), snapshot=structuredClone(c.state.snapshot);
    const saved=f.controls.settingsSaved, metadata=f.controls.metadataSaved.length;
    assert(await migration.open());await migration.load('B');migration.select('custom');
    assert.deepEqual(c.state.snapshot,snapshot);assert.equal(f.native.manager.getSelectedPresetName(),'A');
    assert.deepEqual(f.diskGlobal()[NS],registry);assert.deepEqual([...f.files],chats);
    assert.equal(f.controls.settingsSaved,saved);assert.equal(f.controls.metadataSaved.length,metadata);
    migration.bridge();assert.equal(migration.state.step,'compare');migration.left('source temporary');assert.equal(c.state.dirty,false);
    await f.generate();assert.equal(f.controls.sent.length,1);
    migration.right('unconfirmed migrated draft');assert(c.state.dirty);assert.equal(c.state.pendingRaw,null);
    await assert.rejects(f.generate());assert.equal(f.controls.sent.length,1);
    f.setChat('single','two');await f.events.emit('chat');await until(()=>f.binding.state.status==='paused-dirty');
    assert.equal(f.native.manager.getSelectedPresetName(),'A');assert.equal(await migration.confirm(),false);
    migration.close();assert.equal(c.state.migrationDraft.content,'unconfirmed migrated draft');
    assert.deepEqual(f.records.get('A'),snapshot.raw);assert.deepEqual(f.files.get('single:one'),chats.find(([key])=>key==='single:one')[1]);
  });
  test(label+'I2 batch property/structure drafts block generation and automatic binding, cancel preserves earlier Pending',async t=>{
    const f=await setup(t,version),c=f.controller,m=c.migration;
    await c.toggle('custom');const before=structuredClone(c.state.pendingRaw);
    assert(await m.open());await m.load('B');m.select('main');m.select('custom');m.bridge();assert.equal(m.state.step,'batch');
    m.editItem('custom');m.patchRight({injection_depth:7,injection_order:20});assert(c.state.dirty);
    await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);assert(await m.confirm());
    assert.deepEqual(c.state.pendingRaw,before);await assert.rejects(f.generate());
    f.setChat('single','two');await f.events.emit('chat');await until(()=>f.binding.state.status==='paused-dirty');
    assert.equal(f.native.manager.getSelectedPresetName(),'A');assert.equal(await m.confirmBatch(),false);
    assert(m.state.batch.find(i=>i.sourceId==='custom').right.injection_depth===7);
    m.cancelBatch();assert.deepEqual(c.state.pendingRaw,before);assert(c.state.dirty);
  });
  test(label+'only automatic per-chat selection quiets native authorized regex notices',async t=>{
    const fixture=require('./fixtures/st-regex-contracts.json').baselines.find(b=>b.version===version);
    const notices=[],renders=[],chat=[{mes:'synthetic',extra:{keep:true}}];
    let nativeRegex;
    const f=await setup(t,version,f=>{
      const originalContext=f.host.SillyTavern.getContext;
      const t=(strings,...values)=>strings.reduce((s,v,i)=>s+v+(values[i]??''),'');
      const reloadCurrentChat=()=>{throw Error('must not reload chat');};
      f.host.toastr={info:(...args)=>notices.push(args)};
      f.host.document={querySelector:()=>({querySelectorAll:selector=>selector.includes('textarea')?[]:[{getAttribute:()=> '0'}]})};
      f.host.SillyTavern.getContext=()=>({...originalContext(),t,chat,reloadCurrentChat,updateMessageBlock:(_,message)=>renders.push(message)});
      const vm=require('node:vm');
      nativeRegex=vm.runInNewContext(fixture.sources[0].snippets.notifyReloadCurrentChat.text+';notifyReloadCurrentChat',
        {toastr:f.host.toastr,t,reloadCurrentChat,escapeHtml:s=>s});
      f.events.on('changed',payload=>{if(payload.apiId==='openai')nativeRegex(payload.name);});
    });
    await f.controller.select('B');await f.settle();assert.equal(notices.length,1);notices.length=0;
    await f.changeChat('single','two');await f.settle();assert.equal(f.live.preset_settings_openai,'A');assert.equal(notices.length,0);assert.equal(renders.length,1);
    await f.changeChat('single','one');await f.settle();assert.equal(f.live.preset_settings_openai,'B');assert.equal(notices.length,0);assert.equal(renders.length,2);
    assert.deepEqual(chat,[{mes:'synthetic',extra:{keep:true}}]);assert.equal(f.binding.state.status,'ready');
  });
  test(label+'bootstrap persisted once and unrelated settings intact',async t=>{
    const f=await setup(t,version); assert.equal(f.binding.state.status,'ready'); assert.equal(f.binding.state.defaultName,'A');
    assert.deepEqual(f.diskGlobal().unrelated_extension,{preserved:true});assert.equal(f.diskGlobal()[NS].revision,1);
    assert.equal(Object.keys(f.diskGlobal()[NS].bindings).length,1);assert.equal(f.controls.settingsSaved,1);
    await f.changeChat('single','two');await f.settle();assert.equal(f.controls.settingsSaved,1);
  });
  test(label+'A started, B coalesced, C latest; actual host finally C target',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();
    await f.changeChat('single','two');await f.settle(); // inherited A
    await f.controller.newPreset('C');await f.settle();await f.changeChat('single','three');await f.settle();
    const before=f.controls.changes.length;
    const held=f.gate('before');await f.changeChat('single','two');await held.entered; // started C
    await f.changeChat('single','three');await f.changeChat('single','one'); // intermediate A skipped; latest B
    held.release();held.remove();await f.settle();assert.equal(f.binding.state.chat.filename,'one');assert.equal(f.live.preset_settings_openai,'B');
    assert.deepEqual(f.controls.changes.slice(before).map(c=>c.selected),[String(f.names.C),String(f.names.B)]);
    assert.equal(f.binding.state.status,'ready');
  });
  test(label+'Dirty A survives B/C, generation blocked; discard applies latest only',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();
    await f.changeChat('single','two');await f.settle();
    f.controller.edit('custom');f.controller.draft({name:'Synthetic dirty A'}); const anchor=f.controller.state.snapshot;
    await f.changeChat('single','one');await f.changeChat('single','three');await f.settle();
    assert.equal(f.binding.state.status,'paused-dirty');assert.deepEqual(f.controller.state.snapshot,anchor);
    assert.equal(f.controller.state.snapshot.revision,anchor.revision);assert.equal(f.controller.state.draft.patch.name,'Synthetic dirty A');
    await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);assert.equal(f.records.get('B').prompts[1].name,'写作-正文');
    f.controller.cancelChanges();await f.settle();assert.equal(f.binding.state.chat.filename,'three');assert.equal(f.live.preset_settings_openai,'A');
  });
  test(label+'Dirty save stays on original snapshot then latest binding applies',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();await f.changeChat('single','two');await f.settle();
    f.controller.edit('custom');f.controller.draft({name:'Saved only A'});await f.controller.saveEdit();
    await f.changeChat('single','one');await f.settle();await f.controller.saveChanges();await f.settle();
    assert.equal(f.records.get('A').prompts[1].name,'Saved only A');assert.equal(f.records.get('B').prompts[1].name,'写作-正文');
    assert.equal(f.live.preset_settings_openai,'B');assert.equal(f.controller.state.dirty,false);
  });
  test(label+'preset changes after prompt preparation cannot send stale normal request',async t=>{
    const f=await setup(t,version); const {deferred}=require('./helpers/st-native-host.cjs');
    const prepare=deferred();f.controls.prepareGate=prepare;
    let reached=false;f.events.on('commands',()=>{reached=true;});
    const generation=f.generate();void generation.catch(()=>{});await until(()=>reached);await turn();
    await f.manual('B');await f.settle();prepare.resolve();await assert.rejects(generation);assert.equal(f.controls.sent.length,0);
  });
  test(label+'rename keeps ID, copy gets fresh ID, raw format untouched',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle(); const id=f.files.get('single:one')[NS].presetBindingId;
    await f.controller.renamePreset('B2');await f.settle();assert.equal(f.diskGlobal()[NS].bindings[id].nativeName,'B2');
    assert.equal(f.files.get('single:one')[NS].presetBindingId,id);assert.equal(f.records.get('B2')[NS],undefined);
    await f.controller.copyPreset();await f.settle();assert.notEqual(f.files.get('single:one')[NS].presetBindingId,id);
  });
  test(label+'wrong-chat start prevents any namespace write',async t=>{
    const f=await setup(t,version);const target=f.hostAdapter.currentChat();f.setChat('single','two');
    await assert.rejects(f.hostAdapter.writeChat(target.identity,undefined,{schemaVersion:1,presetBindingId:'synthetic-id'}),/保存前/);
    assert.equal(f.metadata.get('single:two')[NS],undefined);
  });
  test(label+'Dirty plus native switch cannot write A changes into B',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();await f.changeChat('single','two');await f.settle();
    f.controller.edit('custom');f.controller.draft({name:'Only local A draft'});await f.controller.saveEdit();
    await f.changeChat('single','one');await f.manual('B');await f.settle();
    assert.equal(f.controller.state.snapshot.name,'A');assert(f.controller.state.conflict);await f.controller.saveChanges();
    assert(f.controller.state.dirty);assert.equal(f.records.get('A').prompts[1].name,'写作-正文');assert.equal(f.records.get('B').prompts[1].name,'写作-正文');
    await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);
  });
  test(label+'Native rename receipt verified against directory retains stable ID',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();const id=f.files.get('single:one')[NS].presetBindingId;
    await f.events.emit('rename-before',{apiId:'openai',oldName:'B',newName:'B2'});
    await f.native.manager.savePreset('B2',structuredClone(f.records.get('B')),{skipUpdate:false});
    await until(()=>!f.hostAdapter.nativeBusy());await f.native.manager.deletePreset('B');
    await f.events.emit(f.host.SillyTavern.getContext().eventTypes.PRESET_RENAMED,{apiId:'openai',oldName:'B',newName:'B2'});await f.settle();
    assert.equal(f.diskGlobal()[NS].bindings[id].nativeName,'B2');assert.equal(f.live.preset_settings_openai,'B2');
    assert.equal(f.files.get('single:one')[NS].presetBindingId,id);
  });
  test(label+'unproven and other-API rename payloads never migrate mappings',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();const id=f.files.get('single:one')[NS].presetBindingId;
    await f.events.emit(f.host.SillyTavern.getContext().eventTypes.PRESET_RENAMED,{apiId:'openai',oldName:'B',newName:'A'});await f.settle();
    assert.equal(f.diskGlobal()[NS].bindings[id].nativeName,'B');
    await f.events.emit(f.host.SillyTavern.getContext().eventTypes.PRESET_RENAMED,{apiId:'other',oldName:'B',newName:'A'});await f.settle();
    assert.equal(f.diskGlobal()[NS].bindings[id].nativeName,'B');
  });
  test(label+'default delete follows actual native option order rather than disk order',async t=>{
    const f=await setup(t,version);await f.controller.newPreset('C');await f.settle();await f.controller.select('A');await f.settle();
    require('node:vm').runInContext("$('#settings_preset_openai').items[0].options.sort((a,b)=>({A:0,C:1,B:2}[a.text])-({A:0,C:1,B:2}[b.text]))",f.vmContext);
    await f.controller.deletePreset();await f.settle();assert.equal(f.binding.state.defaultName,'C');assert.equal(f.live.preset_settings_openai,'C');
  });
  test(label+'read failure is not interpreted as no presets',async t=>{
    const f=await setup(t,version);const before=structuredClone(f.diskGlobal()[NS]);f.faults.globalRead=true;
    await f.binding.reconcile();assert.equal(f.binding.state.status,'error');assert.deepEqual(f.diskGlobal()[NS],before);
    assert.equal(f.binding.state.defaultName,'A');
  });
  test(label+'truly empty directory persists None without claiming live settings were cleared',async t=>{
    const f=await setup(t,version,f=>f.records.clear());assert.equal(f.binding.state.status,'error');
    assert.equal(f.diskGlobal()[NS].defaultBindingId,null);assert(f.binding.state.error.length>0);
    assert(f.live.prompts.length>0);await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);
  });
  test(label+'invalid persisted registry is never replaced by bootstrap',async t=>{
    const f=await setup(t,version,f=>{f.globals[NS]={schemaVersion:8,unknown:'preserve'};f.setDiskGlobal(f.globals);});
    assert.equal(f.binding.state.status,'error');assert.deepEqual(f.diskGlobal()[NS],{schemaVersion:8,unknown:'preserve'});
    assert.equal(f.controls.settingsSaved,0);
  });
}
