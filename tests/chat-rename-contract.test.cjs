// SPDX-License-Identifier: GPL-3.0-or-later
// Upstream functions run unchanged; transport/UI dependencies are synthetic.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
for(const b of require('./fixtures/st-chat-rename-contracts.json').baselines)test('Native chat rename '+b.version+': reload precedes receipt; sanitized name differs from event',async()=>{
 for(const groupId of [null,'group-1']){
  const trace=[],characters=[{avatar:'role.png',chat:'old'}];
  const sandbox={console,getCurrentChatId:()=> 'old',characters,this_chid:0,
   equalsIgnoreCaseAndAccents:(a,b)=>a.toLowerCase()===b.toLowerCase(),toastr:{warning(){throw Error('unexpected warning')}},t:x=>x,
   fetch:async(_url,init)=>{trace.push(['request',JSON.parse(init.body)]);return{ok:true,json:async()=>({ok:true,sanitizedFileName:'newname'})}},getRequestHeaders:()=>({}),
   renameGroupChat:async(...args)=>trace.push(['group',...args]),$:()=>({val:value=>trace.push(['input',value])}),
   createOrEditCharacter:async()=>trace.push(['character',characters[0].chat]),reloadCurrentChat:async()=>trace.push(['reload']),
   event_types:{CHAT_RENAMED:'rename'},eventSource:{emit:async(event,data)=>trace.push(['event',event,JSON.parse(JSON.stringify(data))])},
   delay:async()=>{},callGenericPopup:async()=>{throw Error('unexpected native error')},POPUP_TYPE:{TEXT:1},loader:{show(){throw Error('loader not requested')}}};
  vm.createContext(sandbox);vm.runInContext(b.text.replace(/^export /,'')+';globalThis.rename=renameGroupOrCharacterChat;',sandbox);
  await sandbox.rename({characterId:0,groupId,oldFileName:'old',newFileName:'new:name',loader:false});
  assert(trace.findIndex(x=>x[0]==='reload')<trace.findIndex(x=>x[0]==='event'));
  assert.equal(trace.at(-1)[2].newFileName,'new:name.jsonl');
  assert.equal(groupId?trace.find(x=>x[0]==='group')[3]:characters[0].chat,'newname');
 }
});
