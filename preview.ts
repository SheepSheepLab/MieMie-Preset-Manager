// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { PresetAdapter, RawPreset, Snapshot } from './contracts';
import { createController } from './controller';
import { createManagerView } from './ui';
import { startDualMode } from './dual-mode';
import { createPresetBinding, type PresetBindingService } from './chat-preset-coordinator';
import { same, type ChatIdentity } from './preset-binding';
import type { BindingHost, HostEvent } from './chat-binding-host';
import type { ManagerController } from './contracts';

const sample: RawPreset = {
  temperature: 0.8, openai_max_context: 200000, openai_max_tokens: 2048, n: 1, stream_openai: true, frequency_penalty: 0, presence_penalty: 0, top_p: 0.9, show_thoughts: true, reasoning_effort: 'auto', future_setting: { retained: true },
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
  async directory() { return { names: [...presets.keys()], supported: [...presets.keys()] }; },
  async select(name, expected) { guard(expected); if (!presets.has(name)) throw Error('预设不存在。'); selected = name; return snapshot(); },
  async save(expected, raw) { guard(expected); presets.set(selected, structuredClone(raw)); return snapshot(); },
  async create(expected, name, raw) { guard(expected); if (presets.has(name)) throw Error('同名预设已存在。'); presets.set(name, structuredClone(raw)); selected = name; return snapshot(); },
  async rename(expected, name) { guard(expected); if (!name || presets.has(name)) throw Error('名称为空或已存在。'); presets.set(name, presets.get(selected)!); presets.delete(selected); selected = name; return snapshot(); },
  async remove(expected) { guard(expected); if (presets.size < 2) throw Error('至少保留一个预设。'); presets.delete(selected); selected = [...presets.keys()][0]; return snapshot(); },
};
let controller: ManagerController;
let binding: PresetBindingService | undefined;
let offWork: (() => void) | undefined;
if (new URLSearchParams(window.location.search).get('binding') === '1') {
  let global: unknown;
  let current: ChatIdentity = { kind: 'single', key: 'synthetic/one', avatar: 'synthetic.png', filename: 'one', characterName: '示例角色' };
  const metadata = new Map<string, unknown>(), callbacks = new Set<(event: HostEvent) => void>();
  const send = (event: HostEvent) => callbacks.forEach(fn => fn(event));
  const host: BindingHost = {
    currentChat: () => ({ identity: current, binding: structuredClone(metadata.get(current.key)) }),
    selectedName: () => selected, async readGlobal() { return structuredClone(global); },
    async writeGlobal(expected, next) { if (!same(global, expected)) throw Error('演示设置冲突'); global = structuredClone(next); },
    async writeChat(identity, expected, next) {
      if (current.key !== identity.key || !same(metadata.get(identity.key), expected)) throw Error('演示聊天冲突');
      if (next === undefined) metadata.delete(identity.key); else metadata.set(identity.key, structuredClone(next));
    },
    subscribe(fn) { callbacks.add(fn); return () => callbacks.delete(fn); },
    async waitNativeIdle() {}, nativeBusy: () => false, installGenerationGate: () => () => {}, invalidateGeneration() {}, dispose() { callbacks.clear(); },
  };
  binding = createPresetBinding(adapter, host, () => controller?.state ?? { dirty: false, busy: false });
  const demo = {
    binding,
    async chat(filename: string | null, group = false) {
      current = filename === null ? { kind: 'none', key: 'none' } : group
        ? { kind: 'group', key: `group/${filename}`, groupId: 'demo-group', filename }
        : { kind: 'single', key: `synthetic/${filename}`, avatar: 'synthetic.png', filename, characterName: '示例角色' };
      send({ kind: 'chat' });
    },
    async missing() { metadata.set(current.key, { schemaVersion: 1, presetBindingId: 'missing-synthetic-id' }); send({ kind: 'chat' }); },
    async external() { selected = selected === '星夜 · 示例预设' ? '轻量 · 示例预设' : '星夜 · 示例预设'; send({ kind: 'preset', name: selected }); },
    metadata: () => structuredClone(Object.fromEntries(metadata)), global: () => structuredClone(global),
  };
  Object.assign(window, { __MieMieBindingDemo: demo });
  const demoBar = document.createElement('nav'); demoBar.setAttribute('aria-label', '合成对话演示');
  demoBar.style.cssText = 'position:fixed;left:8px;top:8px;z-index:1;display:flex;gap:8px;flex-wrap:wrap;max-width:calc(100vw - 16px);font:12px system-ui';
  for (const [label, action] of [['无对话', () => demo.chat(null)], ['对话一', () => demo.chat('one')], ['对话二', () => demo.chat('two')],
    ['群聊', () => demo.chat('one', true)], ['绑定缺失', () => demo.missing()], ['原生切换', () => demo.external()]] as const) {
    const button = document.createElement('button'); button.textContent = label; button.style.cssText = 'min-height:32px;color:#d5c9ee;background:#282035;border:1px solid #695477;border-radius:8px';
    button.onclick = () => { void action(); }; demoBar.append(button);
  }
  document.body.append(demoBar);
  const explanation = document.querySelector('body > p');
  if (explanation instanceof HTMLElement) {
    explanation.style.marginTop = '56px';
    explanation.textContent = '对话绑定本地演示 · 仅合成数据，不代表真实宿主验收。关闭面板可用上方按钮切换示例对话；也可用 Alt+1 / Alt+2 / Alt+0 / Alt+G 切换。';
  }
  window.addEventListener('keydown', event => {
    if (!event.altKey) return;
    if (event.key === '1') void demo.chat('one');
    else if (event.key === '2') void demo.chat('two');
    else if (event.key === '0') void demo.chat(null);
    else if (event.key.toLowerCase() === 'g') void demo.chat('one', true);
    else return;
    event.preventDefault();
  });
}
controller = createController(binding?.adapter ?? adapter, binding);
if (binding) offWork = controller.subscribe(() => binding?.workChanged());
const view = createManagerView(window, controller);
const dual = startDualMode(window as Window & Record<string, any>, window, view);
if (binding) Object.assign((window as Window & Record<string, any>).__MieMieBindingDemo, { controller, view, source: dual });
void (binding?.start() ?? Promise.resolve()).then(() => controller.refresh()).then(() => view.open());
window.addEventListener('pagehide', () => { offWork?.(); binding?.dispose(); controller.dispose(); void dual.dispose().finally(() => view.dispose()); }, { once: true });
