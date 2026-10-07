// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

type Info = (...args: unknown[]) => unknown;
export interface RegexDisplayContext {
  chat: unknown[];
  t(strings: TemplateStringsArray, ...values: unknown[]): string;
  reloadCurrentChat: () => unknown;
  updateMessageBlock(index: number, message: unknown): unknown;
}
/** Only the native, already-authorized preset regex reload notice is deferred.
 * Never suppress permission dialogs, manual changes, or unrelated notifications.
 * Redraw visible messages through ST, without reloading/persisting chat data.
 */
export async function automaticRegexDisplay<T>(host: Window & { toastr?: { info: Info } },
  context: () => RegexDisplayContext | undefined, name: string, valid: () => boolean, action: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const ctx = context(), toast = host.toastr;
  if (signal?.aborted || !ctx || !toast || typeof toast.info !== 'function' || typeof ctx.t !== 'function' ||
      typeof ctx.reloadCurrentChat !== 'function' || typeof ctx.updateMessageBlock !== 'function' || !Array.isArray(ctx.chat)) return action();
  const isValid = () => { try { return valid(); } catch { return false; } };
  const original = toast.info, notices: unknown[][] = [];
  const message = ctx.t`Reload the chat for regex to take effect` + '<br><u>' + ctx.t`Click here to reload immediately` + '</u>';
  const escaped = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const title = ctx.t`Preset '${escaped}' contains enabled regex scripts`;
  let expired = false, completed = false;
  const replay = () => { for (const args of notices.splice(0)) original.apply(toast, args); };
  const wrapped: Info = function(...args) {
    const options = args[2];
    if (!expired && args[0] === message && args[1] === title && isValid() && options && typeof options === 'object' &&
        (options as { onclick?: unknown }).onclick === ctx.reloadCurrentChat) { notices.push(args); return undefined; }
    return original.apply(toast, args);
  };
  const restore = () => { if (toast.info === wrapped) toast.info = original; };
  try { toast.info = wrapped; } catch { return action(); }
  if (toast.info !== wrapped) return action();
  const cancel = () => { expired = true; restore(); replay(); };
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = host.setTimeout(() => { expired = true; restore(); replay(); }, 20000);
  try {
    const result = await action();
    restore();
    if (notices.length && !expired && isValid() && context()?.chat === ctx.chat) {
      const root = host.document.querySelector('#chat');
      // Do not disturb a message currently being edited or an unknown host layout.
      if (root && ![...root.querySelectorAll<HTMLElement>('.mes_edit_textarea,.mes_reasoning_edit_textarea')].some(node => node.getClientRects().length > 0)) {
        try {
          const nodes = [...root.querySelectorAll<HTMLElement>('.mes[mesid]')];
          let safe = true;
          for (let i = 0; i < nodes.length; i++) {
            const index = Number(nodes[i].getAttribute('mesid'));
            if (!isValid() || context()?.chat !== ctx.chat || !Number.isSafeInteger(index) || index < 0 || !ctx.chat[index]) { safe = false; break; }
            // Native media formatting can normalize its argument. Preserve the raw message.
            await ctx.updateMessageBlock(index, structuredClone(ctx.chat[index]));
            if (i % 16 === 15) await new Promise<void>(resolve => host.setTimeout(resolve, 0));
          }
          completed = safe && isValid() && context()?.chat === ctx.chat;
        } catch { /* Display refresh is optional; replay the native notice on failure. */ }
      }
    }
    return result;
  } finally {
    host.clearTimeout(timer); signal?.removeEventListener('abort', cancel); restore();
    if (!completed) replay();
  }
}
