// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import { bounded } from './async-scope';
import { automaticRegexDisplay, type RegexDisplayContext } from './automatic-regex-display';
import { BINDING_NAMESPACE as NS, object, same, nativeChatFilename, parseChat, type ChatIdentity } from './preset-binding';
export type HostEvent = { kind: 'chat' | 'before' | 'preset' | 'directory' | 'settings' | 'chat-renamed';
  from?: ChatIdentity; to?: ChatIdentity;
  name?: string; oldName?: string; rename?: boolean; renamed?: boolean;
  chatKey?: string; transition?: boolean; serial?: number };
export interface BindingHost {
  currentChat(): { identity: ChatIdentity; binding: unknown };
  selectedName(): string;
  automaticPreset?<T>(name: string, identity: ChatIdentity, valid: () => boolean, action: () => Promise<T>): Promise<T>;
  readGlobal(): Promise<unknown>;
  writeGlobal(expected: unknown, next: unknown): Promise<void>;
  writeChat(identity: ChatIdentity, expected: unknown, next: unknown): Promise<void>;
  verifyChat?(identity: ChatIdentity, expected: unknown): Promise<void>;
  subscribe(fn: (event: HostEvent) => void | Promise<void>): () => void;
  verifyRename?(from: ChatIdentity, to: ChatIdentity): Promise<unknown>;
  verifyCopy?(target: ChatIdentity, binding: unknown): Promise<void>;
  waitNativeIdle(): Promise<void>;
  nativeBusy(): boolean;
  installGenerationGate(check: (stage: 'commands' | 'request', signal?: AbortSignal) => Promise<boolean>, canceled: () => string | void): () => void;
  invalidateGeneration(): void;
  dispose(): void;
}
type Listener = (...args: unknown[]) => unknown;
interface Context extends Partial<RegexDisplayContext> {
  characterId?: number; groupId?: string | number | null; chatId?: string;
  characters: Array<{ avatar: string; name: string }>;
  chatMetadata: Record<string, unknown>; extensionSettings: Record<string, unknown>;
  getPresetManager(api: string): { getSelectedPresetName(): string };
  getRequestHeaders(): HeadersInit;
  saveMetadata(): Promise<void>; saveSettingsDebounced(): void; stopGeneration(): unknown;
  eventTypes: Record<string, string>;
  eventSource: { makeFirst?(event: string, fn: Listener): void; makeLast?(event: string, fn: Listener): void; on(event: string, fn: Listener): void; removeListener(event: string, fn: Listener): void };
}
interface STWindow extends Window { toastr?: { warning?: (...args: unknown[]) => unknown; info: (...args: unknown[]) => unknown }; SillyTavern?: { getContext(): Context } }
export function createBindingHost(windowHost: Window): BindingHost {
  const host = windowHost as STWindow;
  const context = () => { const ctx = host.SillyTavern?.getContext(); if (!ctx) throw Error('酒馆上下文不可用。'); return ctx; };
  const initial = context(), source = initial.eventSource, types = initial.eventTypes;
  for (const key of ['CHAT_CHANGED', 'PRESET_CHANGED', 'OAI_PRESET_CHANGED_BEFORE', 'SETTINGS_UPDATED',
    'CHAT_RENAMED', 'GENERATION_STARTED', 'GENERATION_AFTER_COMMANDS', 'CHAT_COMPLETION_SETTINGS_READY', 'GENERATION_ENDED'])
    if (!types[key]) throw Error(`缺少安全绑定所需的原生事件：${key}`);
  for (const fn of ['saveMetadata', 'saveSettingsDebounced', 'stopGeneration'] as const)
    if (typeof initial[fn] !== 'function') throw Error('缺少安全绑定所需的原生持久化或生成能力。');
  if (!object(initial.extensionSettings) || !object(initial.chatMetadata)) throw Error('酒馆绑定存储尚未就绪。');
  const quietLifetime = new AbortController();
  let disposed = false, activeGeneration = false, transition = false, nativeSerial = 0;
  let nativeDeadline = 0;
  let generation = new AbortController(), chatLifetime = new AbortController();
  const subscriptions: Array<[string, Listener]> = [], callbacks = new Set<(event: HostEvent) => void | Promise<void>>();
  const waits = new Set<() => void>(), native = new Map<string, Array<{ serial: number; chatKey: string; transition: boolean }>>();
  const alive = () => { if (disposed) throw Error('预设绑定服务已停用。'); };
  function listen(key: string, fn: Listener) {
    const event = types[key]; if (!event) return () => {};
    source.on(event, fn); subscriptions.push([event, fn]);
    return () => { source.removeListener(event, fn); const i = subscriptions.findIndex(s => s[0] === event && s[1] === fn); if (i >= 0) subscriptions.splice(i, 1); };
  }
  const emit = (event: HostEvent) => callbacks.forEach(fn => fn(event));
  function identity(ctx: Context): ChatIdentity {
    const filename = ctx.chatId;
    if (!filename) return { kind: 'none', key: 'none' };
    if (ctx.groupId) {
      const groupId = String(ctx.groupId);
      return { kind: 'group', groupId, filename, key: JSON.stringify(['group', groupId, filename]) };
    }
    const character = ctx.characterId !== undefined ? ctx.characters?.[ctx.characterId] : undefined;
    if (!character?.avatar) throw Error('无法确认当前聊天的角色身份，已停止绑定写入。');
    return { kind: 'single', avatar: character.avatar, characterName: character.name, filename,
      key: JSON.stringify(['single', character.avatar, filename]) };
  }
  const currentChat = () => { const ctx = context(); return { identity: identity(ctx), binding: structuredClone(ctx.chatMetadata[NS]) }; };
  async function post(path: string, body: unknown, load?: AbortSignal): Promise<unknown> {
    alive();
    return bounded(async signal => {
      const response = await host.fetch(new URL(path, host.location.href).href,
        { method: 'POST', headers: context().getRequestHeaders(), body: JSON.stringify(body), cache: 'no-cache', signal });
      if (!response.ok) throw Error('无法回读酒馆绑定数据，请检查连接后重试。');
      const result: unknown = await response.json(); alive(); return result;
    }, [quietLifetime.signal, load]);
  }
  async function readGlobal() {
    const result = await post('api/settings/get', {});
    if (!object(result) || typeof result.settings !== 'string') throw Error('酒馆 settings 回读格式不兼容。');
    const settings: unknown = JSON.parse(result.settings);
    if (!object(settings) || !object(settings.extension_settings)) throw Error('酒馆 extension settings 回读格式不兼容。');
    return structuredClone(settings.extension_settings[NS]);
  }
  async function readChatFile(target: ChatIdentity, load?: AbortSignal): Promise<unknown[]> {
    if (target.kind === 'none') throw Error('没有当前对话，不能保存聊天绑定。');
    const result = target.kind === 'group' ? await post('api/chats/group/get', { id: target.filename }, load) :
      await post('api/chats/get', { ch_name: target.characterName, file_name: target.filename, avatar_url: target.avatar }, load);
    if (!Array.isArray(result) || (result.length && (!object(result[0]) || !object(result[0].chat_metadata))))
      throw Error('无法确认目标对话的 metadata，未继续写入。');
    return result;
  }
  const fileBinding = (file: unknown[]) => file.length ? structuredClone((file[0] as { chat_metadata: Record<string, unknown> }).chat_metadata[NS]) : undefined;
  const readChat = async (target: ChatIdentity, load = chatLifetime.signal) => fileBinding(await readChatFile(target, load));
  function previousIdentity(target: ChatIdentity, key: string): ChatIdentity {
    const parts: unknown = JSON.parse(key);
    if (target.kind === 'none' || !Array.isArray(parts) || parts.length !== 3 || parts[0] !== target.kind ||
      parts[1] !== (target.kind === 'single' ? target.avatar : target.groupId) || typeof parts[2] !== 'string' || !parts[2])
      throw Error('聊天身份来源不匹配，未继承其他聊天绑定。');
    return { ...target, filename: parts[2], key };
  }
  async function verifyCopy(target: ChatIdentity, value: unknown) {
    if (target.kind === 'none') return; // ST may retain the previous metadata while closing a chat.
    const binding = parseChat(value);
    if (!binding || binding.chatKey === target.key) return;
    const origin = previousIdentity(target, binding.chatKey);
    // A successful read of the still-existing source proves this is a distinct
    // file. Missing/unreadable source is NOT proof of a new chat or a rename.
    if (!(await readChatFile(origin, chatLifetime.signal)).length)
      throw Error('正在确认聊天重命名；原文件不存在，未覆盖原绑定。请完成原生重命名后重新读取。');
  }
  async function verifyRename(from: ChatIdentity, to: ChatIdentity) {
    if (from.kind === 'none' || to.kind === 'none' || from.key === to.key) throw Error('无效的聊天重命名回执。');
    previousIdentity(to, from.key);
    if ((await readChatFile(from)).length) throw Error('原聊天仍存在，未将复制当作重命名。');
    const binding = parseChat(fileBinding(await readChatFile(to)));
    if (binding) previousIdentity(to, binding.chatKey);
    return binding;
  }
  function eventWait(key: string): { promise: Promise<void>; cancel(): void } {
    let cancel!: () => void;
    const promise = new Promise<void>((resolve, reject) => {
      let timer: number;
      const finish = (error?: Error) => { host.clearTimeout(timer); off(); waits.delete(cancel); error ? reject(error) : resolve(); };
      const off = listen(key, () => finish());
      cancel = () => finish(Error('绑定等待已停止，持久化结果尚未确认。'));
      timer = host.setTimeout(() => finish(Error('等待原生绑定操作超时，结果尚未确认。')), 20000);
      waits.add(cancel);
    });
    void promise.catch(() => undefined); return { promise, cancel };
  }
  async function writeGlobal(expected: unknown, next: unknown) {
    const disk = await readGlobal(); alive();
    const ctx = context();
    if (!same(disk, expected) || !same(ctx.extensionSettings[NS], expected))
      throw Error('全局绑定设置已被其他来源修改，未覆盖新状态。');
    const saved = eventWait('SETTINGS_UPDATED');
    ctx.extensionSettings[NS] = structuredClone(next);
    try { ctx.saveSettingsDebounced(); await saved.promise; }
    catch { /* Lost acknowledgement: read back once, never repeat the write. */ }
    finally { saved.cancel(); }
    if (!same(await readGlobal(), next) || !same(context().extensionSettings[NS], next))
      throw Error('全局绑定保存部分完成或未确认；请重新协调，未回写旧配置。');
  }
  async function writeChat(target: ChatIdentity, expected: unknown, next: unknown) {
    if (target.kind === 'none') throw Error('没有当前对话，未保存 override。');
    if (currentChat().identity.key !== target.key) throw Error('保存前对话已切换，未写入新对话。');
    const load = chatLifetime, ctx = context(), metadata = ctx.chatMetadata;
    const disk = await readChat(target, load.signal);
    if (load !== chatLifetime || identity(context()).key !== target.key || context().chatMetadata !== metadata || !same(metadata[NS], expected) || !same(disk, expected))
      throw Error('聊天绑定基线已改变，未覆盖 metadata。');
    if (same(expected, next)) return;
    // Mutate only the captured chat's literal namespace. Never copy A metadata
    // into a freshly acquired B context, even if native save waits and changes chat.
    if (next === undefined) delete metadata[NS]; else metadata[NS] = structuredClone(next);
    try { await bounded(() => ctx.saveMetadata(), [quietLifetime.signal, load.signal], 10000, '聊天绑定保存'); }
    catch { /* A lost response is not proof of failure. Verify the captured file. */ }
    if (load !== chatLifetime || currentChat().identity.key !== target.key || context().chatMetadata !== metadata)
      throw Error('保存期间对话已切换，原聊天写入尚未确认；没有向新对话迁移绑定。');
    if (!same(await readChat(target, load.signal), next) || load !== chatLifetime || currentChat().identity.key !== target.key || !same(metadata[NS], next))
      throw Error('目标聊天绑定回读不一致，保存未确认。');
  }
  function invalidateGeneration() { if (activeGeneration) context().stopGeneration(); }
  const chatBegin = () => {
    transition = true; invalidateGeneration(); generation.abort();
    chatLifetime.abort(); chatLifetime = new AbortController(); emit({ kind: 'chat' });
  };
  const chatEnd = () => { transition = false; };
  listen('CHAT_CHANGED', chatBegin);
  source.makeFirst?.(types.CHAT_CHANGED, chatBegin);
  listen('CHAT_CHANGED', chatEnd);
  source.makeLast?.(types.CHAT_CHANGED, chatEnd);
  listen('CHAT_RENAMED', async payload => {
    if (!object(payload) || typeof payload.oldFileName !== 'string' || typeof payload.newFileName !== 'string') return;
    const oldName = nativeChatFilename(payload.oldFileName), newName = nativeChatFilename(payload.newFileName);
    if (!oldName || !newName) return;
    const ctx = context(), character = ctx.characters.find(c => c.avatar === payload.avatarId);
    const make = (filename: string): ChatIdentity | null => payload.groupId ?
      { kind: 'group', groupId: String(payload.groupId), filename, key: JSON.stringify(['group', String(payload.groupId), filename]) } :
      character ? { kind: 'single', avatar: character.avatar, characterName: character.name, filename,
        key: JSON.stringify(['single', character.avatar, filename]) } : null;
    const from = make(oldName), to = make(newName);
    if (from && to && from.key !== to.key) await Promise.all([...callbacks].map(fn => fn({ kind: 'chat-renamed', from, to })));
  });
  const presetBegin: Listener = payload => {
    invalidateGeneration();
    const name = object(payload) && typeof payload.presetName === 'string' ? payload.presetName : '?';
    const record = { serial: ++nativeSerial, chatKey: currentChat().identity.key, transition };
    if (!native.size) nativeDeadline = Date.now() + 20000;
    native.set(name, [...(native.get(name) ?? []), record]);
    emit({ kind: 'before', name, ...record });
  };
  listen('OAI_PRESET_CHANGED_BEFORE', presetBegin);
  source.makeFirst?.(types.OAI_PRESET_CHANGED_BEFORE, presetBegin);
  listen('PRESET_CHANGED', payload => {
    if (!object(payload) || payload.apiId !== 'openai' || typeof payload.name !== 'string') return;
    const records = native.get(payload.name), record = records?.shift();
    if (!records?.length) native.delete(payload.name);
    if (!native.size) nativeDeadline = 0;
    emit({ kind: 'preset', name: payload.name, ...record });
  });
  listen('PRESET_RENAMED_BEFORE', payload => {
    if (object(payload) && payload.apiId === 'openai') { invalidateGeneration(); emit({ kind: 'directory', rename: true }); }
  });
  listen('PRESET_RENAMED', payload => {
    if (object(payload) && payload.apiId === 'openai') emit({ kind: 'directory', renamed: true,
      oldName: String(payload.oldName), name: String(payload.newName) });
  });
  listen('PRESET_DELETED', payload => {
    if (object(payload) && payload.apiId === 'openai') emit({ kind: 'directory', name: String(payload.name) });
  });
  let observedGlobal = structuredClone(initial.extensionSettings[NS]);
  listen('SETTINGS_UPDATED', () => {
    const next = context().extensionSettings[NS];
    if (!same(next, observedGlobal)) { observedGlobal = structuredClone(next); invalidateGeneration(); emit({ kind: 'settings' }); }
  });
  return {
    currentChat, verifyRename, verifyCopy, selectedName: () => context().getPresetManager('openai').getSelectedPresetName(), readGlobal, writeGlobal, writeChat,
    async verifyChat(target, expected) {
      if (target.kind === 'none') return;
      const load = chatLifetime;
      const saved = await readChat(target, load.signal);
      if (load !== chatLifetime || currentChat().identity.key !== target.key || !same(saved, expected))
        throw Error('聊天绑定的磁盘与运行态不一致，请检查连接并重新加载此聊天；未重复写入。');
    },
    subscribe(fn) { callbacks.add(fn); return () => callbacks.delete(fn); },
    nativeBusy: () => native.size > 0,
    async waitNativeIdle() {
      alive(); if (!native.size) return;
      const remaining = nativeDeadline - Date.now();
      if (remaining <= 0) throw Error('原生预设持续应用或未完成，协调已停止。');
      // One deadline covers the whole native application barrier. Completions
      // cannot extend it indefinitely while another source keeps applying presets.
      await new Promise<void>((resolve, reject) => {
        let timer: number;
        const finish = (error?: Error) => { host.clearTimeout(timer); off(); waits.delete(cancel); error ? reject(error) : resolve(); };
        const off = listen('PRESET_CHANGED', () => { if (!native.size) finish(); });
        const cancel = () => finish(Error('原生应用等待已停止，未确认预设。'));
        waits.add(cancel);
        timer = host.setTimeout(() => finish(Error('原生预设持续应用或未完成，协调已停止。')), remaining);
      }); alive();
    },
    installGenerationGate(check, canceled) {
      // STARTED is not paired with ENDED. Each attempt/continuation supersedes
      // only our pending check; ST owns the actual generation and abort controller.
      const stopWait = () => { activeGeneration = false; generation.abort(); };
      const gate = async (stage: 'commands' | 'request') => {
        const attempt = generation;
        if (attempt.signal.aborted || disposed) return;
        let allowed = false;
        try { allowed = await bounded(signal => check(stage, signal), [attempt.signal, quietLifetime.signal], 30000, '生成前预设确认'); }
        catch { /* Report through the coordinator; no native event exception can cancel ST. */ }
        if (attempt !== generation || attempt.signal.aborted || disposed) return;
        if (!allowed) {
          const message = canceled() || '本次生成已取消，请打开咩咩预设管理并重新读取。';
          context().stopGeneration();
          host.toastr?.warning?.(message, '咩咩预设管理', { timeOut: 8000, preventDuplicates: true });
        } else activeGeneration = true;
      };
      const off = [listen('GENERATION_STARTED', (_type, _options, dryRun) => {
          if (dryRun === true) return;
          activeGeneration = false; generation.abort(); generation = new AbortController();
        }),
        listen('GENERATION_STOPPED', stopWait), listen('GENERATION_ENDED', () => { activeGeneration = false; }),
        listen('GENERATION_AFTER_COMMANDS', async (_type, _options, dryRun) => {
          if (dryRun !== true) await gate('commands');
        }),
        listen('CHAT_COMPLETION_SETTINGS_READY', () => gate('request'))];
      return () => { off.forEach(fn => fn()); invalidateGeneration(); generation.abort(); };
    },
    automaticPreset(name, target, valid, action) {
      const allowed = () => !disposed && valid() && currentChat().identity.key === target.key &&
        context().getPresetManager('openai').getSelectedPresetName() === name &&
        ![...native.keys()].some(pending => pending !== name);
      return automaticRegexDisplay(host, () => context() as RegexDisplayContext, name, allowed, action, quietLifetime.signal);
    },
    invalidateGeneration,
    dispose() { if (disposed) return; invalidateGeneration(); disposed = true; quietLifetime.abort(); chatLifetime.abort(); generation.abort(); waits.forEach(fn => fn());
      subscriptions.forEach(([event, fn]) => source.removeListener(event, fn)); subscriptions.length = 0; callbacks.clear(); native.clear(); },
  };
}
