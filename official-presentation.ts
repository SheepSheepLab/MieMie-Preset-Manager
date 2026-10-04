// Copyright (C) 2026 SheepSheepLab
// Header and orb clearance adapted from MieMie Story Director
// (commit 32f34865af156d35b628adc6e66018329026df96).
// SPDX-License-Identifier: GPL-3.0-or-later
// Presentation only. Never reads or changes controller, draft or preset state.
interface CharacterHeaderContext {
  groupId?: unknown;
  characterId?: string | number;
  characters?: Record<string | number, { name?: string } | undefined>;
  eventTypes?: Record<string, string>;
  eventSource?: {
    on(event: string, callback: () => void): unknown;
    removeListener(event: string, callback: () => void): unknown;
  };
}

/** Match the official Director/Polisher current-character header, read-only. */
export function mountCharacterHeader(host: Window, label: HTMLElement) {
  const source = host as Window & { SillyTavern?: { getContext(): CharacterHeaderContext } };
  let disposed = false, events: CharacterHeaderContext['eventSource'], names: string[] = [];
  function unbind() {
    for (const name of names) events?.removeListener(name,refresh);
    names = []; events = undefined;
  }
  function refresh() {
    if (disposed) return;
    let context: CharacterHeaderContext | undefined;
    try { context = source.SillyTavern?.getContext(); } catch { /* Host not ready; header only. */ }
    const character = !context?.groupId && context?.characterId !== undefined ? context.characters?.[context.characterId] : undefined;
    const text = character ? `当前角色：${character.name || context!.characterId}` : '请打开单人角色聊天';
    if (label.textContent !== text) label.textContent = text;
    label.title = text;
    const next = context?.eventSource;
    const nextNames = [...new Set(['CHAT_CHANGED','CHARACTER_EDITED','CHARACTER_RENAMED'].map(key => context?.eventTypes?.[key]).filter((name): name is string => !!name))];
    if (next !== events || nextNames.join('\0') !== names.join('\0')) {
      unbind();
      if (next && typeof next.on === 'function' && typeof next.removeListener === 'function') {
        events = next; names = nextNames;
        for (const name of names) events.on(name,refresh);
      }
    }
  }
  refresh();
  return { refresh, dispose() { if (disposed) return; disposed = true; unbind(); } };
}

