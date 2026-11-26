// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

/** Morph the dialog's surface from its trigger while keeping its content at normal size. */
export function createDialogMotion(host: Window, layer: HTMLElement, dialog: HTMLElement,
  content: readonly HTMLElement[]) {
  let motion: { opening: boolean; shell: HTMLElement; finish(restoreFocus?: boolean): void } | undefined;
  layer.tabIndex = -1;

  function play(opening: boolean, trigger: HTMLElement, done: (restoreFocus?: boolean) => void = () => {}) {
    let start: Keyframe | undefined;
    let startOpacity: string[] | undefined;
    if (!opening && motion?.opening) {
      const style = host.getComputedStyle(motion.shell);
      start = { transform: style.transform, opacity: style.opacity };
      startOpacity = content.map(node => host.getComputedStyle(node).opacity);
    }
    motion?.finish(false);
    if (host.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof dialog.animate !== 'function') {
      done();
      return;
    }
    const bounds = dialog.getBoundingClientRect();
    const anchor = trigger.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !anchor.width || !anchor.height) {
      done();
      return;
    }
    const width = Math.min(anchor.width, bounds.width), height = Math.min(anchor.height, bounds.height);
    const x = Math.max(0, Math.min(bounds.width - width, anchor.left - bounds.left));
    const y = Math.max(0, Math.min(bounds.height - height, anchor.top - bounds.top));
    const entry = `translate3d(${x}px,${y}px,0) scale(${width / bounds.width},${height / bounds.height})`;
    const expanded = { transform: 'translate3d(0,0,0) scale(1,1)', opacity: 1 };
    const shell = host.document.createElement('span');
    shell.className = 'mm-dialog-motion-shell';
    shell.setAttribute('aria-hidden', 'true');
    dialog.append(shell);
    dialog.classList.add('mm-dialog-in-motion');
    if (!opening) {
      layer.focus({ preventScroll: true });
      dialog.inert = true;
    }
    const shellMotion = shell.animate(opening ? [{ transform: entry, opacity: .5 }, expanded] :
      [start ?? expanded, { transform: entry, opacity: 0 }], {
      duration: opening ? 360 : 240,
      easing: opening ? 'cubic-bezier(.16,1,.3,1)' : 'cubic-bezier(.4,0,.6,1)', fill: 'both',
    });
    const animations = [shellMotion, ...content.map((node, index) => node.animate(
      opening ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: startOpacity?.[index] ?? 1 }, { opacity: 0 }],
      { duration: opening ? 140 : 90, delay: opening ? 180 : 0, easing: 'ease-out', fill: 'both' },
    ))];
    const finish = (restoreFocus = true) => {
      if (motion?.finish !== finish) return;
      motion = undefined;
      for (const animation of animations) animation.cancel();
      shell.remove();
      dialog.classList.remove('mm-dialog-in-motion');
      done(restoreFocus);
    };
    motion = { opening, shell, finish };
    void shellMotion.finished.then(() => finish(), () => finish());
  }
  return {
    play,
    get closing() { return motion?.opening === false; },
    finish(restoreFocus = true) { motion?.finish(restoreFocus); },
  };
}
