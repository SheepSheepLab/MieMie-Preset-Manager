// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import { automaticRegexDisplay, type RegexDisplayContext } from './automatic-regex-display';
import { BINDING_NAMESPACE as NS, object, same, type ChatIdentity } from './preset-binding';
export type HostEvent = { kind: 'chat' | 'before' | 'preset' | 'directory' | 'settings';
  name?: string; oldName?: string; rename?: boolean; renamed?: boolean };
export interface BindingHost {
  currentChat(): { identity: ChatIdentity; binding: unknown };
  selectedName(): string;
  automaticPreset?<T>(name: string, identity: ChatIdentity, valid: () => boolean, action: () => Promise<T>): Promise<T>;
  readGlobal(): Promise<unknown>;
  writeGlobal(expected: unknown, next: unknown): Promise<void>;
  writeChat(identity: ChatIdentity, expected: unknown, next: unknown): Promise<void>;
  subscribe(fn: (event: HostEvent) => void): () => void;
  waitNativeIdle(): Promise<void>;
  nativeBusy(): boolean;
  installGenerationGate(check: (stage: 'commands' | 'request') => Promise<boolean>, canceled: () => void): () => void;
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
  eventSource: { on(event: string, fn: Listener): void; removeListener(event: string, fn: Listener): void };
}
interface STWindow extends Window { toastr?: { info: (...args: unknown[]) => unknown }; SillyTavern?: { getContext(): Context } }
export function createBindingHost(windowHost: Window): BindingHost {
  const host = windowHost as STWindow;
  const context = () => { const ctx = host.SillyTavern?.getContext(); if (!ctx) throw Error('酒馆上下文不可用。'); return ctx; };
  const initial = context(), source = initial.eventSource, types = initial.eventTypes;
  for (const key of ['CHAT_CHANGED', 'PRESET_CHANGED', 'OAI_PRESET_CHANGED_BEFORE', 'SETTINGS_UPDATED',
    'GENERATION_STARTED', 'GENERATION_AFTER_COMMANDS', 'CHAT_COMPLETION_SETTINGS_READY', 'GENERATION_ENDED'])
    if (!types[key]) throw Error(`缺少安全绑定所需的原生事件：${key}`);
  for (const fn of ['saveMetadata', 'saveSettingsDebounced', 'stopGeneration'] as const)
    if (typeof initial[fn] !== 'function') throw Error('缺少安全绑定所需的原生持久化或生成能力。');
  if (!object(initial.extensionSettings) || !object(initial.chatMetadata)) throw Error('酒馆绑定存储尚未就绪。');
  const quietLifetime = new AbortController();
  let disposed = false, activeGeneration = false, generationDepth = 0, overlappingGeneration = false;
  const subscriptions: Array<[string, Listener]> = [], callbacks = new Set<(event: HostEvent) => void>();
  const waits = new Set<() => void>(), native = new Map<string, number>();
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
  async function post(path: string, body: unknown): Promise<unknown> {
    alive(); const response = await host.fetch(new URL(path, host.location.href).href,
      { method: 'POST', headers: context().getRequestHeaders(), body: JSON.stringify(body), cache: 'no-cache' });
    if (!response.ok) throw Error('无法回读酒馆绑定数据，请检查连接后重试。');
    const result: unknown = await response.json(); alive(); return result;
  }
  async function readGlobal() {
    const result = await post('api/settings/get', {});
    if (!object(result) || typeof result.settings !== 'string') throw Error('酒馆 settings 回读格式不兼容。');
    const settings: unknown = JSON.parse(result.settings);
    if (!object(settings) || !object(settings.extension_settings)) throw Error('酒馆 extension settings 回读格式不兼容。');
    return structuredClone(settings.extension_settings[NS]);
  }
  async function readChat(target: ChatIdentity): Promise<unknown> {
    if (target.kind === 'none') throw Error('没有当前对话，不能保存聊天绑定。');
    const result = target.kind === 'group' ? await post('api/chats/group/get', { id: target.filename }) :
      await post('api/chats/get', { ch_name: target.characterName, file_name: target.filename, avatar_url: target.avatar });
    if (!Array.isArray(result) || !result.length || !object(result[0]) || !object(result[0].chat_metadata))
      throw Error('无法确认目标对话的 metadata，未继续写入。');
    return structuredClone(result[0].chat_metadata[NS]);
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
    finally { saved.cancel(); }
    if (!same(await readGlobal(), next) || !same(context().extensionSettings[NS], next))
      throw Error('全局绑定保存部分完成或未确认；请重新协调，未回写旧配置。');
  }
  async function writeChat(target: ChatIdentity, expected: unknown, next: unknown) {
    if (target.kind === 'none') throw Error('没有当前对话，未保存 override。');
    if (currentChat().identity.key !== target.key) throw Error('保存前对话已切换，未写入新对话。');
    const disk = await readChat(target);
    const ctx = context(), metadata = ctx.chatMetadata;
    if (identity(ctx).key !== target.key || !same(metadata[NS], expected) || !same(disk, expected))
      throw Error('聊天绑定基线已改变，未覆盖 metadata。');
    if (same(expected, next)) return;
    // Mutate only the captured chat's literal namespace. Never copy A metadata
    // into a freshly acquired B context, even if native save waits and changes chat.
    if (next === undefined) delete metadata[NS]; else metadata[NS] = structuredClone(next);
    await ctx.saveMetadata();
    if (currentChat().identity.key !== target.key || context().chatMetadata !== metadata)
      throw Error('保存期间对话已切换，原聊天写入尚未确认；没有向新对话迁移绑定。');
    if (!same(await readChat(target), next) || currentChat().identity.key !== target.key || !same(metadata[NS], next))
      throw Error('目标聊天绑定回读不一致，保存未确认。');
  }
  function invalidateGeneration() { if (activeGeneration) context().stopGeneration(); }
  listen('CHAT_CHANGED', () => { invalidateGeneration(); emit({ kind: 'chat' }); });
  listen('OAI_PRESET_CHANGED_BEFORE', payload => {
    invalidateGeneration(); const name = object(payload) && typeof payload.presetName === 'string' ? payload.presetName : '?';
    native.set(name, (native.get(name) ?? 0) + 1); emit({ kind: 'before', name });
  });
  listen('PRESET_CHANGED', payload => {
    if (!object(payload) || payload.apiId !== 'openai' || typeof payload.name !== 'string') return;
    const count = native.get(payload.name) ?? 0;
    if (count <= 1) native.delete(payload.name); else native.set(payload.name, count - 1);
    emit({ kind: 'preset', name: payload.name });
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
    currentChat, selectedName: () => context().getPresetManager('openai').getSelectedPresetName(), readGlobal, writeGlobal, writeChat,
    subscribe(fn) { callbacks.add(fn); return () => callbacks.delete(fn); },
    nativeBusy: () => native.size > 0,
    async waitNativeIdle() {
      alive(); if (!native.size) return;
      // One deadline covers the whole native application barrier. Completions
      // cannot extend it indefinitely while another source keeps applying presets.
      await new Promise<void>((resolve, reject) => {
        let timer: number;
        const finish = (error?: Error) => { host.clearTimeout(timer); off(); waits.delete(cancel); error ? reject(error) : resolve(); };
        const off = listen('PRESET_CHANGED', () => { if (!native.size) finish(); });
        const cancel = () => finish(Error('原生应用等待已停止，未确认预设。'));
        waits.add(cancel);
        timer = host.setTimeout(() => finish(Error('原生预设持续应用或未完成，协调已停止。')), 20000);
      }); alive();
    },
    installGenerationGate(check, canceled) {
      // STARTED occurs before ST creates its AbortController. Cancel only AFTER_COMMANDS
      // and at the request boundary; listener exceptions alone never abort native emits.
      const off = [listen('GENERATION_STARTED', (_type, options, dryRun) => {
          if (dryRun === true) return;
          // Native group member recursion supplies the parent's signal and retains
          // its controller. Independent ordinary attempts share a native controller;
          // refuse overlap until their lifecycle has ended rather than reuse a permit.
          if (!object(options) || !options.signal) {
            generationDepth++;
            if (generationDepth > 1) {
              overlappingGeneration = true;
              // Cancel the previous request's controller BEFORE Generate replaces
              // it after STARTED. AFTER_COMMANDS then cancels the new controller.
              context().stopGeneration();
            }
          }
          activeGeneration = true;
        }),
        listen('GENERATION_ENDED', () => {
          generationDepth = Math.max(0, generationDepth - 1);
          if (!generationDepth) { activeGeneration = false; overlappingGeneration = false; }
        }),
        listen('GENERATION_AFTER_COMMANDS', async (_type, _options, dryRun) => {
          if (dryRun === true) return;
          activeGeneration = true;
          let allowed = false; try { allowed = !overlappingGeneration && await check('commands'); } catch { /* Fail closed. */ }
          if (!allowed) { context().stopGeneration(); canceled(); }
        }),
        listen('CHAT_COMPLETION_SETTINGS_READY', async () => {
          let allowed = false; try { allowed = !overlappingGeneration && await check('request'); } catch { /* Fail closed. */ }
          if (!allowed) { context().stopGeneration(); canceled(); }
        })];
      return () => { off.forEach(fn => fn()); invalidateGeneration(); };
    },
    automaticPreset(name, target, valid, action) {
      const allowed = () => !disposed && valid() && currentChat().identity.key === target.key &&
        context().getPresetManager('openai').getSelectedPresetName() === name &&
        ![...native.keys()].some(pending => pending !== name);
      return automaticRegexDisplay(host, () => context() as RegexDisplayContext, name, allowed, action, quietLifetime.signal);
    },
    invalidateGeneration,
    dispose() { if (disposed) return; invalidateGeneration(); disposed = true; quietLifetime.abort(); waits.forEach(fn => fn());
      subscriptions.forEach(([event, fn]) => source.removeListener(event, fn)); subscriptions.length = 0; callbacks.clear(); native.clear(); },
  };
}
