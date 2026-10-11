// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { Row } from './contracts';
/** Variable-height window for large lists; all business rows stay in the controller. */
export function createMigrationList(doc:Document,root:HTMLElement,make:(row:Row,index:number)=>HTMLElement){
  const host=doc.defaultView!;
  const before=doc.createElement('div'),after=doc.createElement('div'),window=doc.createElement('div');
  before.setAttribute('aria-hidden','true');after.setAttribute('aria-hidden','true');window.className='mm-migration-window';
  let rows:Row[]=[],heights:number[]=[],prefix:number[]=[0],start=-1,end=-1,frame=0,disposed=false;
  let nodes=new Map<number,HTMLElement>();
  const indexes=new Map<string,number>();
  const observer=new ResizeObserver(()=>schedule());
  observer.observe(root);
  function rebuildPrefix(){prefix=[0];for(let i=0;i<heights.length;i++)prefix.push(prefix[i]+heights[i]+8);}
  function at(y:number){let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>>1;if(prefix[mid+1]<=y)lo=mid+1;else hi=mid;}return Math.min(lo,Math.max(0,rows.length-1));}
  function schedule(){if(disposed||frame||!root.isConnected)return;frame=host.requestAnimationFrame(()=>{frame=0;render();});}
  function render(){
    if(disposed||root.dataset.virtual!=='true'||!root.isConnected||!root.getClientRects().length)return;
    const anchor=at(root.scrollTop),oldAnchor=prefix[anchor];let changed=false;
    for(const [index,node]of nodes){const height=node.getBoundingClientRect().height;if(height>0&&Math.abs(heights[index]-height)>.5){heights[index]=height;changed=true;}}
    if(changed){rebuildPrefix();root.scrollTop+=prefix[anchor]-oldAnchor;}
    const nextStart=Math.max(0,at(Math.max(0,root.scrollTop-296))),nextEnd=Math.min(rows.length,at(root.scrollTop+root.clientHeight+296)+1);
    if(start!==nextStart||end!==nextEnd){
      const active=doc.activeElement as HTMLElement|null;const hadFocus=!!active&&root.contains(active);const old=nodes;nodes=new Map();const fragment=doc.createDocumentFragment();
      for(let i=nextStart;i<nextEnd;i++){const node=old.get(i)??make(rows[i],i);nodes.set(i,node);fragment.append(node);observer.observe(node);}
      for(const [i,node]of old)if(!nodes.has(i))observer.unobserve(node);
      window.replaceChildren(fragment);start=nextStart;end=nextEnd;if(hadFocus){if(active?.isConnected)active.focus({preventScroll:true});else{root.tabIndex=-1;root.focus({preventScroll:true});}}
    }
    before.style.height=`${prefix[Math.max(0,start)]}px`;
    after.style.height=`${Math.max(0,prefix[rows.length]-prefix[Math.max(0,end)]-(end<rows.length?8:0))}px`;
    window.style.paddingBottom=end<rows.length?'8px':'0';
  }
  function focusRow(index:number,preview=false){
    if(index<0||index>=rows.length)return;
    root.scrollTop=prefix[index];render();
    const node=nodes.get(index);(preview?node?.querySelector<HTMLButtonElement>('.mm-migration-view'):node?.querySelector<HTMLButtonElement>('button'))?.focus({preventScroll:true});
  }
  function key(event:KeyboardEvent){
    if(root.dataset.virtual!=='true')return;
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button'),card=button?.closest<HTMLElement>('[data-id]');
    if(!button||!card)return;const index=indexes.get(card.dataset.id!);if(index===undefined)return;
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();event.stopPropagation();focusRow(event.key==='Home'?0:event.key==='End'?rows.length-1:index+(event.key==='ArrowDown'?1:-1),button.classList.contains('mm-migration-view'));
    }else if(event.key==='Tab'&&index===end-1&&!event.shiftKey&&button.classList.contains('mm-migration-view')&&index<rows.length-1){event.preventDefault();focusRow(index+1);}
    else if(event.key==='Tab'&&index===start&&event.shiftKey&&!button.classList.contains('mm-migration-view')&&index>0){event.preventDefault();focusRow(index-1,true);}
  }
  root.addEventListener('scroll',schedule,{passive:true});root.addEventListener('keydown',key);
  return {
    setRows(next:Row[]){
      for(const node of nodes.values())observer.unobserve(node);nodes.clear();rows=next;indexes.clear();rows.forEach((row,i)=>indexes.set(row.prompt.identifier,i));root.dataset.totalRows=String(rows.length);root.dataset.virtual=String(rows.length>120);start=-1;end=-1;heights=rows.map(()=>74);rebuildPrefix();root.scrollTop=0;
      if(rows.length>120){root.replaceChildren(before,window,after);render();schedule();}
      else{const fragment=doc.createDocumentFragment();rows.forEach((row,i)=>fragment.append(make(row,i)));root.replaceChildren(fragment);}
    },
    dispose(){if(disposed)return;disposed=true;observer.disconnect();if(frame)host.cancelAnimationFrame(frame);root.removeEventListener('scroll',schedule);root.removeEventListener('keydown',key);nodes.clear();rows=[];indexes.clear();}
  };
}
