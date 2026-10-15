// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
const assert=require('node:assert/strict');
const {createController}=require('../../.test-build/controller.js');
const cp=structuredClone;
const p=(id,name,content=id)=>({identifier:id,name,content,role:'system',system_prompt:false,marker:false,injection_position:0,injection_depth:4,injection_order:100,injection_trigger:['normal'],unknown:{keep:true}});
function raw(prompts){return {temperature:.7,extensions:{privateTarget:'preserve'},rootUnknown:42,prompts,prompt_order:[{character_id:100000,unknown:'group',order:[]},{character_id:100001,unknown:'active',order:prompts.map(p=>({identifier:p.identifier,enabled:false,metadata:'preserve'}))}]};}
function fixture(){let current='Target',writes=0,readGate;
 const target=raw([p('t1','Write-one'),p('t2','Write-two')]);const source=raw([p('s1','Write-one','source1'),p('s2','Write-two','source2'),p('s3','New-one'),p('s4','New-two')]);source.prompt_order[1].order.forEach(e=>delete e.metadata);
 const records=new Map([['Target',target],['Source',source],['Other',raw([p('other','Other')])]]);
 const snap=()=>({name:current,names:[...records.keys()],raw:cp(records.get(current)),revision:JSON.stringify([current,records.get(current)]),activeGroupId:100001});
 const adapter={directory:async()=>({names:[...records.keys()],supported:[...records.keys()]}),readPresetByName:async n=>{if(!records.has(n))throw Error('source deleted');const raw=cp(records.get(n));return {name:n,raw,fingerprint:JSON.stringify(raw),activeGroupId:100001};},read:async()=>{if(readGate)await readGate;return snap();},save:async(before,next)=>{assert.equal(before.revision,snap().revision);writes++;records.set(current,cp(next));return snap();},select:async n=>{current=n;return snap();}};
 const c=createController(adapter);return {c,m:c.migration,adapter,records,get writes(){return writes;},setCurrent:n=>current=n,setReadGate:p=>readGate=p};
}
async function setup(ids=['s1','s2']){const f=fixture();await f.c.refresh();await f.m.open();await f.m.load('Source');ids.forEach(id=>f.m.select(id));return f;}
async function replacement(f,id,text='copied'){if(f.m.state.step==='batch-position'){f.m.choosePosition({kind:'bottom'});assert(await f.m.confirm());}f.m.editItem(id);assert.equal(f.m.state.step,'compare');f.m.right(text);assert(await f.m.confirm());}
async function insertion(f,id,pos={kind:'bottom'}){if(f.m.state.step==='batch')f.m.editPosition();assert.equal(f.m.state.step,'batch-position');f.m.choosePosition(pos);assert(await f.m.confirm());assert.equal(f.m.state.batch.find(i=>i.sourceId===id).status,'ready');}

module.exports={setup,fixture,p,raw,replacement,insertion};
