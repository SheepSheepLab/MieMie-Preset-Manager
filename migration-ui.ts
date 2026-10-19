// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { ManagerController, Row } from './contracts';
import { createIcon, type IconName } from './icons';
import { migrationStyles } from './migration-styles';
import { contentEditable, type MigrationPosition } from './migration-model';
import { createFloatingPicker, floatingPickerStyles } from './floating-picker';
import { createMigrationList } from './migration-list';
import { mountMigrationEditor } from './migration-editor';

/** One business session with owned child dialogs; never a second Hub Surface. */
export function createMigrationView(host: Window, panel: HTMLElement, controller: ManagerController) {
  const doc=host.document, migration=controller.migration;
  let disposed=false, returnFocus: HTMLElement | null=null, key='', sourceKey='', targetKey='',directoryKey='';
  let leftInput: HTMLTextAreaElement | null=null, rightInput: HTMLTextAreaElement | null=null;
  let bridge: HTMLButtonElement | null=null, sourceList: HTMLElement | null=null, targetList: HTMLElement | null=null;
  let leftEditor:ReturnType<typeof mountMigrationEditor>|null=null,rightEditor:ReturnType<typeof mountMigrationEditor>|null=null;
  let fullBridge:HTMLButtonElement|null=null,selectionCount:HTMLElement|null=null;
  let picker: HTMLButtonElement | null=null, options: HTMLElement | null=null, pickerLabel: HTMLElement | null=null;
  let sourceWindow:ReturnType<typeof createMigrationList>|null=null,targetWindow:ReturnType<typeof createMigrationList>|null=null;
  let sourcePicker:ReturnType<typeof createFloatingPicker>|null=null;
  let previewEffect:ReturnType<typeof centeredMotion>|null=null,previewClosing=false;
  let previewDialog:HTMLDialogElement|null=null, previewEditor:ReturnType<typeof mountMigrationEditor>|null=null;
  let previewParent:HTMLDialogElement|null=null,previewSide:'source'|'target'='source';
  const animate=(node:HTMLElement,frames:Keyframe[],duration=200,easing='cubic-bezier(.2,.8,.2,1)')=>{node.getAnimations().forEach(a=>a.cancel());return typeof node.animate!=='function'||host.matchMedia('(prefers-reduced-motion: reduce)').matches?null:node.animate(frames,{duration,easing});};
  let surfaceAnimations:Animation[]=[];let motionShell:HTMLElement|null=null,motionEpoch=0;
  let child:HTMLDialogElement|null=null,childBody:HTMLElement|null=null,childActions:HTMLElement|null=null;
  let childError:HTMLElement|null=null,childHint:HTMLElement|null=null,childBridge:HTMLButtonElement|null=null;
  let childKey='',childClosing=false,childEffect:ReturnType<typeof centeredMotion>|null=null;
  let childOrigin:HTMLElement|null=null,childKeyboard=false,childParent:HTMLDialogElement|null=null;
  let batchDialog:HTMLDialogElement|null=null,batchBody:HTMLElement|null=null,batchActions:HTMLElement|null=null;
  let batchError:HTMLElement|null=null,batchHint:HTMLElement|null=null,batchEffect:ReturnType<typeof centeredMotion>|null=null;
  const batchRows=new Map<string,{node:HTMLElement;key:string}>();
  let batchSummary:HTMLElement|null=null;
  let batchClosing=false,batchOrigin:HTMLElement|null=null,batchKeyboard=false;
  const cleanups: Array<()=>void>=[];
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls='', text='') {
    const node=doc.createElement(tag); node.className=cls; node.textContent=text; return node;
  }
  const dialog=el('dialog','mm-migration-dialog'); dialog.setAttribute('aria-label','预设条目迁移');dialog.tabIndex=-1;
  const style=el('style'); style.textContent=migrationStyles+floatingPickerStyles; doc.head.append(style);cleanups.push(()=>style.remove());
  const head=el('header','mm-migration-head'), heading=el('h2','', '预设条目迁移'), subheading=el('p');
  const headingWrap=el('div'); headingWrap.append(heading,subheading); head.append(createIcon(doc,'migration'),headingWrap);
  const body=el('div','mm-migration-body'), footer=el('footer','mm-migration-footer');
  const error=el('p','mm-migration-error'); error.setAttribute('role','alert');
  const hint=el('p','mm-migration-hint'); hint.setAttribute('role','status');
  const actions=el('div','mm-migration-actions'); footer.append(error,hint,actions); dialog.append(head,body,footer);
  function on(target:EventTarget,type:string,listener:EventListener) { target.addEventListener(type,listener); cleanups.push(()=>target.removeEventListener(type,listener)); }
  function button(label:string,action:()=>void,icon?:IconName,cls='') {
    const node=el('button',cls); node.type='button'; node.setAttribute('aria-label',label);
    if(icon)node.append(createIcon(doc,icon)); node.append(doc.createTextNode(label)); node.onclick=action; return node;
  }
  function makeBridge(label:string,action:()=>void,icon:IconName='transfer') {
    const node=button(label,action,icon,'mm-migration-bridge'); node.lastChild?.remove();
    node.append(el('span','mm-migration-tooltip',label));
    return node;
  }
  function pane(title:string) { const pane=el('section','mm-migration-pane'); pane.append(el('h3','mm-migration-pane-title',title)); return pane; }
  function description(row:Row,index:number) { return `${row.prompt.role ?? '未指定 Role'} · ${row.category} · ${row.attached ? `${index+1} · ${row.enabled ? '启用' : '关闭'}` : '未挂接'} · ${row.prompt.identifier.slice(0,12)}`; }
  function closePreview(immediate=false){
    const current=previewDialog;if(!current)return;if(previewClosing&&!immediate)return;
    previewClosing=true;previewEffect?.clear();previewEditor?.dispose();previewEditor=null;current.inert=true;
    const finish=()=>{if(previewDialog===current){
      const parent=previewParent;previewEffect?.clear();previewDialog=null;previewEffect=null;previewClosing=false;previewParent=null;
      if(parent){delete parent.dataset.childOpen;parent.inert=!migration.state.open||(parent===child&&childClosing)||(parent===batchDialog&&batchClosing);}
    }current.close();current.remove();};
    if(immediate)finish();else previewEffect?.run(false,finish);
  }
  function showPreview(row:Row,origin:HTMLElement,keyboard=false){
    closePreview(true);sourcePicker?.close();
    const view=el('dialog','mm-migration-dialog mm-migration-preview');view.setAttribute('aria-label','查看条目内容');view.setAttribute('aria-modal','true');view.tabIndex=-1;previewDialog=view;
    previewSide=origin.closest('[aria-label=目标条目]')||migration.state.step==='candidates'?'target':'source';view.dataset.previewSide=previewSide;
    const header=el('header','mm-migration-head'),titleWrap=el('div');titleWrap.append(el('h2','','查看条目内容'),el('p','',previewSide==='source'?'来源预设 · 只读查看':'当前预设 · 只读查看'));header.append(createIcon(doc,'view'),titleWrap);
    const pane=el('section','mm-migration-pane mm-migration-body'),foot=el('footer','mm-migration-footer');
    const copy=el('p','mm-migration-hint','只读查看 · 不会选择条目或产生未保存修改');pane.append(copy);view.append(header,pane,foot);doc.body.append(view);
    previewEditor=mountMigrationEditor(doc,pane,previewSide==='target'?'目标':'来源',row.prompt,()=>{},view);
    pane.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea').forEach(input=>{if(input.type==='checkbox')input.disabled=true;else input.readOnly=true;});
    pane.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=true);
    const done=button('返回迁移',()=>closePreview(), 'back');foot.append(done);
    // Pointer return focuses the parent surface; keyboard return keeps the invoking control reachable.
    view.addEventListener('pointerdown',()=>{keyboard=false;});view.addEventListener('keydown',()=>{keyboard=true;});
    const parent=origin.closest('dialog')??dialog;previewParent=parent;parent.inert=true;parent.dataset.childOpen='true';
    view.addEventListener('cancel',e=>{e.preventDefault();closePreview();});view.addEventListener('close',()=>{if(!previewDialog&&origin.isConnected&&migration.state.open&&parent.open&&!parent.inert)(keyboard?origin:parent).focus({preventScroll:true});});
    previewEffect=centeredMotion(view,pane);
    try{view.showModal();}catch{closePreview(true);return;}
    placePreview();view.focus({preventScroll:true});previewEffect.run(true);
  }
  function placePreview(){
    if(!previewDialog||!dialog.open)return;
    // Match the batch dialog's root-relative 95% size on stacked layouts.
    // On desktop, center the same inset within the invoking half of the migration root.
    const bounds=dialog.getBoundingClientRect(),stacked=dialog.dataset.stacked==='true',regionWidth=bounds.width/(stacked?1:2);
    const width=regionWidth*.95,height=bounds.height*.95,left=bounds.left+(!stacked&&previewSide==='target'?regionWidth:0)+(regionWidth-width)/2;
    Object.assign(previewDialog.style,{width:`${width}px`,height:`${height}px`,left:`${left}px`,top:`${bounds.top+(bounds.height-height)/2}px`});previewDialog.dataset.stacked=String(width<760);
  }
  function card(row:Row,index:number,select?:()=>void,sourceSelection=false) {
    const node=el('div','mm-migration-card');node.dataset.id=row.prompt.identifier;
    const copy=el('span','mm-migration-card-copy');copy.append(el('strong','',row.prompt.name||'未命名'),el('small','',description(row,index)));
    const main=select?button(row.prompt.name||'未命名',select,undefined,'mm-migration-card-main'):el('div','mm-migration-card-main');main.replaceChildren(copy);
    if(select){const selected=String(migration.state.selectedIds.includes(row.prompt.identifier));main.setAttribute('aria-pressed',selected);node.dataset.selected=selected;(main as HTMLButtonElement).disabled=controller.state.busy||migration.state.loading||!migration.valid()||(!sourceSelection&&!contentEditable(row.prompt));node.onclick=e=>{if(e.target===node)select();};
      if(sourceSelection){const check=el('span','mm-migration-selection');check.append(createIcon(doc,'check'));main.prepend(check);
        let origin:{x:number;y:number}|null=null,moved=false;node.addEventListener('pointerdown',e=>{origin={x:e.clientX,y:e.clientY};moved=false;});node.addEventListener('pointermove',e=>{if(origin&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>10)moved=true;});node.addEventListener('pointercancel',()=>{moved=true;origin=null;});node.addEventListener('click',e=>{if(moved&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();}origin=null;moved=false;},true);}}
    const preview=button('查看内容：'+(row.prompt.name||'未命名'),()=>{},'view','mm-migration-view');preview.onclick=event=>showPreview(row,preview,event.detail===0);preview.lastChild?.remove();preview.setAttribute('aria-haspopup','dialog');node.append(main,preview);return node;
  }
  function closeOptions(){sourcePicker?.close();}
  function buildPicker(parent:HTMLElement) {
    sourcePicker?.dispose();const wrap=el('div','mm-migration-picker-wrap');picker=button('来源预设（已保存）',()=>{},undefined,'mm-migration-picker');wrap.append(picker);parent.append(wrap);
    directoryKey=migration.state.names.join('\0');const values=migration.state.names.map(name=>[name,name]as const);
    sourcePicker=createFloatingPicker(doc,dialog,picker,'来源预设（已保存）',values,migration.state.source?.name??'',name=>{void migration.load(name);});options=sourcePicker.menu;pickerLabel=picker.querySelector('span');
  }
  function buildList() {
    const pair=el('div','mm-migration-pair'), left=pane('来源预设 · 已保存版本'),right=pane('当前预设 · 目标固定');
    buildPicker(left); selectionCount=el('p','mm-migration-hint');selectionCount.setAttribute('role','status');left.append(selectionCount); right.append(el('p','mm-migration-pane-title mm-migration-target-field',migration.state.target));
    sourceList=el('div','mm-migration-scroll');sourceList.setAttribute('aria-label','来源条目');
    targetList=el('div','mm-migration-scroll');targetList.setAttribute('aria-label','目标条目');left.append(sourceList);right.append(targetList);
    sourceWindow=createMigrationList(doc,sourceList,(row,i)=>card(row,i,()=>migration.select(row.prompt.identifier),true));targetWindow=createMigrationList(doc,targetList,(row,i)=>{const node=card(row,i);node.dataset.target=String(row.prompt.identifier===migration.state.targetId);return node;});
    bridge=makeBridge('迁移条目',()=>migration.bridge());pair.append(left,right,bridge);body.append(pair);
    actions.append(button('返回预设管理',()=>migration.close(), 'back'));sourceKey='';targetKey='';
  }
  function buildCompare(container:HTMLElement,controls:HTMLElement,overlay:HTMLElement) {
    const pair=el('div','mm-migration-pair'),left=pane('来源 · 临时编辑不写回来源'),right=pane('目标 · 确定后进入待保存');
    leftEditor=mountMigrationEditor(doc,left,'来源',migration.state.leftPrompt!,patch=>migration.patchLeft(patch),overlay);
    rightEditor=mountMigrationEditor(doc,right,'目标',migration.state.rightPrompt!,patch=>migration.patchRight(patch),overlay);
    leftInput=leftEditor.content as HTMLTextAreaElement;rightInput=rightEditor.content as HTMLTextAreaElement;
    const bridges=el('div','mm-migration-bridges');
    fullBridge=makeBridge('覆盖全部属性',()=>migration.overwriteAll(),'transfer-all');
    childBridge=makeBridge('覆盖提示词',()=>migration.overwrite(),'transfer-text');bridges.append(fullBridge,childBridge);pair.append(left,right,bridges);container.append(pair);
    const note=el('p','mm-migration-hint');note.dataset.overrideHint='true';container.append(note);
    controls.append(button('取消',()=>migration.back()),button('确定',()=>{if(leftEditor?.validate()&&rightEditor?.validate())void migration.confirm();},'check','mm-migration-primary'));
  }
  function positionLabel(position:MigrationPosition){return position.kind==='category'?`${position.name} · 分类末尾`:position.kind==='top'?'顶部':'底部';}
  function buildBatch(container:HTMLElement,controls:HTMLElement) {
    batchSummary=el('div','mm-migration-batch-summary');batchSummary.setAttribute('role','status');
    const list=el('div','mm-migration-single');container.append(batchSummary,list);
    controls.append(button('取消本批次',()=>migration.cancelBatch()),button('确认迁移',()=>{void migration.confirmBatch();},'check','mm-migration-primary'));
  }
  function updateBatch(opening:boolean){
    const state=migration.state,counts=migration.batchSummary(),list=batchBody!.querySelector<HTMLElement>('.mm-migration-single')!;
    const summary=`已选择 ${state.batch!.length} 项 · 自动新增 ${counts.ready} 项 · 待核对 ${counts.pending} 项 · 已确认 ${counts.confirmed} 项 · 已跳过 ${counts.skipped} 项${counts.blocked?` · 不可迁移 ${counts.blocked} 项`:''}`;
    const summaryKey=summary+JSON.stringify(state.batchPosition);
    if(batchSummary!.dataset.summary!==summaryKey){batchSummary!.dataset.summary=summaryKey;batchSummary!.replaceChildren(el('p','',summary));
      if(state.batchPosition)batchSummary!.append(button(`插入位置：${positionLabel(state.batchPosition)} · 修改`,()=>migration.editPosition(),undefined,'mm-migration-position-edit'));
    }
    const prompts=new Map(state.source!.raw.prompts.map(p=>[p.identifier,p]));
    const targets=new Map(migration.targetRows().map(r=>[r.prompt.identifier,r.prompt.name]));
    for(const item of state.batch!){
      const key=JSON.stringify([item.status,item.reason,item.plan]);let saved=batchRows.get(item.sourceId);
      if(saved?.key===key)continue;
      const row=saved?.node??el('section','mm-migration-batch-item'),focused=doc.activeElement as HTMLElement|null;
      const focusIndex=row.contains(focused)?[...row.querySelectorAll('button')].indexOf(focused as HTMLButtonElement):-1;
      row.dataset.batchSource=item.sourceId;row.dataset.status=item.status;
      const statuses={ready:'已准备新增',pending:'待处理',confirmed:'已确认',skipped:'已跳过',blocked:'不可迁移'};
      const summary=el('div');summary.append(el('strong','',prompts.get(item.sourceId)?.name??'未命名'),el('span','mm-migration-batch-status',statuses[item.status]));
      const plan=item.plan,detail=plan?.kind==='replace'?`${plan.mode} → ${targets.get(plan.targetId)??plan.targetId} · 保留目标位置`:
        plan?.kind==='insert'?`新增 → ${positionLabel(plan.position)}`:item.matches.length?`同名目标：${item.matches.length} 个`:'本次不迁移';
      summary.append(el('small','',detail));if(item.reason)summary.append(el('p','mm-migration-error',item.reason+' 本次不会迁移此项。'));
      row.replaceChildren(summary);
      if(item.matches.length){const controls=el('div','mm-migration-batch-actions');
        const edit=button(item.status==='confirmed'?'修改方案':'核对方案',()=>migration.editItem(item.sourceId),'edit');edit.dataset.review='true';
        edit.disabled=item.status==='blocked';controls.append(edit,button('跳过此项',()=>migration.skipItem(item.sourceId)));row.append(controls);
      }
      if(!saved){list.append(row);batchRows.set(item.sourceId,{node:row,key});}else{saved.key=key;if(!opening)animate(row,[{opacity:.55},{opacity:1}],180);}
      if(focusIndex>=0&&!batchDialog!.inert)(row.querySelectorAll<HTMLButtonElement>('button')[focusIndex]??batchDialog!).focus({preventScroll:true});
    }
  }
  function buildCandidates(container:HTMLElement,controls:HTMLElement) {
    const list=el('div','mm-migration-single');list.append(el('p','mm-migration-hint','存在多个完全同名条目，请明确选择目标。'));
    const rows=migration.targetRows(); migration.state.candidates.forEach(prompt=>{
      const index=rows.findIndex(r=>r.prompt.identifier===prompt.identifier),row=rows[index];
      const candidate=card(row,index,()=>migration.chooseTarget(prompt.identifier));
      const action=candidate.querySelector<HTMLButtonElement>('.mm-migration-card-main')!;action.disabled=!contentEditable(prompt);if(action.disabled)candidate.append(el('small','','正文受原生保护'));list.append(candidate);
    });container.append(list);controls.append(button('取消',()=>migration.back()));
  }
  function positionButton(label:string,position:MigrationPosition,icon?:IconName) {
    const node=button(label,()=>migration.choosePosition(position),icon,'mm-migration-position');
    node.dataset.position=JSON.stringify(position);node.setAttribute('aria-pressed',String(JSON.stringify(migration.state.position)===JSON.stringify(position)));return node;
  }
  function buildInsert(container:HTMLElement,controls:HTMLElement) {
    const list=el('div','mm-migration-single'),unified=migration.state.step==='batch-position',source=migration.state.source!.raw.prompts.find(p=>p.identifier===migration.state.selected);
    list.append(el('h3','',unified?`为 ${migration.state.batch!.filter(i=>!i.matches.length&&i.status!=='blocked').length} 个新增条目选择共同位置`:source?.name??''),el('p','mm-migration-hint','仅改变插入位置，原标题和分类规则保持不变。'));
    const fixed=el('div','mm-migration-positions');fixed.append(positionButton('插入顶部',{kind:'top'},'insert-top'),positionButton('插入底部',{kind:'bottom'},'insert-bottom'));list.append(fixed,el('p','mm-migration-category-title','插入分类最后一个已挂接条目之后'));
    migration.categories().forEach(category=>{const node=positionButton(`${category.name} · ${category.count} 个已挂接`,{kind:'category',name:category.name});
      node.disabled=!category.available;if(!category.available){node.title='活动顺序中没有该分类条目，请选择顶部或底部';node.append(el('small','',' · 无活动锚点'));}list.append(node);});
    container.append(list);controls.append(button(unified?'返回':'取消',()=>migration.back()),button(unified?'确认位置':'确认插入',()=>{void migration.confirm();},'check','mm-migration-primary'));
  }
  // Both hierarchy levels share the same compositor-only center motion.
  function centeredMotion(view:HTMLDialogElement,content:HTMLElement){
    let epoch=0,animations:Animation[]=[];
    function clear(){++epoch;animations.forEach(a=>a.cancel());animations=[];view.querySelector('.mm-migration-motion-shell')?.remove();delete view.dataset.motion;for(const node of [view.firstElementChild as HTMLElement|null,content,view.querySelector<HTMLElement>('.mm-migration-footer')])if(node){node.style.removeProperty('opacity');node.style.removeProperty('will-change');}}
    function run(opening:boolean,finish:()=>void=()=>{}){
      clear();if(host.matchMedia('(prefers-reduced-motion: reduce)').matches||typeof view.animate!=='function'){finish();return;}
      const current=epoch,shell=el('span','mm-migration-motion-shell');shell.setAttribute('aria-hidden','true');view.append(shell);view.dataset.motion=opening?'opening':'closing';
      const motion=shell.animate(opening?[{transform:'scale(.86)',opacity:.35},{transform:'scale(1)',opacity:1}]:[{transform:'scale(1)',opacity:1},{transform:'scale(.9)',opacity:0}],{duration:opening?260:180,easing:opening?'cubic-bezier(.16,1,.3,1)':'cubic-bezier(.4,0,.6,1)',fill:'both'});animations.push(motion);
      for(const node of [view.firstElementChild as HTMLElement|null,content,view.querySelector<HTMLElement>('.mm-migration-footer')])if(node){node.style.willChange='opacity';node.style.opacity=opening?'0':'1';animations.push(node.animate(opening?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],{duration:opening?130:70,delay:opening?80:0,fill:'both',easing:'ease-out'}));}
      void motion.finished.then(()=>{if(disposed||!view.isConnected||current!==epoch)return;clear();finish();},()=>{});
    }
    return {clear,run};
  }
  function clearChildMotion(){childEffect?.clear();}
  function childMotion(opening:boolean,finish:()=>void=()=>{}){childEffect?.run(opening,finish);}
  function finishChild(restoreFocus=true){
    clearChildMotion();const view=child,parent=childParent??dialog;child=null;childKey='';childClosing=false;childEffect=null;childParent=null;
    leftEditor?.dispose();rightEditor?.dispose();leftEditor=null;rightEditor=null;leftInput=null;rightInput=null;fullBridge=null;childBridge=null;
    childBody=null;childActions=null;childError=null;childHint=null;view?.close();view?.remove();
    delete parent.dataset.childOpen;parent.inert=!migration.state.open||(parent===batchDialog&&!migration.state.batch);
    if(restoreFocus&&migration.state.open&&parent.open&&!parent.inert){const origin=childKeyboard&&childOrigin?.isConnected?childOrigin:parent;origin.focus({preventScroll:true});}childOrigin=null;
  }
  function closeChild(immediate=false){
    if(!child)return;if(immediate){finishChild(false);return;}if(childClosing)return;
    childClosing=true;child.inert=true;childMotion(false,()=>{finishChild();render();});
  }
  function placeChild(){
    if(!child||!dialog.open)return;
    // Use the migration root as the size reference for both direct and batch review routes.
    // childParent still owns the underlay, focus return and modal interaction isolation.
    const bounds=dialog.getBoundingClientRect(),ratio=.9;
    const width=bounds.width*ratio,height=bounds.height*ratio;
    Object.assign(child.style,{width:`${width}px`,height:`${height}px`,left:`${bounds.left+(bounds.width-width)/2}px`,top:`${bounds.top+(bounds.height-height)/2}px`});child.dataset.stacked=String(width<760);
  }
  function renderChild(){
    const state=migration.state,next=`${state.target}:${state.step}:${state.selected??''}:${state.targetId??''}`;
    if(childClosing||childKey!==next){closeChild(true);}
    if(!child){
      closeOptions();closePreview(true);cancelSurfaceMotion();batchEffect?.clear();childOrigin=doc.activeElement as HTMLElement|null;childKeyboard=childOrigin?.matches(':focus-visible')??false;childParent=batchDialog??dialog;
      const view=el('dialog','mm-migration-dialog mm-migration-child');child=view;childKey=next;view.tabIndex=-1;
      const title=state.step==='compare'?'对比与合并':state.step==='candidates'?'选择同名目标':state.step==='batch-position'?'统一选择插入位置':'选择插入位置';view.setAttribute('aria-label',title);view.setAttribute('aria-modal','true');
      const header=el('header','mm-migration-head'),wrap=el('div');wrap.append(el('h2','',title),el('p','',`目标：${state.target}`));header.append(createIcon(doc,'migration'),wrap);
      childBody=el('div','mm-migration-body');const foot=el('footer','mm-migration-footer');childError=el('p','mm-migration-error');childError.setAttribute('role','alert');childHint=el('p','mm-migration-hint');childHint.setAttribute('role','status');childActions=el('div','mm-migration-actions');foot.append(childError,childHint,childActions);view.append(header,childBody,foot);
      if(state.step==='compare')buildCompare(childBody,childActions,view);else if(state.step==='candidates')buildCandidates(childBody,childActions);else buildInsert(childBody,childActions);
      view.addEventListener('cancel',e=>{if(e.defaultPrevented)return;e.preventDefault();if(!childClosing&&!controller.state.busy)migration.back();});
      view.addEventListener('keydown',e=>{if(e.defaultPrevented)return;e.stopPropagation();childKeyboard=true;if(e.key==='Escape'){e.preventDefault();if(!e.repeat&&!childClosing&&!controller.state.busy)migration.back();}});
      view.addEventListener('pointerdown',()=>{childKeyboard=false;});
      childEffect=centeredMotion(view,childBody);doc.body.append(view);childParent.inert=true;childParent.dataset.childOpen='true';
      try{view.showModal();}catch{finishChild();migration.back();return;}
      placeChild();view.focus({preventScroll:true});childMotion(true);
    }
    childError!.textContent=state.error||(!migration.valid()?'目标或对话已改变，旧确认已失效；草稿仍保留。':'');
    childHint!.textContent=controller.state.busy?'正在核对来源及原生目标…':controller.state.dirty?'有未保存修改 · 回到主页面统一保存':'仅手动确认后修改目标 · 来源始终只读';
    if(leftEditor&&state.leftPrompt)leftEditor.update(state.leftPrompt,controller.state.busy);if(rightEditor&&state.rightPrompt)rightEditor.update(state.rightPrompt,controller.state.busy);
    const reason=migration.fullReason();if(fullBridge){fullBridge.disabled=!migration.valid()||controller.state.busy||!!reason;fullBridge.removeAttribute('title');}if(childBridge)childBridge.disabled=!migration.valid()||controller.state.busy;
    const note=childBody!.querySelector<HTMLElement>('[data-override-hint]');if(note)note.textContent=reason||'保留当前列表位置；注入顺序等高级属性将按来源覆盖。';
    childActions!.querySelectorAll<HTMLButtonElement>('button').forEach(node=>node.disabled=controller.state.busy||(node.classList.contains('mm-migration-primary')&&(!migration.valid()||(['insert','batch-position'].includes(state.step)&&!state.position))));
    childBody!.querySelectorAll<HTMLElement>('[data-position]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.position===JSON.stringify(state.position))));
    childBody!.querySelectorAll<HTMLButtonElement>('.mm-migration-card-main').forEach(node=>node.disabled=controller.state.busy||!migration.valid()||!contentEditable(state.candidates.find(p=>p.identifier===node.closest<HTMLElement>('[data-id]')?.dataset.id)!));
  }
  function finishBatch(restoreFocus=true){
    batchEffect?.clear();const view=batchDialog;batchDialog=null;batchBody=null;batchActions=null;batchError=null;batchHint=null;batchEffect=null;batchRows.clear();batchSummary=null;batchClosing=false;view?.close();view?.remove();
    delete dialog.dataset.childOpen;dialog.inert=!migration.state.open;
    if(restoreFocus&&migration.state.open&&dialog.open){const origin=batchKeyboard&&batchOrigin?.isConnected?batchOrigin:dialog;origin.focus({preventScroll:true});}batchOrigin=null;
  }
  function closeBatch(immediate=false){
    if(!batchDialog)return;if(immediate){finishBatch(false);return;}if(batchClosing)return;batchClosing=true;batchDialog.inert=true;batchEffect?.run(false,()=>{finishBatch();render();});
  }
  function placeBatch(){
    if(!batchDialog||!dialog.open)return;const bounds=dialog.getBoundingClientRect(),ratio=.95,width=bounds.width*ratio,height=bounds.height*ratio;
    Object.assign(batchDialog.style,{width:`${width}px`,height:`${height}px`,left:`${bounds.left+(bounds.width-width)/2}px`,top:`${bounds.top+(bounds.height-height)/2}px`});batchDialog.dataset.stacked=String(width<760);
  }
  function renderBatch(){
    const state=migration.state;if(batchClosing)closeBatch(true);
    let opening=false;
    if(!batchDialog){
      closeOptions();closePreview(true);cancelSurfaceMotion();batchOrigin=doc.activeElement as HTMLElement|null;batchKeyboard=batchOrigin?.matches(':focus-visible')??false;
      const view=el('dialog','mm-migration-dialog mm-migration-child mm-migration-batch');batchDialog=view;view.tabIndex=-1;view.setAttribute('aria-label','批量迁移确认');view.setAttribute('aria-modal','true');
      const header=el('header','mm-migration-head'),wrap=el('div');wrap.append(el('h2','','批量迁移确认'),el('p','',`目标：${state.target}`));header.append(createIcon(doc,'migration'),wrap);
      batchBody=el('div','mm-migration-body');const foot=el('footer','mm-migration-footer');batchError=el('p','mm-migration-error');batchError.setAttribute('role','alert');batchHint=el('p','mm-migration-hint');batchHint.setAttribute('role','status');batchActions=el('div','mm-migration-actions');foot.append(batchError,batchHint,batchActions);view.append(header,batchBody,foot);buildBatch(batchBody,batchActions);batchEffect=centeredMotion(view,batchBody);
      view.addEventListener('cancel',e=>{if(e.defaultPrevented)return;e.preventDefault();if(!batchClosing&&!controller.state.busy)migration.cancelBatch();});
      view.addEventListener('keydown',e=>{if(e.defaultPrevented)return;e.stopPropagation();batchKeyboard=true;if(e.key==='Escape'){e.preventDefault();if(!e.repeat&&!batchClosing&&!controller.state.busy)migration.cancelBatch();}});view.addEventListener('pointerdown',()=>{batchKeyboard=false;});
      doc.body.append(view);dialog.inert=true;dialog.dataset.childOpen='true';try{view.showModal();}catch{finishBatch();migration.cancelBatch();return;}placeBatch();view.focus({preventScroll:true});opening=true;
    }
    updateBatch(opening);
    batchError!.textContent=state.error||(!migration.valid()?'目标或对话已改变，旧确认已失效；草稿仍保留。':'');
    const counts=migration.batchSummary();
    batchHint!.textContent=controller.state.busy?'正在核对来源及原生目标…':counts.pending?`还有 ${counts.pending} 项需要核对或跳过。`:counts.canConfirm?`将迁移 ${counts.ready+counts.confirmed} 项 · 确认后仍需主界面保存`:'没有可迁移的条目，请返回重新选择。';
    for(const item of state.batch??[]){const row=batchRows.get(item.sourceId)?.node;row?.querySelectorAll<HTMLButtonElement>('button').forEach(node=>node.disabled=controller.state.busy||!migration.valid()||(node.dataset.review==='true'&&item.status==='blocked'));}
    batchSummary!.querySelectorAll<HTMLButtonElement>('button').forEach(node=>node.disabled=controller.state.busy||!migration.valid());
    batchActions!.querySelectorAll<HTMLButtonElement>('button').forEach(node=>{
      const disabled=controller.state.busy||(node.classList.contains('mm-migration-primary')&&(!migration.valid()||!counts.canConfirm));
      if(node.disabled!==disabled){node.disabled=disabled;if(!opening)animate(node,[{opacity:.5},{opacity:disabled?.45:1}],180);}
    });
    if(opening)batchEffect!.run(true);
  }
  function place() {
    if(!dialog.open)return;if(motionShell){if(!migration.state.open){finishHide();return;}cancelSurfaceMotion();}
    const v=host.visualViewport,css=host.getComputedStyle(panel),safe=(side:string)=>Math.max(12,parseFloat(css.getPropertyValue(`--mm-safe-${side}`))||0);
    const w=v?.width || host.innerWidth,h=v?.height || host.innerHeight,l=safe('left'),r=safe('right'),t=safe('top'),b=safe('bottom');
    const width=Math.max(1,Math.min(1080,w-l-r)),height=Math.max(1,Math.min(800,h-t-b));
    Object.assign(dialog.style,{width:`${width}px`,height:`${height}px`,left:`${(v?.offsetLeft || 0)+l+(w-l-r-width)/2}px`,top:`${(v?.offsetTop || 0)+t+(h-t-b-height)/2}px`});
    dialog.dataset.stacked=String(width<760);
    // Finish a motion before resizing its chrome; editor nodes and focus remain untouched.
    if(batchDialog&&!batchClosing)batchEffect?.clear();placeBatch();if(child&&!childClosing)clearChildMotion();placeChild();if(previewDialog&&!previewClosing)previewEffect?.clear();placePreview();
  }
  // Animate only an empty chrome layer; text and long lists never scale or repaint per frame.
  function cancelSurfaceMotion(){++motionEpoch;surfaceAnimations.forEach(a=>a.cancel());surfaceAnimations=[];motionShell?.remove();motionShell=null;delete dialog.dataset.motion;for(const node of [head,body,footer]){node.style.removeProperty('opacity');node.style.removeProperty('will-change');}}
  function entryTransform(){
    const bounds=dialog.getBoundingClientRect(),anchor=panel.querySelector<HTMLElement>('[aria-label="更多预设操作"]')?.getBoundingClientRect();
    const width=Math.min(anchor?.width||200,bounds.width),height=Math.min(anchor?.height||48,bounds.height);
    const x=Math.max(0,Math.min(bounds.width-width,anchor?.width?anchor.left-bounds.left:(bounds.width-width)/2));
    const y=Math.max(0,Math.min(bounds.height-height,anchor?.height?anchor.top-bounds.top:(bounds.height-height)/2));
    return `translate3d(${x}px, ${y}px, 0) scale(${width/bounds.width}, ${height/bounds.height})`;
  }
  function surfaceMotion(opening:boolean,finish:()=>void=()=>{}){
    cancelSurfaceMotion();if(host.matchMedia('(prefers-reduced-motion: reduce)').matches||typeof dialog.animate!=='function'){finish();return;}
    const epoch=motionEpoch,shell=el('span','mm-migration-motion-shell');shell.setAttribute('aria-hidden','true');motionShell=shell;dialog.append(shell);dialog.dataset.motion=opening?'opening':'closing';
    const entry=entryTransform(),duration=opening?360:240,easing=opening?'cubic-bezier(.16,1,.3,1)':'cubic-bezier(.4,0,.6,1)';
    const motion=shell.animate(opening?[{transform:entry,opacity:.5},{transform:'translate3d(0,0,0) scale(1,1)',opacity:1}]:[{transform:'translate3d(0,0,0) scale(1,1)',opacity:1},{transform:entry,opacity:0}],{duration,easing,fill:'both'});surfaceAnimations.push(motion);
    for(const node of [head,body,footer]){node.style.willChange='opacity';node.style.opacity=opening?'0':'1';surfaceAnimations.push(node.animate(opening?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],{duration:opening?140:90,delay:opening?180:0,fill:'both',easing:'ease-out'}));}
    void motion.finished.then(()=>{if(disposed||epoch!==motionEpoch)return;cancelSurfaceMotion();finish();},()=>{});
  }
  function finishHide(){closeChild(true);closeBatch(true);cancelSurfaceMotion();closeOptions();if(dialog.open)dialog.close();dialog.remove();if(returnFocus?.isConnected&&!panel.hidden&&!panel.inert)returnFocus.focus({preventScroll:true});}
  function hide(){closeOptions();closePreview(true);closeChild(true);closeBatch(true);if(!dialog.open||dialog.dataset.motion==='closing')return;if(disposed||panel.hidden||panel.inert){finishHide();return;}dialog.inert=true;surfaceMotion(false,()=>{if(!migration.state.open)finishHide();});}
  function render() {
    if(disposed)return;
    const state=migration.state;
    if(!state.open){hide();return;}
    // Finish the outgoing child before opening a sibling surface. Animation completion,
    // not a timer, owns the handoff; repeated notifications cannot resurrect old callbacks.
    const wantsChild=['compare','insert','candidates','batch-position'].includes(state.step);
    const desiredChild=`${state.target}:${state.step}:${state.selected??''}:${state.targetId??''}`;
    if(child&&(!wantsChild||childKey!==desiredChild)){closeChild();return;}
    if(wantsChild){
      if(state.batch&&state.step!=='batch-position'&&!batchDialog)renderBatch();
      renderChild();return;
    }
    if(state.batch&&state.step==='batch'){renderBatch();return;}
    if(batchDialog){closeBatch();return;}
    if(dialog.dataset.motion==='closing')cancelSurfaceMotion();dialog.inert=previewParent===dialog;
    let opening=false;
    if(!dialog.isConnected)doc.body.append(dialog);
    if(!dialog.open){
      returnFocus=doc.activeElement as HTMLElement|null;
      if(typeof dialog.showModal!=='function'){controller.state.error='当前浏览器不支持安全的独立迁移窗口。';migration.close();return;}
      try{dialog.showModal();}catch{controller.state.error='迁移窗口暂时无法打开，请先关闭当前系统弹窗。';migration.close();return;}
      place();opening=true;
    }
    const buildKey=`${state.target}:${state.step}`;
    if(key!==buildKey){
      closeOptions();closePreview(true);sourcePicker?.dispose();sourcePicker=null;sourceWindow?.dispose();targetWindow?.dispose();sourceWindow=null;targetWindow=null;leftEditor?.dispose();rightEditor?.dispose();key=buildKey;body.replaceChildren();actions.replaceChildren();leftInput=null;rightInput=null;leftEditor=null;rightEditor=null;fullBridge=null;selectionCount=null;sourceList=null;targetList=null;bridge=null;picker=null;options=null;
      buildList();
      // Animate the fresh step surface, never the cached dialog body/compositor layer.
      const stepSurface=body.firstElementChild as HTMLElement|null;if(!opening&&stepSurface)animate(stepSurface,[{opacity:0},{opacity:1}]);
      dialog.focus({preventScroll:true});
    }
    // Directory loading completes after the shell opens; update only picker options, not the lists.
    if(state.step==='list' && options && !state.loading && directoryKey!==state.names.join('\0')){const parent=picker!.parentElement!;parent.remove();const first=sourceList!.parentElement!;buildPicker(first);first.insertBefore(picker!.parentElement!,selectionCount);}
    heading.textContent='预设条目迁移';
    subheading.textContent=`目标：${state.target}`;
    error.textContent=state.error || (!migration.valid()?'目标或对话已改变，旧确认已失效；草稿仍保留。':'');
    hint.textContent=controller.state.busy?'正在核对来源及原生目标…':controller.state.dirty?'有未保存修改 · 回到主页面统一保存':'仅手动确认后修改目标 · 来源始终只读';
    if(picker){sourcePicker?.update(state.source?.name??'',controller.state.busy||state.loading||!migration.valid());pickerLabel!.textContent=state.loading?'正在读取来源…':state.source?.name??'选择来源预设';}
    if(sourceList){const next=state.source?.fingerprint ?? '';if(sourceKey!==next||!sourceList.children.length){sourceKey=next;sourceWindow?.setRows(migration.sourceRows());
      if(!sourceList.children.length)sourceList.append(el('p','mm-migration-empty',state.loading?'正在加载…':'请选择其他预设，再选择一个来源条目。'));}
      const selectedIds=new Set(state.selectedIds);sourceList.querySelectorAll<HTMLElement>('[data-id]').forEach(node=>{const selected=String(selectedIds.has(node.dataset.id!));if(node.dataset.selected!==selected){node.dataset.selected=selected;node.querySelector('.mm-migration-card-main')?.setAttribute('aria-pressed',selected);}});
    }
    if(targetList){const next=controller.revision();if(targetKey!==next){targetKey=next;targetWindow?.setRows(migration.targetRows());}}

    if(selectionCount)selectionCount.textContent=`已选择 ${state.selectedIds.length} 项 · 点击卡片可取消选择`;
    if(leftEditor&&state.leftPrompt)leftEditor.update(state.leftPrompt,controller.state.busy);if(rightEditor&&state.rightPrompt)rightEditor.update(state.rightPrompt,controller.state.busy);
    const reason=migration.fullReason();if(fullBridge){fullBridge.disabled=!migration.valid()||controller.state.busy||!!reason;fullBridge.removeAttribute('title');}
    const note=body.querySelector<HTMLElement>('[data-override-hint]');if(note)note.textContent=reason||'保留当前列表位置；注入顺序等高级属性将按来源覆盖。';
    const valid=migration.valid();const cardsDisabled=controller.state.busy||state.loading||!valid;body.querySelectorAll<HTMLButtonElement>('button.mm-migration-card-main').forEach(node=>{if(node.disabled!==cardsDisabled)node.disabled=cardsDisabled;});
    body.querySelectorAll<HTMLButtonElement>('.mm-migration-batch-actions button').forEach(node=>node.disabled=controller.state.busy||!migration.valid()||(node.textContent==='核对方案'&&state.batch?.find(i=>i.sourceId===node.closest<HTMLElement>('[data-batch-source]')?.dataset.batchSource)?.status==='blocked'));
    if(bridge)bridge.disabled=!migration.valid()||state.loading||controller.state.busy||(state.step==='list'&&!state.selectedIds.length);
    if(leftInput)leftInput.disabled=controller.state.busy;if(rightInput)rightInput.disabled=controller.state.busy;
    actions.querySelectorAll<HTMLButtonElement>('button').forEach(node=>node.disabled=controller.state.busy);
    body.querySelectorAll<HTMLElement>('[data-position]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.position===JSON.stringify(state.position))));
    if(opening)surfaceMotion(true);
  }
  on(dialog,'cancel',((event:Event)=>{if(event.defaultPrevented)return;event.preventDefault();if(controller.state.busy)return;if(sourcePicker&&!sourcePicker.layer.hidden){closeOptions();picker?.focus();}else if(migration.state.step!=='list')migration.back();else migration.close();}) as EventListener);
  on(dialog,'keydown',((event:KeyboardEvent)=>{
    if(event.defaultPrevented)return;event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();if(event.repeat||controller.state.busy)return;if(sourcePicker&&!sourcePicker.layer.hidden){closeOptions();picker?.focus();}else if(migration.state.step!=='list')migration.back();else migration.close();}
    else if(options&&sourcePicker&&!sourcePicker.layer.hidden&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();const nodes=[...options.querySelectorAll<HTMLButtonElement>('button')];let index=nodes.indexOf(doc.activeElement as HTMLButtonElement);
      index=event.key==='Home'?0:event.key==='End'?nodes.length-1:Math.max(0,Math.min(nodes.length-1,index+(event.key==='ArrowDown'?1:-1)));nodes[index]?.focus();
    }
  }) as EventListener);
  on(host,'resize',place);on(host,'orientationchange',place);if(host.visualViewport){on(host.visualViewport,'resize',place);on(host.visualViewport,'scroll',place);}
  const unsubscribe=controller.subscribe(render);
  const observer=new MutationObserver(()=>{if(migration.state.open&&(panel.hidden||panel.inert||!panel.isConnected))migration.close(true);});
  observer.observe(panel,{attributes:true,attributeFilter:['hidden','inert']});cleanups.push(()=>observer.disconnect());
  function requestBack():boolean {
    if(!migration.state.open)return false;
    if(controller.state.busy||childClosing||batchClosing||previewClosing)return true;
    if(previewDialog){closePreview();return true;}
    if(child){migration.back();return true;}
    if(batchDialog){migration.cancelBatch();return true;}
    if(sourcePicker&&!sourcePicker.layer.hidden){closeOptions();picker?.focus();return true;}
    if(migration.state.step!=='list')migration.back();else migration.close();
    return true;
  }
  const ownsEvent=(event:Event)=>event.composedPath().some(node=>[dialog,previewDialog,child,batchDialog].some(root=>root && (node===root || (node instanceof (doc.defaultView!.Node) && root.contains(node as Node)))));
  return {requestBack,ownsEvent,open:()=>migration.open(),close:()=>migration.close(true),dispose(){if(disposed)return;disposed=true;unsubscribe();cleanups.forEach(fn=>fn());migration.close(true);closePreview(true);finishHide();sourcePicker?.dispose();sourceWindow?.dispose();targetWindow?.dispose();leftEditor?.dispose();rightEditor?.dispose();body.replaceChildren();dialog.remove();}};
}
