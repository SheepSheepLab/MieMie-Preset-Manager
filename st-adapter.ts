// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { PresetAdapter, RawPreset, Snapshot } from './contracts';

type Data = Record<string, unknown>;
type Listener = (...args: unknown[]) => void;
interface NativeManager {
  getSelectedPresetName(): string;
  findPreset(name: string): unknown;
  getCompletionPresetByName(name: string): unknown;
  getPresetList(): { presets: unknown[]; preset_names: Record<string, number>; settings: Data };
  savePreset(name: string, raw: RawPreset, options: { skipUpdate: boolean }): Promise<void>;
  // 1.18 returns void; 1.19 additionally returns the native application promise.
  selectPreset(value: unknown): void | Promise<void>;
  updateList(name: string, raw: RawPreset): void;
  deletePreset(name?: string): Promise<boolean>;
}
interface NativeContext {
  getPresetManager(api: string): NativeManager;
  getRequestHeaders(): HeadersInit;
  chatCompletionSettings: Data;
  eventTypes: Record<string, string>;
  eventSource: { on(event: string, listener: Listener): void; removeListener(event: string, listener: Listener): void };
}
type Host = Window & {
  SillyTavern?: { getContext(): NativeContext };
  TavernHelper?: {
    getTavernVersion?(): string;
    builtin?: { promptManager?: { configuration?: { promptOrder?: { strategy?: string; dummyId?: number } } } };
  };
};

// Complete default-object fingerprints from chatCompletionDefaultPrompts in the
// pinned 1.18.0 / 1.19.0 PromptManager.js (identical in both). Only exact native
// missing-prompt supplements are projections; an identifier alone is not proof.
const builtinDefaults: Record<string, string> = {
  main: '7bd33ad7e48cb623', nsfw: '82cf4a6ff1eb7c1b', jailbreak: '198534d8bd8851c',
  enhanceDefinitions: '5527d66c98e566b8', dialogueExamples: '677399ad4499b11', chatHistory: 'ab0a72c9ff391fbd',
  worldInfoBefore: '174dd9f476fe2670', worldInfoAfter: '13a1d32e5f1fa322', charDescription: 'dd9dda05c5bd19d9',
  charPersonality: '95c60dc9f35de96d', scenario: '3c392cef2288dc63', personaDescription: '2ee9f4779ea40c33',
};
const aliases: Record<string, string> = {
  temperature: 'temp_openai', frequency_penalty: 'freq_pen_openai', presence_penalty: 'pres_pen_openai',
  top_p: 'top_p_openai', top_k: 'top_k_openai', top_a: 'top_a_openai', min_p: 'min_p_openai',
  repetition_penalty: 'repetition_penalty_openai',
};
// Pinned 1.18.0/1.19.0 openai.js settingsToUpdate; see docs/COMPATIBILITY.md.
// This is the union of supported fields. Unknown and newer fields always stay in raw.
const connectionKeys = new Set(`chat_completion_source group_models sort_models openai_model claude_model
openrouter_model openrouter_use_fallback openrouter_providers openrouter_quantizations openrouter_allow_fallbacks
openrouter_middleout ai21_model mistralai_model cohere_model perplexity_model groq_model chutes_model siliconflow_model
siliconflow_endpoint minimax_model minimax_endpoint electronhub_model nanogpt_model nanogpt_provider nanogpt_payg_override
deepseek_model aimlapi_model xai_model pollinations_model pollinations_endpoint moonshot_model fireworks_model cometapi_model
custom_model custom_url custom_include_body custom_exclude_body custom_include_headers custom_prompt_post_processing
google_model vertexai_model zai_model zai_endpoint workers_ai_model workers_ai_account_id reverse_proxy show_external_models
proxy_password vertexai_auth_mode vertexai_region vertexai_express_project_id bypass_status_check azure_base_url
azure_deployment_name azure_api_version azure_openai_model`.split(/\s+/));
const valueKeys = new Set(`temperature frequency_penalty presence_penalty top_p top_k top_a min_p repetition_penalty
max_context_unlocked tool_reasoning_mode openai_max_context openai_max_tokens names_behavior send_if_empty impersonation_prompt
new_chat_prompt new_group_chat_prompt new_example_chat_prompt continue_nudge_prompt bias_preset_selected wi_format scenario_format
personality_format group_nudge_prompt stream_openai assistant_prefill assistant_impersonation use_sysprompt squash_system_messages
media_inlining inline_image_quality continue_prefill continue_postfix function_calling tool_call_recurse_limit show_thoughts
reasoning_effort verbosity enable_web_search seed n request_images request_image_aspect_ratio request_image_resolution`.split(/\s+/));
// 1.19's native migrateChatCompletionSettings changes these values in the live
// projection only. The manager keeps the original raw model names on disk/export.
const modelMigrations119: Record<string, string> = {
  'gemini-3.1-flash-lite-preview': 'gemini-3.1-flash-lite',
  'gemini-3.1-flash-image-preview': 'gemini-3.1-flash-image',
  'gemini-3-pro-image-preview': 'gemini-3-pro-image',
};

