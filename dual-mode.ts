// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { ManagerView } from './contracts';
import { ICON } from './product-icon';
import { createPresetManagerNativeLauncher, type NativeLauncher } from './native-launcher';
import { PRESET_MANAGER_PRODUCT } from './product-identity';

const SOURCE_KEY = '__MieMiePresetManagerSource';
const WAIT_MS = 1500;

export const PRESET_MANAGER_MANIFEST = Object.freeze({
  schemaVersion: 1,
  apiVersion: 1,
  id: 'miemie.preset-manager',
  name: PRESET_MANAGER_PRODUCT.name,
  version: PRESET_MANAGER_PRODUCT.version,
  description: '直接管理当前酒馆预设及提示词条目。',
  entry: 'preset-manager.js',
  icon: ICON,
  contributes: { launcher: { title: PRESET_MANAGER_PRODUCT.launcherName, icon: '预设' } },
  hubApi: { min: 1, max: 1 },
});

type HubApi = {
  signal: AbortSignal;
  attachPanel(panel: HTMLElement, options: { icon: string }): unknown;
  showPanel(): unknown;
  closePanel(): unknown;
  registerShortcutLauncher?(provider: { mount(context: { open(): unknown }): NativeLauncher }): unknown;
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
  let launcher: NativeLauncher | null = null;
  let activeSession: (() => void) | null = null;
  let closeSession: (() => unknown) | null = null;

  const report = (error: unknown) => console.warn('[咩咩预设管理]', error);
  view.setCloseHandler(() => {
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
  });
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
    launcher?.dispose(); launcher = null;
  }
  function makeLauncher() {
    if (disposed || launcher) return;
    restorePanel(); view.setPresentation?.('native');
    launcher = createPresetManagerNativeLauncher({ host, icon:ICON, onError:report, open:async () => {
      const opening = launcher;
      if (!opening || disposed || connection) return false;
      restorePanel(); view.setPresentation?.('native');
      const ok = await opening.show(view.panel);
      if (ok && !disposed && !connection && launcher === opening) view.open();
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
      if (typeof api.closePanel !== 'function') throw new Error('Hub 缺少正式面板关闭能力，已恢复独立入口。');
      let ended = false;
      let shortcut: NativeLauncher | null = null;
      let activation: Promise<void> | null = null;
      const valid = () =>
        !disposed && !ended && next.valid && connection === next && currentHub() === hub && !api.signal.aborted;
      const end = () => {
        if (ended) return;
        ended = true;
        shortcut?.dispose(); shortcut = null;
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
          closeSession = () => valid() && activeSession === end ? api.closePanel() : false;
          restorePanel();
          view.setPresentation?.('hub');
          await api.attachPanel(view.panel, { icon: ICON });
          if (!valid()) { end(); return; }
          if (typeof api.registerShortcutLauncher === 'function') api.registerShortcutLauncher({
            mount({ open }) {
              if (!valid()) throw new Error('预设管理 Shortcut session 已停用。');
              shortcut?.dispose();
              const native = createPresetManagerNativeLauncher({ host, icon: ICON, mode:'shortcut',
                open:() => valid() ? open() : false, onError:report });
              shortcut = native;
              return native;
            },
          });
          })();
          return activation;
        },
        open() {
          if (!valid() || activeSession !== end) return false;
          restorePanel();
          // Hub owns the current Surface origin and its opening/closing flight.
          // Repeated launch is only a focus request: resetting a visible panel
          // would erase Native placement, and view.open() would unlock a flight.
          // A fresh hidden entry starts with Hub geometry; the Shortcut provider
          // applies Native placement when Hub actually enters that Surface.
          if (view.panel.hidden) {
            view.setPresentation?.('hub');
            view.open();
          }
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
