// SPDX-License-Identifier: GPL-3.0-or-later
// Pinned Hub functions; Launcher/storage dependencies are synthetic.
const fs=require('node:fs'),path=require('node:path');
const fixture=require('../fixtures/hub-v1-contracts.json'),code=n=>fixture.excerpts.find(x=>x.name===n).code.replace(/^export /,'');
const shortcut=fs.readFileSync(path.join(__dirname,'../fixtures/hub-v1-shortcut-launchers.js'),'utf8').replace(/^export /m,'');
function hubCode(){return `window.createPinnedHub=function(){
const host=window,doc=document,HUB_PRODUCT={englishName:'MieMie Hub'},HUB_COPY={extensionCenter:'Center',settings:'Settings'},NATIVE_PRESENTATION_TIMEOUT_MS=5000;
const SURFACE_TUNING={fallbackOffset:12,fallbackScale:.9,contentEnterStart:.2,contentEnterEnd:.8,contentExitEnd:.6,faceEnterEnd:.7,faceExitStart:.2,faceExitEnd:.8};
const shell={root:doc.createElement('div'),orb:doc.createElement('button')},root=doc.createElement('nav'),honeycomb=doc.createElement('button');
shell.root.style.cssText='--mie-motion-surface-open:180ms;--mie-motion-surface-close:160ms;--mie-motion-hero:200ms;--mie-z-surface:2147483500';
honeycomb.style.cssText='position:fixed;left:24px;top:24px;width:64px;height:64px';honeycomb.innerHTML='<span>预设</span>';root.hidden=true;shell.root.append(shell.orb,root,honeycomb);doc.body.append(shell.root);
const panels=new Set(),extensionPanels=new Map(),warnings=[],sources=new Map(),withdrawing=new Set(),bundledPolicies=new Map(),savedHubState={extensions:{}};
let disposed=false,hubDisposed=false,menuButtons=[],lastError='',factoryCount=0,attachCount=0,closeCount=0,paused=false,surface,shortcuts,extensionRuntime,runtime,hubUI;
const onError=e=>warnings.push(String(e)),launcher={capture:()=>({kind:'launcher',rect:honeycomb.getBoundingClientRect()}),originRect:()=>honeycomb.getBoundingClientRect(),originElement:()=>honeycomb,resume(){paused=false;},suspend(){paused=true;},highlight(){honeycomb.focus();},open:async()=>{root.hidden=false;},close:async()=>{root.hidden=true;},setItems(items){this.items=items;}};
${['createSurfaceMotion','createSurfaceController','createExtensionRuntime','registerSource','provide','renderMenu'].map(code).join('\n')}
${shortcut}
function place(){const entry=extensionPanels.get(surface?.state);if(entry&&!surface.placeNative(entry.panel))window.presentationTest.view.setPresentation('hub');}
surface=createSurfaceController({host,shell,root,launcher,panels,resolve:key=>extensionPanels.get(key),place,onState(){},onError});
const methods={${['attachPanel','showPanel','closePanel'].map(code).join(',')}};
hubUI={...methods,refresh(){renderMenu();shortcuts?.sync();}};
shortcuts=createShortcutLaunchers({host,runtime:{get:id=>extensionRuntime.get(id),open:id=>extensionRuntime.open(id)},launch:(...args)=>surface.launch(...args),onError});
extensionRuntime=createExtensionRuntime({onChange:()=>hubUI.refresh(),onPanel(id,title,p,opts){attachCount++;return hubUI.attachPanel(id,title,p,opts);},onShowPanel:id=>hubUI.showPanel(id),onClosePanel:id=>{closeCount++;return hubUI.closePanel(id);},onShortcut:(id,mount)=>shortcuts.register(id,mount)});
runtime=extensionRuntime;const go=(...args)=>surface.go(...args);const hub={apiVersion:1,extensions:{provide(m,f){return provide(m,api=>{factoryCount++;return f(api);});}}};
const resize=()=>{surface.resize();place();};host.addEventListener('resize',resize);
return {hub,surface,shortcuts,runtime:extensionRuntime,warnings,panels,launcher,shell,root,
counts:()=>({factoryCount,attachCount,closeCount,paused}),honeycomb:()=>surface.launch('miemie.preset-manager',()=>extensionRuntime.open('miemie.preset-manager')),
async dispose(){hubDisposed=true;await extensionRuntime.dispose();surface.dispose();shortcuts.dispose();host.removeEventListener('resize',resize);shell.root.remove();}};
};`;}
module.exports={hubCode};