function object(value: unknown): value is Data {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value) ?? 'undefined';
}
function equal(a: unknown, b: unknown): boolean { return stable(a) === stable(b); }
function hash(value: unknown): string {
  const text = stable(value);
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ text.charCodeAt(i), 0x85ebca6b);
  }
  return (a >>> 0).toString(16) + (b >>> 0).toString(16);
}
function rawPreset(value: unknown): RawPreset {
  if (!object(value) || !Array.isArray(value.prompts) || !Array.isArray(value.prompt_order)) {
    throw new Error('预设缺少原生 prompts 或 prompt_order，已停止操作，源数据未修改。');
  }
  const ids = new Set<string>();
  for (const prompt of value.prompts) {
    if (!object(prompt) || typeof prompt.identifier !== 'string' || !prompt.identifier || ids.has(prompt.identifier)) {
      throw new Error('预设包含无效或重复的条目标识，已停止操作，源数据未修改。');
    }
    ids.add(prompt.identifier);
  }
  const groups = new Set<string>();
  for (const group of value.prompt_order) {
    if (!object(group) || !['string', 'number'].includes(typeof group.character_id) || !Array.isArray(group.order)
      || groups.has(String(group.character_id))) throw new Error('预设顺序分组无效，已停止操作。');
    groups.add(String(group.character_id));
    const entries = new Set<string>();
    for (const entry of group.order) {
      if (!object(entry) || typeof entry.identifier !== 'string' || !ids.has(entry.identifier)
        || entries.has(entry.identifier) || typeof entry.enabled !== 'boolean') throw new Error('预设顺序包含缺失、重复或无效的条目引用，已停止操作。');
      entries.add(entry.identifier);
    }
  }
  if (!groups.has('100001')) throw new Error('预设缺少当前酒馆使用的 100001 顺序分组；源数据未修改。');
  // Native loading migrates these fields and can resave through a lossy whitelist.
  if (value.main_prompt || value.nsfw_prompt || value.jailbreak_prompt) {
    throw new Error('这是会触发原生旧格式迁移的预设；请先在副本上完成迁移，再交给管理器处理。');
  }
  return clone(value) as RawPreset;
}

/** Errors keep an in-memory recovery copy; nothing is logged or sent to the Hub. */
export class PresetOperationError extends Error {
  constructor(message: string, public readonly backup?: Snapshot, public readonly persistedName?: string) { super(message); }
}

