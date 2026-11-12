// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
export type UnicodeReply = 'plain' | 'encoded';
type Data = Record<string, unknown>;
export type ChatMessage = { mes?: string; is_user?: boolean; is_system?: boolean };
export type ChatExchange = { messages: Data[]; finish(text: string, intermediate?: boolean): string };
type TextSlot = { owner: Data; key: string };
type TextGroups = Map<number, TextSlot[]>;
type ReplyTransform = (text: string, intermediate: boolean) => string;

const requestPath = '/api/backends/chat-completions/generate';
const requestKey = '_miemieUnicodeRequest';
const invalidReply = '模型没有返回完整的 Unicode 编码回复。请重试，或在「预设工具」中切换为原文回复。';
const invalidToolReply = '模型没有返回完整的工具调用回复。请重试，或关闭「工具调用回复」。';
const replyToolName = 'deliver_reply';
const toolReplySources = new Set(['openai', 'custom', 'openrouter', 'makersuite', 'vertexai']);
const canceled = () => new DOMException('当前对话已切换或生成已取消。', 'AbortError');
const isObject = (value: unknown): value is Data => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const objects = (value: unknown): Data[] => Array.isArray(value) ? value.filter(isObject) : [];

export function encodeUnicode(text: string): string {
  return JSON.stringify(text).replace(/[\u007f-\uffff]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
}

export function decodeUnicode(value: string): string {
  if (/[^\u0000-\u007f]/.test(value)) throw Error(invalidReply);
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw Error(invalidReply); }
  if (typeof parsed !== 'string' || !parsed.trim() ||
      /[\uD800-\uDFFF]/u.test(parsed)) throw Error(invalidReply);
  return parsed;
}

function encodeContent(content: unknown): unknown {
  if (typeof content === 'string' && content) return encodeUnicode(content);
  if (!Array.isArray(content)) return content;
  return content.map(part => isObject(part) && part.type === 'text' && typeof part.text === 'string' && part.text ?
    { ...part, text: encodeUnicode(part.text) } : part);
}

function encodeMessages(messages: Data[], reply: UnicodeReply, toolReply: boolean): Data[] {
  const destination = `将结果填入 ${replyToolName} 的 text 参数。`;
  const instructions = [
    '传输格式说明：除本条说明外，这次请求的所有消息正文、以及多模态消息的 text 部分，均为一层 JSON 字符串。若相邻正文被合并，请按出现顺序逐段解码。\\uXXXX、代理对、\\n、\\r、\\t、引号和反斜杠按 JSON 规则还原。按还原后的角色、顺序、标签、缩进和换行理解上下文。',
    reply === 'encoded' ?
      '先按还原后的指令生成完整原文，然后将整个本次回复（包括所有标签、空白行和结束标签）写成一个 ASCII JSON 字符串。所有非 ASCII 字符均用 \\uXXXX，补充字符用两个代理单元。' +
      (toolReply ? '字符串包含外层双引号。' + destination : '直接返回这一字符串，带外层双引号。') +
      '不要附加 Markdown 围栏、解码说明、前缀或额外文本。' :
      '回复使用还原后的指令所要求的原文格式，' + (toolReply ? destination : '直接输出正文。'),
    '工具调用及其参数按工具声明的原生格式发送。'
  ].join('\n');
  return [{ role: 'system', content: instructions }, ...messages.map(message =>
    Object.hasOwn(message, 'content') ? { ...message, content: encodeContent(message.content) } : message)];
}

function addText(groups: TextGroups, index: number, owner: unknown, key: string) {
  if (!isObject(owner) || typeof owner[key] !== 'string' || !owner[key]) return;
  if (!groups.has(index)) groups.set(index, []);
  groups.get(index)!.push({ owner, key });
}

function addContent(groups: TextGroups, index: number, owner: Data, key: string) {
  if (Array.isArray(owner[key])) {
    for (const part of objects(owner[key])) {
      if (part.type === 'text' || (part.type === undefined && typeof part.text === 'string')) addText(groups, index, part, 'text');
    }
  } else addText(groups, index, owner, key);
}

