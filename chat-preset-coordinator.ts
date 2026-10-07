// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { PresetAdapter, Snapshot } from './contracts';
import type { BindingHost, HostEvent } from './chat-binding-host';
import { parseGlobal, parseChat, register, renamed, resolve, same, syncDirectory,
  type GlobalBindingSettings, type BindingState, type ChatIdentity } from './preset-binding';

export interface PresetBindingService {
  readonly state: BindingState;
  readonly adapter: PresetAdapter;
  subscribe(fn: () => void): () => void;
  start(): Promise<void>;
  reconcile(): Promise<void>;
  setDefault(): Promise<void>;
  followDefault(): Promise<void>;
  workChanged(): void;
  dispose(): void;
}
interface LocalSession { dirty: boolean; busy: boolean }
export function createPresetBinding(adapter: PresetAdapter, host: BindingHost,
  session: () => LocalSession): PresetBindingService {
  const state: BindingState = { chat: { kind: 'none', key: 'none' }, mode: 'no-chat', status: 'starting',
    targetName: null, defaultName: null, appliedName: null, error: '', epoch: 0, operation: 0 };
  let settings: GlobalBindingSettings | null = null, disposed = false, initialized = false;
  let pending = false, scheduled = false, ownOperation = false, directoryDirty = false, reloadGlobal = false;
  let renamePending = false, renameReceipt: HostEvent | null = null;
  let tail: Promise<unknown> = Promise.resolve(), failures = false, recovered = false, hasConfirmed = false;
  let confirmed: Snapshot | null = null, nativeEpoch = 0, permit: { epoch: number; nativeEpoch: number; revision: string; chat: string } | null = null;
  let priorDirty = false, priorBusy = false, restoreNoChat = true;
  const listeners = new Set<() => void>();
  const notify = () => { if (!disposed) listeners.forEach(fn => fn()); };
  const alive = () => { if (disposed) throw Error('预设绑定服务已停用。'); };
  function fail(error: unknown) {
    failures = true; permit = null; state.status = 'error'; confirmed = null;
    state.error = error instanceof Error ? error.message : '无法确认对话预设。'; host.invalidateGeneration(); notify();
  }
  function captureChat() {
    const current = host.currentChat();
    if (current.identity.key !== state.chat.key) {
      state.epoch++; state.chat = current.identity; permit = null; recovered = false; hasConfirmed = false; failures = false;
      confirmed = null; state.status = 'reconciling'; restoreNoChat = true;
    }
    if (settings) Object.assign(state, resolve(settings, current.identity, parseChat(current.binding)));
    return current;
  }
  async function directory() {
    if (!adapter.directory) throw Error('宿主缺少已核验的预设目录能力。');
    return adapter.directory();
  }
  async function persist(next: GlobalBindingSettings) {
    if (!settings) throw Error('绑定设置尚未初始化。');
    if (same(next, settings)) return;
    next.revision = settings.revision + 1;
    await host.writeGlobal(settings, next); alive(); settings = next;
  }
  async function initialize() {
    const value = await host.readGlobal(); alive();
    settings = parseGlobal(value);
    if (!settings) {
      const listing = await directory();
      const actual = listing.supported.length ? await adapter.read() : null;
      if (actual && !listing.supported.includes(actual.name)) throw Error('当前预设未通过安全读取，未初始化默认绑定。');
      const next: GlobalBindingSettings = { schemaVersion: 1, revision: 1, defaultBindingId: null, bindings: {} };
      if (actual) next.defaultBindingId = register(next, actual.name);
      await host.writeGlobal(undefined, next); alive(); settings = next;
    }
    initialized = true; directoryDirty = true; captureChat();
  }
  async function synchronizeDirectory() {
    if (!settings || renamePending) throw Error('原生重命名尚未完成，绑定等待明确结果。');
    const listing = await directory(); alive(); const next = structuredClone(settings);
    const receipt = renameReceipt;
    if (receipt?.renamed && receipt.oldName && receipt.name && !listing.names.includes(receipt.oldName) && listing.supported.includes(receipt.name))
      renamed(next, receipt.oldName, receipt.name);
    renameReceipt = null;
    syncDirectory(next, listing.supported, listing.names); await persist(next); directoryDirty = false;
  }
  function schedule() {
    if (disposed || scheduled || !initialized || session().busy) return;
    scheduled = true;
    const job = tail.then(async () => {
      try {
        // One reconciliation can perform its requested application and at most
        // one corrective verification replay. Continuous competition fails closed.
        let selections = 0;
        while (pending && !disposed && !failures) {
          if (session().busy) break;
          if (session().dirty) { state.status = 'paused-dirty'; permit = null; notify(); break; }
          pending = false;
          await host.waitNativeIdle(); alive();
          if (reloadGlobal) {
            const next = parseGlobal(await host.readGlobal());
            if (!next) throw Error('全局绑定配置被移除，请核对后重新协调。');
            settings = next; reloadGlobal = false; directoryDirty = true;
          }
          if (renamePending) { state.status = 'reconciling'; break; }
          if (directoryDirty) await synchronizeDirectory();
          const current = captureChat(), epoch = state.epoch;
          const target = state.targetName;
          if (!target) { state.appliedName = host.selectedName() || null; throw Error('无可用预设；未清空酒馆 live settings，生成已阻止。'); }
          let actual = await adapter.read(); alive();
          if (host.currentChat().identity.key !== current.identity.key || epoch !== state.epoch || host.nativeBusy()) { pending = true; continue; }
          if (session().dirty || session().busy) { pending = true; continue; }
          if (!actual.names.includes(target)) { await synchronizeDirectory(); pending = true; continue; }
          if (actual.name !== target && (current.identity.kind !== 'none' || restoreNoChat)) {
            if (hasConfirmed && recovered) throw Error('其他来源持续争夺预设，自动协调已停止；请处理冲突后重新协调。');
            if (selections >= 2) throw Error('预设应用未能稳定收敛，已停止重试并阻止生成。');
            if (hasConfirmed) recovered = true;
            selections++; ownOperation = true; state.operation++; state.status = 'reconciling'; notify();
            const beforeNative = nativeEpoch;
            try {
              const select = () => adapter.select(target, actual);
              actual = host.automaticPreset ? await host.automaticPreset(target, current.identity,
                () => !disposed && state.epoch === epoch && !session().dirty && !session().busy, select) : await select();
            }
            catch (error) {
              // A concurrent native application may invalidate the adapter receipt.
              // Replay only if a real observable application is still pending.
              if (host.nativeBusy() || nativeEpoch !== beforeNative) { pending = true; continue; }
              throw error;
            } finally { ownOperation = false; }
          }
          if (state.epoch !== epoch || host.currentChat().identity.key !== current.identity.key || host.nativeBusy()) { pending = true; continue; }
          if (current.identity.kind !== 'none' && actual.name !== state.targetName) { pending = true; continue; }
          if (session().dirty) { pending = true; continue; }
          confirmed = actual; state.appliedName = actual.name; state.status = 'ready'; state.error = '';
          hasConfirmed = true; restoreNoChat = false; notify();
        }
      } catch (error) { if (!disposed) fail(error); }
      finally { scheduled = false; }
    });
    tail = job.catch(() => undefined);
  }
  function request(reset = false) {
    if (reset) { failures = false; recovered = false; hasConfirmed = false; state.error = ''; restoreNoChat = true; }
    permit = null; pending = true;
    if (!failures) { state.status = session().dirty ? 'paused-dirty' : 'reconciling'; notify(); schedule(); }
  }
  const unsubscribe = host.subscribe(event => {
    if (disposed) return;
    try {
      if (event.kind === 'chat') { state.epoch++; state.chat = host.currentChat().identity; captureChat(); request(true); return; }
      if (event.kind === 'directory') {
        if (event.rename) { renamePending = true; request(); return; }
        if (event.renamed) { renamePending = false; renameReceipt = event; }
        directoryDirty = true; request(); return;
      }
      if (event.kind === 'settings') { reloadGlobal = true; if (!ownOperation) request(); return; }
      nativeEpoch++; permit = null;
      if (event.kind === 'before') { confirmed = null; state.appliedName = null; }
      // There is no source attribution: every deviation is reconciled alike.
      if (!ownOperation) request(); else pending = true;
    } catch (error) { fail(error); }
  });
  async function generationCheck(stage: 'commands' | 'request') {
    alive(); const current = host.currentChat();
    const desired = settings && resolve(settings, current.identity, parseChat(current.binding));
    if (state.status === 'ready' && (current.identity.key !== state.chat.key ||
      (current.identity.kind !== 'none' && (host.selectedName() !== state.targetName || desired?.targetName !== state.targetName)))) {
      captureChat(); request(); return false;
    }
    if (state.status !== 'ready' || !confirmed || current.identity.key !== state.chat.key || host.nativeBusy()
      || (current.identity.kind !== 'none' && (host.selectedName() !== state.targetName || desired?.targetName !== state.targetName))) return false;
    const epoch = state.epoch, observedNative = nativeEpoch;
    const receipt = await adapter.read();
    if (state.status !== 'ready' || epoch !== state.epoch || observedNative !== nativeEpoch || host.nativeBusy()
      || host.currentChat().identity.key !== current.identity.key) return false;
    if (receipt.revision !== confirmed.revision) { request(); return false; }
    if (stage === 'commands') {
      permit = { epoch, nativeEpoch: observedNative, revision: receipt.revision, chat: current.identity.key }; return true;
    }
    return Boolean(permit && permit.epoch === epoch && permit.nativeEpoch === observedNative && permit.chat === current.identity.key
      && permit.revision === receipt.revision);
  }
  const offGate = host.installGenerationGate(async stage => {
    try { return await generationCheck(stage); } catch (error) { fail(error); return false; }
  }, () => {
    permit = null; if (state.status !== 'error') state.error = '对话预设尚未安全确认，本次生成已取消；请处理未保存修改或重新协调。'; notify();
  });
  async function command<T>(work: () => Promise<T>, restoreDefault = true): Promise<T> {
    permit = null; host.invalidateGeneration();
    const job = tail.then(async () => {
      alive(); ownOperation = true; failures = false; recovered = false; hasConfirmed = false;
      state.status = 'reconciling'; state.operation++; notify();
      try { if (!initialized) throw Error('预设绑定尚未初始化。'); return await work(); }
      catch (error) { fail(error); throw error; }
      finally { ownOperation = false; }
    });
    tail = job.catch(() => undefined);
    try { return await job; } finally { if (!failures) { request(true); if (host.currentChat().identity.kind === 'none') restoreNoChat = restoreDefault; } }
  }
  async function saveChatChoice(target: ChatIdentity, expected: unknown, id: string) {
    if (target.kind === 'none') return;
    const next = settings?.defaultBindingId === id ? undefined : { schemaVersion: 1, presetBindingId: id };
    await host.writeChat(target, expected, next); alive();
    if (host.currentChat().identity.key !== target.key) throw Error('对话已改变，原操作没有向新对话迁移。');
  }
  async function registerChoice(name: string, fresh = false) {
    if (!settings) throw Error('绑定尚未初始化。');
    const next = structuredClone(settings), id = register(next, name, fresh); await persist(next); return id;
  }
  const wrapped: PresetAdapter = { ...adapter,
    select: (name, expected) => command(async () => {
      const current = captureChat(), actual = await adapter.read();
      if (actual.revision !== expected.revision || actual.name !== expected.name) throw Error('选择前预设已改变，请重新读取。');
      const listing = await directory(); if (!listing.supported.includes(name)) throw Error('目标预设不存在或无法安全支持。');
      const id = await registerChoice(name); await saveChatChoice(current.identity, current.binding, id);
      const result = await adapter.select(name, actual);
      if (host.currentChat().identity.key !== current.identity.key) throw Error('应用期间对话已改变，将重新协调最新对话。');
      return result;
    }, false),
    create: (expected, name, raw) => command(async () => {
      const current = captureChat(); const result = await adapter.create(expected, name, raw);
      const id = await registerChoice(result.name, true); await saveChatChoice(current.identity, current.binding, id); return result;
    }, false),
    rename: (expected, name) => command(async () => {
      const result = await adapter.rename(expected, name), listing = await directory();
      if (!settings || listing.names.includes(expected.name) || !listing.supported.includes(result.name)) throw Error('重命名映射未能确认。');
      const next = structuredClone(settings); renamed(next, expected.name, result.name); await persist(next); return result;
    }),
    remove: expected => command(async () => {
      const result = await adapter.remove(expected); directoryDirty = true; await synchronizeDirectory(); return result;
    }),
  };
  const service: PresetBindingService = {
    state, adapter: wrapped,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async start() { try { await initialize(); request(true); await tail; } catch (error) { fail(error); } },
    async reconcile() {
      if (!initialized) { try { await initialize(); } catch (error) { fail(error); return; } }
      reloadGlobal = true; directoryDirty = true; captureChat(); request(true); await tail;
    },
    setDefault: () => command(async () => {
      if (session().dirty) throw Error('请先处理未保存修改，再设置默认预设。');
      const current = captureChat(); await host.waitNativeIdle(); const applied = await adapter.read();
      if (host.currentChat().identity.key !== current.identity.key) throw Error('设置默认期间对话已切换。');
      const id = await registerChoice(applied.name);
      const next = structuredClone(settings!); next.defaultBindingId = id; await persist(next);
      if (parseChat(current.binding)?.presetBindingId === id) await host.writeChat(current.identity, current.binding, undefined);
    }),
    followDefault: () => command(async () => {
      if (session().dirty) throw Error('请先处理未保存修改。');
      const current = captureChat();
      if (current.identity.kind === 'none') throw Error('没有当前对话。');
      await host.writeChat(current.identity, current.binding, undefined);
    }),
    workChanged() {
      if (disposed) return;
      const local = session(), changed = priorDirty !== local.dirty || priorBusy !== local.busy;
      priorDirty = local.dirty; priorBusy = local.busy;
      if (changed && !local.dirty && !local.busy && pending) { schedule(); }
    },
    dispose() { if (disposed) return; disposed = true; permit = null; unsubscribe(); offGate(); host.dispose(); listeners.clear(); },
  };
  return service;
}
