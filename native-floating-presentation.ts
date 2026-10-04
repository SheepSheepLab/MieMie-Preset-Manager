// Copyright (C) 2026 SheepSheepLab
// Adapted from MieMie Polisher 1.2.1
// (commit 5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1).
// SPDX-License-Identifier: GPL-3.0-or-later
// Geometry and pixels only. Hidden/inert, Hub navigation and business belong to callers.
export type NativeBounds = { left: number; top: number; right: number; bottom: number; size: number };
export type NativePresentation = {
  place(panel: HTMLElement): void;
  run(panel: HTMLElement, opening: boolean): Promise<boolean>;
  cancel(): void; release(): void; follow(): void; dispose(): void;
};
export function createNativeFloatingPresentation(host: Window, orb: HTMLButtonElement, bounds: () => NativeBounds): NativePresentation {
  const doc = host.document, animations = new Set<Animation>(), cleanups = new Set<() => void>();
  let generation = 0, activePanel: HTMLElement | null = null, disposed = false;
  const reduced = () => !!host.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function cancel() {
    generation++;
    for (const animation of animations) animation.cancel();
    animations.clear();
    for (const cleanup of [...cleanups]) cleanup();
  }
  function fit(panel: HTMLElement) {
    const b = { ...bounds() }, o = orb.getBoundingClientRect(), css = host.getComputedStyle(panel);
    const safe = (side: string) => Math.max(10,parseFloat(css.getPropertyValue(`--mm-safe-${side}`)) || 0);
    const v = host.visualViewport;
    b.left = Math.max(b.left,(v?.offsetLeft || 0)+safe('left'));
    b.top = Math.max(b.top,(v?.offsetTop || 0)+safe('top'));
    b.right = Math.min(b.right,(v?.offsetLeft || 0)+(v?.width || host.innerWidth)-safe('right')-b.size);
    b.bottom = Math.min(b.bottom,(v?.offsetTop || 0)+(v?.height || host.innerHeight)-safe('bottom')-b.size);
    const width = Math.max(1, Math.min(600, b.right + b.size - b.left));
    const height = Math.max(1, Math.min(780, b.bottom + b.size - b.top));
    const sideLeft = o.left + o.width / 2 > (b.left + b.right + b.size) / 2 ? o.left - width - 12 : o.right + 12;
    const left = Math.max(b.left, Math.min(b.right + b.size - width, sideLeft));
    const top = Math.max(b.top, Math.min(b.bottom + b.size - height, o.top + o.height / 2 - height / 2));
    panel.dataset.presentation = 'native';
    for (const [key, value] of Object.entries({ position:'fixed', left:`${left}px`, top:`${top}px`, right:'auto', bottom:'auto', transform:'none', width:`${width}px`, height:`${height}px`, 'max-height':`${height}px` }))
      panel.style.setProperty(key, value, key === 'transform' ? '' : 'important');
    // Let the existing view update responsive flags without touching geometry or state.
    panel.dispatchEvent(new Event('miemie:presentation-geometry'));
  }
  function timing(css: CSSStyleDeclaration, key: string, fallback: number) {
    const raw = css.getPropertyValue(key).trim();
    const value = parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000);
    return Number.isFinite(value) ? Math.max(0, Math.min(2000, value)) : fallback;
  }
  async function animate(element: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
    const animation = element.animate(frames, { ...options, fill:'both' });
    animations.add(animation);
    try { await animation.finished; } catch { /* Cancellation settles at the current endpoint. */ }
    finally { animation.cancel(); animations.delete(animation); }
  }
  function prepareHeader(panel: HTMLElement, target: HTMLImageElement) {
    const r = panel.getBoundingClientRect(), size = Math.min(148, r.width - 24, r.height - 24);
    if (size <= 0) return null;
    const theme = host.getComputedStyle(orb), overlay = doc.createElement('div'), veil = doc.createElement('div'), face = doc.createElement('img');
    overlay.dataset.presetManagerSurfaceSplash = ''; overlay.setAttribute('aria-hidden','true'); overlay.inert = true;
    Object.assign(overlay.style, { position:'absolute', inset:'0', zIndex:'2147483647', pointerEvents:'none', borderRadius:'inherit' });
    veil.dataset.presetManagerSurfaceVeil = '';
    const blur = theme.getPropertyValue('--mm-native-blur-hero').trim() || '14px';
    Object.assign(veil.style, { position:'absolute', inset:'0', borderRadius:'inherit', background:theme.getPropertyValue('--mm-native-hero-backdrop').trim() || '#211b2eb8', backdropFilter:`blur(${blur})`, webkitBackdropFilter:`blur(${blur})` });
    face.src = target.currentSrc || target.src; face.alt = ''; face.draggable = false; face.dataset.presetManagerHeaderHero = '';
    Object.assign(face.style, { position:'absolute', left:`${(r.width-size)/2+panel.scrollLeft}px`, top:`${(r.height-size)/2+panel.scrollTop}px`, width:`${size}px`, height:`${size}px`, maxWidth:'none', borderRadius:'50%', transformOrigin:'center', objectFit:'contain', willChange:'transform' });
    overlay.append(veil, face); panel.append(overlay);
    const visibility = target.style.visibility; target.style.visibility = 'hidden';
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return; cleaned = true; overlay.remove(); target.style.visibility = visibility; cleanups.delete(cleanup);
    };
    cleanups.add(cleanup);
    return { cleanup, async land() {
      if (cleaned) return;
      const from = face.getBoundingClientRect(), to = target.getBoundingClientRect();
      if (!from.width || !to.width) { cleanup(); return; }
      const options = { duration:timing(theme,'--mm-native-motion-hero',760), easing:theme.getPropertyValue('--mm-native-ease-hero').trim() || 'ease' };
      const destination = `translate(${to.left+to.width/2-from.left-from.width/2}px,${to.top+to.height/2-from.top-from.height/2}px) scale(${to.width/from.width},${to.height/from.height})`;
      try { await Promise.all([
        animate(face,[{transform:'none',clipPath:'circle(49%)'},{transform:'none',clipPath:'circle(49%)',offset:.16},{transform:destination,clipPath:'circle(71%)'}],options),
        animate(veil,[{opacity:1},{opacity:1,offset:.16},{opacity:0}],{...options,easing:'ease-in-out'}),
      ]); } finally { cleanup(); }
    } };
  }
  async function run(panel: HTMLElement, opening: boolean) {
    if (disposed || !orb.isConnected) return false;
    const epoch = generation; activePanel = panel; fit(panel);
    const header = opening ? panel.querySelector<HTMLImageElement>('[data-tool-icon]') : null;
    const hero = header && typeof panel.animate === 'function' && !reduced() ? prepareHeader(panel,header) : null;
    const r = panel.getBoundingClientRect(), o = orb.getBoundingClientRect();
    if (typeof panel.animate === 'function' && !reduced() && r.width && r.height && o.width) {
      const css = host.getComputedStyle(orb);
      const small = { transform:`translate(${o.left-r.left}px,${o.top-r.top}px) scale(${o.width/r.width},${o.height/r.height})`, opacity:0, clipPath:'inset(0 round 50%)' };
      const large = { transform:'none', opacity:1, clipPath:`inset(0 round ${host.getComputedStyle(panel).borderRadius})` };
      const origin = panel.style.transformOrigin, willChange = panel.style.willChange;
      panel.style.transformOrigin = '0 0'; panel.style.willChange = 'transform,opacity,clip-path'; orb.dataset.surfaceActive = 'true';
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return; cleaned = true;
        delete orb.dataset.surfaceActive; panel.style.transformOrigin = origin; panel.style.willChange = willChange; cleanups.delete(cleanup);
      };
      cleanups.add(cleanup);
      try { await animate(panel,opening?[small,large]:[large,small],{
        duration:timing(css,opening?'--mm-native-motion-open':'--mm-native-motion-close',opening?520:460),
        easing:css.getPropertyValue('--mm-native-ease-surface').trim() || 'ease',
      }); } catch (error) { hero?.cleanup(); throw error; } finally { cleanup(); }
    }
    try { if (hero && epoch === generation) await hero.land(); } finally { hero?.cleanup(); }
    return !disposed;
  }
  function release() { cancel(); activePanel = null; }
  return Object.freeze({ place(panel) { if (!disposed) { activePanel = panel; fit(panel); } }, run, cancel, release,
    follow() { if (activePanel && !activePanel.hidden) fit(activePanel); },
    dispose() { if (disposed) return; disposed = true; release(); },
  });
}
