// SPDX-License-Identifier: GPL-3.0-or-later
// Real pinned API2 Runtime and source protocol; presentation boundary is a test double.
import {createExtensionRuntime} from '../fixtures/hub-api2/src/extension-runtime.js';
import {readFileSync} from 'node:fs';
const bootstrap=readFileSync(new URL('../fixtures/hub-api2/src/bootstrap.js',import.meta.url),'utf8');
const sourceBlock=bootstrap.slice(bootstrap.indexOf('async function registerSource('),bootstrap.indexOf('// Capture the iframe-bound API'));
export function createAPI2HubFixture(host,{id,disabled=false,onAttach=()=>{},onError=()=>{},onFactory=()=>{}}={}) {
 const panels=new Map(),providers=new Map(),motion={honeycomb:0,native:0};
 const Controller=host.AbortController||AbortController;
 let surface=null,native=null,handle=null,preference=false,disposed=false,resolveDisposed;
 const whenDisposed=new Promise(r=>resolveDisposed=r);
 function cancelSurface(){surface?.controller.abort();surface=null;}
 function releaseNative(){const prior=native;native=null;if(prior){prior.controller.abort();providers.get(id)?.release(prior.context);}}
 function lease(){const controller=new Controller(),value={controller};value.context=Object.freeze({signal:controller.signal,isCurrent:()=>!disposed&&!controller.signal.aborted&&(surface===value||native===value)});return value;}
 function unmount(){releaseNative();handle?.dispose();handle=null;}
 const runtime=createExtensionRuntime({
  onError:(_id,error)=>onError(error),
  onRequestOpen(){cancelSurface();surface=lease();return surface.context;},
  onBeforeOpen(){releaseNative();return true;},
  onCancelOpen(){cancelSurface();},
  onPanel(owner,_title,panel,presentation){panel.hidden=true;panel.inert=true;panels.set(owner,{panel,presentation});onAttach(panel,presentation);return ()=>{cancelSurface();unmount();panel.hidden=true;panel.inert=true;panels.delete(owner);};},
  onShowPanel(owner,context){if(surface?.context!==context||!context.isCurrent())return false;const p=panels.get(owner)?.panel;if(!p)return false;motion.honeycomb++;p.hidden=false;p.inert=false;return true;},
  onClosePanel(owner,context){if(surface?.context!==context||!context.isCurrent())return false;cancelSurface();const p=panels.get(owner)?.panel;if(p){p.hidden=true;p.inert=true;}return true;},
  onNativeWindow(owner,provider){providers.set(owner,provider);return ()=>{unmount();providers.delete(owner);};},
 });
 const protocol=new Function('extensionRuntime','sources','withdrawing','savedHubState','bundledPolicies','hubUI',
  'let hubDisposed=false;'+sourceBlock+'\nreturn {provide,retire(){hubDisposed=true;}};')(
   runtime,new Map(),new Set(),{extensions:disabled?{[id]:{registered:true,enabled:false}}:{}},new Map(),{refresh(){}});
 const hub={apiVersion:2,version:'0.9.0',whenDisposed,extensions:{...runtime,provide(manifest,factory){return protocol.provide(manifest,api=>{onFactory(api);return factory(api);});}}};
 const fixture={hub,runtime,panels,motion,
  start(){host.__MieMieHub=hub;host.dispatchEvent(new host.CustomEvent('miemie:hub-ready',{detail:hub}));},
  async stop(){if(disposed)return whenDisposed;protocol.retire();disposed=true;cancelSurface();unmount();const pending=runtime.dispose();if(host.__MieMieHub===hub)delete host.__MieMieHub;host.dispatchEvent(new host.CustomEvent('miemie:hub-disposed',{detail:hub}));await pending;resolveDisposed();},
  preference(enabled){preference=enabled;unmount();const p=providers.get(id);if(enabled&&p&&runtime.get(id)?.enabled){const controller=new Controller();const h=p.mount({signal:controller.signal,open:()=>fixture.openNative()});handle={...h,dispose(){controller.abort();h.dispose();}};}},
  openNative(){if(!handle||!runtime.get(id)?.enabled)return Promise.resolve(false);if(surface){cancelSurface();for(const {panel}of panels.values()){panel.hidden=true;panel.inert=true;}}native||=lease();motion.native++;providers.get(id).open(native.context);return Promise.resolve({ok:true});},
  openHoneycomb(){return runtime.open(id);},
  get shortcut(){return handle;},get shortcutEnabled(){return preference;},get surfaceLease(){return surface?.context;},get nativeLease(){return native?.context;},
 };
 return fixture;
}
