// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { ManagerState, NativePrompt, PresetAdapter, PromptPatch, RawPreset, Row, Snapshot, SourcePreset } from './contracts';
import type { PresetBindingService } from './chat-preset-coordinator';
import { clone, rowsFor } from './model';
import { applyEditorDelta, applyMigrationPlans, contentEditable, editorDelta, fullOverride, fullOverrideReason, insertionCategories, insertPrompt, matchingPrompts, sourcePrompt, type MigrationPlan, type MigrationPosition } from './migration-model';
export interface BatchItem { sourceId:string; status:'pending'|'confirmed'|'skipped'|'blocked'; reason:string; matches:string[]; plan:MigrationPlan|null; left:NativePrompt|null; right:NativePrompt|null }
export interface MigrationState {
  open:boolean; step:'list'|'batch'|'candidates'|'compare'|'insert'; error:string; loading:boolean;
  names:string[]; source:SourcePreset|null; selected:string|null; selectedIds:string[]; candidates:NativePrompt[];
  target:string; revision:string; groupId:string|number; bindingToken:string;
  targetId:string|null; left:string; leftPrompt:NativePrompt|null; rightPrompt:NativePrompt|null; position:MigrationPosition|null;
  batch:BatchItem[]|null; itemId:string|null; mode:string;
}
export interface MigrationController {
  state:MigrationState; open():Promise<boolean>; close(lifecycle?:boolean):void; dispose():void;
  load(name:string):Promise<void>; select(id:string):void; bridge():void; chooseTarget(id:string):void;
  left(content:string):void; right(content:string):void; patchLeft(patch:PromptPatch):void; patchRight(patch:PromptPatch):void;
  overwrite():void; overwriteAll():void; fullReason():string;
  choosePosition(position:MigrationPosition):void; confirm():Promise<boolean>; back():void;
  editItem(id:string):void; skipItem(id:string):void; cancelBatch():void; confirmBatch():Promise<boolean>;
  valid():boolean; sourceRows():Row[]; targetRows():Row[]; categories():ReturnType<typeof insertionCategories>;
}
interface Hooks { state:ManagerState; snapshot():Snapshot; raw():RawPreset; revision():string; notify():void; dirty():void; stage(raw:RawPreset):void; finishBusy():Promise<void> }
export function createMigrationController(adapter:PresetAdapter,binding:PresetBindingService|undefined,hooks:Hooks):MigrationController {
  const state:MigrationState={open:false,step:'list',error:'',loading:false,names:[],source:null,selected:null,selectedIds:[],candidates:[],target:'',revision:'',groupId:100001,bindingToken:'',targetId:null,left:'',leftPrompt:null,rightPrompt:null,position:null,batch:null,itemId:null,mode:'手动核对'};
  let disposed=false,serial=0,sourceRequest=0;
  const bindingToken=()=>binding?`${binding.state.chat.key}:${binding.state.epoch}`:'';
  const notify=()=>hooks.notify();
  const fail=(error:unknown)=>{state.error=error instanceof Error?error.message:'迁移未完成，草稿仍保留。';notify();};
  const validTarget=()=>state.target===hooks.state.snapshot?.name&&state.revision===hooks.revision()&&String(state.groupId)===String(hooks.state.snapshot?.activeGroupId)&&bindingToken()===state.bindingToken;
  const valid=()=>!disposed&&state.open&&!hooks.state.conflict&&validTarget();
  function guard(){if(!valid())throw Error('目标预设、活动分组、对话或版本已改变，旧确认已失效；草稿仍保留，请先处理冲突。');}
  function cancelDraft(){hooks.state.migrationDraft=null;hooks.dirty();}
  const item=()=>state.batch?.find(i=>i.sourceId===state.itemId);
  function batchDirty(){return !!state.batch?.some(i=>i.status==='confirmed'&&i.plan&&(i.plan.kind==='insert'||Object.keys(i.plan.delta.patch).length||i.plan.delta.unset.length));}
  function trackDraft(){
    if(state.step==='compare'&&state.rightPrompt){
      const base=hooks.raw().prompts.find(p=>p.identifier===state.targetId)!;
      const delta=editorDelta(base,state.rightPrompt);
      hooks.state.migrationDraft={content:state.rightPrompt.content??'',baseline:base.content,patch:delta.patch,baselinePrompt:base,batchDirty:batchDirty()||!!delta.unset.length};
    }else if(state.batch||state.step==='insert')hooks.state.migrationDraft={content:'',baseline:'',batchDirty:batchDirty()||(state.step==='insert'&&!!state.position)};
    else hooks.state.migrationDraft=null;
    hooks.dirty();
  }
  function clearItem(){state.targetId=null;state.leftPrompt=null;state.rightPrompt=null;state.left='';state.position=null;state.candidates=[];state.itemId=null;state.mode='手动核对';}
  function back(){if(hooks.state.busy)return;state.step=state.batch?'batch':'list';clearItem();state.error='';trackDraft();notify();}
  function cancelBatch(){if(hooks.state.busy)return;state.batch=null;state.step='list';clearItem();state.error='';cancelDraft();notify();}
  function close(lifecycle=false){
    ++serial;++sourceRequest;state.open=false;state.loading=false;
    if(!hooks.state.conflict&&validTarget()){state.batch=null;state.step='list';clearItem();cancelDraft();}
    else if(!lifecycle)state.error='外部状态已改变，未确认草稿仍保留；请处理冲突或明确重新读取。';notify();
  }
  function chooseTarget(id:string){try{
    guard();if(hooks.state.busy)return;
    const p=state.candidates.find(p=>p.identifier===id);if(!p||!contentEditable(p))throw Error('该目标正文受原生保护，不能覆盖，也不会自动转为新增。');
    state.targetId=id;state.step='compare';const saved=item();
    state.leftPrompt=clone(saved?.left??sourcePrompt(state.source!,state.selected!));state.left=state.leftPrompt.content??'';
    state.rightPrompt=clone(saved?.plan?.kind==='replace'&&saved.plan.targetId===id&&saved.right?saved.right:p);
    state.mode=saved?.plan?.kind==='replace'?saved.plan.mode:'手动核对';trackDraft();state.error='';notify();
  }catch(e){fail(e);}}
  function route(id:string){
    state.selected=id;const p=sourcePrompt(state.source!,id);state.candidates=matchingPrompts(hooks.raw(),p);state.error='';
    if(state.candidates.length===1)chooseTarget(state.candidates[0].identifier);
    else {state.step=state.candidates.length?'candidates':'insert';state.position=item()?.plan?.kind==='insert'?(item()!.plan as Extract<MigrationPlan,{kind:'insert'}>).position:null;trackDraft();notify();}
  }
  async function checked(action:(fresh:SourcePreset)=>void):Promise<boolean>{
    if(disposed||hooks.state.busy||state.loading)return false;
    const session=serial,request=sourceRequest;
    try{guard();if(!state.source)throw Error('请重新加载来源。');hooks.state.busy=true;state.error='';notify();
      const fresh=await adapter.readPresetByName!(state.source.name);
      if(disposed||session!==serial||request!==sourceRequest||!state.open)return false;guard();
      if(fresh.name!==state.source.name||fresh.fingerprint!==state.source.fingerprint||JSON.stringify(fresh.raw)!==JSON.stringify(state.source.raw))throw Error('来源已修改，旧确认失效；临时草稿仍保留，请取消本次操作后重新加载来源。');
      let actual:Snapshot;try{actual=await adapter.read();}catch(e){hooks.state.conflict=true;throw e;}
      if(disposed||session!==serial||!state.open)return false;guard();const expected=hooks.snapshot();
      if(actual.name!==expected.name||actual.revision!==expected.revision||String(actual.activeGroupId)!==String(expected.activeGroupId)){hooks.state.conflict=true;throw Error('原生目标已修改或切换，旧确认失效；草稿仍保留。');}
      action(fresh);state.error='';notify();return true;
    }catch(e){if(!disposed&&session===serial)fail(e);return false;}finally{if(hooks.state.busy)await hooks.finishBusy();}
  }
  const api:MigrationController={state,valid,close,back,cancelBatch,chooseTarget,
    async open(){
      if(disposed||hooks.state.busy)return false;
      if(hooks.state.draft||hooks.state.parametersDraft){hooks.state.error='请先确认或取消当前条目／参数编辑，再打开预设条目迁移。';notify();return false;}
      if(state.open)return true;if(hooks.state.migrationDraft){state.open=true;notify();return true;}
      if(hooks.state.conflict){hooks.state.error='请先处理外部冲突；已有修改没有丢弃。';notify();return false;}
      if(!adapter.readPresetByName||!adapter.directory){hooks.state.error='宿主未提供安全的来源只读能力。';notify();return false;}
      const snap=hooks.snapshot(),request=++serial;
      Object.assign(state,{open:true,step:'list',error:'',loading:true,names:[],source:null,selected:null,selectedIds:[],batch:null,target:snap.name,revision:hooks.revision(),groupId:snap.activeGroupId,bindingToken:bindingToken()});clearItem();notify();
      try{const directory=await adapter.directory();if(disposed||request!==serial||!state.open)return false;guard();state.names=directory.supported.filter(n=>n!==state.target);if(!state.names.length)state.error='没有其他可安全读取的已保存预设。';}
      catch(e){if(!disposed&&request===serial)fail(e);}finally{if(!disposed&&request===serial){state.loading=false;notify();}}return state.open;
    },
    async load(name){if(disposed||hooks.state.busy||state.step!=='list')return;const request=++sourceRequest,session=serial;
      try{guard();if(name===state.target||!state.names.includes(name))throw Error('请选择其他已保存预设作为来源。');state.loading=true;state.error='';state.source=null;state.selected=null;state.selectedIds=[];notify();
        const result=await adapter.readPresetByName!(name);if(disposed||request!==sourceRequest||session!==serial||!state.open)return;guard();state.source=result;
      }catch(e){if(!disposed&&request===sourceRequest&&session===serial)fail(e);}finally{if(!disposed&&request===sourceRequest&&session===serial){state.loading=false;notify();}}
    },
    select(id){try{guard();if(state.loading||hooks.state.busy||state.step!=='list')return;if(!state.source?.raw.prompts.some(p=>p.identifier===id))throw Error('来源条目已不存在。');
      state.selectedIds=state.selectedIds.includes(id)?state.selectedIds.filter(p=>p!==id):[...state.selectedIds,id];state.selected=state.selectedIds.at(-1)??null;state.error='';notify();}catch(e){fail(e);}},
    bridge(){try{guard();if(state.loading||hooks.state.busy||!state.source||!state.selectedIds.length)return;
      if(state.selectedIds.length===1){route(state.selectedIds[0]);return;}
      state.batch=api.sourceRows().filter(r=>state.selectedIds.includes(r.prompt.identifier)).map(r=>{
        let reason='',matches:string[]=[];try{const p=sourcePrompt(state.source!,r.prompt.identifier);matches=matchingPrompts(hooks.raw(),p).map(p=>p.identifier);
          if(!matches.length)insertPrompt(hooks.raw(),state.groupId,state.source!,p.identifier,crypto.randomUUID(),{kind:'bottom'});
          else if(!matches.some(id=>contentEditable(hooks.raw().prompts.find(p=>p.identifier===id)!)))reason='全部同名目标均受原生保护。';
        }catch(e){reason=e instanceof Error?e.message:'该条目不可安全迁移。';}
        return {sourceId:r.prompt.identifier,status:reason?'blocked':'pending',reason,matches,plan:null,left:null,right:null};
      });state.step='batch';trackDraft();state.error='';notify();
    }catch(e){fail(e);}},
    editItem(id){try{guard();if(hooks.state.busy)return;const next=state.batch?.find(i=>i.sourceId===id);if(!next||next.status==='blocked')throw Error(next?.reason??'批次条目已不存在。');state.itemId=id;route(id);}catch(e){fail(e);}},
    skipItem(id){try{guard();if(hooks.state.busy)return;const next=state.batch?.find(i=>i.sourceId===id);if(!next)throw Error('批次条目已不存在。');next.status='skipped';next.plan=null;next.left=null;next.right=null;trackDraft();state.error='';notify();}catch(e){fail(e);}},
    left(content){api.patchLeft({content});},right(content){api.patchRight({content});},
    patchLeft(patch){if(state.step!=='compare'||hooks.state.busy||!state.leftPrompt)return;Object.assign(state.leftPrompt,clone(patch));state.left=state.leftPrompt.content??'';notify();},
    patchRight(patch){if(state.step!=='compare'||hooks.state.busy||!state.rightPrompt)return;Object.assign(state.rightPrompt,clone(patch));state.mode='手动核对';trackDraft();notify();},
    overwrite(){if(valid()&&state.step==='compare'&&!hooks.state.busy){api.patchRight({content:state.left});state.mode='仅覆盖提示词';notify();}},
    fullReason(){return state.leftPrompt&&state.rightPrompt?fullOverrideReason(state.leftPrompt,state.rightPrompt):'请先选择目标。';},
    overwriteAll(){try{guard();if(state.step!=='compare'||hooks.state.busy)return;state.rightPrompt=fullOverride(state.leftPrompt!,state.rightPrompt!);state.mode='覆盖全部属性';trackDraft();state.error='';notify();}catch(e){fail(e);}},
    choosePosition(position){try{guard();if(hooks.state.busy||state.step!=='insert')return;state.position=position;trackDraft();state.error='';notify();}catch(e){fail(e);}},
    async confirm(){if(!['compare','insert'].includes(state.step))return false;
      return checked(fresh=>{
        let plan:MigrationPlan;
        if(state.step==='compare'){const original=hooks.raw().prompts.find(p=>p.identifier===state.targetId)!;
          const delta=editorDelta(original,state.rightPrompt!);applyEditorDelta(hooks.raw(),state.targetId!,delta);
          // Validate left edits too; never mutate or write the source.
          const leftBase=sourcePrompt(fresh,state.selected!);applyEditorDelta(fresh.raw,leftBase.identifier,editorDelta(leftBase,state.leftPrompt!));
          plan={sourceId:state.selected!,kind:'replace',targetId:state.targetId!,delta,mode:state.mode};
        }else {if(!state.position)throw Error('请选择插入位置。');plan={sourceId:state.selected!,kind:'insert',position:clone(state.position)};insertPrompt(hooks.raw(),state.groupId,fresh,state.selected!,crypto.randomUUID(),state.position);}
        if(state.batch){const next=item()!;next.plan=plan;next.status='confirmed';next.left=clone(state.leftPrompt);next.right=clone(state.rightPrompt);state.step='batch';clearItem();trackDraft();}
        else {const next=plan.kind==='replace'?applyEditorDelta(hooks.raw(),plan.targetId,plan.delta):insertPrompt(hooks.raw(),state.groupId,fresh,plan.sourceId,crypto.randomUUID(),plan.position);
          cancelDraft();state.step='list';clearItem();if(next!==hooks.raw()){hooks.stage(next);state.revision=hooks.revision();}}
      });
    },
    async confirmBatch(){if(state.step!=='batch'||!state.batch)return false;
      return checked(fresh=>{const plans=state.batch!.filter(i=>i.status==='confirmed'&&i.plan).map(i=>i.plan!);if(!plans.length)throw Error('本批次没有已确认的迁移方案。');
        const next=applyMigrationPlans(hooks.raw(),state.groupId,fresh,plans,()=>crypto.randomUUID());
        state.batch=null;state.step='list';clearItem();cancelDraft();if(next!==hooks.raw()){hooks.stage(next);state.revision=hooks.revision();}
      });
    },
    sourceRows(){return state.source?rowsFor(state.source.raw,state.source.activeGroupId):[];},
    targetRows(){return hooks.state.snapshot?.name===state.target?rowsFor(hooks.raw(),state.groupId):[];},categories(){return insertionCategories(hooks.raw(),state.groupId);},
    dispose(){disposed=true;++serial;++sourceRequest;state.open=false;cancelDraft();state.source=null;state.names=[];state.batch=null;}
  };return api;
}
