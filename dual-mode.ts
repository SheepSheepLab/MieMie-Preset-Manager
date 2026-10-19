// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { ManagerView } from './contracts';
import { ICON } from './product-icon';
import { createPresetManagerNativeLauncher, type NativeLauncher } from './native-launcher';
import manifest from './manifest.json';

const SOURCE_KEY = '__MieMiePresetManagerSource';
const WAIT_MS = 1500;

// Package identity comes from the release manifest; Runtime uses the embedded PNG.
export const PRESET_MANAGER_MANIFEST = Object.freeze({ ...manifest, icon: ICON });

type PresentationLease = { signal: AbortSignal; isCurrent(): boolean };
type HubApi = {
  signal: AbortSignal;
  attachPanel(panel: HTMLElement, options: { icon: string }): unknown;
  showPanel(lease?: PresentationLease): unknown;
  closePanel(lease?: PresentationLease): unknown;
  registerNativeWindow?(provider: {
    mount(context: {open(): unknown; signal: AbortSignal}): {getOrigin(): HTMLButtonElement | null; dispose(): void};
    open(lease: PresentationLease): void; release(lease: PresentationLease): void; ownsEvent(event: Event): boolean;
  }): unknown;
  registerBackHandler?(handler: (request: {isCurrent(): boolean}) => boolean): unknown;
  onCleanup(fn: () => void): unknown;
};
type HubInstance = { activate(): Promise<void>; open(lease?: PresentationLease): unknown; deactivate(): void };
type Lease = { ok: boolean; error?: string; ready?: Promise<unknown>; release?: () => unknown };
type Hub = {
  apiVersion: number;
  extensions: { provide(manifest: typeof PRESET_MANAGER_MANIFEST, factory: (api: HubApi) => HubInstance): Lease };
  whenDisposed: Promise<unknown>;
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
  let launcher: NativeLauncher | null = null;
  let activeSession: (() => void) | null = null;
  let closeSession: (() => unknown) | null = null;

  const report = (error: unknown) => console.warn('[咩咩预设管理]', error);
  function closeStandalone() {
    if (disposed) return undefined;
    // Hub owns visibility and launcher restoration, including its animation.
    // Never locally hide a Hub surface ahead of its formal close operation.
    if (connection) {
      try { return Promise.resolve(closeSession?.()).catch(report); } catch (error) { report(error); }
    } else {
      const closing = launcher;
      if (closing) return closing.close(view.panel).then(ok => {
        if (ok && !disposed && !connection && launcher === closing) view.close();
      });
      view.close();
    }
    return undefined;
  }
  view.setCloseHandler(closeStandalone);
  function currentHub(): Hub | null {
    const hub = host.__MieMieHub as Hub | undefined;
    return hub?.apiVersion === 2 && typeof hub.extensions?.provide === 'function' && !retiredHubs.has(hub) ? hub : null;
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
    launcher?.dispose(); launcher = null;
  }
  function makeLauncher() {
    if (disposed || launcher) return;
    restorePanel(); view.setPresentation?.('native');
    view.setCloseHandler(() => closeStandalone());
    launcher = createPresetManagerNativeLauncher({ host, icon:ICON, onError:report, open:async () => {
      const opening = launcher;
      if (!opening || disposed || connection) return false;
      restorePanel();
      // A visible Native window already owns valid geometry (or an active flight).
      // Repeated opens must not reset it through the View's local layout, nor
      // reopen the View and steal focus from an editor. A closing window still
      // queues a real reopen through the launcher's existing transition queue.
      const entering = view.panel.hidden || view.panel.dataset.surfaceState === 'closing';
      if (view.panel.hidden) view.setPresentation?.('native');
      const ok = await opening.show(view.panel);
      if (ok && entering && !disposed && !connection && launcher === opening) view.open();
      return ok;
    } });
    launcher.presentation.place(view.panel);
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
    if (host.__MieMieHub !== old.hub) {
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
      if (!api?.signal || typeof api.signal.addEventListener !== 'function' ||
          ['onCleanup','attachPanel','showPanel','closePanel'].some(key => typeof api[key as keyof HubApi] !== 'function'))
        throw new Error('Hub API2 缺少必需的生命周期或 Surface 能力。');
      let ended = false;
      let nativeWindow: NativeLauncher | null = null;
      let surfaceLease: PresentationLease | undefined, nativeLease: PresentationLease | undefined;
      let activation: Promise<void> | null = null;
      const valid = () =>
        !disposed && !ended && next.valid && connection === next && currentHub() === hub && !api.signal.aborted;
      const end = () => {
        if (ended) return;
        ended = true;
        nativeWindow?.dispose(); nativeWindow = null;
        api.signal.removeEventListener('abort', end);
        next.sessions.delete(end);
        if (activeSession === end) {
          activeSession = null;
          closeSession = null;
          view.close();
        }
      };
      next.sessions.add(end);
      api.signal.addEventListener('abort', end, { once: true });
      api.onCleanup(end);
      if (api.signal.aborted) end();
      return {
        activate() {
          if (activation) return activation;
          activation = (async () => {
          if (!valid()) return;
          if (activeSession !== end) activeSession?.();
          activeSession = end;
          view.setCloseHandler(() => false);
          closeSession = null;
          restorePanel();
          view.setPresentation?.('hub');
          await api.attachPanel(view.panel, { icon: ICON });
          if (!valid()) { end(); return; }
          api.registerBackHandler?.(request => {
            if (!valid() || !request.isCurrent()) return true;
            if (view.requestBack) return view.requestBack();
            if (surfaceLease?.isCurrent()) void api.closePanel(surfaceLease);
            return true;
          });
          api.registerNativeWindow?.({
            mount({open, signal}) {
              if (!valid() || signal.aborted) throw new Error('预设管理 Native session 已停用。');
              const native = createPresetManagerNativeLauncher({host, icon:ICON, mode:'native',
                open:() => valid() && !signal.aborted ? open() : false, onError:report});
              nativeWindow = native;
              return {getOrigin:native.getOrigin,dispose() {
                if(nativeWindow===native){native.release();nativeWindow=null;nativeLease=undefined;}
                native.dispose();
              }};
            },
            open(lease) {
              if (!valid() || !lease.isCurrent() || !nativeWindow) return;
              // A fresh Native lease must place even a visible restored root.
              if(nativeLease!==lease){view.panel.hidden=true;view.panel.inert=true;}
              nativeLease=lease;surfaceLease=undefined;
              const native=nativeWindow;
              const current=()=>valid() && nativeLease===lease && lease.isCurrent() && nativeWindow===native;
              view.setCloseHandler(() => current() ? native.close(view.panel,current) : false);
              const entering=view.panel.hidden || view.panel.dataset.surfaceState==='closing';
              if(view.panel.hidden)view.setPresentation?.('native');
              void native.show(view.panel,current).then(ok=>{if(ok&&entering&&current())view.open();}).catch(report);
            },
            release(lease) {
              if(nativeLease && nativeLease!==lease)return;
              nativeLease=undefined;
              view.setCloseHandler(() => false);
              nativeWindow?.release();
            },
            ownsEvent:event => view.ownsEvent?.(event) === true,
          });
          })();
          return activation;
        },
        open(lease) {
          if (!valid() || activeSession !== end || !lease?.isCurrent()) return false;
          surfaceLease=lease;nativeLease=undefined;
          closeSession=()=>valid() && surfaceLease===lease && lease.isCurrent() ? api.closePanel(lease) : false;
          view.setCloseHandler(closeSession);
          restorePanel();
          // Hub owns the current Surface origin and its opening/closing flight.
          // Repeated launch is only a focus request: resetting a visible panel
          // would erase Native placement, and view.open() would unlock a flight.
          // A fresh hidden entry starts with Hub geometry; Native uses its own lease.
          if (view.panel.hidden) {
            view.setPresentation?.('hub');
            view.open();
          }
          return api.showPanel(lease);
        },
        deactivate: end,
      };
    };
    try {
      if (typeof hub.whenDisposed?.then !== 'function') throw new Error('Hub API2 缺少 whenDisposed 完成边界。');
      next.lease = hub.extensions.provide(PRESET_MANAGER_MANIFEST, factory);
      if (!next.lease?.ok) throw new Error(next.lease?.error || 'Hub 拒绝注册预设管理。');
      if (typeof next.lease.ready?.then !== 'function' || typeof next.lease.release !== 'function')
        throw new Error('Hub API2 缺少 Source ready/release。');
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
    view.setCloseHandler(null);
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