/** Uses the host's existing modules only; importing core modules inside a script iframe would duplicate state. */
export async function createSTAdapter(windowHost: Window): Promise<PresetAdapter> {
  const host = windowHost as Host;
  const context = host.SillyTavern?.getContext();
  const version = host.TavernHelper?.getTavernVersion?.();
  const minor = typeof version === 'string' ? /^1\.(18|19)\.\d+$/.exec(version)?.[1] : undefined;
  if (!context || !version || !minor) {
    throw new Error('当前宿主未通过兼容检查。此版本适配 SillyTavern 1.18.x / 1.19.x，并需要酒馆助手提供原生版本接口。');
  }
  // 1.18 has no application target for this 1.19 connection field. Comparing it
  // against undefined would reject a lossless cross-version import as an unsaved edit.
  const liveKeys = [...valueKeys, ...connectionKeys].filter(key => minor === '19' || key !== 'pollinations_endpoint');
  const ctx: NativeContext = context;
  const manager = ctx.getPresetManager?.('openai');
  const orderConfig = host.TavernHelper?.builtin?.promptManager?.configuration?.promptOrder;
  const required = ['getSelectedPresetName', 'findPreset', 'getCompletionPresetByName', 'getPresetList',
    'savePreset', 'selectPreset', 'updateList', 'deletePreset'] as const;
  if (!manager || required.some(k => typeof manager[k] !== 'function') || typeof ctx.getRequestHeaders !== 'function'
    || typeof ctx.eventSource?.on !== 'function' || typeof ctx.eventSource?.removeListener !== 'function'
    || typeof ctx.eventTypes?.PRESET_CHANGED !== 'string' || !ctx.eventTypes.PRESET_CHANGED
    || typeof ctx.eventTypes?.OAI_PRESET_CHANGED_BEFORE !== 'string' || !ctx.eventTypes.OAI_PRESET_CHANGED_BEFORE
    || !object(ctx.chatCompletionSettings) || orderConfig?.strategy !== 'global' || orderConfig.dummyId !== 100001) {
    throw new Error('当前宿主缺少已核验的原生预设能力，已停止写入。请使用兼容的酒馆及酒馆助手版本。');
  }
  const activeGroupId = orderConfig.dummyId;
  const source = ctx.eventSource;
  let disposed = false;
  let epoch = 0, notificationEpoch = 0;
  // Private receipt metadata, never exported with native presets. Arbitrary/cloned
  // snapshots cannot suppress a read; only this adapter's own verified read can.
  const readReceipts = new WeakMap<Snapshot, { notifications: number; epoch: number; live: string; name: string; revision: string }>();
  let tail: Promise<unknown> = Promise.resolve();
  const callbacks = new Set<() => void>();
  const subscriptions: Array<[string, Listener]> = [];
  const pendingWaits = new Set<() => void>();
  const listen = (key: string, listener: Listener) => {
    const event = ctx.eventTypes[key];
    if (event) { source.on(event, listener); subscriptions.push([event, listener]); }
  };
  const notify = () => { notificationEpoch++; for (const callback of callbacks) callback(); };
  listen('OAI_PRESET_CHANGED_BEFORE', () => { epoch++; });
  for (const key of ['PRESET_CHANGED', 'PRESET_DELETED', 'PRESET_RENAMED', 'SETTINGS_UPDATED']) listen(key, notify);
  const alive = () => { if (disposed) throw new Error('预设管理器已停用，本次操作已停止。'); };
  const current = () => manager.getSelectedPresetName();
  const serialize = <T>(work: () => Promise<T>): Promise<T> => {
    const operation = tail.then(() => { alive(); return work(); });
    tail = operation.catch(() => undefined);
    return operation;
  };

  async function disk(confirmPendingWrite = false): Promise<Map<string, unknown>> {
    if (!confirmPendingWrite) alive();
    const url = new URL('api/settings/get', host.location.href);
    const response = await host.fetch(url.href, { method: 'POST', headers: ctx.getRequestHeaders(), body: '{}' });
    if (!response.ok) throw new Error('无法回读酒馆保存的数据，请检查连接后重试。');
    const data: unknown = await response.json();
    if (!object(data) || !Array.isArray(data.openai_setting_names) || !Array.isArray(data.openai_settings)
      || data.openai_setting_names.length !== data.openai_settings.length) throw new Error('酒馆回读格式不兼容，已停止操作。');
    const result = new Map<string, unknown>();
    data.openai_setting_names.forEach((name, index) => {
      if (typeof name !== 'string') throw new Error('酒馆返回了无效预设名称。');
      const item = (data.openai_settings as unknown[])[index];
      try { result.set(name, typeof item === 'string' ? JSON.parse(item) : item); }
      catch { result.set(name, null); }
    });
    return result;
  }

  function liveValues(): Data {
    const live = ctx.chatCompletionSettings;
    const result: Data = { prompts: live.prompts, prompt_order: live.prompt_order, extensions: live.extensions,
      bind_preset_to_connection: live.bind_preset_to_connection };
    for (const key of liveKeys) result[key] = live[aliases[key] ?? key];
    return result;
  }
  function checkLive(raw: RawPreset): void {
    const live = ctx.chatCompletionSettings;
    const conflict = () => { throw new Error('检测到原生界面未保存修改，请先处理这些修改后重新读取。管理器没有替你保存或丢弃修改。'); };
    for (const key of liveKeys) {
      if (connectionKeys.has(key) && !live.bind_preset_to_connection) continue;
      const value = raw[key];
      const appliedValue = minor === '19' && ['google_model', 'vertexai_model'].includes(key)
        && typeof value === 'string' && Object.hasOwn(modelMigrations119, value) ? modelMigrations119[value] : value;
      if (Object.hasOwn(raw, key) && value !== undefined && !equal(appliedValue, live[aliases[key] ?? key])) conflict();
    }
    if (!equal(raw.extensions ?? {}, live.extensions ?? {})) conflict();
    if (!Array.isArray(live.prompts) || !Array.isArray(live.prompt_order)) conflict();
    const prompts = live.prompts as Data[];
    if (prompts.some(p => !object(p) || typeof p.identifier !== 'string')
      || new Set(prompts.map(p => p.identifier)).size !== prompts.length) conflict();
    for (const prompt of raw.prompts) {
      const actual = prompts.find(p => p.identifier === prompt.identifier);
      // Service settings are plain objects, not Prompt constructor projections.
      // Even a default-looking new attribute may be an unsaved native/third-party
      // edit. Compare both directions; never rebase a revision over that delta.
      if (!actual || !equal(prompt, actual)) conflict();
    }
    if (prompts.some(p => !raw.prompts.some(r => r.identifier === p.identifier)
      && (!Object.hasOwn(builtinDefaults, String(p.identifier)) || hash(p) !== builtinDefaults[String(p.identifier)]))) conflict();
    const groups = live.prompt_order as Data[];
    if (groups.length !== raw.prompt_order.length || groups.some(g => !object(g))
      || new Set(groups.map(g => String(g.character_id))).size !== groups.length) conflict();
    for (const group of raw.prompt_order) {
      const actual = groups.find(g => String(g.character_id) === String(group.character_id));
      if (!actual || !equal({ ...group, character_id: String(group.character_id) },
        { ...actual, character_id: String(actual.character_id) })) conflict();
    }
  }
  async function read(): Promise<Snapshot> {
    alive();
    const started = epoch;
    const notifications = notificationEpoch;
    const name = current();
    if (!name) throw new Error('酒馆尚未选中 Chat Completion 预设。');
    const presets = await disk();
    alive();
    if (started !== epoch || name !== current()) throw new Error('读取期间酒馆切换了预设，请重新读取。');
    const raw = rawPreset(presets.get(name));
    if (!raw.prompt_order.some(group => String(group.character_id) === String(activeGroupId))) {
      throw new Error('当前预设缺少酒馆使用的 100001 顺序分组，管理器不会自动创建或改写它。');
    }
    checkLive(raw);
    const live = stable(liveValues());
    const result: Snapshot = { name, names: [...presets.keys()], raw, activeGroupId, version, revision: `${epoch}:${hash([name, raw, live])}` };
    // Capture notifications at read START: an event during HTTP/readback is not
    // assumed to be covered, even if its live projection happens to look unchanged.
    readReceipts.set(result, { notifications, epoch: started, live, name, revision: result.revision });
    return result;
  }
  async function expectedState(expected: Snapshot): Promise<void> {
    const actual = await read();
    if (actual.name !== expected.name || actual.revision !== expected.revision) {
      throw new PresetOperationError('预设已在其他地方改变，请重新读取后再操作。', expected);
    }
  }
  function unchanged(expected: Snapshot, started: number, liveBefore: string): boolean {
    return !disposed && epoch === started && current() === expected.name && stable(liveValues()) === liveBefore
      && expected.revision === `${started}:${hash([expected.name, expected.raw, liveBefore])}`;
  }
  async function verifySaved(name: string, raw: RawPreset, backup: Snapshot): Promise<void> {
    let saved: unknown;
    try { saved = (await disk(true)).get(name); }
    catch { throw new PresetOperationError(`酒馆已接受「${name}」的保存，但无法回读确认完整性；已停止应用，请重新读取。`, backup, name); }
    if (!equal(saved, raw)) throw new PresetOperationError(`无法确认「${name}」完整保存；已停止后续操作，请重新读取。`, backup, name);
  }
  async function persist(name: string, raw: RawPreset, backup: Snapshot): Promise<void> {
    try { await manager.savePreset(name, clone(raw), { skipUpdate: true }); }
    catch {
      // A dropped response does not prove the server failed to commit the file.
      try { if (equal((await disk(true)).get(name), raw)) return; }
      catch { throw new PresetOperationError(`「${name}」保存请求中断，磁盘结果尚不确定；请重新读取，操作前副本仍保留。`, backup); }
      throw new PresetOperationError(`「${name}」保存失败，未将修改应用到当前界面；请重新读取。`, backup);
    }
    await verifySaved(name, raw, backup);
  }

  async function apply(name: string, action: () => unknown): Promise<void> {
    alive();
    const started = epoch;
    const event = ctx.eventTypes.PRESET_CHANGED;
    let listener!: Listener;
    const applied = new Promise<void>(resolve => {
      listener = payload => {
        if (object(payload) && payload.apiId === 'openai' && payload.name === name) resolve();
      };
    });
    let cancel!: () => void;
    let timer!: number;
    const interrupted = new Promise<never>((_, reject) => {
      timer = host.setTimeout(() => reject(new Error('等待酒馆应用预设超时，请重新读取实际状态。')), 20000);
      cancel = () => reject(new Error('预设管理器已停用，酒馆操作的最终结果需重新读取确认。'));
    });
    // A synchronous native action can dispose and throw before the race attaches.
    void interrupted.catch(() => undefined);
    pendingWaits.add(cancel);
    source.on(event, listener);
    try {
      // Subscribe before triggering either release. PRESET_CHANGED is the shared
      // completion barrier; await a returned promise too, without trapping timeout/dispose.
      await Promise.race([Promise.all([Promise.resolve(action()), applied]), interrupted]);
    } finally {
      host.clearTimeout(timer);
      source.removeListener(event, listener);
      pendingWaits.delete(cancel);
    }
    alive();
    if (current() !== name || epoch !== started + 1) throw new Error('应用过程中发生了另一次预设切换，已停止后续操作，请重新读取。');
  }
  function cacheSaved(name: string, raw: RawPreset): boolean {
    const list = manager.getPresetList();
    const index = list.preset_names[name];
    if (!Number.isInteger(index)) return false;
    list.presets[index] = clone(raw);
    return true;
  }
  async function loadSaved(name: string, raw: RawPreset): Promise<void> {
    if (cacheSaved(name, raw)) await apply(name, () => manager.selectPreset(manager.findPreset(name)));
    else await apply(name, () => manager.updateList(name, clone(raw)));
  }
  function checkName(name: string, names: string[]): void {
    if (!name.trim() || name !== name.trim() || /[<>:"/\\|?*\u0000-\u001f]/.test(name) || /[. ]$/.test(name)
      || new TextEncoder().encode(name).length > 180 || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name)) {
      throw new Error('名称含有酒馆文件名不支持的字符、首尾空格，或长度超过安全范围。');
    }
    if (names.some(n => n.localeCompare(name, undefined, { sensitivity: 'base' }) === 0)) throw new Error('已存在同名预设，请换一个名称。');
  }
  async function saveNew(expected: Snapshot, name: string, value: RawPreset): Promise<Snapshot> {
    await expectedState(expected);
    const started = epoch;
    const liveBefore = stable(liveValues());
    checkName(name, [...(await disk()).keys()]);
    const raw = rawPreset(value);
    if (!unchanged(expected, started, liveBefore)) throw new PresetOperationError('保存前当前预设已改变，请重新读取。', expected);
    await persist(name, raw, expected);
    if (!unchanged(expected, started, liveBefore)) {
      throw new PresetOperationError(`「${name}」已保存，但原生状态已改变或管理器已停用；保留当前选择和未保存修改，未自动应用。请重新读取，必要时刷新酒馆以显示新预设。`, expected, name);
    }
    try { await loadSaved(name, raw); return await read(); }
    catch { throw new PresetOperationError(`「${name}」已保存，但未能确认应用完成；请重新读取实际状态。`, expected, name); }
  }

  async function deleteNative(name: string, backup: Snapshot): Promise<void> {
    alive();
    const started = epoch;
    const selectedBefore = current();
    const liveBefore = stable(liveValues());
    const beforeDelete = await disk();
    if (!equal(beforeDelete.get(name), backup.raw)) {
      throw new PresetOperationError('待删除预设已被其他操作更新，已保留其新内容，请重新读取。', backup);
    }
    if (disposed || epoch !== started || current() !== selectedBefore || stable(liveValues()) !== liveBefore) {
      throw new PresetOperationError('删除前原生状态发生变化或管理器已停用，删除没有执行。', backup);
    }
    let ok = false;
    try { ok = await manager.deletePreset(name); } catch { /* Re-read before deciding whether rollback is required. */ }
    let remaining: Map<string, unknown>;
    try { remaining = await disk(true); }
    catch { throw new PresetOperationError('删除请求结果无法确认，请重新读取。操作前副本仍保留在内存中。', backup); }
    if (!remaining.has(name)) return;
    // Native delete mutates the list before the request. Restore only while the user has not switched away.
    if (!disposed && epoch === started && current() === selectedBefore && stable(liveValues()) === liveBefore) {
      try { await loadSaved(name, rawPreset(remaining.get(name))); }
      catch { throw new PresetOperationError('删除未完成，原预设仍在磁盘；列表恢复未完成，请重新读取或刷新酒馆。', backup); }
    }
    throw new PresetOperationError(ok ? '酒馆仍返回原预设，删除未通过回读确认。' : '删除失败，原预设仍保留；请重新读取。', backup);
  }

  return {
    read,
    coversNotifications(snapshot) {
      const receipt = readReceipts.get(snapshot);
      if (!receipt || disposed || receipt.notifications !== notificationEpoch || receipt.epoch !== epoch
        || receipt.name !== current() || receipt.name !== snapshot.name || receipt.revision !== snapshot.revision) return false;
      try { return receipt.live === stable(liveValues()); } catch { return false; }
    },
    select: (name, expected) => serialize(async () => {
      await expectedState(expected);
      const started = epoch;
      const liveBefore = stable(liveValues());
      const presets = await disk();
      const raw = rawPreset(presets.get(name));
      if (!unchanged(expected, started, liveBefore)) throw new PresetOperationError('选择期间当前预设已改变，请重新读取。', expected);
      if (name === expected.name) return read();
      await loadSaved(name, raw);
      return read();
    }),
    save: (expected, next) => serialize(async () => {
      await expectedState(expected);
      const raw = rawPreset(next);
      const started = epoch;
      const liveBefore = stable(liveValues());
      if (!unchanged(expected, started, liveBefore)) throw new PresetOperationError('保存前原生状态已改变，请重新读取。', expected);
      await persist(expected.name, raw, expected);
      // Updating the saved cache is safe even if another preset is now current; application is not.
      cacheSaved(expected.name, raw);
      if (!unchanged(expected, started, liveBefore)) throw new PresetOperationError(`修改已保存到「${expected.name}」，但原生状态已改变；保留当前选择和未保存修改，没有自动应用。请重新读取。`, expected, expected.name);
      try { await loadSaved(expected.name, raw); return await read(); }
      catch { throw new PresetOperationError(`修改已保存到「${expected.name}」，但应用状态未确认；请重新读取。`, expected, expected.name); }
    }),
    create: (expected, name, raw) => serialize(() => saveNew(expected, name, raw)),
    rename: (expected, name) => serialize(async () => {
      const created = await saveNew(expected, name, expected.raw);
      try { await deleteNative(expected.name, expected); }
      catch { throw new PresetOperationError(`「${name}」已保存，但旧预设「${expected.name}」未确认删除；可能保留两份。请重新读取。`, expected, name); }
      if (current() !== created.name) throw new PresetOperationError(`已重命名为「${name}」，期间当前预设发生切换，请重新读取。`, expected, name);
      return read();
    }),
    remove: expected => serialize(async () => {
      await expectedState(expected);
      const started = epoch;
      const liveBefore = stable(liveValues());
      const presets = await disk();
      const names = [...presets.keys()].filter(name => name !== expected.name);
      if (!names.length) throw new Error('至少需要保留一个预设，请先创建或导入另一个。');
      // Explicitly select a surviving preset before native deletion, avoiding native fallback selection races.
      const replacement = names[0];
      const raw = rawPreset(presets.get(replacement));
      if (!unchanged(expected, started, liveBefore)) throw new PresetOperationError('删除前当前预设已改变，请重新读取。', expected);
      await loadSaved(replacement, raw);
      await deleteNative(expected.name, expected);
      if (current() !== replacement) throw new PresetOperationError(`「${expected.name}」已删除，但当前预设发生切换，请重新读取。`, expected);
      return read();
    }),
    subscribe(callback) { callbacks.add(callback); return () => { callbacks.delete(callback); }; },
    dispose() {
      disposed = true;
      for (const cancel of [...pendingWaits]) cancel();
      for (const [event, listener] of subscriptions) source.removeListener(event, listener);
      callbacks.clear();
    },
  };
}
