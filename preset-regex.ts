// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

import type { RawPreset } from './contracts';
import { newPresetId } from './preset-id';

export type PresetRegex = Record<string, unknown> & { id: string; scriptName: string };
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function parsePresetRegex(text: string): PresetRegex[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data) || !data.length) throw Error('此文件不是可绑定的预设正则。');
  const ids = new Set<string>();
  for (const entry of data) {
    if (!record(entry) || typeof entry.id !== 'string' || !entry.id.trim() || ids.has(entry.id) ||
        typeof entry.scriptName !== 'string' || !entry.scriptName.trim() || typeof entry.findRegex !== 'string' ||
        typeof entry.replaceString !== 'string' || !Array.isArray(entry.placement) ||
        !entry.placement.every(value => Number.isSafeInteger(value)) || !Array.isArray(entry.trimStrings) ||
        !entry.trimStrings.every(value => typeof value === 'string')) throw Error('正则条目格式不兼容，请选择仅下载文件。');
    ids.add(entry.id);
  }
  return data as PresetRegex[];
}

function boundRegex(preset: RawPreset) {
  const extensions = preset.extensions ?? {};
  if (!record(extensions) || (extensions.regex_scripts !== undefined && !Array.isArray(extensions.regex_scripts))) {
    throw Error('目标预设已有的扩展数据格式无效，无法绑定正则。');
  }
  return { extensions, entries: (extensions.regex_scripts as unknown[] | undefined) ?? [] };
}

export function boundRegexCount(preset: RawPreset): number {
  return boundRegex(preset).entries.length;
}

export function attachPresetRegex(preset: RawPreset, scripts: readonly PresetRegex[]): RawPreset {
  const { entries, extensions } = boundRegex(preset);
  const used = new Set(entries.flatMap(entry => record(entry) && typeof entry.id === 'string' ? [entry.id] : []));
  const incoming = new Set(scripts.map(script => script.id));
  const added: PresetRegex[] = [];
  for (const script of scripts) {
    let id = script.id;
    if (used.has(id)) {
      do { id = newPresetId(); } while (used.has(id) || incoming.has(id));
    }
    used.add(id);
    added.push(id === script.id ? script : { ...script, id });
  }
  return { ...preset, extensions: { ...extensions, regex_scripts: [...entries, ...added] } };
}
