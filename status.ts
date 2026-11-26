// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { ChatExchange, ChatMessage } from './unicode-chat';
import { scanPresetTags } from './tag-isolation';

type Data = Record<string, unknown>;
type Entry = { title: string; parent?: string; child: boolean; label: string; value: string };
type Snapshot = { body: string; entries: Entry[] };

const block = /<status\s*>([\s\S]*?)<\/status\s*>/gi;
const format = /<status_format\s*>([\s\S]*?)<\/status_format\s*>/dgi;
const blockWithOffsets = /<status\s*>([\s\S]*?)<\/status\s*>/dgi;
const statusOpen = /<status\s*>/i;
const laterBlock = /<(?:affinity|npc_log)(?=\s|>)/i;
const followingBlock = /<\/?[a-z][\w-]*(?=[\t >])/i;
export const DEFAULT_STATUS_PROMPT = '仅输出本回合有变化的条目即可。';
const statusPrefix = /^\s*(?:状态栏条目[\t ]*[:：][\t ]*(?:\r?\n|$)\s*)?/u;
const comment = /<!--[\s\S]*?-->/g;
const lineHeader = /^([\t ]*)(?:([│┃├└┣┗](?:[─━│┃\t ]*)))?(?:[-*+][\t ]+)?([^:：\r\n]+)([:：])(.*)$/u;
const key = ({ title, parent }: Entry) => JSON.stringify([parent, title]);

function parseEntries(body: string): Entry[] | undefined {
  const entries: Entry[] = [];
  let parent: string | undefined;
  for (const line of body.replace(statusPrefix, '').trimEnd().split(/\r?\n/)) {
    const match = lineHeader.exec(line);
    const title = match?.[3].trim().replace(/^\*\*|\*\*$/g, '')
      .replace(/^[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D\s]+/u, '')
      .normalize('NFKC').trim().replace(/\s+/g, ' ');
    if (!match || !title || title.length > 80 || /[<>]/u.test(title)) {
      if (entries.length) entries.at(-1)!.value += '\n' + line;
      else if (line.trim()) return;
      continue;
    }
    const [, , tree, rawTitle, colon, rawValue] = match;
    const closesBold = rawTitle.trimStart().startsWith('**') && rawValue.startsWith('**');
    const value = closesBold ? rawValue.slice(2) : rawValue;
    const label = line.slice(0, line.length - rawValue.length - colon.length) + colon + (closesBold ? '**' : '');
    const child = Boolean(tree);
    entries.push({ title, parent: child ? parent : undefined, child, label, value });
    if (!child) parent = title;
  }
  return entries.length ? entries : undefined;
}

function schema(entries: readonly Entry[]) {
  const keys = new Set(entries.map(key));
  return keys.size === entries.length ? keys : undefined;
}

function hasSchema(snapshot: Snapshot | undefined, keys: ReadonlySet<string>): snapshot is Snapshot {
  return Boolean(snapshot && snapshot.entries.length === keys.size && snapshot.entries.every(entry => keys.has(key(entry))));
}

function afterStory(text: string) {
  const end = [...text.matchAll(/<\/story_scene\s*>/gi)].at(-1);
  return end ? end.index! + end[0].length : 0;
}

function previousStatus(chat: readonly ChatMessage[], historyEnd = chat.length, protectedTags?: readonly string[]): Snapshot | undefined {
  for (let i = Math.min(historyEnd, chat.length) - 1; i >= 0; i--) {
    const message = chat[i];
    if (message.is_user || message.is_system || !message.mes) continue;
    const scan = protectedTags && scanPresetTags(message.mes, protectedTags);
    const bodies = scan?.protectsStatus ?
      scan.blocks.filter(item => item.name === 'status')
        .map(item => message.mes!.slice(item.bodyStart, item.bodyEnd)) :
      [...message.mes.slice(afterStory(message.mes)).matchAll(block)].map(item => item[1]);
    if (bodies.length !== 1) continue;
    const body = bodies[0], entries = parseEntries(body);
    if (entries && schema(entries)) return { body, entries };
  }
  return undefined;
}

function mergeStatus(body: string, baseline: Snapshot, warn: () => void): string {
  if (/^(?:无(?:变化)?|暂无变化|没有变化)?[。！!]?$/u.test(body.trim())) return baseline.body;
  const updates = parseEntries(body);
  if (!updates) { warn(); return baseline.body; }
  const changes = new Map<Entry, string>();
  const ambiguous = new Set<Entry>();
  const parents = new Set(baseline.entries.map(entry => entry.parent));
  for (const update of updates) {
    if (!update.value.trim()) continue;
    const matching = baseline.entries.filter(entry => entry.title === update.title && (!update.child || entry.child) &&
      (!update.parent || !parents.has(update.parent) || entry.parent === update.parent));
    if (matching.length !== 1) continue;
    const entry = matching[0];
    if (changes.has(entry)) ambiguous.add(entry);
    else changes.set(entry, (entry.value.match(/^[\t ]*/)?.[0] ?? '') + update.value.trimStart());
  }
  if (ambiguous.size) warn();
  if (changes.size === ambiguous.size) return baseline.body;
  const first = baseline.body.match(statusPrefix)?.[0] ?? '';
  const last = baseline.body.match(/\s*$/u)?.[0] ?? '';
  const newline = baseline.body.includes('\r\n') ? '\r\n' : '\n';
  return first + baseline.entries.map(entry => (entry.label +
    (ambiguous.has(entry) ? entry.value : changes.get(entry) ?? entry.value)).replace(/\n/g, newline)).join(newline) + last;
}

