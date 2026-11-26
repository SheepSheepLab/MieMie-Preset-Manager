// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

const planning = new Set(['story_driver', 'combat_driver', 'acg_think', 'lore_search', 'parallel_line_drive', 'think', 'thinking', 'analysis']);
const sections = new Set(['story_scene', 'opening']);
const inline = new Set(['t_big', 't_small', 't_s']);
export const DEFAULT_ISOLATION_TAGS = Object.freeze([
  'status', 'special_status', 'affinity', 'memory_log', 'wlog', 'npc_log',
  ...planning, ...sections, 'locator', 'selection', 'parallel_line', 'secure_log', ...inline, 'UpdateVariable', 'JSONPatch',
  'story_driver_format', 'story_scene_format', 'status_format', 'special_status_format',
  'affinity_format', 'memory_log_format', 'wlog_format', 'npc_log_format', 'acg_think_format',
]);
const builtIn = new Set(DEFAULT_ISOLATION_TAGS.map(name => name.toLowerCase()));
const storyFormat = new Set(['story_driver', 'story_scene', 'combat_driver', 'lore_search', 'acg_think', 'parallel_line_drive']);
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
    if (literal || (!storyFormat.has(name) && !footerFormat.has(name))) continue;
    if (!closing) seen.add(name);
    else if (seen.delete(name)) {
      if (storyFormat.has(name)) return true;
      footers.add(name);
      if (footers.size >= 2) return true;
    }
  }
  return false;
}

export function scanPresetTags(text: string, custom: readonly string[] = []) {
  const tags: Tag[] = [];
  const customSet = new Set(custom);
  const addTag = (source: string, slash: string, rawName: string, start: number, opaque: boolean) => {
    const name = rawName.toLowerCase();
    if (!builtIn.has(name) && !customSet.has(name)) return;
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
  const isProtected = (name: string) => presetFormat || customSet.has(name);
  const applicable = presetFormat ? tags : tags.filter(tag => customSet.has(tag.name) || planning.has(tag.name) || sections.has(tag.name));

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
  const containers = new Map<string, Tag>(), spans = new Map<string, Tag>();
  let fields: Tag[] = [];
  let plan: { close?: Tag } | undefined;
  for (const tag of applicable) {
    const { name, closing, literal } = tag;
    if (literal) continue;
    if (plan) {
      if (tag === plan.close) { plan = undefined; continue; }
      // A structural opener can recover a reply whose planning closer was omitted.
      if (plan.close || closing || (!sections.has(name) && !planningEnds.has(tag))) continue;
      plan = undefined;
    }
    if (planning.has(name)) {
      if (closing || containers.has('story_scene')) continue;
      fields = [];
      spans.clear();
      const close = planningEnds.get(tag);
      plan = { close };
      if (close) pair(tag, close);
      continue;
    }
    if (sections.has(name)) {
      fields = [];
      spans.clear();
      if (!closing) containers.set(name, tag);
      else {
        const open = containers.get(name);
        if (open) pair(open, tag);
        containers.delete(name);
      }
      continue;
    }
    if (inline.has(name)) {
      if (!closing) spans.set(name, tag);
      else {
        const open = spans.get(name);
        if (open) pair(open, tag);
        spans.delete(name);
      }
      continue;
    }
    if (containers.has('story_scene')) continue;
    if (!closing) {
      spans.clear();
      // MVU keeps its JSON payload inside an UpdateVariable block.
      fields = name === 'jsonpatch' && fields[0]?.name === 'updatevariable' ? [fields[0], tag] : [tag];
    } else {
      const open = fields.at(-1);
      if (open?.name !== name) continue;
      pair(open, tag);
      fields.pop();
      spans.clear();
    }
  }
  return {
    blocks: blocks.filter(block => isProtected(block.name)),
    isolated: applicable.filter(tag => isProtected(tag.name) && !accepted.has(tag)),
    protectsStatus: isProtected('status'),
    incompleteStructure: Boolean(plan || containers.size),
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
