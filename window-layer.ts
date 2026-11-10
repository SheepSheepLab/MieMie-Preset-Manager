// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
const layers = new WeakMap<HTMLElement, {show(orb?: HTMLButtonElement): void; release(orb: HTMLButtonElement): void}>();

export function raiseNativeWindow(panel: HTMLElement, orb: HTMLButtonElement) {
  layers.get(panel)?.show(orb);
}

export function releaseNativeWindow(panel: HTMLElement, orb: HTMLButtonElement) {
  layers.get(panel)?.release(orb);
}

// Manual popovers preserve the panel's original ancestry and scoped styles.
// From back to front: shield, current orb at its existing dock, then panel.
export function observeWindowLayer(host: Window, panel: HTMLElement): () => void {
  if (typeof panel.showPopover !== 'function' || panel.hasAttribute('popover')) return () => {};
  const doc = panel.ownerDocument;
  const style = doc.createElement('style');
  style.textContent = `
    :where([data-miemie-window-layer][popover]){margin:0;padding:0;inset:auto;position:fixed;color:inherit}
    :where([data-miemie-window-layer][popover])::backdrop,[data-miemie-window-shield]::backdrop{display:none}
    [data-miemie-window-shield][popover]{position:fixed;inset:0;margin:0;padding:0;width:auto;height:auto;max-width:none;max-height:none;border:0;background:transparent;pointer-events:none}
    @media(pointer:coarse),(max-width:600px){
      [data-miemie-window-shield][popover]{pointer-events:auto;touch-action:none;overscroll-behavior:none;background:#09061191;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
    }
  `;
  doc.head.append(style);
  const shield = doc.createElement('div');
  shield.setAttribute('aria-hidden','true');
  shield.setAttribute('data-miemie-window-shield','');
  shield.setAttribute('popover','manual');
  const block = (event: Event) => event.preventDefault();
  for (const name of ['pointerdown','wheel','touchmove']) shield.addEventListener(name,block,{passive:false});
  let shown = false, orb: HTMLButtonElement | undefined;
  function lift(node: HTMLElement) {
    node.setAttribute('data-miemie-window-layer','');
    node.setAttribute('popover','manual');
    node.showPopover();
  }
  function lower(node: HTMLElement) {
    if (node.matches(':popover-open')) node.hidePopover();
    node.removeAttribute('popover');
    node.removeAttribute('data-miemie-window-layer');
  }
  function close() {
    if (orb) lower(orb);
    orb = undefined;
    if (shown) lower(panel);
    shown = false;
    shield.remove();
  }
  function show(nextOrb?: HTMLButtonElement) {
    if (!panel.isConnected || panel.hidden) return;
    try {
      if (shown && (!nextOrb || nextOrb === orb)) return;
      if (!shown) {
        doc.documentElement.append(shield);
        shield.showPopover();
        shown = true;
      }
      if (nextOrb && nextOrb !== orb) {
        // Reinsert an already lifted panel after the orb to keep overlap covered.
        if (panel.matches(':popover-open')) panel.hidePopover();
        if (orb) lower(orb);
        orb = nextOrb;
        lift(orb);
      }
      lift(panel);
    } catch { close(); }
  }
  const Observer = (host as Window & {MutationObserver: typeof MutationObserver}).MutationObserver;
  const observer = new Observer(() => {
    if (panel.hidden || !panel.isConnected || !['opening','open','closing'].includes(panel.dataset.surfaceState ?? '')) close();
    else show();
  });
  observer.observe(panel,{attributes:true,attributeFilter:['hidden','data-surface-state']});
  layers.set(panel,{show,release(entry) { if (entry === orb) close(); }});
  return () => { observer.disconnect(); layers.delete(panel); close(); style.remove(); };
}
