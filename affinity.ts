// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { ChatExchange, ChatMessage } from './unicode-chat';

type Profile = 'trust' | 'eva';
type Data = Record<string, unknown>;
type Character = { name: string; affection: number; secondary: number; relationship: string };
type Scope = { name?: string; profile: Profile; directed: boolean; legacy: boolean };
type Range = { start: number; end: number };

const block = /<affinity\s*>([\s\S]*?)<\/affinity\s*>/gi;
const template = /<affinity_format>([\s\S]*?)<\/affinity_format>/gi;
const row = /^(?:[-*]\s+)?(.+?)\s*💞好感(?:度)?\s*[:：]\s*([+\-−]?\d+)\s*[｜|]\s*(🤝信任(?:度)?|🔶AT力场)\s*[:：]\s*([+\-−]?\d+)(%?)\s*[｜|]\s*🔗关系\s*[:：]\s*(.+)$/u;
const deltaRow = /^(.+?)\s*[｜|]\s*好感(?:度)?\s*([+\-−]\d+)\s*[｜|]\s*(信任(?:度)?|AT(?:力场)?)\s*([+\-−]\d+)(%?)(?:\s*[｜|]\s*关系\s*[=＝]\s*(.+?))?$/iu;
const legacyDelta = /^(.+?)\s*[(（]\s*好感(?:度)?\s*([+\-−]\d+)\s*[/／]\s*(信任(?:度)?|AT(?:力场)?)\s*([+\-−]\d+)(%?)(?:\s*[/／]\s*关系\s*[=＝→]\s*(.+?))?\s*[)）]$/iu;
const placeholder = /^(?:无|无名氏?|匿名|龙套|路人[甲乙丙丁]?|npc|某人)$/iu;
const heading = /^【本回合变动】\s*$/u;
const safeLabel = (value: string, limit: number) => value === value.trim() && value.length > 0 &&
  value.length <= limit && !/[<>\[\]｜|\u0000-\u001f\u007f]/u.test(value);
const signedNumber = (value: string) => Number(value.replace('−', '-'));
const maskComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, comment => comment.replace(/[^\r\n]/g, ' '));

function modules(text: string) {
  // addvar can concatenate a closing bracket and the next opening bracket directly.
  return [...maskComments(text).matchAll(/\[([^\[\]\r\n/]+)\][\t ]*\r?\n([\s\S]*?)^[\t ]*\[\/\1\]/dgm)].map(match => {
    const [start, end] = match.indices![2]!;
    return { name: match[1], open: match.index, close: match.index + match[0].length, start, end, body: text.slice(start, end) };
  });
}

function dividers(body: string) {
  return [...maskComments(body).matchAll(/^[\t ]*\*{3}[\t ]*(?:\r?\n|$)/gm)];
}

function nameFor(text: string, directed: boolean): string | undefined {
  const names = text.trim().split(/\s*→\s*/u);
  if (names.length !== (directed ? 2 : 1) || names.some(name => !safeLabel(name, 80) || placeholder.test(name)) ||
      (directed && names[0] === names[1])) return;
  return names.join('→');
}

function splitRoster(body: string) {
  const lines = body.trim().split(/\r?\n/);
  const divider = lines.findIndex(line => line.trim() === '***');
  if (divider < 0 || !lines.slice(0, divider).some(line => heading.test(line.trim()))) return;
  return lines.slice(divider + 1).map(line => line.trim()).filter(Boolean);
}

function parseRoster(body: string, scope: Scope): Character[] | undefined {
  const entries = splitRoster(body);
  if (!entries?.length) return;
  if (entries.length === 1 && entries[0] === '无') return [];
  const names = new Set<string>();
  const roster: Character[] = [];
  for (const line of entries) {
    const fields = row.exec(line);
    if (!fields) return;
    const [, label, a, metric, s, percent, relationship] = fields;
    const name = nameFor(label, scope.directed);
    const affection = signedNumber(a), secondary = signedNumber(s);
    const isEva = metric === '🔶AT力场';
    if (!name || names.has(name) || !relationshipFor(relationship) || !Number.isSafeInteger(affection) ||
        !Number.isSafeInteger(secondary) || affection > 100 || secondary > 100 || isEva !== (scope.profile === 'eva') ||
        Boolean(percent) !== isEva || (isEva && secondary < 0)) return;
    names.add(name);
    roster.push({ name, affection, secondary, relationship });
  }
  return roster;
}

