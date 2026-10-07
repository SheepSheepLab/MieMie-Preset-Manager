// Copyright (C) 2026 SheepSheepLab
// Adapted from MieMie Polisher 1.2.1
// (commit 5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1).
// SPDX-License-Identifier: GPL-3.0-or-later
import { createNativeFloatingPresentation, type NativeBounds, type NativePresentation } from './native-floating-presentation';
import { PRESET_MANAGER_DOCK_KEY, PRESET_MANAGER_PRODUCT } from './product-identity';
import { nativeLauncherStyles } from './presentation-styles';
import { createIcon } from './icons';
export type NativeLauncher = {
  presentation: NativePresentation; getOrigin(): HTMLButtonElement | null;
  setActive(active: boolean): void; highlight(): void;
  show(panel: HTMLElement): Promise<boolean>; close(panel: HTMLElement): Promise<boolean>; dispose(): void;
};
export function createPresetManagerNativeLauncher({ host, icon, mode = 'standalone', open, onError = () => {} }: {
  host: Window; icon: string; mode?: 'standalone' | 'shortcut'; open: () => unknown; onError?: (error: unknown) => void;
}): NativeLauncher {
  const doc = host.document, style = doc.createElement('style'), orb = doc.createElement('button');
  style.textContent = nativeLauncherStyles;
  orb.type = 'button';
  if (mode === 'standalone') orb.dataset.miemiePresetManagerStandalone = '';
  orb.dataset.miemiePresetManagerNative = ''; orb.dataset.miemiePresetManagerMode = mode;
  orb.title = PRESET_MANAGER_PRODUCT.launcherName; orb.setAttribute('aria-label',`打开${PRESET_MANAGER_PRODUCT.name}`);
  const image = doc.createElement('img'); image.alt = ''; image.draggable = false;
  const imageFailed = () => {
    if (disposed || image.parentElement !== orb) return;
    const fallback = createIcon(doc, 'sheep');
    fallback.dataset.presetManagerIconFallback = '';
    image.replaceWith(fallback);
  };
  image.addEventListener('error', imageFailed, { once: true }); image.src = icon; orb.append(image);
  (doc.head || doc.documentElement).append(style); (doc.body || doc.documentElement).append(orb);
  let dock: { side:'left' | 'right'; ratio:number } = { side:'right', ratio:.6 };
  type Drag = { id:number; x:number; y:number; left:number; top:number; bounds:NativeBounds; moved:boolean; leftNow:number; topNow:number };
  let drag: Drag | null = null, suppress = false, disposed = false, queue: Promise<unknown> = Promise.resolve();
  let pending: { opening:boolean; task:Promise<boolean> } | null = null, activePanel:HTMLElement | null = null, followFrame = 0;
  const raf = host.requestAnimationFrame?.bind(host) || ((fn:FrameRequestCallback) => host.setTimeout(fn,16));
  const caf = host.cancelAnimationFrame?.bind(host) || host.clearTimeout.bind(host);
  const presentation = createNativeFloatingPresentation(host,orb,bounds);
  try {
    const value = JSON.parse(host.localStorage.getItem(PRESET_MANAGER_DOCK_KEY) || 'null');
    if (['left','right'].includes(value?.side) && Number.isFinite(value.ratio)) dock = { side:value.side, ratio:Math.max(0,Math.min(1,value.ratio)) };
  } catch { /* Storage may be unavailable; Dock remains page-local. */ }
  function bounds(): NativeBounds {
    const v = host.visualViewport, w = v?.width || host.innerWidth, h = v?.height || host.innerHeight, css = host.getComputedStyle(orb);
    const safe = (side:string) => Math.max(10,parseFloat(css.getPropertyValue(`--mm-native-safe-${side}`)) || 0);
    const left = (v?.offsetLeft || 0)+safe('left'), top = (v?.offsetTop || 0)+safe('top');
    const size = Math.max(1,Math.min(64,w-safe('left')-safe('right'),h-safe('top')-safe('bottom')));
    return { left,top,size,right:Math.max(left,(v?.offsetLeft || 0)+w-safe('right')-size),bottom:Math.max(top,(v?.offsetTop || 0)+h-safe('bottom')-size) };
  }
  function place() {
    const b = bounds();
    Object.assign(orb.style,{position:'fixed',transform:'none',width:`${b.size}px`,height:`${b.size}px`,left:`${dock.side==='left'?b.left:b.right}px`,top:`${b.top+dock.ratio*Math.max(0,b.bottom-b.top)}px`});
  }
  function follow() { if (!followFrame) followFrame = raf(() => { followFrame = 0; presentation.follow(); }); }
  function settlePosition() { if (followFrame) caf(followFrame); followFrame = 0; presentation.follow(); }
  function cancelPointer() {
    const old = drag; drag = null;
    if (old) try { orb.releasePointerCapture(old.id); } catch { /* Already released. */ }
  }
  function resize() { cancelPointer(); suppress = true; presentation.cancel(); place(); presentation.follow(); }
  function down(e:PointerEvent) {
    if (disposed || drag || e.isPrimary === false || e.button !== 0) return;
    const r = orb.getBoundingClientRect();
    drag = {id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,leftNow:r.left,topNow:r.top,bounds:bounds(),moved:false}; suppress = false;
    try { orb.setPointerCapture(e.pointerId); } catch { /* Older hosts still dispatch document events. */ }
  }
  function move(e:PointerEvent) {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX-drag.x, dy = e.clientY-drag.y;
    if (Math.hypot(dx,dy)>7) drag.moved = true;
    if (!drag.moved) return;
    e.preventDefault(); const b = drag.bounds;
    drag.leftNow = Math.max(b.left,Math.min(b.right,drag.left+dx)); drag.topNow = Math.max(b.top,Math.min(b.bottom,drag.top+dy));
    orb.style.transform = `translate(${drag.leftNow-drag.left}px,${drag.topNow-drag.top}px)`; follow();
  }
  function end(e:PointerEvent) {
    if (!drag || drag.id !== e.pointerId) return;
    const old = drag; suppress = old.moved; cancelPointer();
    if (old.moved) {
      const b = bounds(); dock = {side:old.leftNow<(b.left+b.right)/2?'left':'right',ratio:Math.max(0,Math.min(1,(old.topNow-b.top)/Math.max(1,b.bottom-b.top)))};
      try { host.localStorage.setItem(PRESET_MANAGER_DOCK_KEY,JSON.stringify(dock)); } catch { /* Memory-only Dock fallback. */ }
      place(); settlePosition();
    }
  }
  function abort(e:PointerEvent) { if (!drag || drag.id !== e.pointerId) return; suppress = true; cancelPointer(); place(); settlePosition(); }
  function click(e:MouseEvent) {
    if (suppress && e.detail !== 0) { suppress = false; e.preventDefault(); return; }
    suppress = false; if (!disposed) void Promise.resolve().then(open).catch(onError);
  }
  const listeners: Record<string,EventListener> = {pointerdown:down as EventListener,pointermove:move as EventListener,pointerup:end as EventListener,pointercancel:abort as EventListener,lostpointercapture:abort as EventListener,click:click as EventListener};
  for (const [name,fn] of Object.entries(listeners)) orb.addEventListener(name,fn);
  for (const name of ['resize','orientationchange']) host.addEventListener(name,resize);
  host.visualViewport?.addEventListener('resize',resize); host.visualViewport?.addEventListener('scroll',resize); place();
  function transition(panel:HTMLElement, opening:boolean): Promise<boolean> {
    if (disposed) return Promise.resolve(false);
    if (pending?.opening === opening) return pending.task;
    const task = queue.then(async () => {
      if (disposed) return false;
      if (opening && !panel.hidden) { panel.focus?.({preventScroll:true}); return true; }
      if (!opening && panel.hidden) return true;
      activePanel = panel; panel.hidden = false; panel.inert = true; panel.dataset.surfaceState = opening?'opening':'closing';
      try { await presentation.run(panel,opening); }
      catch (error) { presentation.cancel(); onError(error); }
      if (disposed) return false;
      panel.hidden = !opening; panel.inert = !opening; panel.dataset.surfaceState = opening?'open':'closed';
      if (opening) panel.focus?.({preventScroll:true});
      else { activePanel = null; presentation.release(); orb.inert = false; orb.focus({preventScroll:true}); }
      return true;
    });
    queue = task.catch(onError); pending = {opening,task};
    void task.finally(() => { if (pending?.task === task) pending = null; }).catch(() => {});
    return task;
  }
  return { presentation,getOrigin:() => disposed?null:orb,
    setActive(active) { if (active) orb.dataset.surfaceActive='true'; else delete orb.dataset.surfaceActive; },
    highlight() { if (!disposed) { orb.inert = false; orb.focus({preventScroll:true}); } },
    show:panel => transition(panel,true), close:panel => transition(panel,false),
    dispose() {
      if (disposed) return; disposed = true; cancelPointer(); presentation.dispose(); if (followFrame) caf(followFrame); followFrame = 0;
      // A delegated Shortcut never owns hidden/inert. Only our local transitions do.
      if (activePanel) { activePanel.hidden = true; activePanel.inert = true; }
      for (const [name,fn] of Object.entries(listeners)) orb.removeEventListener(name,fn);
      for (const name of ['resize','orientationchange']) host.removeEventListener(name,resize);
      host.visualViewport?.removeEventListener('resize',resize); host.visualViewport?.removeEventListener('scroll',resize);
      image.removeEventListener('error', imageFailed); orb.remove(); style.remove();
    },
  };
}