const hasReplyText = (groups: TextGroups) => [...groups.values()].some(slots =>
  slots.some(({ owner, key }) => String(owner[key]).trim()));

function transformGroups(groups: TextGroups, transform: ReplyTransform, intermediate: boolean) {
  for (const slots of groups.values()) {
    const decoded = transform(slots.map(({ owner, key }) => owner[key]).join(''), intermediate);
    for (const { owner, key } of slots) owner[key] = '';
    const last = slots.at(-1)!;
    last.owner[last.key] = decoded;
  }
}

function hasToolCall(data: Data): boolean {
  if (objects(data.choices).some(choice => [choice.message, choice.delta].some(part =>
    isObject(part) && (objects(part.tool_calls).length > 0 || isObject(part.function_call))))) return true;
  if (objects(data.content).some(part => part.type === 'tool_use') ||
      (isObject(data.content_block) && data.content_block.type === 'tool_use')) return true;
  const candidate = objects(data.candidates)[0];
  const content = candidate?.content ?? data.responseContent;
  return isObject(content) && objects(content.parts).some(part => isObject(part.functionCall));
}

function addReplyTool(request: Data, encoded: boolean): boolean {
  if (!toolReplySources.has(String(request.chat_completion_source)) ||
      (Array.isArray(request.tools) && request.tools.length > 0) ||
      (request.tool_choice != null && request.tool_choice !== 'auto') || Number(request.n ?? 1) > 1) return false;
  request.tools = [{ type: 'function', function: {
    name: replyToolName,
    description: '提交本回合的完整回复。使用一次，并遵循当前对话要求的内容和排版。',
    parameters: { type: 'object', properties: { text: { type: 'string', description: encoded ?
      '按本次传输说明生成的完整 ASCII JSON 字符串，包含其外层引号。' :
      '完整的回复原文，包含预设要求的正文、标签和分隔符。' } }, required: ['text'] },
  } }];
  request.tool_choice = { type: 'function', function: { name: replyToolName } };
  return true;
}

function readReplyText(args: unknown): string | undefined {
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch { return undefined; }
  }
  if (isObject(args) && typeof args.text === 'string' && args.text.trim()) return args.text;
  return undefined;
}

type ReplyCall = { name: string; args?: unknown; entries: Array<{ owner: Data; call: Data }> };
type ReplyChoice = { calls: Map<number, ReplyCall>; texts: TextGroups; finish?: Data };

function restoreOpenAIReply(payloads: Data[], complete: boolean) {
  const replies = new Map<number, ReplyChoice>();
  for (const payload of payloads) {
    for (const [position, choice] of objects(payload.choices).entries()) {
      const index = typeof choice.index === 'number' ? choice.index : position;
      let reply = replies.get(index);
      if (!reply) replies.set(index, reply = { calls: new Map(), texts: new Map() });
      if (typeof choice.finish_reason === 'string') reply.finish = choice;
      const owner = choice.delta ?? choice.message;
      if (isObject(owner)) addContent(reply.texts, 0, owner, 'content');
      else addText(reply.texts, 0, choice, 'text');
      if (!isObject(owner)) continue;
      for (const [position, call] of objects(owner.tool_calls).entries()) {
        const index = typeof call.index === 'number' ? call.index : position;
        let collected = reply.calls.get(index);
        if (!collected) reply.calls.set(index, collected = { name: '', entries: [] });
        collected.entries.push({ owner, call });
        const fn = call.function;
        if (!isObject(fn)) continue;
        if (typeof fn.name === 'string') collected.name = fn.name === replyToolName ? fn.name : collected.name + fn.name;
        if (typeof fn.arguments === 'string' && typeof collected.args === 'string' && owner === choice.delta) {
          collected.args += fn.arguments;
        } else if (fn.arguments !== undefined) collected.args = fn.arguments;
      }
    }
  }
  for (const reply of replies.values()) {
    const own = [...reply.calls.values()].filter(call => call.name === replyToolName);
    if (!own.length) continue;
    const foreign = own.length < reply.calls.size;
    const finish = reply.finish?.finish_reason;
    const terminated = finish == null ? complete : ['stop', 'tool_calls', 'function_call'].includes(String(finish));
    const text = own.length === 1 && !foreign && terminated ? readReplyText(own[0].args) : undefined;
    if (text === undefined && !foreign && !hasReplyText(reply.texts)) throw Error(invalidToolReply);
    for (const { owner, call } of own.flatMap(item => item.entries)) {
      const remaining = (owner.tool_calls as unknown[]).filter(item => item !== call);
      if (remaining.length) owner.tool_calls = remaining;
      else delete owner.tool_calls;
    }
    if (text !== undefined) {
      for (const slot of reply.texts.get(0) ?? []) slot.owner[slot.key] = '';
      const { owner } = own[0].entries.at(-1)!;
      if (Array.isArray(owner.content)) owner.content.push({ type: 'text', text });
      else owner.content = text;
    }
    if (!foreign && reply.finish && (finish === 'tool_calls' || finish === 'function_call')) reply.finish.finish_reason = 'stop';
  }
}

