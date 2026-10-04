// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Synthetic offline adapter. This is not a real ST/HTTP/Hub performance measurement.
import { createController } from '../../controller';
import { createManagerView } from '../../ui';
import { movePrompt } from '../../model';
import type { PresetAdapter, RawPreset, Snapshot } from '../../contracts';

const w = window as Window & { reorderTest: unknown };
let raw: RawPreset = {
  prompts: ['a', 'b', 'c', 'd'].map(identifier => ({ identifier, name: `写作-${identifier}`, content: 'synthetic test text', role: 'system', system_prompt: false, future_prompt: { preserved: true } })),
  prompt_order: [{ character_id: 100001, order: ['a', 'b', 'c', 'd'].map(identifier => ({ identifier, enabled: true, future_entry: identifier })), future_group: true }],
  future_root: true,
};
let epoch = 0, notify = () => {}, writes = 0;
const calls: { release: () => void; reject: () => void; expected: Snapshot; next: RawPreset }[] = [];
const marks: { stage: string; time: number }[] = [];
let timed = false, failRead = false;
const snapshot = (): Snapshot => ({ name: 'Synthetic', names: ['Synthetic'], raw: structuredClone(raw), activeGroupId: 100001, revision: `${epoch}:${JSON.stringify(raw)}` });
const adapter: PresetAdapter = {
  async read() { if (failRead) throw Error('controlled read failure'); return snapshot(); },
  async save(expected, next) {
    marks.push({ stage: 'adapter.save', time: performance.now() });
    if (timed) {
      for (const [stage, delay] of [['preflight-read', 30], ['HTTP-save', 100], ['disk-readback', 50], ['apply-event', 80], ['final-read', 30]] as const) {
        marks.push({ stage: `${stage}:start`, time: performance.now() });
        await new Promise(done => setTimeout(done, delay));
        marks.push({ stage: `${stage}:end`, time: performance.now() });
      }
    } else await new Promise<void>((resolve, reject) => calls.push({ release: resolve, reject: () => reject(Error('controlled save failure')), expected, next }));
    if (snapshot().revision !== expected.revision) throw Error('external modification');
    raw = structuredClone(next); epoch++; writes++;
    marks.push({ stage: 'confirmed', time: performance.now() });
    return snapshot();
  },
  async select() { throw Error('unused'); }, async create() { throw Error('unused'); },
  async rename() { throw Error('unused'); }, async remove() { throw Error('unused'); },
  subscribe(fn) { notify = fn; return () => { notify = () => {}; }; },
};
const controller = createController(adapter);
const move = controller.move.bind(controller);
controller.move = (...args) => {
  marks.push({ stage: 'controller.move:start', time: performance.now() });
  const pending = move(...args);
  marks.push({ stage: 'controller.move:visual-return', time: performance.now() });
  return pending;
};
const view = createManagerView(window, controller);
document.body.append(view.panel);
w.reorderTest = {
  controller, view, calls, marks,
  failRead(value: boolean) { failRead = value; },
  get writes() { return writes; }, raw: () => structuredClone(raw),
  external() { raw.prompts[0].external_unknown = { added: true }; epoch++; notify(); },
  async categories(names: string[]) {
    raw.prompts = names.flatMap(name => [`${name}-synthetic`, `${name}:synthetic`]).map((name, index) => ({ identifier: `category-${index}`, name, role: 'system', system_prompt: false }));
    raw.prompt_order[0].order = raw.prompts.map(prompt => ({ identifier: prompt.identifier, enabled: true }));
    epoch++; await controller.refresh();
  },
  timed() {
    const start = performance.now();
    movePrompt(raw, 100001, 'c', 'a', ['a', 'b', 'c', 'd']);
    marks.push({ stage: 'isolated-model-patch:start', time: start }, { stage: 'isolated-model-patch:end', time: performance.now() });
    timed = true;
  },
};
void controller.refresh().then(() => view.open());