function replaceStatus(tail: string, matches: RegExpMatchArray[], snapshot: string) {
  if (matches.length) {
    let index = 0;
    return tail.replace(block, () => index++ === 0 ? snapshot : '');
  }
  const open = statusOpen.exec(tail);
  const from = open ? open.index + open[0].length : 0;
  const next = (open ? followingBlock : laterBlock).exec(tail.slice(from));
  const insertion = next ? from + next.index : tail.length;
  const prefix = tail.slice(0, open?.index ?? insertion);
  return prefix + (prefix.endsWith('\n') ? '' : '\n') + snapshot + (next ? '\n' + tail.slice(insertion) : '');
}

/** The worldbook or preset owns the status schema. Each update replaces a named entry in the latest full snapshot. */
export function prepareStatus(messages: Data[], chat: readonly ChatMessage[], historyEnd: number | undefined,
  warn: () => void, continuing = false, prompt = DEFAULT_STATUS_PROMPT,
  protectedTags?: readonly string[]): ChatExchange | undefined {
  const templates = messages.flatMap((message, index) => message.role === 'system' && typeof message.content === 'string' ?
    [...message.content.matchAll(format)].map(match => ({ index, match })) : []);
  if (templates.length !== 1) return;
  const { index, match } = templates[0];
  const [sourceStart, sourceEnd] = match.indices![1]!;
  const formatBody = match[1];
  const blocks = [...formatBody.replace(comment, value => value.replace(/[^\r\n]/g, ' ')).matchAll(blockWithOffsets)];
  if (blocks.length !== 1) return;
  const [statusStart] = blocks[0].indices![0]!;
  const [bodyStart, bodyEnd] = blocks[0].indices![1]!;
  const fields = formatBody.slice(bodyStart, bodyEnd);
  const expected = parseEntries(fields.replace(comment, ''));
  const expectedKeys = expected && schema(expected);
  const baseline = previousStatus(chat, historyEnd, protectedTags);
  if (!expectedKeys || !hasSchema(baseline, expectedKeys)) return;

  const source = messages[index].content as string;
  const newline = match[0].includes('\r\n') ? '\r\n' : '\n';
  const updated = messages.slice();
  if (!continuing) {
    const reference = fields.replace(statusPrefix, '').trimEnd();
    const instructions = formatBody.slice(0, statusStart).trim();
    const parts = [reference, instructions].filter(Boolean).join(newline + newline);
    // Keep the full field reference, but only show the delta instruction in the reply example.
    const revised = newline + parts + newline + formatBody.slice(statusStart, bodyStart) +
      newline + prompt.replace(/\r?\n/g, newline) + newline + formatBody.slice(bodyEnd);
    updated[index] = { ...messages[index], content: source.slice(0, sourceStart) + revised + source.slice(sourceEnd) };
  }
  return {
    messages: updated,
    finish(text, intermediate = false) {
      const split = afterStory(text), tail = text.slice(split);
      const scan = protectedTags && scanPresetTags(text, protectedTags);
      if (scan?.protectsStatus) {
        const statuses = scan.blocks.filter(item => item.name === 'status');
        if (intermediate || continuing) {
          for (const item of statuses.slice().sort((a, b) => b.start - a.start)) text = text.slice(0, item.start) + text.slice(item.end);
          return text;
        }
        const current = previousStatus(chat, historyEnd, protectedTags);
        if (!hasSchema(current, expectedKeys)) return text;
        if (statuses.length > 1 || scan.incompleteStructure ||
            (!statuses.length && scan.isolated.some(item => item.name === 'status'))) {
          warn();
          return text;
        }
        if (current.body !== baseline.body) warn();
        const status = statuses[0];
        const body = status && current.body === baseline.body ?
          mergeStatus(text.slice(status.bodyStart, status.bodyEnd), current, warn) : current.body;
        return status ? text.slice(0, status.bodyStart) + body + text.slice(status.bodyEnd) :
          text.slice(0, split) + replaceStatus(tail, [], '<status>' + body + '</status>');
      }
      if (intermediate || continuing) return text.slice(0, split) + tail.replace(block, '');
      const current = previousStatus(chat, historyEnd);
      const matches = [...tail.matchAll(block)];
      const stable = current?.body === baseline.body;
      if (!stable || matches.length > 1 || (!matches.length && statusOpen.test(tail))) warn();
      if (!hasSchema(current, expectedKeys)) return text;
      const body = stable && matches.length === 1 ? mergeStatus(matches[0][1], current, warn) : current.body;
      return text.slice(0, split) + replaceStatus(tail, matches, '<status>' + body + '</status>');
    },
  };
}