export function protectNativeControls(host: Window, panel: HTMLElement): () => void {
  const doc = host.document;
  let orb: HTMLButtonElement | null = null, orbObserver: MutationObserver | null = null;
  let frame = 0, disposed = false, previousZ = '', previousPriority = '', previousInert = false, lowered = false;
  const raf = host.requestAnimationFrame.bind(host), caf = host.cancelAnimationFrame.bind(host);
  const overlaps = (a: DOMRect, b: DOMRect) => a.width > 0 && a.height > 0 && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const observerCtor = (host as Window & { MutationObserver: typeof MutationObserver }).MutationObserver;
  function visible(node: HTMLElement): boolean {
    if (!node.isConnected || !node.getClientRects().length) return false;
    for (let current: HTMLElement | null = node; current; current = current.parentElement) {
      const style = host.getComputedStyle(current);
      if (current.hidden || style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) return false;
    }
    return true;
  }
  // Story Director's persistent orb can cover cards. Rects alone do not prove
  // that condition here: Hub/ancestors can put our panel in a higher context.
  // Sample the clipped intersection using the browser's actual hit-test order,
  // rather than comparing z-index numbers from unrelated stacking contexts.
  function covers(node: HTMLElement, r: DOMRect, o: DOMRect, root: DOMRect): boolean {
    if (!orb) return false;
    const left = Math.max(r.left, o.left, root.left, 0), right = Math.min(r.right, o.right, root.right, host.innerWidth);
    const top = Math.max(r.top, o.top, root.top, 0), bottom = Math.min(r.bottom, o.bottom, root.bottom, host.innerHeight);
    if (right <= left || bottom <= top) return false;
    for (const x of [.2, .5, .8]) for (const y of [.2, .5, .8]) {
      const stack = doc.elementsFromPoint(left + (right - left) * x, top + (bottom - top) * y);
      if (!stack.length || !orb.contains(stack[0])) continue;
      // Require the affected content beneath the orb at the same point. This
      // also excludes cards clipped by their scroll container or a dialog.
      if (stack.some(element => node === element || node.contains(element))) return true;
    }
    return false;
  }
  function clearCards() {
    for (const node of panel.querySelectorAll<HTMLElement>('.mm-card')) {
      node.style.removeProperty('--mm-orb-left'); node.style.removeProperty('--mm-orb-right');
      delete node.dataset.orbClearance;
    }
  }
  function restoreOrb() {
    if (orb && lowered) {
      // Hub may have already restored its stacking layer while this observer
      // was queued. Do not put the retired Surface's z-index back.
      if (orb.style.zIndex === '2147482999') {
        if (previousZ) orb.style.setProperty('z-index',previousZ,previousPriority); else orb.style.removeProperty('z-index');
      }
      orb.inert = previousInert;
    }
    lowered = false;
  }
  function update() {
    frame = 0;
    if (disposed) return;
    const current = doc.querySelector<HTMLButtonElement>('[data-miemie-preset-manager-native]');
    if (current !== orb) {
      restoreOrb(); orbObserver?.disconnect(); orb = current;
      if (orb) { orbObserver = new observerCtor(schedule); orbObserver.observe(orb, { attributes:true, attributeFilter:['style','hidden','class'] }); }
    }
    const o = orb?.getBoundingClientRect(), root = panel.getBoundingClientRect();
    const active = !!o && !!orb && visible(orb) && visible(panel) && overlaps(o,root);
    const modal = [...panel.querySelectorAll<HTMLElement>('.mm-modal-layer')].some(node => !node.hidden);
    // Fixed controls cannot be padded on a 320px window. Place the orb behind
    // the application temporarily rather than cover Save, Reload or Return.
    const fixed = [...panel.querySelectorAll<HTMLElement>('.mm-brandline,.mm-toolbar,.mm-category-row,.mm-footer')];
    const critical = active && fixed.some(node => overlaps(node.getBoundingClientRect(),o!));
    // Keep the existing temporary fixed-control shield until the intersection
    // ends; otherwise our own lowering would alternate with restoration.
    const lower = active && (modal || critical) && (lowered || covers(panel,root,o!,root));
    const changes = [...panel.querySelectorAll<HTMLElement>('.mm-card')].map(node => {
      const r = node.getBoundingClientRect(), hit = active && !lower && overlaps(r,o!) && covers(node,r,o!,root);
      const side = hit ? (o!.left + o!.width / 2 > root.left + root.width / 2 ? 'right':'left') : '';
      const space = hit ? Math.min(76, Math.max(0, side === 'right' ? r.right-o!.left+4 : o!.right-r.left+4)) : 0;
      return {node,side,space};
    });
    if (orb && lower !== lowered) {
      if (lower) { previousZ = orb.style.zIndex; previousPriority = orb.style.getPropertyPriority('z-index'); previousInert = orb.inert; orb.style.zIndex = '2147482999'; orb.inert = true; lowered = true; }
      else restoreOrb();
    }
    // Read geometry above, write below. Unchanged values avoid observer loops.
    for (const {node,side,space} of changes) {
      const value = space ? `${space}px` : '';
      for (const key of ['left','right']) {
        const next = key === side ? value : '';
        if (node.style.getPropertyValue(`--mm-orb-${key}`) !== next) {
          if (next) node.style.setProperty(`--mm-orb-${key}`,next); else node.style.removeProperty(`--mm-orb-${key}`);
        }
      }
      if (side) { if (node.dataset.orbClearance !== side) node.dataset.orbClearance = side; }
      else delete node.dataset.orbClearance;
    }
  }
  function schedule() { if (!disposed && !frame) frame = raf(update); }
  function motionEnded(event: Event) {
    const target = event.target as Node | null;
    if (target && (target.contains(panel) || (!!orb && target.contains(orb)))) schedule();
  }
  const surface = new observerCtor(records => {
    if (records.some(record => record.type === 'childList' || (record.target.nodeType === 1 && ((record.target as Element).contains(panel) || (!!orb && (record.target as Element).contains(orb)))))) schedule();
  }), content = new observerCtor(schedule);
  surface.observe(doc.body || doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','style','class']});
  content.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','style','class']});
  panel.addEventListener('scroll',schedule,true); host.addEventListener('resize',schedule);
  doc.addEventListener('transitionend',motionEnded,true); doc.addEventListener('animationend',motionEnded,true);
  schedule();
  return () => {
    disposed = true; if (frame) caf(frame); surface.disconnect(); content.disconnect(); orbObserver?.disconnect();
    panel.removeEventListener('scroll',schedule,true); host.removeEventListener('resize',schedule); restoreOrb(); clearCards();
    doc.removeEventListener('transitionend',motionEnded,true); doc.removeEventListener('animationend',motionEnded,true);
  };
}