function bodyFor(scope: Scope, body: string, sections: ReturnType<typeof modules>) {
  if (!scope.name) return sections.length ? undefined : body;
  const matches = sections.filter(section => section.name === scope.name);
  return matches.length === 1 ? matches[0].body : undefined;
}

function readSnapshot(body: string, scopes: readonly Scope[]): Character[][] | undefined {
  const sections = modules(body);
  if (!sections.length) {
    // A compatible legacy roster can seed a single player module.
    const candidates = scopes.flatMap((scope, index) => {
      const roster = scope.directed ? undefined : parseRoster(body, scope);
      return roster === undefined ? [] : [{ index, roster }];
    });
    if (candidates.length !== 1) return;
    return scopes.map((_, index) => index === candidates[0].index ? candidates[0].roster : []);
  }

  const markers = new Set([...maskComments(body).matchAll(/(?:^[\t ]*|(?<=\]))\[\/?([^\[\]\r\n/]+)\](?=[\[\t \r\n]|$)/gm)]
    .map(match => match[1]));
  const snapshot: Character[][] = [];
  let recognized = false;
  for (const scope of scopes) {
    const matches = sections.filter(section => section.name === scope.name);
    if (matches.length === 0) {
      if (scope.name && markers.has(scope.name)) return;
      snapshot.push([]);
      continue;
    }
    if (matches.length !== 1) return;
    const roster = parseRoster(matches[0].body, scope);
    if (roster === undefined) return;
    snapshot.push(roster);
    recognized = true;
  }
  return recognized ? snapshot : undefined;
}

function previousSnapshot(chat: readonly ChatMessage[], scopes: readonly Scope[], historyEnd = chat.length): Character[][] {
  // ST projects the selected swipe and saved edits into mes on the active chat.
  // Every module comes from the same reply, including modules with empty rosters.
  for (let i = Math.min(historyEnd, chat.length) - 1; i >= 0; i--) {
    const message = chat[i];
    if (message.is_user || message.is_system || !message.mes?.includes('<')) continue;
    const [, tail] = splitStory(message.mes);
    const bodies = Array.from(tail.matchAll(block), match => match[1]);
    if (!bodies.length) continue;
    const snapshot = readSnapshot(bodies.join('\n'), scopes);
    if (snapshot) return snapshot;
  }
  return scopes.map(() => []);
}

function clamp(value: number, field: 'affection' | Profile): number {
  if (!Number.isSafeInteger(value)) throw Error('好感度数值超出整数范围。');
  return field === 'eva' ? Math.max(0, Math.min(100, value)) : Math.min(100, value);
}

function relationshipFor(text: string | undefined): string | undefined {
  const label = text?.trim();
  return label && !/[<>\u0000-\u001f\u007f]/u.test(label) && !/^(?:[?？]|无(?:变化)?|不变)$/u.test(label) ? label : undefined;
}