function restoreGeminiReply(payloads: Data[], complete: boolean) {
  const blocks: Data[] = [];
  let finish: unknown;
  for (const payload of payloads) {
    const candidate = objects(payload.candidates)[0];
    if (candidate?.finishReason) finish = candidate.finishReason;
    const content = candidate?.content ?? payload.responseContent;
    if (isObject(content) && Array.isArray(content.parts)) blocks.push(content);
  }
  const parts = blocks.flatMap(block => objects(block.parts));
  const calls = parts.filter(part => isObject(part.functionCall));
  const own = calls.filter(part => (part.functionCall as Data).name === replyToolName);
  if (!own.length) return;
  const foreign = own.length < calls.length;
  const text = own.length === 1 && !foreign && (finish === 'STOP' || (finish == null && complete)) ?
    readReplyText((own[0].functionCall as Data).args) : undefined;
  const plain = parts.filter(part => !part.thought && typeof part.text === 'string');
  if (text === undefined && !foreign && !plain.some(part => String(part.text).trim())) throw Error(invalidToolReply);
  for (const block of blocks) {
    const parts = objects(block.parts);
    const remaining = parts.filter(part => !own.includes(part));
    // The native stream reader shows only the first visible part of this frame.
    block.parts = text !== undefined && parts.includes(own[0]) ? [own[0], ...remaining] : remaining;
  }
  if (text === undefined) return;
  delete own[0].functionCall;
  own[0].text = text;
  for (const part of plain) if (part !== own[0]) part.text = '';
  for (const payload of payloads) {
    const message = objects(payload.choices)[0]?.message;
    if (isObject(payload.responseContent) && isObject(message)) message.content = text;
  }
}

function restoreToolReply(payloads: Data[], source: string, complete: boolean) {
  if (source === 'makersuite' || source === 'vertexai') restoreGeminiReply(payloads, complete);
  else restoreOpenAIReply(payloads, complete);
}

export function decodeChatReply(data: Data, transform: ReplyTransform = decodeUnicode, toolSource?: string): Data {
  if (data.error || data.quota_error || data.moderation_blocked) return data;
  if (toolSource) restoreToolReply([data], toolSource, true);
  const groups: TextGroups = new Map();
  const choices = objects(data.choices);
  if (Array.isArray(data.content)) addContent(groups, 0, data, 'content');
  else if (choices.length) {
    for (const [index, choice] of choices.entries()) {
      const message = choice.message;
      if (isObject(message) && message.content != null) addContent(groups, index, message, 'content');
      else addText(groups, index, choice, 'text');
    }
  } else if (typeof data.text === 'string') addText(groups, 0, data, 'text');
  else if (isObject(data.message)) {
    addContent(groups, 0, data.message, 'content');
    if (!groups.size) addText(groups, 0, data.message, 'tool_plan');
  }
  const intermediate = hasToolCall(data);
  if (toolSource && !hasReplyText(groups) && !intermediate) throw Error(invalidToolReply);
  transformGroups(groups, transform, intermediate);
  if (Array.isArray(data.content)) {
    data.content = data.content.filter(part => !isObject(part) || part.type !== 'text' || part.text !== '');
  }
  return data;
}

