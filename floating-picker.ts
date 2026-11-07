// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import { createIcon } from './icons';
let sequence=0;
/** Escape belongs to the visible picker even when Safari leaves focus on its dialog.
 * Capture before dialog handlers, and cancel the keyboard default (native dialog cancel).
 * A native cancel delivered without keydown follows the same one-layer rule. */
export function createPickerEscapeGuard(doc:Document,trigger:HTMLButtonElement,isOpen:()=>boolean,dismiss:()=>void){
  let listening=false;
  function interactive(){
    if(!isOpen()||!trigger.isConnected||trigger.closest('[hidden],[inert]'))return false;
    const modal=[...doc.querySelectorAll<HTMLDialogElement>('dialog:modal')].at(-1);
    return !modal||modal.contains(trigger);
  }
  function consume(event:Event){event.preventDefault();event.stopImmediatePropagation();dismiss();}
  function keydown(event:KeyboardEvent){if(event.key==='Escape'&&!event.isComposing&&event.keyCode!==229&&interactive())consume(event);}
  function cancel(event:Event){if(interactive()&&(event.target as Node).contains(trigger))consume(event);}
  function listen(add:boolean){
    if(listening===add)return;listening=add;
    const method=add?'addEventListener':'removeEventListener';
    doc[method]('keydown',keydown as EventListener,true);doc[method]('cancel',cancel,true);
  }
  return {activate:()=>listen(true),deactivate:()=>listen(false)};
}
/** Product-owned overlay. The selected row meets the field, without changing document flow. */
export function createFloatingPicker(doc:Document,root:HTMLElement,trigger:HTMLButtonElement,label:string,values:ReadonlyArray<readonly[string,string]>,initial:string,change:(id:string)=>void,bounds:()=>DOMRect=()=>root.getBoundingClientRect()){
  const host=doc.defaultView!,layer=doc.createElement('div'),menu=doc.createElement('div'),value=doc.createElement('span');
  layer.className='mm-floating-layer';layer.hidden=true;menu.className='mm-floating-menu';menu.id=`mm-floating-${++sequence}`;menu.setAttribute('role','listbox');menu.setAttribute('aria-label',label+'选项');
  const top=doc.createElement('div'),bottom=doc.createElement('div');top.className='mm-floating-shadow mm-floating-top';bottom.className='mm-floating-shadow mm-floating-bottom';top.setAttribute('aria-hidden','true');bottom.setAttribute('aria-hidden','true');layer.append(menu,top,bottom);root.append(layer);
  value.className='mm-floating-value';trigger.replaceChildren(value,createIcon(doc,'chevron'));trigger.removeAttribute('title');trigger.setAttribute('role','combobox');trigger.setAttribute('aria-label',label);trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',menu.id);
  let current=initial,disposed=false,frame=0,openListeners=false,built=false;
  const escape=createPickerEscapeGuard(doc,trigger,()=>!layer.hidden,()=>close(true));
  const labels=new Map(values);let selectedButton:HTMLButtonElement|undefined,lastDisabled:boolean|undefined;
  const buttons:HTMLButtonElement[]=[];
  const shadows=()=>{top.hidden=menu.scrollTop<=1;bottom.hidden=menu.scrollHeight-menu.clientHeight-menu.scrollTop<=1;};
  function position(){
    if(layer.hidden||disposed)return;
    const b=bounds(),a=trigger.getBoundingClientRect(),origin=(layer.offsetParent as HTMLElement|null)?.getBoundingClientRect()??new DOMRect(0,0,host.innerWidth,host.innerHeight);
    const vv=host.visualViewport,edgeTop=Math.max(b.top+8,vv?.offsetTop??0),edgeBottom=Math.min(b.bottom-8,(vv?.offsetTop??0)+(vv?.height??host.innerHeight));
    if(!trigger.isConnected||a.bottom<=b.top||a.top>=b.bottom){close();return;}
    const available=Math.max(44,edgeBottom-edgeTop);layer.style.width=`${Math.min(a.width,Math.max(44,b.width-16))}px`;menu.style.maxHeight=`${available}px`;
    const selected=buttons.find(button=>button.dataset.value===current)??buttons[0],center=a.top+a.height/2;
    const before=selected?selected.offsetTop+selected.offsetHeight/2+menu.clientTop:22,after=menu.scrollHeight+2*menu.clientTop-before;
    menu.style.maxHeight=`${Math.min(available,Math.max(44,Math.min(center-edgeTop+after,edgeBottom-center+before)))}px`;
    const height=menu.getBoundingClientRect().height,rowCenter=selected?selected.offsetTop+selected.offsetHeight/2+menu.clientTop:height/2;
    const y=Math.max(edgeTop,Math.min(center-rowCenter,Math.max(edgeTop,edgeBottom-height)));
    layer.style.left=`${Math.max(b.left+8,Math.min(a.left,b.right-8-layer.offsetWidth))-origin.left-((layer.offsetParent as HTMLElement|null)?.clientLeft??0)}px`;
    layer.style.top=`${y-origin.top-((layer.offsetParent as HTMLElement|null)?.clientTop??0)}px`;
    menu.scrollTop=Math.max(0,Math.min(menu.scrollHeight-menu.clientHeight,y+rowCenter-center));shadows();
  }
  function schedule(){if(!frame)frame=host.requestAnimationFrame(()=>{frame=0;position();});}
  function outside(e:Event){const node=e.target as Node;if(!trigger.contains(node)&&!layer.contains(node))close();}
  function focusout(e:FocusEvent){const node=e.relatedTarget as Node|null;if(!node||(!trigger.contains(node)&&!layer.contains(node)))close();}
  function scroll(e:Event){if(!layer.contains(e.target as Node))schedule();}
  function key(e:KeyboardEvent){
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
    e.preventDefault();e.stopPropagation();if(layer.hidden){open(true);return;}
    const enabled=buttons.filter(b=>!b.disabled),i=enabled.indexOf(doc.activeElement as HTMLButtonElement);
    const n=e.key==='Home'?0:e.key==='End'?enabled.length-1:(Math.max(0,i)+(e.key==='ArrowDown'?1:enabled.length-1))%enabled.length;
    enabled[n]?.focus({preventScroll:true});enabled[n]?.scrollIntoView({block:'nearest'});shadows();
  }
  function listen(add:boolean){if(openListeners===add)return;openListeners=add;const method=add?'addEventListener':'removeEventListener';doc[method]('pointerdown',outside,true);doc[method]('scroll',scroll,true);host[method]('resize',schedule);host.visualViewport?.[method]('resize',schedule);host.visualViewport?.[method]('scroll',schedule);}
  function close(focus=false){layer.hidden=true;trigger.setAttribute('aria-expanded','false');escape.deactivate();listen(false);if(frame){host.cancelAnimationFrame(frame);frame=0;}if(focus&&trigger.isConnected)trigger.focus({preventScroll:true});}
  function open(keyboard=false){if(disposed||trigger.disabled)return;build();root.querySelectorAll<HTMLButtonElement>('[role=combobox][aria-expanded=true]').forEach(b=>{if(b!==trigger)b.dispatchEvent(new CustomEvent('mm:picker-close'));});layer.hidden=false;trigger.setAttribute('aria-expanded','true');position();if(layer.hidden)return;listen(true);escape.activate();if(keyboard)(buttons.find(b=>b.dataset.value===current&&!b.disabled)??buttons.find(b=>!b.disabled))?.focus({preventScroll:true});}
  function build(){if(built)return;built=true;const fragment=doc.createDocumentFragment();
    for(const [id,name]of values){const b=doc.createElement('button');b.type='button';b.className='mm-floating-option';b.setAttribute('role','option');b.tabIndex=-1;b.dataset.value=id;const copy=doc.createElement('span');copy.textContent=name;b.append(copy,createIcon(doc,'check'));b.onclick=()=>{update(id);close(true);change(id);};b.disabled=trigger.disabled;b.setAttribute('aria-selected',String(id===current));if(id===current)selectedButton=b;buttons.push(b);fragment.append(b);}menu.append(fragment);lastDisabled=trigger.disabled;
  }
  function update(id:string,disabled=trigger.disabled){
    if(current!==id||trigger.dataset.value!==id){current=id;trigger.dataset.value=id;value.textContent=labels.get(id)??`保留原值：${id}`;selectedButton?.setAttribute('aria-selected','false');selectedButton=buttons.find(b=>b.dataset.value===id);selectedButton?.setAttribute('aria-selected','true');}
    if(trigger.disabled!==disabled)trigger.disabled=disabled;
    if(built&&lastDisabled!==disabled){buttons.forEach(b=>b.disabled=disabled);lastDisabled=disabled;}
    if(disabled)close();
  }
  const toggle=()=>layer.hidden?open():close(),forceClose=()=>close();trigger.addEventListener('click',toggle);trigger.addEventListener('keydown',key);menu.addEventListener('keydown',key);trigger.addEventListener('focusout',focusout);layer.addEventListener('focusout',focusout);trigger.addEventListener('mm:picker-close',forceClose);menu.addEventListener('scroll',shadows,{passive:true});update(initial);
  return {menu,layer,update,close,position,dispose(){if(disposed)return;close();disposed=true;trigger.removeEventListener('click',toggle);trigger.removeEventListener('keydown',key);menu.removeEventListener('keydown',key);trigger.removeEventListener('focusout',focusout);layer.removeEventListener('focusout',focusout);trigger.removeEventListener('mm:picker-close',forceClose);menu.removeEventListener('scroll',shadows);layer.remove();}};
}
export const floatingPickerStyles=`
.mm-floating-layer{position:absolute;z-index:20;min-width:0;border-radius:12px;box-shadow:0 14px 36px #0009;animation:mm-floating-in .18s ease-out;isolation:isolate}.mm-floating-layer[hidden]{display:none!important}
.mm-floating-menu{display:grid;gap:2px;padding:5px;border:1px solid var(--mm-line);border-radius:12px;background:var(--mm-bg);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--mm-line) transparent}
.mm-floating-layer .mm-floating-option{width:100%;min-width:0;min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;border-radius:8px;padding:10px 14px;margin:0;text-align:left;background:transparent;color:var(--mm-text);font:inherit;cursor:pointer}.mm-floating-option span{min-width:0;overflow-wrap:anywhere}.mm-floating-option svg{width:18px;height:18px;flex:none;opacity:0}.mm-floating-option[aria-selected=true]{background:var(--mm-tonal);color:var(--mm-accent)}.mm-floating-option[aria-selected=true] svg{opacity:1}.mm-floating-option:hover:not(:disabled){background:var(--mm-card)}.mm-floating-option:focus-visible{outline:2px solid var(--mm-accent);outline-offset:-2px}.mm-floating-value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:left}.mm-floating-shadow{position:absolute;left:1px;right:1px;height:40px;pointer-events:none;border-radius:11px;z-index:1}.mm-floating-shadow[hidden]{display:none}.mm-floating-top{top:1px;background:linear-gradient(#080617d9,transparent)}.mm-floating-bottom{bottom:1px;background:linear-gradient(transparent,#080617d9)}
@keyframes mm-floating-in{from{opacity:0;filter:brightness(.85)}to{opacity:1;filter:none}}@media(prefers-reduced-motion:reduce){.mm-floating-layer{animation:none}}
`;
