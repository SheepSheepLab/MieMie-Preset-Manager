// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { ManagerView } from './contracts';

const SOURCE_KEY = '__MieMiePresetManagerSource';
const WAIT_MS = 1500;
const ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#201332"/><g fill="#f4d8ec"><circle cx="23" cy="24" r="7"/><circle cx="31" cy="20" r="7"/><circle cx="38" cy="25" r="7"/><ellipse cx="31" cy="32" rx="11" ry="12"/></g><path d="M18 29l-5-5m31 5 5-5" stroke="#ef79ca" stroke-width="5" stroke-linecap="round"/><circle cx="27" cy="31" r="2" fill="#392544"/><circle cx="35" cy="31" r="2" fill="#392544"/><path d="M23 48h22m-22 7h22" stroke="#ef79ca" stroke-width="3" stroke-linecap="round"/></svg>')}`;

export const PRESET_MANAGER_MANIFEST = Object.freeze({
  schemaVersion: 1,
  apiVersion: 1,
  id: 'miemie.preset-manager',
  name: '咩咩预设管理',
  version: '0.1.2',
  description: '直接管理当前酒馆预设及提示词条目。',
  entry: 'preset-manager.js',
  icon: ICON,
  contributes: { launcher: { title: '咩咩预设管理', icon: ICON } },
  hubApi: { min: 1, max: 1 },
});

type HubApi = {
  signal: AbortSignal;
  attachPanel(panel: HTMLElement, options: { icon: string }): unknown;
  showPanel(): unknown;
  onCleanup(fn: () => void): unknown;
};
type HubInstance = { activate(): Promise<void>; open(): unknown; deactivate(): void };
type Lease = { ok: boolean; error?: string; ready?: Promise<unknown>; release?: () => unknown };
type Hub = {
  apiVersion: number;
  extensions: { provide(manifest: typeof PRESET_MANAGER_MANIFEST, factory: (api: HubApi) => HubInstance): Lease };
  whenDisposed?: Promise<unknown>;
};
type Connection = { hub: Hub; lease?: Lease; valid: boolean; sessions: Set<() => void> };
type Source = { readonly disposed: boolean; dispose(): Promise<void>; settled(): Promise<void> };