export function decodeChatStream(text: string, source?: string, transform: ReplyTransform = decodeUnicode, toolReply = false): string {
  const groups: TextGroups = new Map();
  const frames = text.replace(/\r\n?/g, '\n').split('\n\n').map(frame => {
    const lines = frame.split('\n');
    const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n');
    if (!data || data === '[DONE]') return { frame, done: data === '[DONE]' };
    const payload: unknown = JSON.parse(data);
    if (!isObject(payload)) throw Error(invalidReply);
    return { frame, payload, lines };
  });
  const payloads = frames.flatMap(frame => frame.payload ? [frame.payload] : []);
  if (payloads.some(payload => payload.error || payload.quota_error || payload.moderation_blocked)) return text;
  if (toolReply && source) restoreToolReply(payloads, source, frames.some(frame => frame.done));
  for (const payload of payloads) {
    for (const [position, choice] of objects(payload.choices).entries()) {
      const index = Number.isSafeInteger(choice.index) ? Number(choice.index) : position;
      const delta = choice.delta, message = choice.message;
      if (isObject(delta) && delta.content != null) addContent(groups, index, delta, 'content');
      else if (isObject(message) && message.content != null) addContent(groups, index, message, 'content');
      else addText(groups, index, choice, 'text');
    }
    const candidate = objects(payload.candidates)[0];
    if (isObject(candidate?.content)) {
      const part = objects(candidate.content.parts).find(value => !value.thought && typeof value.text === 'string' && value.text);
      addText(groups, 0, part, 'text');
    }
    if (isObject(payload.delta)) {
      addText(groups, 0, payload.delta, 'text');
      const message = payload.delta.message;
      if (isObject(message)) {
        if (isObject(message.content)) addText(groups, 0, message.content, 'text');
        else addText(groups, 0, message, 'tool_plan');
      }
    }
  }
  const intermediate = payloads.some(hasToolCall);
  if (toolReply && !hasReplyText(groups) && !intermediate) throw Error(invalidToolReply);
  transformGroups(groups, transform, intermediate);
  return frames.map(({ frame, payload, lines }) => {
    if (!payload || !lines) return frame;
    // Gemini's reader uses the first visible text part in each SSE event.
    // Retain thought signatures, inline data and tool call fields in place.
    if (source === 'makersuite' || source === 'vertexai') {
      const candidate = objects(payload.candidates)[0];
      if (isObject(candidate?.content) && Array.isArray(candidate.content.parts)) {
        const parts = candidate.content.parts;
        if (parts.some(part => isObject(part) && !part.thought && part.text === '')) {
          candidate.content.parts = parts.filter(part => !isObject(part) || part.thought || part.text !== '' || Boolean(part.thoughtSignature));
        }
      }
    }
    return [...lines.filter(line => !line.startsWith('data:')), 'data: ' + JSON.stringify(payload)].join('\n');
  }).join('\n\n');
}

interface UnicodeHost extends Window {
  toastr?: { error?(message: string, title: string): void };
}
interface RequestOptions {
  reply?: UnicodeReply;
  toolReply?: boolean;
  affinity?(messages: Data[]): ChatExchange | undefined;
  status?(messages: Data[]): ChatExchange | undefined;
  valid(): boolean;
}

/** The host reads the transport response before applying AI-output regex or
 * touching chat history. Claim only the request marked at the native event. */
