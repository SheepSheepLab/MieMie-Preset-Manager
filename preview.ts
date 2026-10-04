// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { PresetAdapter, RawPreset, Snapshot } from './contracts';
import { createController } from './controller';
import { createManagerView } from './ui';
import { startDualMode } from './dual-mode';

const sample: RawPreset = {
  temperature: 0.8, openai_max_tokens: 2048, future_setting: { retained: true },
  prompts: [
    { identifier: 'main', name: 'Main Prompt', system_prompt: true, role: 'system', content: '这是本地演示数据。', forbid_overrides: true },
    ...['写作-正文', '写作-风格', '写作-文风限制', '剧情-推进', '剧情-节奏', '角色-对白', '角色-行为', '防抢话', '【格式】分段', '【格式】标点'].map((name, i) => ({ identifier: `demo-${i}`, name, system_prompt: false, role: 'system', content: `演示条目「${name}」\n内容只在本页内存中保存。`, injection_position: 0, injection_depth: 4, injection_order: 100, injection_trigger: [], future_prompt_option: { keep: true } })),
    { identifier: 'chatHistory', name: 'Chat History', marker: true, system_prompt: true },
  ],
  prompt_order: [{ character_id: 100000, order: [], future_group: true }, { character_id: 100001, order: ['main', ...Array.from({ length: 10 }, (_, i) => `demo-${i}`), 'chatHistory'].map(identifier => ({ identifier, enabled: identifier !== 'demo-4' })) }],
};
const presets = new Map<string, RawPreset>([['星夜 · 示例预设', structuredClone(sample)], ['轻量 · 示例预设', structuredClone(sample)]]);
let selected = '星夜 · 示例预设';
const snapshot = (): Snapshot => ({ name: selected, names: [...presets.keys()], raw: structuredClone(presets.get(selected)!), activeGroupId: 100001, revision: JSON.stringify([selected, presets.get(selected)]), version: 'offline-preview' });
const guard = (expected: Snapshot) => { if (snapshot().revision !== expected.revision) throw Error('预览状态已改变，请重读。'); };
const adapter: PresetAdapter = {
  async read() { return snapshot(); },
  async select(name, expected) { guard(expected); if (!presets.has(name)) throw Error('预设不存在。'); selected = name; return snapshot(); },
  async save(expected, raw) { guard(expected); presets.set(selected, structuredClone(raw)); return snapshot(); },
  async create(expected, name, raw) { guard(expected); if (presets.has(name)) throw Error('同名预设已存在。'); presets.set(name, structuredClone(raw)); selected = name; return snapshot(); },
  async rename(expected, name) { guard(expected); if (!name || presets.has(name)) throw Error('名称为空或已存在。'); presets.set(name, presets.get(selected)!); presets.delete(selected); selected = name; return snapshot(); },
  async remove(expected) { guard(expected); if (presets.size < 2) throw Error('至少保留一个预设。'); presets.delete(selected); selected = [...presets.keys()][0]; return snapshot(); },
};
const controller = createController(adapter);
const view = createManagerView(window, controller);
const dual = startDualMode(window as Window & Record<string, any>, window, view);
void controller.refresh().then(() => view.open());
window.addEventListener('pagehide', () => { controller.dispose(); void dual.dispose().finally(() => view.dispose()); }, { once: true });
