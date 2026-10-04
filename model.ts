// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { NativePrompt, RawPreset, OrderGroup, PromptPatch, Row } from './contracts';

export const MARKER_EDITABLE = new Set(['charDescription', 'charPersonality', 'scenario', 'personaDescription', 'worldInfoBefore', 'worldInfoAfter']);
const MARKER_TOGGLEABLE = new Set([...MARKER_EDITABLE, 'main', 'chatHistory', 'dialogueExamples']);
export const PROTECTED_IDS = new Set(['main', 'nsfw', 'jailbreak', 'enhanceDefinitions', 'worldInfoBefore', 'personaDescription', 'charDescription', 'charPersonality', 'scenario', 'worldInfoAfter', 'dialogueExamples', 'chatHistory']);
export const TRIGGERS = ['normal', 'continue', 'impersonate', 'swipe', 'regenerate', 'quiet'];
export const clone = <T>(value: T): T => structuredClone(value);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Validation never normalizes, strips, repairs or assigns defaults to source data. */
export function validatePreset(value: unknown): asserts value is RawPreset {
  if (!record(value) || !Array.isArray(value.prompts) || !Array.isArray(value.prompt_order)) throw Error('文件不是原生 Chat Completion 预设：需要 prompts 和 prompt_order 数组。');
  const ids = new Set<string>();
  for (const [i, p] of value.prompts.entries()) {
    if (!record(p) || typeof p.identifier !== 'string' || !p.identifier.trim()) throw Error(`prompts[${i}] 缺少有效 identifier。`);
    if (ids.has(p.identifier)) throw Error(`条目 identifier 重复：${p.identifier}`);
    ids.add(p.identifier);
    for (const field of ['name', 'role', 'content']) if (p[field] !== undefined && typeof p[field] !== 'string') throw Error(`条目 ${p.identifier} 的 ${field} 必须是文本。`);
    for (const field of ['marker', 'system_prompt', 'forbid_overrides']) if (p[field] !== undefined && typeof p[field] !== 'boolean') throw Error(`条目 ${p.identifier} 的 ${field} 必须是布尔值。`);
    if (p.injection_trigger !== undefined && (!Array.isArray(p.injection_trigger) || p.injection_trigger.some(t => typeof t !== 'string'))) throw Error(`条目 ${p.identifier} 的触发条件格式损坏。`);
  }
  const groups = new Set<string>();
  for (const [i, g] of value.prompt_order.entries()) {
    if (!record(g) || !['string', 'number'].includes(typeof g.character_id) || !Array.isArray(g.order)) throw Error(`prompt_order[${i}] 的分组格式损坏。`);
    const key = String(g.character_id);
    if (groups.has(key)) throw Error(`prompt_order 分组重复：${key}`);
    groups.add(key);
    const references = new Set<string>();
    for (const e of g.order) {
      if (!record(e) || typeof e.identifier !== 'string' || typeof e.enabled !== 'boolean') throw Error(`分组 ${key} 的条目引用或 enabled 格式损坏。`);
      if (!ids.has(e.identifier)) throw Error(`分组 ${key} 引用了不存在的条目：${e.identifier}`);
      if (references.has(e.identifier)) throw Error(`分组 ${key} 重复引用了条目：${e.identifier}`);
      references.add(e.identifier);
    }
  }
  // JSON.parse accepts overflowing exponents as Infinity; exporting those would silently produce null.
  const stack: unknown[] = [value];
  const seen = new Set<object>();
  while (stack.length) {
    const item = stack.pop();
    if (typeof item === 'number' && !Number.isFinite(item)) throw Error('预设含有不能无损导出的非有限数值。');
    if (typeof item === 'object' && item !== null) {
      if (seen.has(item)) throw Error('预设含有循环或共享对象引用，请使用原生 JSON 文件。');
      seen.add(item);
      stack.push(...Object.values(item));
    } else if (item !== null && !['string', 'number', 'boolean'].includes(typeof item)) throw Error('预设含有非 JSON 数据，无法无损保存。');
  }
}

export function parsePreset(text: string): RawPreset {
  let value: unknown;
  try { value = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw Error('JSON 无法解析，请检查文件是否完整。'); }
  validatePreset(value);
  return value;
}

export function group(raw: RawPreset, id: string | number): OrderGroup {
  const found = raw.prompt_order.find(g => String(g.character_id) === String(id));
  if (!found) throw Error(`找不到当前发送顺序分组 ${id}；保留源数据，未自动补建。`);
  return found;
}

