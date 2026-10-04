// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Public Hub excerpts keep their upstream license; see fixtures/README.md.
const fs=require('node:fs'),path=require('node:path');
const officialPNG=fs.readFileSync(path.join(__dirname,'../assets/preset-manager-icon.png'));
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {PRESET_MANAGER_MANIFEST:manifest,startDualMode}=require('../.test-build/dual-mode.js');
const fixture=require('./fixtures/hub-v1-contracts.json');
const code=name=>{const item=fixture.excerpts.find(x=>x.name===name);assert(item,'Missing pinned excerpt '+name);return item.code;};
class Element extends EventTarget{
 constructor(doc,tag){super();this.ownerDocument=doc;this.tag=tag;this.nodeType=1;this.children=[];this.parentNode=null;this.dataset={};this.style={getPropertyValue:()=>'',getPropertyPriority:()=>'',setProperty(){},removeProperty(){}};this.observers=new Set();this._hidden=true;this.inert=true;this.textContent='';}
 get hidden(){return this._hidden;}set hidden(v){if(v===this._hidden)return;this._hidden=v;this.observers.forEach(f=>f());}
 get isConnected(){return this.tag==='html'||!!this.parentNode?.isConnected;}
 get parentElement(){return this.parentNode;}
 appendChild(n){n.remove();this.children.push(n);n.parentNode=this;return n;}
 append(...nodes){nodes.forEach(n=>this.appendChild(n));}
 replaceChildren(...nodes){[...this.children].forEach(n=>n.remove());this.textContent='';this.append(...nodes);}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 contains(n){return n===this||this.children.some(c=>c.contains(n));}
 setAttribute(){}getAttribute(){return null;}removeAttribute(){}focus(){this.ownerDocument.activeElement=this;}
}
class Observer{constructor(fn){this.fn=fn;}observe(node){this.node=node;this.notify=()=>queueMicrotask(this.fn);node.observers.add(this.notify);}disconnect(){this.node?.observers.delete(this.notify);}}
function harness(){
 const doc={activeElement:null,createElement(tag){return new Element(this,tag);}};doc.documentElement=new Element(doc,'html');doc.body=doc.documentElement;
 const panel=doc.createElement('section');doc.documentElement.append(panel);let closeHandler=null,created=0,presentation=null,paused=false;
 const view={panel,setCloseHandler(fn){closeHandler=fn;},open(){panel.hidden=false;panel.inert=false;},close(){panel.hidden=true;panel.inert=true;},dispose(){throw Error('Hub must not destroy the business view');}};
 const host=Object.assign(new EventTarget(),{document:doc,innerWidth:1000,innerHeight:800,MutationObserver:Observer,setTimeout,clearTimeout,getComputedStyle:()=>({getPropertyValue:()=>''})}),frame=new EventTarget();
 const extensionPanels=new Map(),panels=new Set(),root=doc.createElement('nav'),shell={root:doc.documentElement,orb:doc.createElement('button')};root.hidden=true;
 const launcher={capture:()=>({kind:'launcher'}),originRect:()=>null,originElement:()=>null,resume(){paused=false;},suspend(){paused=true;},highlight(){},open:async()=>{root.hidden=false;},close:async()=>{root.hidden=true;},setItems(items){this.items=items;}};
 const warnings=[];const context=vm.createContext({console:{warn:(...a)=>warnings.push(a.map(String).join(' '))},setTimeout,clearTimeout,AbortController,Promise,HUB_PRODUCT:{englishName:'MieMie Hub'},SURFACE_TUNING:{},host,doc,shell,root,launcher,panels,extensionPanels,disposed:false,menuButtons:[],lastError:'',place(){},onError:e=>warnings.push(String(e)),HUB_COPY:{extensionCenter:'Center',settings:'Settings'}});
 // Original function/method bodies; DOM, storage preferences, and Launcher are synthetic.
 vm.runInContext(code('createSurfaceMotion').replace(/^export /,'')+'\n'+code('createSurfaceController').replace(/^export /,'')+'\n'+code('createExtensionRuntime').replace(/^export /,'')+'\n'+code('registerSource')+'\n'+code('provide')+'\n'+code('renderMenu')+'\nglobalThis.methods={'+['attachPanel','showPanel','closePanel'].map(code).join(',')+'};',context);
 context.surface=context.createSurfaceController({host,shell,root,launcher,panels,resolve:key=>extensionPanels.get(key),place(){},onState(){},onError:context.onError});context.go=(...args)=>context.surface.go(...args);
 context.hubUI={...context.methods,refresh:()=>context.renderMenu()};context.sources=new Map();context.withdrawing=new Set();context.bundledPolicies=new Map();context.savedHubState={extensions:{}};context.hubDisposed=false;
 context.extensionRuntime=context.runtime=context.createExtensionRuntime({onChange:()=>context.hubUI.refresh(),onPanel(id,title,p,opts){presentation=opts.icon;return context.hubUI.attachPanel(id,title,p,opts);},onShowPanel:id=>context.hubUI.showPanel(id),onClosePanel:id=>context.hubUI.closePanel(id)});
 let provided=null;host.__MieMieHub={apiVersion:1,extensions:{provide(m,f){provided=m;return context.provide(m,api=>{created++;return f(api);});}}};
 return{host,frame,view,panel,context,warnings,launcher,provided:()=>provided,created:()=>created,presentation:()=>presentation,paused:()=>paused,requestClose:()=>closeHandler(),open:()=>context.surface.launch(manifest.id,()=>context.runtime.open(manifest.id),{kind:'shortcut',rect:{left:1,top:1,width:44,height:44}}),cleanup:async source=>{await source.dispose();await context.runtime.dispose();}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));async function flush(){for(let i=0;i<8;i++)await tick();}
