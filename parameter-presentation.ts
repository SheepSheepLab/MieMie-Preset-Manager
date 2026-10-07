// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Presentation only: never owns parameter drafts, saves or Hub navigation.
export function createParameterPresentation(host: Window, layer: HTMLElement, entry: HTMLElement) {
  const doc = host.document;
  const animations = new Set<Animation>();
  let release: (() => void) | null = null, disposed = false;
  function cancel() {
    for (const animation of animations) animation.cancel();
    animations.clear(); release?.(); release = null;
  }
  const preference = host.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motionPreferenceChanged = () => { if (preference?.matches) cancel(); };
  preference?.addEventListener('change', motionPreferenceChanged);
  async function run(box: HTMLElement, opening: boolean) {
    const priorShell = layer.querySelector<HTMLElement>('.mm-parameter-morph-shell')?.getBoundingClientRect();
    const priorBoxOpacity = layer.dataset.parameterMotion ? host.getComputedStyle(box).opacity : null;
    const priorVeil = layer.querySelector<HTMLElement>('.mm-parameter-morph-veil');
    const priorVeilOpacity = priorVeil ? host.getComputedStyle(priorVeil).opacity : null;
    cancel();
    if (disposed || !box.isConnected || layer.closest('[hidden]') ||
        preference?.matches || typeof box.animate !== 'function') return;
    const parent = layer.getBoundingClientRect(), target = box.getBoundingClientRect();
    if (!parent.width || !parent.height || !target.width || !target.height) return;
    // Rectangles are mapped into the layer, including a scaled native/Hub surface.
    const sx = layer.clientWidth / parent.width, sy = layer.clientHeight / parent.height;
    const rect = (r: DOMRect) => ({ left: (r.left - parent.left) * sx, top: (r.top - parent.top) * sy, width: r.width * sx, height: r.height * sy });
    const source = entry.getBoundingClientRect(), scroll = entry.parentElement?.getBoundingClientRect();
    const css = host.getComputedStyle(entry);
    const visible = entry.isConnected && !entry.closest('[hidden]') && css.visibility !== 'hidden' && css.display !== 'none' &&
      source.width > 0 && source.height > 0 && source.top >= Math.max(parent.top, scroll?.top ?? parent.top) &&
      source.bottom <= Math.min(parent.bottom, scroll?.bottom ?? parent.bottom) && source.left >= parent.left && source.right <= parent.right;
    const from = visible ? rect(source) : null, to = rect(target), theme = host.getComputedStyle(box);
    const duration = opening ? 360 : 280, easing = 'cubic-bezier(.22,.8,.22,1)';
    const veil = doc.createElement('div'); veil.className = 'mm-parameter-morph-veil';
    veil.setAttribute('aria-hidden', 'true'); veil.inert = true; layer.prepend(veil);
    const shell = from ? doc.createElement('div') : null;
    const visibility = entry.style.visibility, inert = box.inert;
    if (shell) {
      shell.className = 'mm-parameter-morph-shell'; shell.setAttribute('aria-hidden', 'true'); shell.inert = true;
      shell.style.boxShadow = theme.boxShadow;
      layer.append(shell); entry.style.visibility = 'hidden';
    }
    // Keep Escape/Tab routed through the manager while form controls are inert.
    layer.focus({ preventScroll: true });
    box.inert = true; layer.dataset.parameterMotion = opening ? 'opening' : 'closing';
    let cleaned = false;
    const own = new Set<Animation>();
    const cleanup = () => {
      if (cleaned) return; cleaned = true;
      for (const animation of own) { animation.cancel(); animations.delete(animation); }
      veil.remove(); shell?.remove();
      entry.style.visibility = visibility; box.inert = inert;
      delete layer.dataset.parameterMotion;
      if (release === cleanup) release = null;
    };
    release = cleanup;
    function play(node: HTMLElement, frames: Keyframe[], ms = duration, delay = 0) {
      const animation = node.animate(frames, { duration: ms, delay, easing, fill: 'both' });
      animations.add(animation); own.add(animation);
      return animation.finished.catch(() => undefined);
    }
    try {
      const jobs = [play(veil, [{ opacity: priorVeilOpacity ?? (opening ? 0 : 1) }, { opacity: opening ? 1 : 0 }])];
      if (from && shell) {
        // Resize a blank shell; real form text/controls never stretch or reflow.
        // Hover may be a translucent tint; the expanding surface stays opaque.
        const small = { ...Object.fromEntries(Object.entries(from).map(([key, n]) => [key, `${n}px`])), borderRadius: css.borderRadius,
          backgroundColor: css.getPropertyValue('--mm-panel').trim() || theme.backgroundColor };
        const large = { ...Object.fromEntries(Object.entries(to).map(([key, n]) => [key, `${n}px`])), borderRadius: theme.borderRadius, backgroundColor: theme.backgroundColor };
        const current = priorShell ? { ...large, ...Object.fromEntries(Object.entries(rect(priorShell)).map(([key, n]) => [key, `${n}px`])) } : null;
        jobs.push(play(shell, opening ? [current ?? small, large] : [current ?? large, small]));
        jobs.push(play(box, [{ opacity: priorBoxOpacity ?? (opening ? 0 : 1) }, { opacity: opening ? 1 : 0 }],
          opening ? 120 : 90, opening && priorBoxOpacity === null ? 240 : 0));
      } else {
        // An off-screen/detached origin cannot be a safe morph destination.
        jobs.push(play(box, opening ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }]));
      }
      await Promise.all(jobs);
    } catch { /* Unsupported/interrupted motion always settles to the caller's state. */ }
    finally { cleanup(); }
  }
  return { run, cancel, dispose() { disposed = true; cancel(); preference?.removeEventListener('change', motionPreferenceChanged); } };
}