function prefix(name: string): string | null {
  const clean = name.trim().replace(/^[\s★☆●○◆◇▪▫✦✧•·※#*_~]+/u, '').trim();
  const bracket = clean.match(/^[【\[「『]([^】\]」』]{1,24})[】\]」』]\s*\S/u);
  if (bracket) return bracket[1].trim();
  const separated = clean.match(/^(.{1,24}?)\s*(?:::|[:：—–|/\-])\s*\S/u);
  return separated?.[1].trim() || null;
}

export function categoriesFor(prompts: NativePrompt[]): Map<string, string> {
  const candidates = prompts.map(p => prefix(p.name || ''));
  const counts = new Map<string, number>();
  candidates.forEach(c => { if (c) counts.set(c, (counts.get(c) || 0) + 1); });
  return new Map(prompts.map((p, i) => [p.identifier, candidates[i] && (counts.get(candidates[i]!) || 0) >= 2 ? candidates[i]! : '未分类']));
}

export const removable = (p: NativePrompt): boolean => p.system_prompt === false && !p.marker && !PROTECTED_IDS.has(p.identifier);
export const editable = (p: NativePrompt): boolean => !p.marker || MARKER_EDITABLE.has(p.identifier);
export function rowsFor(raw: RawPreset, groupId: string | number): Row[] {
  const active = group(raw, groupId).order;
  const byId = new Map(raw.prompts.map(p => [p.identifier, p]));
  const cats = categoriesFor(raw.prompts);
  const attached = new Set(active.map(e => e.identifier));
  const make = (p: NativePrompt, enabled: boolean, linked: boolean): Row => ({ prompt: p, enabled, attached: linked, category: cats.get(p.identifier) || '未分类', editable: editable(p), removable: removable(p), canDetach: removable(p), toggleable: !p.marker || MARKER_TOGGLEABLE.has(p.identifier) });
  return [...active.map(e => make(byId.get(e.identifier)!, e.enabled, true)), ...raw.prompts.filter(p => !attached.has(p.identifier)).map(p => make(p, false, false))];
}

export function uniqueName(base: string, names: string[], copy = false): string {
  const seed = (copy ? `${base} copy` : base).trim();
  if (!seed) throw Error('名称不能为空。');
  const used = new Set(names.map(s => s.normalize('NFC').toLocaleLowerCase()));
  if (!used.has(seed.normalize('NFC').toLocaleLowerCase())) return seed;
  let n = 2;
  while (used.has(`${seed} ${n}`.normalize('NFC').toLocaleLowerCase())) n++;
  return `${seed} ${n}`;
}

function prompt(raw: RawPreset, id: string): NativePrompt {
  const p = raw.prompts.find(p => p.identifier === id);
  if (!p) throw Error('该条目已被移除，请重新读取。');
  return p;
}
export function patchPrompt(raw: RawPreset, id: string, patch: PromptPatch): RawPreset {
  const p = clone(prompt(raw, id));
  const next = { ...raw, prompts: raw.prompts.map(item => item.identifier === id ? p : item) };
  if (!editable(p)) throw Error('该 Marker 的属性由酒馆管理，不能编辑。');
  for (const [key, value] of Object.entries(patch)) {
    if (!['name', 'role', 'content', 'injection_position', 'injection_depth', 'injection_order', 'injection_trigger', 'forbid_overrides'].includes(key)) throw Error('不支持修改此属性。');
    if (p[key] === value || (p[key] !== null && value !== null && typeof p[key] === 'object' && typeof value === 'object'
      && JSON.stringify(p[key]) === JSON.stringify(value))) continue;
    if (key === 'content' && p.marker) throw Error('Marker 的内容由酒馆提供，不能修改。');
    if (key === 'forbid_overrides' && !['main', 'jailbreak'].includes(id)) throw Error('禁止角色卡覆盖仅适用于 Main Prompt 和 Post-History Instructions。');
    if (key === 'role' && !['system', 'user', 'assistant'].includes(String(value))) throw Error('请选择有效的身份；未来未知身份可保持原值。');
    if (key === 'name' && (typeof value !== 'string' || !value.trim())) throw Error('标题不能为空。');
    if (key === 'injection_position' && value !== 0 && value !== 1) throw Error('插入位置只能为 Relative 或 In-Chat。');
    if (['injection_depth', 'injection_order'].includes(key) && (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 9999)) throw Error('Depth / Order 需要为 0 到 9999 的整数。');
    p[key] = clone(value);
  }
  validatePreset(next);
  return next;
}

export function addPrompt(raw: RawPreset, groupId: string | number, id: string): RawPreset {
  const next = clone(raw);
  next.prompts.push({ identifier: id, name: uniqueName('新条目', next.prompts.map(p => p.name || '')), role: 'system', content: '', system_prompt: false, marker: false, injection_position: 0, injection_depth: 4, injection_order: 100, injection_trigger: [], forbid_overrides: false });
  group(next, groupId).order.push({ identifier: id, enabled: true });
  validatePreset(next); return next;
}

export function copyPrompt(raw: RawPreset, groupId: string | number, id: string, newId: string): RawPreset {
  const next = clone(raw), original = prompt(next, id), order = group(next, groupId).order;
  if (!removable(original)) throw Error('内建 Prompt 与 Marker 不按普通条目复制。');
  const duplicate = { ...clone(original), identifier: newId, name: uniqueName(original.name || '未命名', next.prompts.map(p => p.name || ''), true) };
  next.prompts.splice(next.prompts.indexOf(original) + 1, 0, duplicate);
  const position = order.findIndex(p => p.identifier === id);
  if (position >= 0) order.splice(position + 1, 0, { ...clone(order[position]), identifier: newId });
  validatePreset(next); return next;
}

export function togglePrompt(raw: RawPreset, groupId: string | number, id: string): RawPreset {
  const p = prompt(raw, id);
  if (p.marker && !MARKER_TOGGLEABLE.has(id)) throw Error('该 Marker 的开关由酒馆管理，不能直接修改。');
  const next = clone(raw), entry = group(next, groupId).order.find(e => e.identifier === id);
  if (!entry) throw Error('请先将条目重新挂接到发送列表。');
  entry.enabled = !entry.enabled; return next;
}

export function detachPrompt(raw: RawPreset, groupId: string | number, id: string): RawPreset {
  const next = clone(raw);
  if (!removable(prompt(next, id))) throw Error('内建条目保持原生保护，可通过开关关闭。');
  const g = group(next, groupId);
  g.order = g.order.filter(e => e.identifier !== id);
  return next;
}
export function attachPrompt(raw: RawPreset, groupId: string | number, id: string): RawPreset {
  const next = clone(raw), g = group(next, groupId);
  prompt(next, id);
  if (g.order.some(e => e.identifier === id)) throw Error('条目已经在发送列表中。');
  g.order.push({ identifier: id, enabled: true }); return next;
}
export function deletePrompt(raw: RawPreset, id: string, groupId: string | number): RawPreset {
  const next = clone(raw);
  if (!removable(prompt(next, id))) throw Error('酒馆内建条目不能永久删除。');
  if (group(next, groupId).order.some(e => e.identifier === id)) throw Error('请先解锁条目，再确认删除。');
  next.prompts = next.prompts.filter(p => p.identifier !== id);
  // Delete references in every group, retaining all unrelated entries and group metadata.
  next.prompt_order.forEach(g => { g.order = g.order.filter(e => e.identifier !== id); });
  validatePreset(next); return next;
}

/** Filtered sorting permutes the original visible slots; hidden entries never move. */
export function movePrompt(raw: RawPreset, groupId: string | number, id: string, beforeId: string | null, visibleIds: string[]): RawPreset {
  const next = clone(raw), g = group(next, groupId), visible = new Set(visibleIds);
  const slots: number[] = [];
  const items = g.order.filter((e, i) => { if (!visible.has(e.identifier)) return false; slots.push(i); return true; });
  const index = items.findIndex(e => e.identifier === id);
  if (index < 0 || (beforeId !== null && !items.some(e => e.identifier === beforeId))) throw Error('拖动目标已改变，请重新操作。');
  if (id === beforeId) return next;
  const [item] = items.splice(index, 1);
  items.splice(beforeId === null ? items.length : items.findIndex(e => e.identifier === beforeId), 0, item);
  slots.forEach((slot, i) => { g.order[slot] = items[i]; });
  return next;
}

/** New preset keeps the active connection/generation settings, and resets custom prompts only. */
export function emptyPreset(source: RawPreset): RawPreset {
  const next = clone(source);
  const retained = new Set(next.prompts.filter(p => PROTECTED_IDS.has(p.identifier)).map(p => p.identifier));
  next.prompts = next.prompts.filter(p => retained.has(p.identifier));
  next.prompt_order.forEach(g => { g.order = g.order.filter(e => retained.has(e.identifier)); });
  return next;
}
