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
for(const version of ['1.18.0','1.19.0']){
  const label=`Binding native lifecycle ${version} (synthetic dependencies): `;
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
  test(label+'native completion events cannot extend application deadline forever',async t=>{
    const f=await setup(t,version);let deadline,deadlineCount=0;
    const originalTimer=f.host.setTimeout;
    f.host.setTimeout=(fn,ms)=>{if(ms===20000){deadline=fn;deadlineCount++;return 123456;}return originalTimer(fn,ms);};
    await f.events.emit('before',{presetName:'A'});
    await until(()=>deadlineCount===1);
    for(let i=0;i<6;i++){
      await f.events.emit('before',{presetName:'B'});
      await f.events.emit('changed',{apiId:'openai',name:'B'});
    }
    assert.equal(deadlineCount,1);deadline();await f.settle();
    assert.equal(f.binding.state.status,'error');assert.match(f.binding.state.error,/持续应用/);
    await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);
  });
  test(label+'bootstrap persisted once and unrelated settings intact',async t=>{
    const f=await setup(t,version); assert.equal(f.binding.state.status,'ready'); assert.equal(f.binding.state.defaultName,'A');
    assert.deepEqual(f.diskGlobal().unrelated_extension,{preserved:true});assert.equal(f.diskGlobal()[NS].revision,1);
    assert.equal(Object.keys(f.diskGlobal()[NS].bindings).length,1);assert.equal(f.controls.settingsSaved,1);
    await f.changeChat('single','two');await f.settle();assert.equal(f.controls.settingsSaved,1);
  });
  test(label+'select override, exact-target metadata confirmation, choose default clears',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();
    assert.equal(f.binding.state.targetName,'B');assert.equal(f.live.preset_settings_openai,'B');assert.equal(f.binding.state.mode,'override');
    const saved=f.files.get('single:one');assert(saved[NS]?.presetBindingId);assert.deepEqual(saved.unrelated,{keep:'one'});
    assert.equal(f.diskGlobal()[NS].defaultBindingId,Object.entries(f.diskGlobal()[NS].bindings).find(([,r])=>r.nativeName==='A')[0]);
    await f.controller.select('A');await f.settle();assert.equal(f.files.get('single:one')[NS],undefined);assert.equal(f.binding.state.mode,'inherit');
  });
  test(label+'Set Default persists and clears matching override, other chats unchanged',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle(); const id=f.files.get('single:one')[NS].presetBindingId;
    f.metadata.get('single:two')[NS]={schemaVersion:1,presetBindingId:id};f.files.get('single:two')[NS]={schemaVersion:1,presetBindingId:id};
    await f.binding.setDefault();await f.settle();assert.equal(f.diskGlobal()[NS].defaultBindingId,id);
    assert.equal(f.files.get('single:one')[NS],undefined);assert.equal(f.files.get('single:two')[NS].presetBindingId,id);
  });
  test(label+'manual deviation and late native auto-selection both converge without source attribution',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();
    await f.manual('A');await f.settle();assert.equal(f.live.preset_settings_openai,'B');assert.equal(f.binding.state.mode,'override');
    await f.binding.reconcile();await f.settle();
    const held=f.gate('before'); const external=f.manual('A');await held.entered;
    assert.equal(f.binding.state.status,'reconciling');held.release();await external;held.remove();await f.settle();
    assert.equal(f.live.preset_settings_openai,'B');
  });
  test(label+'continuous external competition stops with error, no unbounded retry',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();
    await f.manual('A');await f.settle();assert.equal(f.live.preset_settings_openai,'B');
    const before=f.controls.changes.length;await f.manual('A');await f.settle();assert.equal(f.binding.state.status,'error');
    assert.match(f.binding.state.error,/争夺/);await turn();assert.equal(f.controls.changes.length,before+1);
    const sent=f.controls.sent.length;await assert.rejects(f.generate());assert.equal(f.controls.sent.length,sent);
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
  test(label+'generation pending canceled; ready target can send through native lifecycle',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();await f.changeChat('single','two');await f.settle();
    const held=f.gate('before');await f.changeChat('single','one');await held.entered;
    await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);
    held.release();held.remove();await f.settle();await f.generate();assert.equal(f.controls.sent.length,1);
    assert.equal(f.controls.sent[0].prompts[0].content,'B');
  });
  test(label+'preset changes after prompt preparation cannot send stale normal request',async t=>{
    const f=await setup(t,version); const {deferred}=require('./helpers/st-native-host.cjs');
    const prepare=deferred();f.controls.prepareGate=prepare;
    let reached=false;f.events.on('commands',()=>{reached=true;});
    const generation=f.generate();void generation.catch(()=>{});await until(()=>reached);await turn();
    await f.manual('B');await f.settle();prepare.resolve();await assert.rejects(generation);assert.equal(f.controls.sent.length,0);
  });
  test(label+'group identity, multiple files, metadata, generation gate',async t=>{
    const f=await setup(t,version);await f.changeChat('group','one');await f.settle();await f.controller.select('B');await f.settle();
    assert(f.files.get('group:one')[NS]);assert.equal(f.files.get('single:one')[NS],undefined);
    await f.generate();assert.equal(f.controls.sent.length,1);
    await f.changeChat('group','two');await f.settle();assert.equal(f.live.preset_settings_openai,'A');
    assert.notEqual(f.binding.state.chat.groupId,f.binding.state.chat.filename);
  });
  test(label+'no-chat native change does not change default or fight; explicit reconcile restores',async t=>{
    const f=await setup(t,version);await f.changeChat('none');await f.settle();const settings=structuredClone(f.diskGlobal()[NS]);
    await f.manual('B');await f.settle();assert.equal(f.live.preset_settings_openai,'B');assert.deepEqual(f.diskGlobal()[NS],settings);
    await f.binding.reconcile();await f.settle();assert.equal(f.live.preset_settings_openai,'A');assert.equal(f.binding.state.mode,'no-chat');
  });
  test(label+'rename keeps ID, copy gets fresh ID, raw format untouched',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle(); const id=f.files.get('single:one')[NS].presetBindingId;
    await f.controller.renamePreset('B2');await f.settle();assert.equal(f.diskGlobal()[NS].bindings[id].nativeName,'B2');
    assert.equal(f.files.get('single:one')[NS].presetBindingId,id);assert.equal(f.records.get('B2')[NS],undefined);
    await f.controller.copyPreset();await f.settle();assert.notEqual(f.files.get('single:one')[NS].presetBindingId,id);
  });
  test(label+'metadata save waits while chat changes: never migrates A override into B',async t=>{
    const f=await setup(t,version);const target=f.hostAdapter.currentChat();const held=f.metadataGate();
    const promise=f.hostAdapter.writeChat(target.identity,undefined,{schemaVersion:1,presetBindingId:'synthetic-id'});void promise.catch(()=>{});
    await until(()=>Boolean(f.metadata.get('single:one')[NS]));f.setChat('single','two');held.resolve();
    await assert.rejects(promise,/对话已切换/);assert.equal(f.files.get('single:two')[NS],undefined);assert.equal(f.files.get('single:one')[NS],undefined);
  });
  test(label+'wrong-chat start prevents any namespace write',async t=>{
    const f=await setup(t,version);const target=f.hostAdapter.currentChat();f.setChat('single','two');
    await assert.rejects(f.hostAdapter.writeChat(target.identity,undefined,{schemaVersion:1,presetBindingId:'synthetic-id'}),/保存前/);
    assert.equal(f.metadata.get('single:two')[NS],undefined);
  });
  for(const fault of ['chatMismatch','chatSave','globalMismatch','globalSave'])test(label+fault+' cannot claim persistence success',async t=>{
    const f=await setup(t,version); f.faults[fault]=true;
    if(fault.startsWith('chat')){const target=f.hostAdapter.currentChat();await assert.rejects(f.hostAdapter.writeChat(target.identity,undefined,{schemaVersion:1,presetBindingId:'synthetic-id'}));}
    else {const expected=f.diskGlobal()[NS],next=structuredClone(expected);next.revision++;await assert.rejects(f.hostAdapter.writeGlobal(expected,next));}
  });
  test(label+'namespace conflict preserves external global state',async t=>{
    const f=await setup(t,version),old=f.diskGlobal()[NS],changed=structuredClone(f.diskGlobal());changed[NS].revision++;
    f.setDiskGlobal(changed);await assert.rejects(f.hostAdapter.writeGlobal(old,old),/其他来源/);assert.deepEqual(f.diskGlobal(),changed);
  });
  test(label+'default saved but override clear failed reports partial, no rollback',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();f.faults.chatSave=true;
    await assert.rejects(f.binding.setDefault());assert.equal(f.binding.state.status,'error');assert.equal(core.resolve(f.diskGlobal()[NS],f.hostAdapter.currentChat().identity,null).defaultName,'B');
    assert(f.files.get('single:one')[NS]);
  });
  test(label+'normal streaming route cancels pending and allows confirmed target',async t=>{
    const f=await setup(t,version); f.controls.generationStreaming=true;
    await f.controller.select('B');await f.settle();await f.changeChat('single','two');await f.settle();
    const held=f.gate('before');await f.changeChat('single','one');await held.entered;
    await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);held.release();held.remove();await f.settle();
    await f.generate();assert.equal(f.controls.sent[0].prompts[0].content,'B');
  });
  test(label+'delete override keeps tombstone, same-name recreated preset does not rebind',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();const old=f.files.get('single:one')[NS].presetBindingId;
    await f.controller.deletePreset();await f.settle();assert.equal(f.binding.state.mode,'missing');assert.equal(f.live.preset_settings_openai,'A');
    assert.equal(f.files.get('single:one')[NS].presetBindingId,old);assert.equal(f.diskGlobal()[NS].bindings[old].tombstone,true);
    await f.controller.newPreset('B');await f.settle();assert.notEqual(f.files.get('single:one')[NS].presetBindingId,old);
    assert.equal(f.diskGlobal()[NS].bindings[old].tombstone,true);
  });
  test(label+'no-event missing target falls back and retains override ID',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();const id=f.files.get('single:one')[NS].presetBindingId;
    await f.changeChat('single','two');await f.settle();f.records.delete('B');
    await f.changeChat('single','one');await f.settle();assert.equal(f.binding.state.mode,'missing');assert.equal(f.live.preset_settings_openai,'A');
    assert.equal(f.files.get('single:one')[NS].presetBindingId,id);
  });
  test(label+'default deletion falls back without clearing another chat override',async t=>{
    const f=await setup(t,version);await f.controller.deletePreset();await f.settle();assert.equal(f.binding.state.defaultName,'B');
    assert.equal(f.binding.state.mode,'inherit');assert.equal(f.live.preset_settings_openai,'B');
  });
  test(label+'inherit already-applied target is zero selects and zero metadata saves',async t=>{
    const f=await setup(t,version);const calls=f.controls.changes.length;await f.changeChat('single','two');await f.settle();
    assert.equal(f.controls.changes.length,calls);assert.equal(f.controls.metadataSaved.length,0);
  });
  test(label+'no-chat MPM select preserves Applied and default until explicit reconcile',async t=>{
    const f=await setup(t,version);await f.changeChat('none');await f.settle();await f.controller.select('B');await f.settle();
    assert.equal(f.live.preset_settings_openai,'B');assert.equal(f.binding.state.defaultName,'A');assert.equal(f.controls.metadataSaved.length,0);
  });
  test(label+'previous indistinguishable event traces now have the same required result',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();await f.binding.reconcile();await f.settle();
    const {deferred}=require('./helpers/st-native-host.cjs'),gate=deferred();
    f.events.on('chat',()=>gate.promise);f.events.on('chat',f.autoSelect);
    const change=f.changeChat('single','one');await until(()=>f.binding.state.status==='ready');
    gate.resolve();await change;await f.settle();assert.equal(f.live.preset_settings_openai,'B');
    await f.binding.reconcile();await f.settle();await f.manual('A');await f.settle();assert.equal(f.live.preset_settings_openai,'B');
  });
  test(label+'external native application finishing after own apply finally restores target',async t=>{
    const f=await setup(t,version);await f.controller.select('B');await f.settle();await f.changeChat('single','two');await f.settle();
    const {deferred}=require('./helpers/st-native-host.cjs'),own=deferred(),foreign=deferred(),ownEntered=deferred(),foreignEntered=deferred();
    let held=true;
    const listener=payload=>{if(!held)return;if(payload.presetName==='B'){ownEntered.resolve();return own.promise;}foreignEntered.resolve();return foreign.promise;};
    f.events.on('before',listener);await f.changeChat('single','one');await ownEntered.promise;
    const late=f.manual('A');await foreignEntered.promise;own.resolve();await turn();await turn();foreign.resolve();held=false;await late;
    f.events.removeListener('before',listener);await f.settle();assert.equal(f.binding.state.status,'ready');assert.equal(f.live.preset_settings_openai,'B');
  });
  test(label+'overlapping ordinary attempts fail closed instead of reusing a permit',async t=>{
    const f=await setup(t,version);const {deferred}=require('./helpers/st-native-host.cjs');const gate=deferred();f.controls.prepareGate=gate;
    const first=f.generate();void first.catch(()=>{});await turn();const second=f.generate();void second.catch(()=>{});await turn();gate.resolve();
    await assert.rejects(first);await assert.rejects(second);assert.equal(f.controls.sent.length,0);
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
    assert.equal(f.diskGlobal()[NS].defaultBindingId,null);assert.match(f.binding.state.error,/无可用预设/);
    assert(f.live.prompts.length>0);await assert.rejects(f.generate());assert.equal(f.controls.sent.length,0);
  });
  test(label+'invalid persisted registry is never replaced by bootstrap',async t=>{
    const f=await setup(t,version,f=>{f.globals[NS]={schemaVersion:8,unknown:'preserve'};f.setDiskGlobal(f.globals);});
    assert.equal(f.binding.state.status,'error');assert.deepEqual(f.diskGlobal()[NS],{schemaVersion:8,unknown:'preserve'});
    assert.equal(f.controls.settingsSaved,0);
  });
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
