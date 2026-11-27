// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import { pinyin } from 'pinyin-pro';
import { createChatTransport, type ChatMessage, type UnicodeReply } from './unicode-chat';
import { prepareAffinity } from './affinity';
import { DEFAULT_STATUS_PROMPT, prepareStatus } from './status';
import { prepareWorldReport, WORLD_REPORT_PROMPT } from './world-report';
import { DEFAULT_ISOLATION_TAGS, parseCustomTags } from './tag-isolation';
import { applyLowThinking, type ThinkingRequest } from './low-thinking';
import { createTagIsolationDisplay, type DisplayContext } from './tag-isolation-display';
import { isMieMiePreset } from './miemie-preset';

type Listener = (...args: unknown[]) => void;
type Content = string | Array<{ type: string; text?: string }>;
interface Message {
  identifier?: string;
  role?: string;
  content?: Content;
  tool_calls?: unknown;
}
interface Collection {
  identifier: string;
  getCollection(): Array<Message | Collection>;
}
interface ChatContext extends DisplayContext {
  chatId?: string;
  mainApi: string;
  chatCompletionSettings?: { preset_settings_openai?: unknown };
  getPresetManager?(api: string): {
    getSelectedPresetName(): string;
    getCompletionPresetByName?(name: string): unknown;
  };
  chat: Array<ChatMessage & { name?: string }>;
  eventTypes: Record<string, string>;
  eventSource: {
    on(event: string, fn: Listener): void;
    makeFirst?(event: string, fn: Listener): void;
    removeListener(event: string, fn: Listener): void;
    emit?(event: string, id: number): void | Promise<void>;
  };
  stopGeneration?(): void;
}
type ToolsHost = Window & {
  SillyTavern?: { getContext(): ChatContext };
  TavernHelper?: { getTavernVersion?(): string; builtin?: { promptManager?: { messages?: Collection } } };
  toastr?: { error?(message: string, title: string): void; warning?(message: string, title: string): void };
};
type InputMode = 'off' | 'pinyin' | 'unicode';
interface ToolSettings {
  input: InputMode;
  reply: UnicodeReply;
  toolReply?: boolean;
  lowThinking?: boolean;
  affinity?: boolean;
  status?: boolean;
  statusPrompt?: string;
  worldReport?: boolean;
  worldReportPrompt?: string;
  tagIsolation?: boolean;
  customTags?: string[];
}
export interface PresetTools {
  readonly available: boolean;
  readonly unicodeAvailable: boolean;
  readonly tagIsolationAvailable: boolean;
  enabled(): boolean;
  setEnabled(value: boolean): boolean;
  presetName(): string | undefined;
  settings(preset?: string): Readonly<ToolSettings>;
  setSettings(changes: Partial<ToolSettings>, expectedPreset?: string): boolean;
  renameSettings(oldName: string, newName: string): void;
  deleteSettings(name: string): void;
  dispose(): void;
}