test('Hub v1 production manifest passes original validate/provide and activates the factory',async()=>{
 const h=harness(),source=startDualMode(h.host,h.frame,h.view);try{await source.settled();assert.equal(h.provided(),manifest,'Never substitute or normalize the production manifest');assert.equal(manifest.contributes.launcher.icon,'预设');assert.equal(h.created(),1);assert.equal(h.context.runtime.get(manifest.id).state,'enabled');assert.equal(h.presentation(),manifest.icon);assert.match(h.presentation(),/^data:image\/png;base64,/);assert.deepEqual(Buffer.from(h.presentation().split(',')[1],'base64'),officialPNG);assert.equal(h.context.extensionPanels.size,1);assert.deepEqual(h.warnings,[]);}finally{await h.cleanup(source);}
});
test('Hub v1 original renderMenu selects the production presentation image over text fallback',async()=>{
 const h=harness(),source=startDualMode(h.host,h.frame,h.view);try{await source.settled();h.context.renderMenu();const button=h.launcher.items.find(n=>n.dataset.hubApp===manifest.id),icon=button.children[0];assert.equal(icon.className,'mm-launcher-image','Production presentation must pass the actual Hub image policy');assert.equal(icon.children[0].tag,'img');assert.equal(icon.children[0].src,h.presentation());icon.children[0].onerror();assert.equal(icon.textContent,'预设');}finally{await h.cleanup(source);}
});
test('Hub v1 production source opens, formally closes, reopens and releases one Surface',async()=>{
 const h=harness(),source=startDualMode(h.host,h.frame,h.view);try{await source.settled();for(let i=0;i<3;i++){await h.open();assert.equal(h.context.surface.state,'panel:'+manifest.id);assert.equal(h.paused(),true);h.requestClose();await flush();assert.equal(h.context.surface.state,'closed');assert.equal(h.panel.dataset.surfaceState,'closed');assert.equal(h.panel.hidden,true);assert.equal(h.paused(),false);assert.equal(h.created(),1);assert.equal(h.context.extensionPanels.size,1);}}finally{await h.cleanup(source);assert.equal(h.context.extensionPanels.size,0);assert.equal(h.context.surface.state,'closed');}
});
test('Hub v1 original provide rejects oversized SVG launcher metadata before invoking any factory',()=>{
 const h=harness();let called=0;const invalid={...manifest,contributes:{launcher:{...manifest.contributes.launcher,icon:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}}};assert(invalid.contributes.launcher.icon.length>16);const result=h.context.provide(invalid,()=>{called++;});assert.equal(result.ok,false);assert.match(result.error,/短文本或 emoji/);assert.equal(called,0);assert.equal(h.context.sources.size,0);assert.equal(h.context.runtime.list().length,0);assert.equal(manifest.contributes.launcher.icon,'预设');
});

test('Standalone uses the same unmodified official PNG as the production Hub presentation',async()=>{
 const h=harness();h.host.__MieMieHub=undefined;const source=startDualMode(h.host,h.frame,h.view);try{await source.settled();const launcher=h.panel.parentNode.children.find(n=>'miemiePresetManagerStandalone' in n.dataset);assert(launcher);assert.equal(launcher.children[0].src,manifest.icon);assert.deepEqual(Buffer.from(launcher.children[0].src.split(',')[1],'base64'),officialPNG);}finally{await h.cleanup(source);}
});
