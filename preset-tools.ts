// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import { pinyin } from 'pinyin-pro';
import { createChatTransport, type ChatMessage, type UnicodeReply } from './unicode-chat';
import { prepareAffinity } from './affinity';
import { DEFAULT_STATUS_PROMPT, prepareStatus } from './status';

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
interface ChatContext {
  chatId?: string;
  mainApi: string;
  chat: Array<ChatMessage & { name?: string }>;
  eventTypes: Record<string, string>;
  eventSource: { on(event: string, fn: Listener): void; removeListener(event: string, fn: Listener): void };
  stopGeneration?(): void;
}
type ToolsHost = Window & {
  SillyTavern?: { getContext(): ChatContext };
  TavernHelper?: { builtin?: { promptManager?: { messages?: Collection } } };
  toastr?: { error?(message: string, title: string): void; warning?(message: string, title: string): void };
};
type InputMode = 'off' | 'pinyin' | 'unicode';
interface ToolSettings {
  input: InputMode;
  reply: UnicodeReply;
  toolReply?: boolean;
  affinity?: boolean;
  status?: boolean;
  statusPrompt?: string;
}
export interface PresetTools {
  readonly available: boolean;
  readonly unicodeAvailable: boolean;
  enabled(): boolean;
  setEnabled(value: boolean): boolean;
  settings(): Readonly<ToolSettings>;
  setSettings(changes: Partial<ToolSettings>): boolean;
  dispose(): void;
}

