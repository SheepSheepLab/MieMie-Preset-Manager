// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import { createSTAdapter } from './st-adapter';
import { createController } from './controller';
import { createManagerView } from './ui';
import { startDualMode } from './dual-mode';
import type { ManagerController, ManagerView } from './contracts';

declare const $: (callback: () => void) => void;
/** Tavern Helper script iframe: all product DOM belongs to the host document. */
$(() => {
  const host = window.parent as Window & Record<string, any>;
  if (host.__MieMiePresetManagerSource && !host.__MieMiePresetManagerSource.disposed) return;
  let controller: ManagerController | undefined, view: ManagerView | undefined;
  let dual: ReturnType<typeof startDualMode> | undefined, stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true; controller?.dispose();
    void Promise.resolve(dual?.dispose()).finally(() => view?.dispose());
    window.removeEventListener('pagehide', stop);
  };
  window.addEventListener('pagehide', stop, { once: true });
  void (async () => {
    try {
      const adapter = await createSTAdapter(host);
      if (stopped) { adapter.dispose?.(); return; }
      controller = createController(adapter);
      view = createManagerView(host, controller);
      dual = startDualMode(host, window, view);
      await controller.refresh();
    } catch (error) {
      stop();
      const message = error instanceof Error ? error.message : '初始化失败。';
      if (host.toastr?.error) host.toastr.error(message, '咩咩预设管理');
      else {
        const notice = host.document.createElement('div');
        notice.style.cssText = 'position:fixed;right:16px;bottom:100px;z-index:2147483000;max-width:340px;padding:16px;background:#291932;color:#fff;border:1px solid #c7a0e8;border-radius:16px;font:14px system-ui';
        notice.textContent = `咩咩预设管理：${message}`;
        const close = host.document.createElement('button'); close.textContent = '关闭'; close.onclick = () => notice.remove(); notice.append(close); host.document.documentElement.append(notice);
      }
    }
  })();
});