function applyChanges(body: string, baseline: readonly Character[], scope: Scope) {
  const [divider] = dividers(body);
  const separator = scope.legacy ? /\r?\n|(?<=[)）])\s*[、，,]\s*/u : /\r?\n/;
  const lines = body.slice(0, divider?.index ?? body.length).trim().split(separator).map(line => line.trim()).filter(Boolean);
  if (heading.test(lines[0] ?? '')) lines.shift();
  const roster = baseline.map(character => ({ ...character }));
  const changes: string[] = [];
  if (lines.length === 1 && lines[0] === '无') return { roster, changes };
  if (!lines.length) throw Error('好感度变动缺失。');
  const byName = new Map(roster.map(character => [character.name, character]));
  const touched = new Set<string>();
  const signed = (value: number) => value < 0 ? String(value) : '+' + value;
  const label = scope.profile === 'eva' ? 'AT' : '信任';
  const percent = scope.profile === 'eva' ? '%' : '';
  for (const line of lines) {
    const plain = line.replace(/^[-*]\s+/u, '');
    const fields = deltaRow.exec(plain) ?? legacyDelta.exec(plain);
    if (!fields) throw Error('好感度变动格式无效。');
    const [, labelText, a, metric, s, suffix, relationText] = fields;
    const name = nameFor(labelText, scope.directed);
    const relation = relationshipFor(relationText);
    if (!name || touched.has(name) || /^AT/i.test(metric) !== (scope.profile === 'eva') || suffix !== percent) {
      throw Error('好感度变动值无效或角色重复。');
    }
    touched.add(name);
    const existing = byName.get(name);
    const affection = clamp((existing?.affection ?? 0) + signedNumber(a), 'affection');
    const secondary = clamp((existing?.secondary ?? 0) + signedNumber(s), scope.profile);
    const relationship = relation ?? existing?.relationship ?? '路人';
    if (!existing) roster.push({ name, affection, secondary, relationship });
    const deltaAffection = signed(affection - (existing?.affection ?? 0));
    const deltaSecondary = signed(secondary - (existing?.secondary ?? 0)) + percent;
    const changedRelation = relationship !== existing?.relationship;
    changes.push(scope.legacy ? name + '(好感' + deltaAffection + '/' + label + deltaSecondary +
      (changedRelation ? '/关系→' + relationship : '') + ')' : name + '｜好感' + deltaAffection + '｜' + label + deltaSecondary +
      (changedRelation ? '｜关系=' + relationship : ''));
    if (existing) Object.assign(existing, { affection, secondary, relationship });
  }
  return { roster, changes };
}

function renderRoster(roster: readonly Character[], changes: readonly string[], scope: Scope) {
  const entries = roster.map(({ name, affection, secondary, relationship }) => name + ' 💞好感: ' + affection +
    (scope.profile === 'eva' ? '｜🔶AT力场: ' + secondary + '%' : '｜🤝信任: ' + secondary) + '｜🔗关系: ' + relationship);
  const body = ['【本回合变动】', changes.join('\n') || '无', '***', entries.join('\n') || '无'].join('\n');
  return scope.name ? '[' + scope.name + ']\n' + body + '\n[/' + scope.name + ']' : body;
}

function profileFor(text: string): Profile | undefined {
  if (!text.includes('💞好感') || !text.includes('🔗关系')) return;
  const trust = text.includes('🤝信任'), eva = text.includes('🔶AT力场');
  return trust === eva ? undefined : eva ? 'eva' : 'trust';
}

function trimLists(text: string): { text: string; scopes: Scope[] } | undefined {
  const ranges: Range[] = [], scopes: Scope[] = [];
  for (const match of text.matchAll(/<affinity\s*>([\s\S]*?)<\/affinity\s*>/dgi)) {
    const body = match[1], [offset] = match.indices![1]!;
    const sections = modules(body);
    const firstLine = maskComments(body).trimStart().split(/\r?\n/, 1)[0];
    const legacy = [{ name: undefined, start: 0, end: body.length, body }];
    const candidates = sections.length ? sections : heading.test(firstLine) ? legacy : [];
    for (const section of candidates) {
      const separators = dividers(section.body);
      if (separators.length !== 1) continue;
      const divider = separators[0];
      const rules = section.body.slice(0, divider.index);
      const profile = profileFor(section.body.slice(divider.index! + divider[0].length));
      if (!profile || !rules.includes('【本回合变动】')) continue;
      if (scopes.some(scope => scope.name === section.name)) return;
      ranges.push({ start: offset + section.start + divider.index!, end: offset + section.end });
      const directed = /^[^\r\n｜|]+→[^\r\n｜|]+[｜|]\s*好感/mu.test(maskComments(rules));
      scopes.push({ name: section.name, profile, directed, legacy: !section.name });
    }
  }
  if (!scopes.length) return;
  for (const { start, end } of ranges.reverse()) text = text.slice(0, start) + text.slice(end);
  return { text, scopes };
}