const preference = 'miemie_preset_manager_message_tools_by_preset_v2';
const legacyPreference = 'miemie_preset_manager_message_tools_v1';
const defaults: Readonly<ToolSettings> = { input: 'off', reply: 'plain', tagIsolation: true };
const miemieDefaults: Readonly<ToolSettings> = {
  ...defaults, lowThinking: true, toolReply: true, affinity: true, status: true, worldReport: true,
};
const switches = ['toolReply', 'lowThinking', 'affinity', 'status', 'worldReport'] as const;
const legacyPinyin = 'miemie_preset_manager_pinyin_v1';
const promptKeys = ['statusPrompt', 'worldReportPrompt'] as const;
const defaultPrompts = { statusPrompt: DEFAULT_STATUS_PROMPT, worldReportPrompt: WORLD_REPORT_PROMPT };
const han = /\p{Script=Han}/u;
const alphaNumeric = /[\p{Letter}\p{Number}]/u;
const protectedOrHan = /\x60{3,}[\s\S]*?\x60{3,}|\x60+[^\x60\n]+\x60+|https?:\/\/[^\s<>"'\x60，。！？；、）\])]+|<\/?[A-Za-z][^<>\n]*>|\{\{[^{}\n]*\}\}|(\p{Script=Han}+)/gu;

export function romanizeUserText(text: string): string {
  return text.replace(protectedOrHan, (whole: string, chinese: string | undefined, offset: number) => {
    if (!chinese) return whole;
    const converted = pinyin(chinese, { toneType: 'none' });
    if (converted === chinese) return whole;
    const before = text[offset - 1] ?? '', after = text[offset + whole.length] ?? '';
    return (alphaNumeric.test(before) ? ' ' : '') + converted + (alphaNumeric.test(after) ? ' ' : '');
  });
}

function isCollection(item: Message | Collection): item is Collection {
  return 'getCollection' in item && typeof item.getCollection === 'function';
}

// ST's flattened API payload drops identifiers. Find the native Chat History
// item first, then verify the matching position and content on the wire.
function replaceLatestUser(prompt: Message[], root: Collection, message: ChatContext['chat'][number]) {
  const original = message.mes?.replace(/\r/g, '').trim();
  if (!original || !han.test(original)) return;
  const groups = root.getCollection();
  const history = groups.find(group => group.identifier === 'chatHistory' && isCollection(group));
  if (!history || !isCollection(history)) return;
  const target = history.getCollection().filter((item): item is Message => !isCollection(item) && item.role === 'user' &&
    typeof item.identifier === 'string' && /^chatHistory-\d+$/.test(item.identifier)).at(-1);
  if (!target) return;
  const matchText = (text: string) => {
    for (const start of ['', message.name ? `${message.name}: ` : '']) {
      if (text === start + original || text.startsWith(start + original + '\n\n')) return start.length;
    }
    return -1;
  };
  const getText = (content: Content | undefined) => typeof content === 'string' ? content :
    content?.find(part => part.type === 'text')?.text;
  const flattened = groups.flatMap(group => isCollection(group) ? group.getCollection() : [group])
    .filter(item => !isCollection(item) && (item.content || item.tool_calls));
  const index = flattened.indexOf(target), outgoing = prompt[index];
  if (flattened.length !== prompt.length || outgoing?.role !== 'user' || outgoing.content !== target.content) return;
  const text = getText(outgoing.content) ?? '';
  const offset = matchText(text);
  if (offset < 0) return;
  const converted = text.slice(0, offset) + romanizeUserText(original) + text.slice(offset + original.length);
  if (converted === text) return;
  const content = typeof outgoing.content === 'string' ? converted :
    outgoing.content!.map((part, index, parts) => index === parts.findIndex(entry => entry.type === 'text') ?
      { ...part, text: converted } : part);
  prompt[index] = { ...outgoing, content };
}

export function createPresetTools(host: ToolsHost): PresetTools {
  const context = () => host.SillyTavern?.getContext();
  const initial = context(), source = initial?.eventSource, types = initial?.eventTypes;
  const keys = ['GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED', 'GENERATION_ENDED', 'CHAT_CHANGED'];
  const available = Boolean(source && types && keys.every(key => typeof types[key] === 'string') &&
    host.TavernHelper?.builtin?.promptManager);
  const unicodeAvailable = Boolean(source && types && [...keys, 'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY']
    .every(key => typeof types[key] === 'string') && typeof host.fetch === 'function');
  const transport = createChatTransport(host);
  const refreshingFrames = new Set<number>();
  const tagDisplay = createTagIsolationDisplay(host.document, context, id => {
    if (!source?.emit || !types?.MESSAGE_UPDATED || refreshingFrames.has(id)) return;
    refreshingFrames.add(id);
    void Promise.resolve(source.emit(types.MESSAGE_UPDATED, id))
      .catch(() => {}).finally(() => refreshingFrames.delete(id));
  });
  const subscriptions: Array<[string, Listener]> = [];
  const presetName = (ctx = context()) => {
    const name = ctx?.getPresetManager?.('openai')?.getSelectedPresetName() || ctx?.chatCompletionSettings?.preset_settings_openai;
    return typeof name === 'string' && name ? name : undefined;
  };
  let entries = new Map<string, ToolSettings>();
  let lastStored: string | null | undefined;
  function normalize(value: unknown): ToolSettings {
    const entry = value as Partial<ToolSettings> | null;
    const settings = { ...defaults };
    if (entry?.input === 'pinyin' || entry?.input === 'unicode') settings.input = entry.input;
    if (entry?.reply === 'encoded') settings.reply = entry.reply;
    for (const key of switches) if (entry?.[key] === true) settings[key] = true;
    for (const key of promptKeys) {
      const prompt = entry?.[key];
      if (typeof prompt === 'string' && prompt.trim() && prompt.trim() !== defaultPrompts[key]) settings[key] = prompt.trim();
    }
    if (entry?.tagIsolation === false) settings.tagIsolation = false;
    if (Array.isArray(entry?.customTags)) {
      settings.customTags = parseCustomTags(entry.customTags.filter(name => typeof name === 'string').join('\n')).names;
    }
    return settings;
  }
  function saveEntries() {
    try {
      const stored = JSON.stringify(Object.fromEntries(entries));
      host.localStorage.setItem(preference, stored);
      lastStored = stored;
      return true;
    } catch { return false; }
  }
  function readEntries() {
    try {
      const stored = host.localStorage.getItem(preference) ?? null;
      if (stored && stored !== lastStored) {
        const parsed: unknown = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
          entries = new Map(Object.entries(parsed).map(([name, value]) => [name, normalize(value)]));
        lastStored = stored;
      } else if (!stored && lastStored === undefined) {
        const preset = presetName();
        if (!preset) return entries;
        lastStored = null;
        // Keep pre-existing preferences with the selected preset on upgrade.
        // Every other preset starts with its own defaults.
        const previous = host.localStorage.getItem(legacyPreference);
        const pinyin = !previous && host.localStorage.getItem(legacyPinyin) === 'true';
        if (previous || pinyin) {
          entries.set(preset, normalize(previous ? JSON.parse(previous) : { input: 'pinyin' }));
          saveEntries();
        }
      }
    } catch { /* Keep the current session usable if local storage is unavailable. */ }
    return entries;
  }
  function defaultsFor(name: string): Readonly<ToolSettings> {
    const preset = context()?.getPresetManager?.('openai')?.getCompletionPresetByName?.(name);
    return isMieMiePreset(preset) ? miemieDefaults : defaults;
  }
  function settingsFor(name = presetName()): Readonly<ToolSettings> {
    return name ? readEntries().get(name) ?? defaultsFor(name) : defaults;
  }
  function renameSettings(oldName: string, newName: string) {
    const stored = readEntries();
    const settings = stored.get(oldName);
    if (!settings || oldName === newName) return;
    stored.delete(oldName);
    stored.set(newName, settings);
    saveEntries();
    syncTagDisplay();
  }
  function deleteSettings(name: string) {
    if (readEntries().delete(name)) saveEntries();
    syncTagDisplay();
  }
  type Attempt = { preset: string; lowThinking: boolean; chatId: string; chat: ChatContext['chat']; type: unknown; input: InputMode; reply: UnicodeReply;
    toolReply: boolean; affinity: boolean; statusPrompt?: string; worldReportPrompt?: string; protectedTags?: readonly string[];
    historyEnd?: number; projections: WeakSet<unknown[]>; prompt?: unknown[] };
  let attempt: Attempt | undefined;
  let lastUnsupportedThinking = '';
  const clear = () => { attempt = undefined; };
  const sameChat = (item: Attempt, ctx = context()) =>
    ctx?.mainApi === 'openai' && ctx.chatId === item.chatId && ctx.chat === item.chat && presetName(ctx) === item.preset;
  const usesTransport = (item: Attempt) => item.input === 'unicode' || item.toolReply || item.affinity ||
    Boolean(item.statusPrompt || item.worldReportPrompt);
  function listen(key: string, fn: Listener, first = false) {
    const event = types![key];
    if (first && source!.makeFirst) source!.makeFirst(event, fn);
    else source!.on(event, fn);
    subscriptions.push([event, fn]);
  }
  function protectedTags(settings: Readonly<ToolSettings>, preset: string | undefined) {
    if (settings.tagIsolation === false || !tagDisplay.available) return;
    const custom = settings.customTags ?? [];
    return preset && defaultsFor(preset) === miemieDefaults ? [...DEFAULT_ISOLATION_TAGS, ...custom] : custom;
  }
  let displayTagKey: string | undefined;
  function syncTagDisplay() {
    const preset = presetName();
    const tags = protectedTags(settingsFor(preset), preset);
    const key = tags?.join('\0');
    if (key === displayTagKey) return;
    displayTagKey = key;
    tagDisplay.set(tags);
  }
  syncTagDisplay();
  for (const key of ['PRESET_CHANGED', 'OAI_PRESET_CHANGED_AFTER', 'CHAT_CHANGED'])
    if (source && types?.[key]) listen(key, syncTagDisplay);
  if (source && types?.PRESET_RENAMED) listen('PRESET_RENAMED', payload => {
    const change = payload as { apiId?: string; oldName?: string; newName?: string } | undefined;
    if (change?.apiId === 'openai' && change.oldName && change.newName) renameSettings(change.oldName, change.newName);
  });
  if (source && types?.PRESET_DELETED) listen('PRESET_DELETED', payload => {
    const change = payload as { apiId?: string; name?: string } | undefined;
    if (change?.apiId === 'openai' && change.name) deleteSettings(change.name);
  });
  const onStorage = (event: StorageEvent) => { if (event.key === preference) syncTagDisplay(); };
  host.addEventListener?.('storage', onStorage);
  if (tagDisplay.available && !tagDisplay.modern && source && types) {
    for (const key of ['CHARACTER_MESSAGE_RENDERED', 'MESSAGE_SWIPED', 'MESSAGE_UPDATED', 'CHAT_CHANGED', 'MORE_MESSAGES_LOADED']) {
      if (typeof types[key] !== 'string') continue;
      listen(key, id => {
        if (settingsFor().tagIsolation === false || refreshingFrames.has(Number(id))) return;
        tagDisplay.refresh(key === 'CHAT_CHANGED' || key === 'MORE_MESSAGES_LOADED' ? undefined : Number(id));
      }, true);
    }
  }
  if (available || unicodeAvailable) {
    listen('GENERATION_AFTER_COMMANDS', (type, _options, dryRun) => {
      if (dryRun === true) return;
      clear();
      const ctx = context();
      const preset = presetName(ctx);
      if (!preset) return;
      const settings = settingsFor(preset), { input, reply } = settings;
      if (ctx?.mainApi !== 'openai' || !ctx.chatId || !['normal', 'regenerate', 'swipe', 'continue'].includes(String(type))) return;
      const lowThinking = settings.lowThinking === true && unicodeAvailable;
      const toolReply = settings.toolReply === true && unicodeAvailable && type !== 'continue';
      const affinity = settings.affinity === true && unicodeAvailable;
      const statusPrompt = settings.status === true && unicodeAvailable ? settings.statusPrompt ?? DEFAULT_STATUS_PROMPT : undefined;
      const worldReportPrompt = settings.worldReport === true && unicodeAvailable ? settings.worldReportPrompt ?? WORLD_REPORT_PROMPT : undefined;
      if ((input === 'pinyin' && available) || (input === 'unicode' && unicodeAvailable) || lowThinking || toolReply || affinity || statusPrompt || worldReportPrompt) {
        const last = ctx.chat.at(-1);
        // At this native event, a re-roll target is still in the chat. ST may
        // clear, replace or remove that entry before sending the request.
        const replacingReply = (type === 'swipe' || type === 'regenerate') && last && !last.is_user && !last.is_system;
        const historyEnd = replacingReply ? ctx.chat.length - 1 : undefined;
        attempt = { preset, lowThinking, chatId: ctx.chatId, chat: ctx.chat, type, input, reply, toolReply, affinity, statusPrompt, worldReportPrompt,
          protectedTags: protectedTags(settings, preset), historyEnd, projections: new WeakSet() };
      }
    });
    listen('GENERATE_AFTER_DATA', (data, dryRun) => {
      if (dryRun !== false || !attempt || !sameChat(attempt)) return;
      const prompt = (data as { prompt?: unknown } | null)?.prompt;
      if (!Array.isArray(prompt)) return;
      const current = attempt;
      if (usesTransport(current) || current.lowThinking) {
        if (!current.projections.has(prompt)) return;
        current.prompt = prompt;
      } else clear();
      if (current.input !== 'pinyin') return;
      const root = host.TavernHelper?.builtin?.promptManager?.messages;
      if (typeof root?.getCollection !== 'function') return;
      const message = current.chat.filter(item => item.is_user === true && !item.is_system).at(-1);
      if (message) replaceLatestUser(prompt, root, message);
    });
    for (const key of keys.slice(2)) listen(key, clear);
  }
  if (unicodeAvailable) {
    listen('CHAT_COMPLETION_PROMPT_READY', event => {
      const data = event as { chat?: unknown; dryRun?: boolean } | null;
      if (attempt && (usesTransport(attempt) || attempt.lowThinking) && data?.dryRun === false &&
          Array.isArray(data.chat) && sameChat(attempt)) {
        attempt.projections.add(data.chat);
      }
    });
    listen('CHAT_COMPLETION_SETTINGS_READY', async event => {
      const request = event as (ThinkingRequest & { type?: unknown; messages?: unknown }) | null;
      const current = attempt;
      if (!request || !current?.prompt || !sameChat(current) || request.type !== current.type ||
          !Array.isArray(request.messages) || request.messages.length !== current.prompt.length ||
          !request.messages.every((message, index) => message === current.prompt![index])) return;
      current.prompt = undefined;
      if (current.lowThinking) {
        const result = await applyLowThinking(request, host, () => attempt === current && sameChat(current), host.TavernHelper?.getTavernVersion?.());
        if (result && !result.applied) {
          const key = JSON.stringify([request.chat_completion_source, request.model, result.reason]);
          if (key !== lastUnsupportedThinking) {
            lastUnsupportedThinking = key;
            host.toastr?.warning?.(result.reason, '低思考模式');
          }
        } else if (result?.applied) lastUnsupportedThinking = '';
      }
      if (!usesTransport(current) || attempt !== current || !sameChat(current)) return;
      const warn = () => host.toastr?.warning?.('本回合的好感度变动无法确认，已保留上次的完整名单。', '好感度引擎');
      const warnStatus = () => host.toastr?.warning?.('本回合的状态栏变动无法确认。', '状态栏引擎');
      const warnWorldReport = () => host.toastr?.warning?.('本回合的世界运行报告变动无法确认。', '世界运行报告引擎');
      const continuing = current.type === 'continue';
      if (!transport.mark(request as Record<string, unknown>, {
        reply: current.input === 'unicode' ? current.reply : undefined,
        toolReply: current.toolReply,
        affinity: current.affinity ? messages => prepareAffinity(messages, current.chat, current.historyEnd, warn, continuing) : undefined,
        status: current.statusPrompt ?
          messages => prepareStatus(messages, current.chat, current.historyEnd, warnStatus, continuing, current.statusPrompt, current.protectedTags) : undefined,
        worldReport: current.worldReportPrompt ?
          messages => prepareWorldReport(messages, current.chat, current.historyEnd, warnWorldReport, continuing, current.worldReportPrompt) : undefined,
        valid: () => attempt === current && sameChat(current),
      })) {
        context()?.stopGeneration?.();
        host.toastr?.error?.('无法接入当前酒馆的聊天补全请求。请刷新页面后重试。', '咩咩预设管理');
      }
    });
  }
  function setSettings(changes: Partial<ToolSettings>, expectedPreset = presetName()) {
    if (!expectedPreset || expectedPreset !== presetName()) return false;
    const input = changes.input;
    if ((input === 'pinyin' && !available) ||
        ((input === 'unicode' || switches.some(key => changes[key])) && !unicodeAvailable) ||
        (changes.tagIsolation && !tagDisplay.available)) return false;
    if (changes.customTags && parseCustomTags(changes.customTags.join('\n')).invalid.length) return false;
    const stored = readEntries();
    stored.set(expectedPreset, normalize({ ...(stored.get(expectedPreset) ?? defaultsFor(expectedPreset)), ...changes }));
    const saved = saveEntries();
    syncTagDisplay();
    if ('lowThinking' in changes) lastUnsupportedThinking = '';
    return saved;
  }
  return {
    available,
    unicodeAvailable,
    tagIsolationAvailable: tagDisplay.available,
    enabled: () => available && settingsFor().input === 'pinyin',
    setEnabled: value => setSettings({ input: value ? 'pinyin' : 'off' }),
    presetName,
    settings: name => settingsFor(name),
    renameSettings,
    deleteSettings,
    setSettings,
    dispose() {
      clear();
      transport.dispose();
      host.removeEventListener?.('storage', onStorage);
      for (const [event, fn] of subscriptions.splice(0)) source!.removeListener(event, fn);
      tagDisplay.dispose();
    },
  };
}
