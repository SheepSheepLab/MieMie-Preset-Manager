// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { NativePrompt, PromptPatch } from './contracts';
import { createFloatingPicker } from './floating-picker';
import { EDITOR_ROLES, EDITOR_TRIGGERS } from './prompt-editor-fields';
/** Official editor field schema in a stable, independently scrolling comparison pane. */
export function mountMigrationEditor(doc:Document,parent:HTMLElement,side:'来源'|'目标',initial:NativePrompt,change:(patch:PromptPatch)=>void,overlay:HTMLElement=parent.closest('dialog')??parent){
  const form=doc.createElement('div');form.className='mm-migration-editor mm-migration-scroll';
  const controls=new Map<string,HTMLInputElement|HTMLTextAreaElement>();
  const pickers:Array<ReturnType<typeof createFloatingPicker>>=[];
  const updates:Array<(p:NativePrompt,busy:boolean)=>void>=[];
  function field(label:string,node:HTMLElement){const wrap=doc.createElement('label');wrap.className='mm-migration-field';const text=doc.createElement('span');text.textContent=label;wrap.append(text,node);return wrap;}
  function text(key:'name'|'content',label:string){const node=doc.createElement(key==='content'?'textarea':'input');if(node.tagName==='INPUT')(node as HTMLInputElement).type='text';node.setAttribute('aria-label',side+(key==='content'?'正文':'标题'));node.value=initial[key]??'';if(node.tagName==='TEXTAREA')node.spellcheck=false;
    node.addEventListener('input',()=>change({[key]:node.value}));controls.set(key,node);form.append(field(label,node));updates.push((p,busy)=>{if(node.value!==(p[key]??''))node.value=p[key]??'';node.disabled=busy;});return node;}
  function picker(key:'role'|'injection_position',label:string,choices:ReadonlyArray<readonly[string,string]>,parent:HTMLElement){
    const wrap=doc.createElement('div');wrap.className='mm-migration-field';const title=doc.createElement('span');title.textContent=label;
    const trigger=doc.createElement('button');trigger.type='button';trigger.className='mm-migration-field-picker';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-label',side+label);trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
    const list=[...choices];if(initial[key]===undefined||!choices.some(([id])=>id===String(initial[key])))list.push([String(initial[key]??''),initial[key]===undefined?'未设置（保留原值）':`保留原值：${initial[key]}`]);
    wrap.append(title,trigger);parent.append(wrap);
    const picker=createFloatingPicker(doc,overlay,trigger,side+label,list,String(initial[key]??''),id=>{if(id!=='')change(key==='role'?{role:id}:{injection_position:Number(id)});});pickers.push(picker);
    updates.push((p,busy)=>picker.update(String(p[key]??''),busy));
  }
  text('name','标题');picker('role','身份',EDITOR_ROLES,form);const content=text('content','内容');
  const details=doc.createElement('details'),summary=doc.createElement('summary');summary.textContent='高级设置';details.append(summary);const advanced=doc.createElement('div');advanced.className='mm-migration-advanced';
  picker('injection_position','插入位置（Position）',[['0','相对位置（Relative）'],['1','聊天中（In-Chat）']],advanced);
  const numeric=doc.createElement('div');numeric.className='mm-migration-field-row';
  for(const [key,label]of [['injection_depth','深度（Depth）'],['injection_order','顺序（Order）']]as const){const input=doc.createElement('input');input.type='number';input.min='0';input.max='9999';input.step='1';input.placeholder='保留默认';input.setAttribute('aria-label',side+label);controls.set(key,input);input.oninput=()=>{input.setCustomValidity('');const number=Number(input.value);const valid=input.value!==''&&input.validity.valid&&Number.isSafeInteger(number);input.setCustomValidity(valid?'':'请填写 0 到 9999 的整数；要放弃本次修改，请取消编辑。');change({[key]:valid?number:Number.NaN});};numeric.append(field(label,input));updates.push((p,busy)=>{const value=p[key]===undefined?'':String(p[key]);if((p[key]===undefined||Number.isFinite(p[key]))&&input.value!==value){input.value=value;input.setCustomValidity('');}input.disabled=busy;});}advanced.append(numeric);
  const triggers=doc.createElement('div');triggers.className='mm-migration-checks';const title=doc.createElement('span');title.textContent='触发条件（空选表示全部）';advanced.append(title,triggers);
  const known=new Set<string>(EDITOR_TRIGGERS.map(([id])=>id));const values=[...EDITOR_TRIGGERS,...(initial.injection_trigger??[]).filter(id=>!known.has(id)).map(id=>[id,`保留触发值：${id}`]as const)];let selected=new Set(initial.injection_trigger??[]);
  for(const [id,label]of values){const input=doc.createElement('input');input.type='checkbox';input.setAttribute('aria-label',side+label);input.onchange=()=>{if(input.checked)selected.add(id);else selected.delete(id);change({injection_trigger:[...selected]});};triggers.append(field(label,input));updates.push((p,busy)=>{input.checked=(p.injection_trigger??[]).includes(id);input.disabled=busy||!known.has(id);});}
  if(['main','jailbreak'].includes(initial.identifier)){const input=doc.createElement('input');input.type='checkbox';input.setAttribute('aria-label',side+'禁止角色卡覆盖');input.onchange=()=>change({forbid_overrides:input.checked});advanced.append(field('禁止角色卡覆盖',input));updates.push((p,busy)=>{input.checked=!!p.forbid_overrides;input.disabled=busy;});}
  const hint=doc.createElement('p');hint.className='mm-migration-hint';hint.textContent='未显示的原生字段会完整保留。';advanced.append(hint);details.append(advanced);form.append(details);parent.append(form);
  function update(p:NativePrompt,busy:boolean){selected=new Set(p.injection_trigger??[]);updates.forEach(fn=>fn(p,busy));}
  update(initial,false);return {content,form,update,validate:()=>[...controls.values()].every(input=>input.reportValidity()),dispose:()=>pickers.forEach(p=>p.dispose())};
}