function splitStory(text: string) {
  const sceneEnd = [...text.matchAll(/<\/story_scene\s*>/gi)].at(-1);
  const split = sceneEnd ? sceneEnd.index! + sceneEnd[0].length : 0;
  return [text.slice(0, split), text.slice(split)] as const;
}

function insertSnapshot(tail: string, snapshot: string): string {
  const open = /<affinity\s*>/i.exec(tail);
  const following = /<\/?[A-Za-z][\w-]*(?:\s|>)/;
  if (open) {
    const start = open.index;
    const rest = tail.slice(start + open[0].length);
    const end = following.exec(rest);
    return tail.slice(0, start) + snapshot + (end ? '\n' + rest.slice(end.index).trimStart() : '');
  }
  const next = /<npc_log(?:\s|>)/i.exec(tail);
  if (next) return tail.slice(0, next.index) + snapshot + '\n' + tail.slice(next.index);
  return tail.trimEnd() + '\n\n' + snapshot;
}

function replaceReply(text: string, scopes: readonly Scope[], rosters: readonly Character[][], invalidated: boolean, warn: () => void) {
  const [story, tail] = splitStory(text);
  const matches = [...tail.matchAll(block)];
  const body = matches.length === 1 ? matches[0][1] : '';
  const sections = modules(body);
  let rejected = false;
  const snapshots = scopes.map((scope, index) => {
    const baseline = rosters[index];
    const scoped = bodyFor(scope, body, sections) ?? (scopes.length === 1 && sections.length === 0 ? body : undefined);
    if (scoped && !invalidated) {
      try {
        const next = applyChanges(scoped, baseline, scope);
        return renderRoster(next.roster, next.changes, scope);
      } catch { /* Preserve this module's previously validated snapshot. */ }
    }
    rejected = true;
    return renderRoster(baseline, [], scope);
  });
  if (rejected) warn();
  let rendered = body;
  if (!sections.length) rendered = snapshots.join('\n***\n');
  else {
    const replaced = new Set<number>();
    for (const { name, open, close, start, end } of sections.slice().reverse()) {
      const index = scopes.findIndex(scope => scope.name === name);
      if (index < 0) continue;
      if (replaced.has(index)) rendered = rendered.slice(0, open) + rendered.slice(close);
      else rendered = rendered.slice(0, start) + modules(snapshots[index])[0].body + rendered.slice(end);
      replaced.add(index);
    }
    const missing = snapshots.filter((_, index) => !replaced.has(index));
    if (missing.length) rendered = [rendered.trim(), ...missing].join('\n***\n');
  }
  const snapshot = '<affinity>\n' + rendered.trim() + '\n</affinity>';
  if (matches.length) {
    let index = 0;
    return story + tail.replace(block, () => index++ === 0 ? snapshot : '');
  }
  return story + insertSnapshot(tail, snapshot);
}

/** The preset owns the model instructions. Only remove the roster output rules
 * from the expanded prompt and keep the snapshots in native chat history. */
export function prepareAffinity(messages: Data[], chat: readonly ChatMessage[], historyEnd: number | undefined,
  warn: () => void, continuing = false): ChatExchange | undefined {
  const candidates = messages.flatMap((message, index) => message.role === 'system' && typeof message.content === 'string' ?
    [...message.content.matchAll(template)].map(match => ({ index, match })) : []);
  if (candidates.length !== 1) return;
  const { index, match } = candidates[0];
  const trimmed = trimLists(match[0]);
  if (!trimmed) return;
  const { scopes } = trimmed;
  const read = () => previousSnapshot(chat, scopes, historyEnd);
  const roster = read(), baseline = JSON.stringify(roster);
  const updated = messages.slice();
  const original = messages[index].content as string;
  updated[index] = { ...messages[index], content: original.slice(0, match.index) +
    trimmed.text + original.slice(match.index! + match[0].length) };
  return {
    messages: updated,
    finish(text, intermediate = false) {
      if (continuing || intermediate) {
        const [story, tail] = splitStory(text);
        return story + tail.replace(block, '');
      }
      const current = read();
      const invalidated = JSON.stringify(current) !== baseline;
      return replaceReply(text, scopes, invalidated ? current : roster, invalidated, warn);
    },
  };
}