/** Only launcher ownership changes. The caller owns the one view and controller. */
export function startDualMode(host: Window & Record<string, any>, frame: Window, view: ManagerView): Source {
  const previous = host[SOURCE_KEY] as Source | undefined;
  if (previous && !previous.disposed) throw new Error('咩咩预设管理已在运行，请只启用一个安装实例。');
  const doc = host.document;
  if (view.panel.ownerDocument !== doc) throw new Error('预设面板必须创建在酒馆主文档中。');
  const panelParent = view.panel.parentNode || doc.documentElement;
  const stopped = new AbortController();
  let disposed = false;
  let queue = Promise.resolve();
  let connection: Connection | null = null;
  let failedHub: Hub | null = null;
  const retiredHubs = new WeakSet<Hub>();
  let launcher: HTMLButtonElement | null = null;
  let launcherCleanup: (() => void) | null = null;
  let activeSession: (() => void) | null = null;
  let placement: { x: number; y: number } | null = null;

  const report = (error: unknown) => console.warn('[咩咩预设管理]', error);
  function currentHub(): Hub | null {
    const hub = host.__MieMieHub as Hub | undefined;
    return hub?.apiVersion === 1 && typeof hub.extensions?.provide === 'function' && !retiredHubs.has(hub) ? hub : null;
  }
  function restorePanel(returnToOriginal = false) {
    if (!view.panel.isConnected || (returnToOriginal && view.panel.parentNode !== panelParent))
      panelParent.appendChild(view.panel);
  }
  function bounded(work: unknown, label: string, signal?: AbortSignal): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let finished = false;
      const finish = (error: unknown, value?: unknown) => {
        if (finished) return;
        finished = true;
        host.clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (error) reject(error);
        else resolve(value);
      };
      const cancel = () => finish(new Error('预设管理入口已停用。'));
      const timer = host.setTimeout(() => finish(new Error(`${label}超时，已释放本地入口。`)), WAIT_MS);
      signal?.addEventListener('abort', cancel, { once: true });
      Promise.resolve(work).then(
        value => finish(null, value),
        error => finish(error),
      );
      if (signal?.aborted) cancel();
    });
  }
  function removeLauncher() {
    launcherCleanup?.();
    launcherCleanup = null;
    launcher?.remove();
    launcher = null;
  }
  function makeLauncher() {
    if (disposed || launcher) return;
    restorePanel();
    const button = doc.createElement('button');
    button.type = 'button';
    button.dataset.miemiePresetManagerStandalone = '';
    button.title = '咩咩预设管理（可拖动）';
    button.setAttribute('aria-label', '打开咩咩预设管理');
    const img = doc.createElement('img');
    img.src = ICON;
    img.alt = '';
    img.draggable = false;
    button.appendChild(img);
    const style = doc.createElement('style');
    style.textContent =
      '[data-miemie-preset-manager-standalone]{position:fixed!important;display:grid;place-items:center;width:60px!important;height:60px!important;min-width:60px;min-height:60px;padding:0!important;margin:0!important;box-sizing:border-box;overflow:hidden;border-radius:50%;border:1px solid #da72b4;background:#201332;box-shadow:0 4px 16px #0009;color:#fff;cursor:pointer;z-index:2147482999;touch-action:none;user-select:none;-webkit-user-select:none;--mm-safe-t:env(safe-area-inset-top,0px);--mm-safe-r:env(safe-area-inset-right,0px);--mm-safe-b:env(safe-area-inset-bottom,0px);--mm-safe-l:env(safe-area-inset-left,0px)}[data-miemie-preset-manager-standalone][hidden]{display:none!important}[data-miemie-preset-manager-standalone]:focus-visible{outline:3px solid #ffd0ee;outline-offset:3px}[data-miemie-preset-manager-standalone] img{width:100%;height:100%;pointer-events:none}';
    doc.documentElement.appendChild(style);
    doc.documentElement.appendChild(button);
    launcher = button;
    // UI and Hub can open the same view without using this launcher's click handler.
    const syncVisibility = () => {
      button.hidden = !view.panel.hidden;
      button.inert = !view.panel.hidden;
    };
    const panelObserver = new host.MutationObserver(syncVisibility);
    panelObserver.observe(view.panel, { attributes: true, attributeFilter: ['hidden'] });
    syncVisibility();
    let drag: { id: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null = null;
    let suppressClick = false;
    const position = (x?: number, y?: number) => {
      const vv = host.visualViewport;
      const viewport = {
        x: vv?.offsetLeft || 0,
        y: vv?.offsetTop || 0,
        w: vv?.width || host.innerWidth,
        h: vv?.height || host.innerHeight,
      };
      const computed = host.getComputedStyle(button);
      const safe = (side: string) => Number.parseFloat(computed.getPropertyValue(`--mm-safe-${side}`)) || 0;
      const minX = viewport.x + safe('l') + 8,
        minY = viewport.y + safe('t') + 8;
      const maxX = Math.max(minX, viewport.x + viewport.w - safe('r') - 68);
      const maxY = Math.max(minY, viewport.y + viewport.h - safe('b') - 68);
      const px = x ?? (placement ? minX + placement.x * (maxX - minX) : maxX - 10);
      const py = y ?? (placement ? minY + placement.y * (maxY - minY) : maxY - 96);
      const left = Math.min(maxX, Math.max(minX, px)),
        top = Math.min(maxY, Math.max(minY, py));
      button.style.left = `${left}px`;
      button.style.top = `${top}px`;
      if (x !== undefined && y !== undefined)
        placement = { x: (left - minX) / (maxX - minX || 1), y: (top - minY) / (maxY - minY || 1) };
    };
    const resize = () => position();
    const down = (event: PointerEvent) => {
      if (drag || !event.isPrimary || event.button !== 0) return;
      suppressClick = false;
      const rect = button.getBoundingClientRect();
      drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: rect.left,
        y: rect.top,
        moved: false,
      };
      button.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.startX,
        dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved) {
        event.preventDefault();
        position(drag.x + dx, drag.y + dy);
      }
    };
    const end = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      suppressClick = drag.moved || event.type === 'pointercancel';
      drag = null;
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    const click = (event: MouseEvent) => {
      if (suppressClick && event.detail !== 0) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      if (!disposed && !connection) {
        restorePanel();
        view.open();
      }
    };
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointermove', move);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('click', click);
    host.addEventListener('resize', resize);
    host.visualViewport?.addEventListener('resize', resize);
    host.visualViewport?.addEventListener('scroll', resize);
    position();
    launcherCleanup = () => {
      panelObserver.disconnect();
      if (drag && button.hasPointerCapture(drag.id)) button.releasePointerCapture(drag.id);
      drag = null;
      button.removeEventListener('pointerdown', down);
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerup', end);
      button.removeEventListener('pointercancel', end);
      button.removeEventListener('click', click);
      host.removeEventListener('resize', resize);
      host.visualViewport?.removeEventListener('resize', resize);
      host.visualViewport?.removeEventListener('scroll', resize);
      style.remove();
    };
  }
  async function detachHub() {
    const old = connection;
    connection = null;
    if (!old) return;
    old.valid = false;
    for (const end of old.sessions) end();
    // Do not wait for an unresponsive ready promise before requesting release.
    try {
      await bounded(old.lease?.release?.(), 'Hub 扩展释放');
    } catch (error) {
      report(error);
    }
    if (host.__MieMieHub !== old.hub && old.hub.whenDisposed) {
      try {
        await bounded(old.hub.whenDisposed, '旧 Hub 清理');
      } catch (error) {
        report(error);
      }
    }
    if (!disposed) restorePanel(true);
  }
  async function attachHub(hub: Hub) {
    const next: Connection = { hub, valid: true, sessions: new Set() };
    connection = next;
    removeLauncher();
    view.close();
    const factory = (api: HubApi): HubInstance => {
      let ended = false;
      const valid = () =>
        !disposed && !ended && next.valid && connection === next && currentHub() === hub && !api.signal.aborted;
      const end = () => {
        if (ended) return;
        ended = true;
        api.signal.removeEventListener('abort', end);
        next.sessions.delete(end);
        if (activeSession === end) {
          activeSession = null;
          view.close();
        }
      };
      next.sessions.add(end);
      api.signal.addEventListener('abort', end, { once: true });
      api.onCleanup(end);
      if (api.signal.aborted) end();
      return {
        async activate() {
          if (!valid()) return;
          activeSession?.();
          activeSession = end;
          restorePanel();
          await api.attachPanel(view.panel, { icon: ICON });
          if (!valid()) end();
        },
        open() {
          if (!valid() || activeSession !== end) return false;
          restorePanel();
          view.open();
          return api.showPanel();
        },
        deactivate: end,
      };
    };
    try {
      next.lease = hub.extensions.provide(PRESET_MANAGER_MANIFEST, factory);
      if (!next.lease?.ok) throw new Error(next.lease?.error || 'Hub 拒绝注册预设管理。');
      const result = await bounded(next.lease.ready, 'Hub 扩展就绪', stopped.signal);
      if (result && typeof result === 'object' && 'ok' in result && result.ok === false)
        throw new Error('Hub 未能启用预设管理。');
      if (disposed || currentHub() !== hub) await detachHub();
    } catch (error) {
      failedHub = hub;
      report(error);
      await detachHub();
      if (!disposed) makeLauncher();
    }
  }
  async function reconcile() {
    if (disposed) {
      await detachHub();
      return;
    }
    const hub = currentHub();
    if (connection && connection.hub !== hub) await detachHub();
    if (disposed) return;
    const fresh = currentHub();
    if (fresh && fresh !== failedHub) {
      if (!connection) await attachHub(fresh);
    } else makeLauncher();
  }
  function schedule() {
    queue = queue.then(reconcile, reconcile).catch(error => {
      report(error);
      if (!disposed && !connection) makeLauncher();
    });
    return queue;
  }
  const ready = () => {
    failedHub = null;
    void schedule();
  };
  const gone = (event: Event) => {
    const hub = (event as CustomEvent<Hub>).detail;
    if (hub && typeof hub === 'object') retiredHubs.add(hub);
    if (!connection || connection.hub === hub) void schedule();
  };
  function dispose() {
    if (disposed) return queue;
    disposed = true;
    stopped.abort();
    removeLauncher();
    view.close();
    host.removeEventListener('miemie:hub-ready', ready);
    host.removeEventListener('miemie:hub-disposed', gone);
    frame.removeEventListener('pagehide', onPageHide);
    queue = schedule().finally(() => {
      if (host[SOURCE_KEY] === source) delete host[SOURCE_KEY];
    });
    return queue;
  }
  const onPageHide = () => {
    void dispose();
  };
  const source: Source = {
    get disposed() {
      return disposed;
    },
    dispose,
    settled: () => queue,
  };
  host[SOURCE_KEY] = source;
  host.addEventListener('miemie:hub-ready', ready);
  host.addEventListener('miemie:hub-disposed', gone);
  frame.addEventListener('pagehide', onPageHide, { once: true });
  if (previous) queue = bounded(previous.settled(), '前一预设管理入口清理').then(() => undefined, report);
  void schedule();
  return source;
}