const preference = 'miemie_preset_manager_message_tools_v1';
const legacyPinyin = 'miemie_preset_manager_pinyin_v1';
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
  const subscriptions: Array<[string, Listener]> = [];
  let settings: ToolSettings = { input: 'off', reply: 'plain' };
  try {
    const saved = host.localStorage.getItem(preference);
    if (saved) {
      const stored = JSON.parse(saved) as Partial<ToolSettings> | null;
      if (stored?.input === 'pinyin' || stored?.input === 'unicode') settings.input = stored.input;
      if (stored?.reply === 'encoded') settings.reply = stored.reply;
      if (stored?.toolReply === true) settings.toolReply = true;
      if (stored?.affinity === true) settings.affinity = true;
      if (stored?.status === true) settings.status = true;
      if (typeof stored?.statusPrompt === 'string' && stored.statusPrompt.trim()) settings.statusPrompt = stored.statusPrompt.trim();
    } else if (host.localStorage.getItem(legacyPinyin) === 'true') settings.input = 'pinyin';
  } catch { /* This session can still use the tools. */ }
  type Attempt = { chatId: string; chat: ChatContext['chat']; type: unknown; input: InputMode; reply: UnicodeReply;
    toolReply: boolean; affinity: boolean; statusPrompt?: string; historyEnd?: number; projections: WeakSet<unknown[]>; prompt?: unknown[] };
  let attempt: Attempt | undefined;
  const clear = () => { attempt = undefined; };
  const sameChat = (item: Attempt, ctx = context()) =>
    ctx?.mainApi === 'openai' && ctx.chatId === item.chatId && ctx.chat === item.chat;
  const usesTransport = (item: Attempt) => item.input === 'unicode' || item.toolReply || item.affinity || Boolean(item.statusPrompt);
  function listen(key: string, fn: Listener) {
    const event = types![key];
    source!.on(event, fn);
    subscriptions.push([event, fn]);
  }
  if (available || unicodeAvailable) {
    listen('GENERATION_AFTER_COMMANDS', (type, _options, dryRun) => {
      if (dryRun === true) return;
      clear();
      const ctx = context();
      const { input, reply } = settings;
      if (ctx?.mainApi !== 'openai' || !ctx.chatId || !['normal', 'regenerate', 'swipe', 'continue'].includes(String(type))) return;
      const toolReply = settings.toolReply === true && unicodeAvailable && type !== 'continue';
      const affinity = settings.affinity === true && unicodeAvailable;
      const statusPrompt = settings.status === true && unicodeAvailable ? settings.statusPrompt ?? DEFAULT_STATUS_PROMPT : undefined;
      if ((input === 'pinyin' && available) || (input === 'unicode' && unicodeAvailable) || toolReply || affinity || statusPrompt) {
        const last = ctx.chat.at(-1);
        // At this native event, a re-roll target is still in the chat. ST may
        // clear, replace or remove that entry before sending the request.
        const replacingReply = (type === 'swipe' || type === 'regenerate') && last && !last.is_user && !last.is_system;
        const historyEnd = replacingReply ? ctx.chat.length - 1 : undefined;
        attempt = { chatId: ctx.chatId, chat: ctx.chat, type, input, reply, toolReply, affinity, statusPrompt, historyEnd, projections: new WeakSet() };
      }
    });
    listen('GENERATE_AFTER_DATA', (data, dryRun) => {
      if (dryRun !== false || !attempt || !sameChat(attempt)) return;
      const prompt = (data as { prompt?: unknown } | null)?.prompt;
      if (!Array.isArray(prompt)) return;
      const current = attempt;
      if (usesTransport(current)) {
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
      if (attempt && usesTransport(attempt) && data?.dryRun === false &&
          Array.isArray(data.chat) && sameChat(attempt)) {
        attempt.projections.add(data.chat);
      }
    });
    listen('CHAT_COMPLETION_SETTINGS_READY', event => {
      const request = event as { type?: unknown; messages?: unknown } | null;
      const current = attempt;
      if (!request || !current?.prompt || !sameChat(current) || request.type !== current.type ||
          !Array.isArray(request.messages) || request.messages.length !== current.prompt.length ||
          !request.messages.every((message, index) => message === current.prompt![index])) return;
      current.prompt = undefined;
      const warn = () => host.toastr?.warning?.('本回合的好感度变动无法确认，已保留上次的完整名单。', '好感度引擎');
      const warnStatus = () => host.toastr?.warning?.('本回合的状态栏变动无法确认。', '状态栏引擎');
      const continuing = current.type === 'continue';
      if (!transport.mark(request, {
        reply: current.input === 'unicode' ? current.reply : undefined,
        toolReply: current.toolReply,
        affinity: current.affinity ? messages => prepareAffinity(messages, current.chat, current.historyEnd, warn, continuing) : undefined,
        status: current.statusPrompt ?
          messages => prepareStatus(messages, current.chat, current.historyEnd, warnStatus, continuing, current.statusPrompt) : undefined,
        valid: () => attempt === current && sameChat(current),
      })) {
        context()?.stopGeneration?.();
        host.toastr?.error?.('无法接入当前酒馆的聊天补全请求。请刷新页面后重试。', '咩咩预设管理');
      }
    });
  }
  function setSettings(changes: Partial<ToolSettings>) {
    const input = changes.input;
    if ((input === 'pinyin' && !available) ||
        ((input === 'unicode' || changes.toolReply || changes.affinity || changes.status) && !unicodeAvailable)) return false;
    settings = { ...settings, ...changes };
    if (changes.statusPrompt !== undefined) {
      const prompt = changes.statusPrompt.trim();
      if (!prompt || prompt === DEFAULT_STATUS_PROMPT) delete settings.statusPrompt;
      else settings.statusPrompt = prompt;
    }
    try { host.localStorage.setItem(preference, JSON.stringify(settings)); return true; }
    catch { return false; }
  }
  return {
    available,
    unicodeAvailable,
    enabled: () => available && settings.input === 'pinyin',
    setEnabled: value => setSettings({ input: value ? 'pinyin' : 'off' }),
    settings: () => settings,
    setSettings,
    dispose() {
      clear();
      transport.dispose();
      for (const [event, fn] of subscriptions.splice(0)) source!.removeListener(event, fn);
    },
  };
}
