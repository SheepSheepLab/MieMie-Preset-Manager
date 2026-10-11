// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../.test-build/model.js'),m=require('../.test-build/migration-model.js');
const {createController}=require('../.test-build/controller.js');
const copy=structuredClone;
const prompt=(identifier,name,content='original')=>({identifier,name,content,role:'system',system_prompt:false,marker:false,injection_position:0,injection_depth:4,injection_order:100,injection_trigger:['normal'],future_option:{keep:true}});
function raw(){return {temperature:.7,extensions:{keep:['target']},prompts:[
  {identifier:'main',name:'Main',content:'native',system_prompt:true},prompt('a1','A-one'),prompt('b1','B-one'),prompt('a2','A-two'),prompt('b2','B-two'),prompt('u1','U-one'),prompt('u2','U-two'),
  {identifier:'chatHistory',name:'History',system_prompt:true,marker:true}],
  prompt_order:[{character_id:100000,extra:{keep:true},order:[{identifier:'a1',enabled:false,unknown:'keep'}]},
    {character_id:100001,extra:99,order:['main','a1','b1','a2','b2','chatHistory'].map(identifier=>({identifier,enabled:identifier!=='a2',future_ref:{keep:true}}))}]};}
function source(name='Custom'){const p=prompt('old-id',name,'source');return {name:'Old',fingerprint:'fixture',activeGroupId:100001,raw:{prompts:[p],prompt_order:[{character_id:100001,order:[{identifier:p.identifier,enabled:false}]}],temperature:2,extensions:{source:true}}};}
test('migration content-only keeps target unknown fields, all groups and parameters; source is unchanged',()=>{
 const target=raw(),before=copy(target),s=source('A-one'),expected=copy(target);expected.prompts[1].content='source';
 assert.deepEqual(m.replaceContent(target,'a1',s.raw.prompts[0].content),expected);assert.deepEqual(target,before);assert.equal(s.raw.prompts[0].content,'source');
});
test('absent content no-op never materializes empty string',()=>{const target=raw();delete target.prompts[1].content;assert.equal(m.replaceContent(target,'a1',''),target);assert(!Object.hasOwn(target.prompts[1],'content'));});
test('exact title candidates include duplicate and unattached definitions without normalization',()=>{
 const target=raw();target.prompts.push(prompt('dup','A-one'),prompt('spaced',' A-one '),prompt('case','a-one'),prompt('emoji','⭐A-one'));
 assert.deepEqual(m.matchingPrompts(target,source('A-one').raw.prompts[0]).map(p=>p.identifier),['a1','dup']);
 assert.equal(m.matchingPrompts(target,source('A-ONE').raw.prompts[0]).length,0);
 const unicode=source('e\u0301');target.prompts.push(prompt('unicode','é'));assert.equal(m.matchingPrompts(target,unicode.raw.prompts[0]).length,0);
});
for(const title of [undefined,'','  '])test('missing/blank source title safely rejected '+JSON.stringify(title),()=>{const s=source();if(title===undefined)delete s.raw.prompts[0].name;else s.raw.prompts[0].name=title;assert.throws(()=>m.sourcePrompt(s,'old-id'),/标题/);});
for(const id of ['main','chatHistory'])test('protected new identities rejected '+id,()=>{const s=source();s.raw.prompts[0].identifier=id;s.raw.prompt_order[0].order[0].identifier=id;assert.throws(()=>m.insertPrompt(raw(),100001,s,id,'new',{kind:'top'}));});
test('marker content rejects instead of inserting fallback',()=>assert.throws(()=>m.replaceContent(raw(),'chatHistory','new'),/保护/));
for(const position of [{kind:'top'},{kind:'bottom'},{kind:'category',name:'A'}])test('insert '+JSON.stringify(position)+' changes only definition and active reference; title stays original',()=>{
 const target=raw(),s=source('【自定义】偏好'),before=copy(target),next=m.insertPrompt(target,100001,s,'old-id','new',position);
 const index=position.kind==='top'?0:position.kind==='bottom'?6:4,expected=copy(target);expected.prompts.push({...copy(s.raw.prompts[0]),identifier:'new'});expected.prompt_order[1].order.splice(index,0,{identifier:'new',enabled:false});
 assert.deepEqual(next,expected);assert.deepEqual(target,before);assert.equal(next.prompts.at(-1).name,'【自定义】偏好');model.validatePreset(next);
});
test('new identifier collision rejected across all definitions',()=>assert.throws(()=>m.insertPrompt(raw(),100001,source(),'old-id','u1',{kind:'bottom'}),/冲突/));
test('category anchors include disabled and fragmented references; unattached category remains disabled',()=>{
 const cats=m.insertionCategories(raw(),100001);assert.deepEqual(cats,[{name:'A',count:2,available:true},{name:'B',count:2,available:true},{name:'U',count:0,available:false}]);
 assert.throws(()=>m.insertPrompt(raw(),100001,source(),'old-id','new',{kind:'category',name:'U'}),/没有/);
});
test('unattached source inserts enabled with safe unknown prompt object retained',()=>{const s=source();s.raw.prompt_order[0].order=[];const next=m.insertPrompt(raw(),100001,s,'old-id','new',{kind:'bottom'});assert.equal(next.prompt_order[1].order.at(-1).enabled,true);assert.deepEqual(next.prompts.at(-1).future_option,{keep:true});});
test('unknown reference metadata refuses migration without loss',()=>{const s=source();s.raw.prompt_order[0].order[0].future=5;const before=copy(s);assert.throws(()=>m.insertPrompt(raw(),100001,s,'old-id','new',{kind:'top'}),/Metadata/);assert.deepEqual(s,before);});
test('unknown identity-bearing/text fields refuse insertion, content-only still preserves target unknowns',()=>{for(const value of [{target:'old-id'},'opaque',{keep:'opaque'}]){const s=source();s.raw.prompts[0].third_party=value;assert.throws(()=>m.insertPrompt(raw(),100001,s,'old-id','new',{kind:'top'}),/第三方/);}});
function fake(){let selected='Target',writes=0,reads=0,sourceGate=null,readGate=null;
 const records=new Map([['Target',raw()],['Old',source('A-one').raw],['Other',source('Custom').raw]]);
 const snapshot=()=>({name:selected,names:[...records.keys()],raw:copy(records.get(selected)),activeGroupId:100001,revision:JSON.stringify([selected,records.get(selected)])});
 const adapter={read:async()=>{if(readGate)await readGate;reads++;return snapshot();},directory:async()=>({names:[...records.keys()],supported:[...records.keys()]}),
 readPresetByName:async name=>{const value=copy(records.get(name));if(sourceGate)await sourceGate;if(!value)throw Error('source deleted');return {name,raw:value,activeGroupId:100001,fingerprint:JSON.stringify(value)};},
 save:async(expected,next)=>{assert.equal(expected.revision,snapshot().revision);writes++;records.set(selected,copy(next));return snapshot();},select:async name=>{selected=name;return snapshot();}};
 return {adapter,records,setSourceGate:gate=>{sourceGate=gate;},setReadGate:gate=>{readGate=gate;},get writes(){return writes;},get reads(){return reads;},select:name=>{selected=name;}};
}
async function setup(){const f=fake(),c=createController(f.adapter);await c.refresh();await c.migration.open();await c.migration.load('Old');c.migration.select('old-id');return {f,c,m:c.migration};}
test('read source leaves snapshot, selection and existing Pending unchanged',async()=>{const {f,c,m}=await setup(),before=copy(c.state.snapshot);await c.toggle('a1');const pending=copy(c.state.pendingRaw);await m.load('Other');assert.deepEqual(c.state.snapshot,before);assert.deepEqual(c.state.pendingRaw,pending);assert.equal(f.writes,0);});
test('cancel comparison removes only current draft and never existing Pending',async()=>{const {f,c,m}=await setup();m.close();await c.toggle('a1');const before=copy(c.state.pendingRaw);await m.open();await m.load('Old');m.select('old-id');m.bridge();m.right('temporary');assert(c.state.dirty);assert.deepEqual(c.state.pendingRaw,before);m.back();assert.deepEqual(c.state.pendingRaw,before);assert(c.state.dirty);assert.equal(f.writes,0);});
test('right comparison dirty, left-only clean; no-op confirms without new Dirty or pending',async()=>{const {f,c,m}=await setup();m.bridge();m.left('left only');assert.equal(c.state.dirty,false);assert(await m.confirm());assert.equal(c.state.pendingRaw,null);assert.equal(c.state.dirty,false);assert.equal(f.writes,0);});
test('overwrite stages on confirmation only; global save is the sole persistence',async()=>{const {f,c,m}=await setup();m.bridge();m.overwrite();assert(c.state.dirty);assert.equal(c.state.pendingRaw,null);await c.saveChanges();assert.equal(f.writes,0);assert(await m.confirm());assert.equal(c.state.pendingRaw.prompts[1].content,'source');assert.equal(f.writes,0);m.close();await c.saveChanges();assert.equal(f.writes,1);assert.equal(c.state.dirty,false);});
test('multiple migrations accumulate and close keeps confirmed Pending',async()=>{const {f,c,m}=await setup();m.bridge();m.right('first');assert(await m.confirm());await m.load('Other');m.select('old-id');m.bridge();m.choosePosition({kind:'bottom'});assert(await m.confirm());m.close();assert.equal(c.state.pendingRaw.prompts[1].content,'first');assert.equal(c.state.pendingRaw.prompts.at(-1).name,'Custom');assert.equal(f.writes,0);});
test('duplicate target demands explicit candidate, includes unattached',async()=>{const {c,m}=await setup();m.close();c.state.snapshot.raw.prompts.push(prompt('dup','A-one'));await m.open();await m.load('Old');m.select('old-id');m.bridge();assert.equal(m.state.step,'candidates');assert.equal(c.state.migrationDraft,null);m.chooseTarget('dup');assert.equal(m.state.targetId,'dup');});
test('source mutation invalidates confirmation and preserves temporary text',async()=>{const {f,c,m}=await setup();m.bridge();m.right('mine');f.records.get('Old').prompts[0].content='external';assert.equal(await m.confirm(),false);assert.equal(c.state.pendingRaw,null);assert.equal(c.state.migrationDraft.content,'mine');assert.match(m.state.error,/来源已修改/);});
test('source deletion refuses and retains draft',async()=>{const {f,c,m}=await setup();m.bridge();m.right('mine');f.records.delete('Old');assert.equal(await m.confirm(),false);assert.equal(c.state.migrationDraft.content,'mine');assert.equal(f.writes,0);});
test('target native switch invalidates confirmation and preserves local draft on close',async()=>{const {f,c,m}=await setup();m.bridge();m.right('mine');f.select('Other');assert.equal(await m.confirm(),false);assert(c.state.conflict);m.close();assert.equal(c.state.migrationDraft.content,'mine');assert.equal(f.writes,0);});
test('checkLive failure is not bypassed, conflict draft preserved',async()=>{const {f,c,m}=await setup();m.bridge();m.right('mine');f.adapter.read=async()=>{throw Error('Native unsaved');};assert.equal(await m.confirm(),false);assert(c.state.conflict);m.close();assert.equal(c.state.migrationDraft.content,'mine');});
test('local target revision change invalidates confirmation',async()=>{const {c,m}=await setup();m.bridge();m.right('mine');await c.toggle('a1');assert.equal(await m.confirm(),false);assert.equal(c.state.migrationDraft.content,'mine');});
test('source read latest-request wins and late closed result is ignored',async()=>{const {f,m}=await setup();let release;f.setSourceGate(new Promise(r=>{release=r;}));const old=m.load('Old');f.setSourceGate(null);await m.load('Other');release();await old;assert.equal(m.state.source.name,'Other');let end;f.setSourceGate(new Promise(r=>{end=r;}));const pending=m.load('Old');m.close();end();await pending;assert.equal(m.state.open,false);assert.equal(m.state.source,null);});
test('close/dispose during async confirmation cannot stage or persist',async()=>{for(const dispose of [false,true]){const {f,c,m}=await setup();m.bridge();m.right('mine');let end;f.setReadGate(new Promise(r=>{end=r;}));const confirming=m.confirm();await new Promise(r=>setImmediate(r));if(dispose)c.dispose();else m.close();end();assert.equal(await confirming,false);assert.equal(f.writes,0);assert.equal(c.state.pendingRaw,null);}});
test('existing editor and parameters drafts block entry without discarding',async()=>{const {c,m}=await setup();m.close();c.edit('a1');c.draft({content:'old draft'});assert.equal(await m.open(),false);assert.equal(c.state.draft.patch.content,'old draft');c.cancelEdit();c.editParameters();assert.equal(await m.open(),false);assert(c.state.parametersDraft);});

test('unknown reference-like root keys refuse insertion even when their values are numeric or null',()=>{for(const [key,value] of [['linked_prompt_id',123],['external_ref',null]]){const s=source();s.raw.prompts[0][key]=value;const before=copy(s);assert.throws(()=>m.insertPrompt(raw(),100001,s,'old-id','new',{kind:'top'}),/第三方/);assert.deepEqual(s,before);}});

test('long comparison input does not read native settings, clone the target or stage writes per character',async()=>{const {f,c,m}=await setup();m.bridge();const snapshot=c.state.snapshot.raw,before=copy(snapshot),reads=f.reads,large='x'.repeat(100000);for(let i=0;i<1000;i++){m.left(large+i);m.right(large+i);}assert.equal(f.reads,reads);assert.equal(f.writes,0);assert.equal(c.state.snapshot.raw,snapshot);assert.deepEqual(snapshot,before);assert.equal(c.state.pendingRaw,null);m.back();assert.equal(c.state.dirty,false);});
