// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { PresetAdapter, Snapshot } from './contracts';
import type { BindingHost, HostEvent } from './chat-binding-host';
import { bounded } from './async-scope';
import { parseGlobal, parseChat, register, renamed, resolve, same, syncDirectory,
  type GlobalBindingSettings, type BindingState, type ChatIdentity } from './preset-binding';

export interface PresetBindingService {
  readonly state: BindingState; readonly adapter: PresetAdapter;
  subscribe(fn: () => void): () => void;
  start(): Promise<void>; reconcile(): Promise<void>; setDefault(): Promise<void>;
  /** Explicitly bind this chat to today's default; never establish dynamic inheritance. */
  followDefault(): Promise<void>;
  workChanged(): void; dispose(): void;
}
interface LocalSession { dirty: boolean; busy: boolean }
export function createPresetBinding(adapter: PresetAdapter, host: BindingHost,
  session: () => LocalSession): PresetBindingService {
  const state: BindingState = { chat: { kind: 'none', key: 'none' }, mode: 'no-chat', status: 'starting',
    targetName: null, defaultName: null, appliedName: null, error: '', epoch: 0, operation: 0 };
  const lifetime = new AbortController(), listeners = new Set<() => void>();
  let settings: GlobalBindingSettings | null = null, initialized = false, disposed = false;
  let pending = false, scheduled = false, ownOperation = false, writingGlobal = false;
  let directoryDirty = true, reloadGlobal = false, renamePending = false;
  let renameReceipt: HostEvent | null = null, confirmed: Snapshot | null = null;
  let nativeEpoch = 0, tail: Promise<unknown> = Promise.resolve();
  let intent: { name: string; key: string; serial?: number; complete: boolean } | null = null;
  let permit: { chat: string; epoch: number; nativeEpoch: number; revision: string } | null = null;
  let priorDirty = false, priorBusy = false;
  let initialChoice: { key: string; id: string | null } | null = null;
  const notify = () => { if (!disposed) listeners.forEach(fn => fn()); };
  const alive = () => { if (disposed) throw Error('预设绑定服务已停用。'); };
  function fail(error: unknown) {
    permit = null; confirmed = null; state.status = 'error';
    state.error = error instanceof Error ? error.message : '无法确认对话预设，请重新读取。'; notify();
  }
  function captureChat(newLoad = false) {
    const current = host.currentChat();
    if (newLoad || current.identity.key !== state.chat.key) {
      if (current.identity.key !== state.chat.key) initialChoice = null;
      state.epoch++; state.chat = current.identity; permit = null; intent = null; confirmed = null;
    }
    if (settings) {
      Object.assign(state, resolve(settings, current.identity, parseChat(current.binding)));
      if (state.mode === 'initializing' && !initialChoice) initialChoice = { key: current.identity.key, id: settings.defaultBindingId };
      const captured = initialChoice?.id && settings.bindings[initialChoice.id];
      if (state.mode === 'initializing' && captured && !captured.tombstone) state.targetName = captured.nativeName;
    }
    return current;
  }
  const validChat = (target: ChatIdentity) => !disposed && host.currentChat().identity.key === target.key;
  async function directory() {
    if (!adapter.directory) throw Error('宿主缺少已核验的预设目录能力。');
    return adapter.directory();
  }
  async function persist(next: GlobalBindingSettings) {
    if (!settings) throw Error('绑定设置尚未初始化。');
    if (same(next, settings)) return;
    next.revision = settings.revision + 1; writingGlobal = true;
    try { await host.writeGlobal(settings, next); alive(); settings = next; }
    finally { writingGlobal = false; }
  }
  async function registerChoice(name: string, fresh = false) {
    if (!settings) throw Error('绑定尚未初始化。');
    const next = structuredClone(settings), id = register(next, name, fresh); await persist(next); return id;
  }
  async function saveChoice(target: ChatIdentity, expected: unknown, id: string) {
    const epoch = state.epoch;
    if (!validChat(target)) throw Error('对话已改变，未向新对话迁移绑定。');
    if (target.kind === 'none') {
      const next = structuredClone(settings!); next.defaultBindingId = id; await persist(next);
    } else {
      await host.writeChat(target, expected, { schemaVersion: 2, presetBindingId: id, chatKey: target.key });
    }
    if (!validChat(target) || epoch !== state.epoch) throw Error('保存期间对话已改变，请重新读取当前对话。');
  }
  async function initialize() {
    settings = parseGlobal(await host.readGlobal()); alive();
    if (!settings) {
      const listing = await directory();
      const actual = listing.supported.length ? await adapter.read() : null;
      if (actual && !listing.supported.includes(actual.name)) throw Error('当前预设未通过安全读取。');
      const next: GlobalBindingSettings = { schemaVersion: 2, revision: 1, defaultBindingId: null, bindings: {} };
      if (actual) next.defaultBindingId = register(next, actual.name);
      writingGlobal = true;
      try { await host.writeGlobal(undefined, next); alive(); settings = next; }
      finally { writingGlobal = false; }
    }
    initialized = true; directoryDirty = true; captureChat();
  }
  async function synchronizeDirectory() {
    if (!settings || renamePending) throw Error('原生重命名尚未完成，请完成后重新读取。');
    const listing = await directory(); alive(); const next = structuredClone(settings);
    if (renameReceipt?.oldName && renameReceipt.name && !listing.names.includes(renameReceipt.oldName)
      && listing.supported.includes(renameReceipt.name)) renamed(next, renameReceipt.oldName, renameReceipt.name);
    syncDirectory(next, listing.supported, listing.names);
    await persist(next); renameReceipt = null; directoryDirty = false;
  }
  async function flush() {
    // Events coalesce to current state. A finite replay budget bounds competing
    // sources; no timers guess when a chat or native preset has finished loading.
    for (let pass = 0; pending && pass < 8; pass++) {
      alive();
      if (session().busy) return;
      if (session().dirty) { state.status = 'paused-dirty'; notify(); return; }
      pending = false;
      const passChat = host.currentChat().identity.key, passNative = nativeEpoch, passEpoch = state.epoch;
      try {
      await host.waitNativeIdle(); alive();
      if (reloadGlobal) {
        settings = parseGlobal(await host.readGlobal());
        if (!settings) throw Error('新版全局绑定被移除，请重新读取。');
        reloadGlobal = false; directoryDirty = true;
      }
      if (renamePending) { pending = true; return; }
      if (directoryDirty) await synchronizeDirectory();
      let current = captureChat(); const epoch = state.epoch, observed = nativeEpoch;
      const inherited = parseChat(current.binding), receipt = settings?.chatRenames?.[current.identity.key];
      if (receipt) {
        if (inherited?.chatKey === receipt.fromKey && inherited.presetBindingId === receipt.presetBindingId) {
          await saveChoice(current.identity, current.binding, receipt.presetBindingId);
          current = captureChat();
        } else if (inherited?.chatKey !== current.identity.key) throw Error('聊天重命名回执与文件不一致，未改写绑定。');
        const next = structuredClone(settings!); delete next.chatRenames![current.identity.key];
        if (!Object.keys(next.chatRenames!).length) delete next.chatRenames;
        await persist(next);
      }
      await host.verifyCopy?.(current.identity, current.binding);
      if (!validChat(current.identity) || epoch !== state.epoch) { pending = true; continue; }
      let actual: Snapshot;
      try { actual = await adapter.read(); }
      catch (error) {
        if (!validChat(current.identity) || epoch !== state.epoch || observed !== nativeEpoch) { pending = true; continue; }
        throw error;
      }
      if (!validChat(current.identity) || epoch !== state.epoch || observed !== nativeEpoch || host.nativeBusy()) { pending = true; continue; }
      if (session().dirty || session().busy) { pending = true; continue; }
      // Only completed native selection intent, captured in the same chat outside
      // the CHAT_CHANGED lifecycle, may update a binding. Our own apply is not intent.
      if (intent?.complete && intent.key === current.identity.key && intent.name === actual.name) {
        const chosen = intent; const id = await registerChoice(actual.name);
        if (intent !== chosen || observed !== nativeEpoch || !validChat(current.identity)) { pending = true; continue; }
        await saveChoice(current.identity, current.binding, id);
        if (intent === chosen) intent = null;
        current = captureChat();
      }
      const target = state.targetName;
      if (!target) throw Error('没有可用默认预设，请先在酒馆创建或选择可用预设后重新读取。');
      const binding = parseChat(current.binding);
      if (current.identity.kind !== 'none' && (binding?.chatKey !== current.identity.key || state.mode === 'missing')) {
        // New chat and confirmed deletion fallback both become durable bindings.
        // The default ID is captured before the asynchronous write; old chat work
        // cannot be committed to a different identity.
        const original = state.mode === 'initializing' && initialChoice?.id;
        const id = original && !settings!.bindings[original]?.tombstone ? original : settings!.defaultBindingId!;
        await saveChoice(current.identity, current.binding, id);
        current = captureChat();
      }
      if (current.identity.kind !== 'none') await host.verifyChat?.(current.identity, current.binding);
      if (!validChat(current.identity) || epoch !== state.epoch || observed !== nativeEpoch) { pending = true; continue; }
      if (actual.name !== state.targetName) {
        ownOperation = true; state.operation++;
        try {
          const select = () => adapter.select(state.targetName!, actual);
          actual = host.automaticPreset ? await host.automaticPreset(state.targetName!, current.identity,
            () => validChat(current.identity) && epoch === state.epoch && !session().dirty, select) : await select();
        } catch (error) {
          if (!validChat(current.identity) || epoch !== state.epoch || observed !== nativeEpoch || host.nativeBusy()) { pending = true; continue; }
          throw error;
        } finally { ownOperation = false; }
      }
      if (!validChat(current.identity) || epoch !== state.epoch || host.nativeBusy() || actual.name !== state.targetName) { pending = true; continue; }
      if (pending) continue;
      confirmed = actual; state.appliedName = actual.name; state.status = 'ready'; state.error = ''; notify();
      } catch (error) {
        // A newer host lifecycle supersedes this pass, including reads aborted
        // during directory/metadata work. Never publish its stale error over B.
        if (!disposed && pending && (host.currentChat().identity.key !== passChat || state.epoch !== passEpoch || nativeEpoch !== passNative)) continue;
        throw error;
      }
    }
    if (pending && !renamePending && !session().dirty && !session().busy) throw Error('预设连续变化，尚未稳定；请完成切换后重新读取。');
  }
  function schedule() {
    if (disposed || scheduled || !initialized || session().busy) return;
    scheduled = true;
    tail = tail.then(flush).catch(fail).finally(() => { scheduled = false; });
  }
  function request() {
    permit = null; pending = true;
    state.status = session().dirty ? 'paused-dirty' : 'reconciling'; notify(); schedule();
  }
  async function settle(signal?: AbortSignal) {
    await bounded(async () => {
      for (let turn = 0; turn < 8; turn++) {
        const job = tail; await job; alive();
        if (pending && !scheduled && !session().dirty && !session().busy) schedule();
        if (job === tail) return;
      }
      throw Error('预设仍在连续变化，请完成操作后重试。');
    }, [lifetime.signal, signal], 30000, '预设确认');
  }
  const unsubscribe = host.subscribe((event): void | Promise<void> => {
    if (disposed) return;
    try {
      if (event.kind === 'chat-renamed' && event.from && event.to) {
        const { from, to } = event;
        return command(async () => {
          const binding = parseChat(await host.verifyRename?.(from, to));
          if (!binding) return;
          const prior = settings?.chatRenames?.[from.key];
          if (binding.chatKey !== from.key && (prior?.fromKey !== binding.chatKey || prior.presetBindingId !== binding.presetBindingId))
            throw Error('聊天重命名来源没有有效回执，未继承绑定。');
          const next = structuredClone(settings!);
          if (next.chatRenames) delete next.chatRenames[from.key];
          (next.chatRenames ??= {})[to.key] = { fromKey: binding.chatKey, presetBindingId: binding.presetBindingId };
          await persist(next);
        }).then(() => settle()).catch(fail);
      }
      if (event.kind === 'chat') { captureChat(true); intent = null; directoryDirty = true; request(); return; }
      if (event.kind === 'settings') { if (!writingGlobal) { reloadGlobal = true; request(); } return; }
      if (event.kind === 'directory') {
        intent = null;
        if (event.rename) renamePending = true;
        if (event.renamed) { renamePending = false; renameReceipt = event; }
        directoryDirty = true; if (!ownOperation) request(); return;
      }
      if (event.kind === 'before') {
        nativeEpoch++; permit = null;
        intent = !ownOperation && !renamePending && !event.transition && (event.chatKey ?? state.chat.key) === state.chat.key
          && event.name ? { name: event.name, key: state.chat.key, serial: event.serial, complete: false } : null;
        if (!ownOperation) request(); return;
      }
      nativeEpoch++; permit = null;
      if (!ownOperation) {
        if (intent && intent.serial === event.serial && intent.name === event.name) intent.complete = true;
        else if (event.serial === undefined && event.name && !event.transition) intent = { name: event.name, key: state.chat.key, complete: true };
        request();
      }
    } catch (error) { fail(error); }
  });
  const offGate = host.installGenerationGate(async (stage, signal) => {
    try {
      alive();
      if (session().dirty || session().busy) throw Error('管理器有未保存修改或正在保存，请完成后发送。');
      const chat = host.currentChat().identity.key;
      if (stage === 'commands') {
        captureChat();
        if (state.status !== 'ready' || host.nativeBusy()) { request(); await settle(signal); }
      }
      signal?.throwIfAborted();
      if (state.status !== 'ready' || !confirmed || host.nativeBusy() || chat !== host.currentChat().identity.key
        || chat !== state.chat.key || host.selectedName() !== state.targetName) throw Error('聊天或预设尚未确认，请重新读取后发送。');
      const epoch = state.epoch, native = nativeEpoch;
      const receipt = await adapter.read(signal);
      if (session().dirty || session().busy || epoch !== state.epoch || native !== nativeEpoch || host.nativeBusy()
        || chat !== host.currentChat().identity.key || receipt.name !== state.targetName) throw Error('生成期间聊天或预设发生变化，请确认后重试。');
      if (stage === 'commands') {
        confirmed = receipt; permit = { chat, epoch, nativeEpoch: native, revision: receipt.revision }; return true;
      }
      if (!permit || permit.chat !== chat || permit.epoch !== epoch || permit.nativeEpoch !== native
        || permit.revision !== receipt.revision) throw Error('请求前预设状态发生变化，请确认后重试。');
      return true;
    } catch (error) { if (!signal?.aborted && !disposed) fail(error); return false; }
  }, () => { if (!state.error) state.error = '本次生成已取消，请重新读取预设状态后重试。'; notify(); return state.error; });
  async function command<T>(work: () => Promise<T>): Promise<T> {
    permit = null; intent = null; host.invalidateGeneration();
    const job = tail.then(async () => {
      alive(); ownOperation = true; state.status = 'reconciling'; state.operation++; notify();
      try { if (!initialized) throw Error('绑定尚未初始化。'); return await work(); }
      finally { ownOperation = false; }
    });
    tail = job.catch(fail);
    try { return await job; } finally { if (!disposed) request(); }
  }
  const wrapped: PresetAdapter = { ...adapter,
    select: (name, expected) => command(async () => {
      const current = captureChat(); const result = await adapter.select(name, expected);
      const id = await registerChoice(result.name); await saveChoice(current.identity, current.binding, id); return result;
    }),
    create: (expected, name, raw) => command(async () => {
      const current = captureChat(); const result = await adapter.create(expected, name, raw);
      const id = await registerChoice(result.name, true); await saveChoice(current.identity, current.binding, id); return result;
    }),
    save: (expected, raw) => command(() => adapter.save(expected, raw)),
    rename: (expected, name) => command(async () => {
      const result = await adapter.rename(expected, name), listing = await directory();
      if (!settings || listing.names.includes(expected.name) || !listing.supported.includes(result.name)) throw Error('重命名结果未确认。');
      const next = structuredClone(settings); renamed(next, expected.name, result.name); await persist(next); return result;
    }),
    remove: expected => command(async () => {
      const result = await adapter.remove(expected); directoryDirty = true; await synchronizeDirectory(); return result;
    }),
  };
  return {
    state, adapter: wrapped,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async start() { try { await initialize(); request(); await settle(); } catch (error) { fail(error); } },
    async reconcile() {
      try {
        if (!initialized) await initialize();
        reloadGlobal = true; directoryDirty = true; captureChat(); request(); await settle();
      } catch (error) { fail(error); }
    },
    setDefault: () => command(async () => {
      if (session().dirty) throw Error('请先处理未保存修改。');
      const current = captureChat(), actual = await adapter.read();
      if (!validChat(current.identity)) throw Error('设置默认期间对话已切换。');
      const id = await registerChoice(actual.name), next = structuredClone(settings!);
      next.defaultBindingId = id; await persist(next);
    }),
    followDefault: () => command(async () => {
      if (session().dirty) throw Error('请先处理未保存修改。');
      const current = captureChat();
      if (current.identity.kind === 'none' || !settings?.defaultBindingId) throw Error('没有可用的聊天或默认预设。');
      await saveChoice(current.identity, current.binding, settings.defaultBindingId);
    }),
    workChanged() {
      if (disposed) return;
      const local = session(), changed = priorDirty !== local.dirty || priorBusy !== local.busy;
      priorDirty = local.dirty; priorBusy = local.busy;
      if (changed && local.dirty) { host.invalidateGeneration(); request(); }
      if (changed && !local.dirty && !local.busy && pending) schedule();
    },
    dispose() { if (disposed) return; disposed = true; lifetime.abort(); permit = null; unsubscribe(); offGate(); host.dispose(); listeners.clear(); },
  };
}