export function createChatTransport(host: UnicodeHost) {
  const pending = new Map<string, RequestOptions & { timer: number }>();
  let restore: (() => void) | undefined;
  const instance = Math.random().toString(36).slice(2);
  let sequence = 0;

  function install(): boolean {
    if (restore) return true;
    const next = host.fetch;
    if (typeof next !== 'function') return false;
    const wrapped: typeof fetch = async (input, init) => {
      if (typeof input !== 'string' || init?.method !== 'POST' || typeof init.body !== 'string' ||
          !init.body.includes('"' + requestKey + '"') ||
          new URL(input, host.location.href).href !== new URL(requestPath, host.location.href).href) {
        return next.call(host, input, init);
      }
      const request = JSON.parse(init.body) as Data;
      const id = request[requestKey];
      const claim = typeof id === 'string' ? pending.get(id) : undefined;
      if (!claim) {
        if (typeof id === 'string' && id.startsWith(instance + '-')) throw canceled();
        return next.call(host, input, init);
      }
      pending.delete(id as string);
      host.clearTimeout(claim.timer);
      delete request[requestKey];
      if (!claim.valid() || init.signal?.aborted) throw canceled();
      const incompatible = Boolean(request.json_schema || request.assistant_prefill);
      if (claim.reply && incompatible) {
        const error = 'Unicode 上下文当前需要普通文本回复。请先关闭本次请求的 JSON Schema 或助手预填充。';
        host.toastr?.error?.(error, '咩咩预设管理');
        throw Error(error);
      }
      const messages = objects(request.messages);
      const affinity = incompatible ? undefined : claim.affinity?.(messages);
      const status = incompatible ? undefined : claim.status?.(affinity?.messages ?? messages);
      const outgoing = status?.messages ?? affinity?.messages ?? messages;
      const source = String(request.chat_completion_source ?? '');
      const toolReply = Boolean(claim.toolReply && !incompatible && addReplyTool(request, claim.reply === 'encoded'));
      if (claim.reply) request.messages = encodeMessages(outgoing, claim.reply, toolReply);
      else if (status || affinity) request.messages = outgoing;
      const response = await next.call(host, input, { ...init, body: JSON.stringify(request) });
      if (!claim.valid() || init.signal?.aborted) throw canceled();
      if ((!affinity && !status && claim.reply !== 'encoded' && !toolReply) || !response.ok) return response;
      const transform: ReplyTransform = (body, intermediate) => {
        const decoded = claim.reply === 'encoded' ? decodeUnicode(body) : body;
        const settled = affinity ? affinity.finish(decoded, intermediate) : decoded;
        return status ? status.finish(settled, intermediate) : settled;
      };
      const invalidText = claim.reply === 'encoded' ? invalidReply : toolReply ? invalidToolReply :
        (status ? '状态栏引擎' : '好感度引擎') + '无法读取完整的模型回复，请重试。';
      let output: string;
      try {
        if (request.stream) {
          output = decodeChatStream(await response.text(), source, transform, toolReply);
        } else {
          const data: unknown = await response.json();
          if (!isObject(data)) throw Error(invalidReply);
          output = JSON.stringify(decodeChatReply(data, transform, toolReply ? source : undefined));
        }
      } catch (cause) {
        if (init.signal?.aborted || !claim.valid()) throw canceled();
        const message = cause instanceof Error && cause.message === invalidToolReply ? invalidToolReply : invalidText;
        host.toastr?.error?.(message, '咩咩预设管理');
        throw Error(message);
      }
      if (!claim.valid() || init.signal?.aborted) throw canceled();
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      return new Response(output, { headers, status: response.status, statusText: response.statusText });
    };
    try { host.fetch = wrapped; } catch { return false; }
    if (host.fetch !== wrapped) return false;
    restore = () => { if (host.fetch === wrapped) host.fetch = next; };
    return true;
  }

  return {
    mark(request: Data, options: RequestOptions) {
      if (!install()) return false;
      const id = instance + '-' + ++sequence;
      // A later native listener may cancel before fetch, leaving no consumer.
      const timer = host.setTimeout(() => pending.delete(id), 60000);
      pending.set(id, { ...options, timer });
      request[requestKey] = id;
      return true;
    },
    dispose() {
      for (const { timer } of pending.values()) host.clearTimeout(timer);
      pending.clear();
      restore?.();
    },
  };
}
