// SPDX-License-Identifier: GPL-3.0-or-later
// Verbatim pinned API2 Runtime/Surface and UI methods; synthetic Launcher/host data.
const fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'../fixtures/hub-api2/src',n),'utf8');
const strip=s=>s.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const bootstrap=read('bootstrap.js'),protocol=bootstrap.slice(bootstrap.indexOf('async function registerSource('),bootstrap.indexOf('// Capture the iframe-bound API'));
const ui=read('hub-ui.js'),methods=ui.slice(ui.indexOf('    attachPanel(id, title, panel, presentation)'),ui.indexOf('    report(error)',ui.indexOf('    attachPanel(id, title, panel, presentation)')));
function hubCode(){return `window.createPinnedHub=function(){
const host=window,doc=document;
${['product-identity.js','motion-tuning.js','surface-motion.js','surface-controller.js','extension-runtime.js'].map(n=>strip(read(n))).join('\n')}
const shell={root:doc.createElement('div'),orb:doc.createElement('button')},root=doc.createElement('nav'),honeycomb=doc.createElement('button');
shell.root.style.cssText='--mie-motion-surface-open:180ms;--mie-motion-surface-close:160ms;--mie-motion-hero:200ms;--mie-z-surface:2147483500';honeycomb.style.cssText='position:fixed;left:24px;top:24px;width:64px;height:64px';honeycomb.innerHTML='<span>预设</span>';root.hidden=true;shell.root.append(shell.orb,root,honeycomb);doc.body.append(shell.root);
const panels=new Set(),extensionPanels=new Map(),warnings=[],sources=new Map(),withdrawing=new Set(),bundledPolicies=new Map(),savedHubState={extensions:{}};
let disposed=false,hubDisposed=false,paused=false,factoryCount=0,attachCount=0,closeCount=0,surface,extensionRuntime,hubUI,finish;
const whenDisposed=new Promise(r=>finish=r),onError=e=>warnings.push(String(e));
const launcher={capture:()=>({kind:'launcher',rect:honeycomb.getBoundingClientRect()}),originRect:()=>honeycomb.getBoundingClientRect(),originElement:()=>honeycomb,resume(){paused=false;},suspend(){paused=true;},highlight(){honeycomb.focus();},open:async()=>{root.hidden=false;},close:async()=>{root.hidden=true;},settle(open){root.hidden=!open;},setItems(){}};
function place(){const entry=extensionPanels.get(surface?.state);if(entry&&!surface.ownsNative(entry.panel))window.presentationTest.view.setPresentation('hub');}
extensionRuntime=createExtensionRuntime({onChange(){surface?.syncEntries();},onNativeWindow:(id,p)=>surface.registerNativeWindow(id,p),onRequestOpen:id=>surface.requestSurface(id),onBeforeOpen:id=>surface.acquireHub(id),onCancelOpen:(id,l)=>surface.cancelSurface(id,l),onPanel(...args){attachCount++;return hubUI.attachPanel(...args);},onShowPanel:(id,l)=>hubUI.showPanel(id,l),onClosePanel:(id,l)=>{closeCount++;return hubUI.closePanel(id,l);},onError:(_id,e)=>onError(e)});
surface=createSurfaceController({host,shell,root,launcher,panels,resolve:key=>extensionPanels.get(key),place,onState(){},onError,runtime:extensionRuntime});
hubUI={${methods}refresh(){surface.syncEntries();}};
${protocol}
const hub={apiVersion:2,version:'0.9.0',whenDisposed,extensions:{provide(m,f){return provide(m,api=>{factoryCount++;return f(api);});},open:id=>extensionRuntime.open(id),disable:id=>extensionRuntime.disable(id),enable:id=>extensionRuntime.enable(id)}};
const resize=()=>{surface.resize();place();};host.addEventListener('resize',resize);
return {hub,surface,nativeEntries:{set:(id,v)=>surface.setEntry(id,v)},runtime:extensionRuntime,warnings,panels,launcher,shell,root,
counts:()=>({factoryCount,attachCount,closeCount,paused}),honeycomb:()=>extensionRuntime.open('miemie.preset-manager'),
async dispose(){if(disposed)return;hubDisposed=true;await extensionRuntime.dispose();surface.dispose();disposed=true;host.removeEventListener('resize',resize);shell.root.remove();finish();}};
};`;}
module.exports={hubCode};
