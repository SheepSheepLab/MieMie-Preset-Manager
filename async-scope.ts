// SPDX-License-Identifier: GPL-3.0-or-later
/** A deadline bounds both headers and body parsing, even for non-cooperative hosts.
 * It cancels our transport; racing a native write only stops waiting, never proves
 * that write failed. Callers must read back before reporting a save outcome. */
export function bounded<T>(work: (signal: AbortSignal) => Promise<T>, signals: Array<AbortSignal | undefined> = [],
  timeout = 10000, label = '酒馆读取'): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(new Error(`${label}已取消，请重新读取实际状态。`));
  for (const signal of signals) {
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(new Error(`${label}超时，请检查连接后重新读取。`)), timeout);
  let onAbort!: () => void;
  const canceled = new Promise<never>((_, reject) => {
    onAbort = () => reject(controller.signal.reason);
    if (controller.signal.aborted) onAbort();
    else controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  const operation = controller.signal.aborted ? canceled : Promise.resolve().then(() => {
    controller.signal.throwIfAborted(); return work(controller.signal);
  });
  return Promise.race([operation, canceled]).finally(() => {
    clearTimeout(timer); controller.signal.removeEventListener('abort', onAbort);
    for (const signal of signals) signal?.removeEventListener('abort', abort);
  });
}
