// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

const presetPlanning = new Set(['story_driver', 'combat_driver', 'acg_think', 'lore_search', 'parallel_line_drive']);
const planning = new Set([...presetPlanning, 'think', 'thinking']);
export const DEFAULT_ISOLATION_TAGS = Object.freeze([
  'lore_search', 'acg_think', 'combat_driver', 'story_driver',
  'special_status', 'memory_log', 'wlog', 'status', 'affinity', 'npc_log', 'selection', 'secure_log',
  'locator', 'parallel_line_drive', 'parallel_line',
]);
const builtIn = new Set(DEFAULT_ISOLATION_TAGS.map(name => name.toLowerCase()));
const footerFormat = new Set(['memory_log', 'wlog', 'npc_log', 'parallel_line', 'secure_log', 'special_status']);

const nameSource = '[\\p{L}_][\\p{L}\\p{N}_.:-]*';
const customName = new RegExp('^(?:<\\/?(' + nameSource + ')>|(' + nameSource + '))$', 'u');
const tagSource = '<(/?)(' + nameSource + ')(?=[\\s/>])(?:[^<>"\']|"[^"]*"|\'[^\']*\')*>';
const opaqueSource = '<!--[\\s\\S]*?(?:-->|(?![\\s\\S]))|^[ \\t]{0,3}(`{3,}|~{3,})[^\\r\\n]*[\\s\\S]*?(?:^[ \\t]{0,3}\\1[ \\t]*$|(?![\\s\\S]))|`+[^`\\r\\n]+`+';

export function parseCustomTags(value: string): { names: string[]; invalid: string[] } {
  const names = new Set<string>(), invalid = new Set<string>();
  for (const entry of value.split(/[\s,，、;；]+/u).filter(Boolean)) {
    const match = customName.exec(entry);
    if (!match) { invalid.add(entry); continue; }
    const name = (match[1] ?? match[2]).toLowerCase();
    names.add(name);
  }
  return { names: [...names], invalid: [...invalid] };
}

type Tag = { name: string; start: number; end: number; closing: boolean; literal: boolean };
export type TagBlock = { name: string; start: number; end: number; bodyStart: number; bodyEnd: number };

function recognizesPresetFormat(tags: readonly Tag[]): boolean {
  const seen = new Set<string>(), footers = new Set<string>();
  for (const { name, closing, literal } of tags) {
    if (literal || (!presetPlanning.has(name) && !footerFormat.has(name))) continue;
    if (!closing) seen.add(name);
    else if (seen.delete(name)) {
      if (presetPlanning.has(name)) return true;
      footers.add(name);
      if (footers.size >= 2) return true;
    }
  }
  return false;
}

export function scanPresetTags(text: string, custom: readonly string[] = []) {
  const tags: Tag[] = [];
  const customSet = new Set(custom.map(name => name.toLowerCase()));
  const addTag = (source: string, slash: string, rawName: string, start: number, opaque: boolean) => {
    const name = rawName.toLowerCase();
    if (!builtIn.has(name) && !customSet.has(name) && !planning.has(name)) return;
    tags.push({ name, start, end: start + source.length, closing: Boolean(slash), literal: opaque || source.endsWith('/>') });
  };
  const tokens = new RegExp(opaqueSource + '|' + tagSource, 'gmu');
  const insideOpaque = new RegExp(tagSource, 'gu');
  // The opaque token pattern has one capturing group, before the tag groups.
  for (const match of text.matchAll(tokens)) {
    if (match[3]) addTag(match[0], match[2], match[3], match.index, false);
    else for (const tag of match[0].matchAll(insideOpaque)) addTag(tag[0], tag[1], tag[2], match.index + tag.index, true);
  }
  // Recognize the format from the reply so older replies still work after a preset switch.
  const presetFormat = recognizesPresetFormat(tags);
  const isProtected = (name: string) => customSet.has(name) || (presetFormat && builtIn.has(name));
  const applicable = tags.filter(tag => isProtected(tag.name) || planning.has(tag.name));

  const planningEnds = new Map<Tag, Tag>();
  const planningStarts = new Map<string, Tag>();
  for (const tag of applicable) {
    if (tag.literal || !planning.has(tag.name)) continue;
    if (!tag.closing) planningStarts.set(tag.name, tag);
    else {
      const open = planningStarts.get(tag.name);
      if (open) planningEnds.set(open, tag);
      planningStarts.delete(tag.name);
    }
  }

  const accepted = new Set<Tag>();
  const blocks: TagBlock[] = [];
  const pair = (open: Tag, close: Tag) => {
    accepted.add(open);
    accepted.add(close);
    blocks.push({ name: open.name, start: open.start, end: close.end, bodyStart: open.end, bodyEnd: close.start });
  };
  const fields: Tag[] = [];
  const fieldStarts = new Map<string, number>();
  const discardFieldsFrom = (index: number) => {
    while (fields.length > index) fieldStarts.delete(fields.pop()!.name);
  };
  let planEnd: Tag | undefined;
  let incompletePlan = false;
  for (const tag of applicable) {
    const { name, closing, literal } = tag;
    if (literal) continue;
    if (planEnd) {
      if (tag === planEnd) planEnd = undefined;
      continue;
    }
    if (planning.has(name)) {
      if (closing) continue;
      planEnd = planningEnds.get(tag);
      incompletePlan = !planEnd;
      if (planEnd) pair(tag, planEnd);
      continue;
    }
    const index = fieldStarts.get(name);
    if (!closing) {
      // A repeated opener supersedes the dangling one for the same tag.
      if (index !== undefined) discardFieldsFrom(index);
      fieldStarts.set(name, fields.length);
      fields.push(tag);
    } else if (index !== undefined) {
      pair(fields[index], tag);
      discardFieldsFrom(index);
    }
  }
  return {
    blocks: blocks.filter(block => isProtected(block.name)),
    isolated: applicable.filter(tag => isProtected(tag.name) && !accepted.has(tag)),
    protectsStatus: isProtected('status'),
    incompleteStructure: incompletePlan,
  };
}

export function isolatePresetTags(text: string, custom: readonly string[] = []): string {
  if (!text.includes('<')) return text;
  return escapeIsolatedTags(text, scanPresetTags(text, custom).isolated);
}

export function escapeIsolatedTags(text: string, isolated: readonly Tag[]): string {
  let result = '', end = 0;
  for (const tag of isolated) {
    result += text.slice(end, tag.start) + text.slice(tag.start, tag.end)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    end = tag.end;
  }
  return end ? result + text.slice(end) : text;
}
