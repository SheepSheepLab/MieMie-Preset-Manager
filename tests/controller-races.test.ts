// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PresetAdapter, RawPreset, Snapshot } from '../contracts';
import { createController } from '../controller';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function fixture() {
  const raw: RawPreset = {
    prompts: [{ identifier: 'p', name: '写作-正文', role: 'system', content: '原内容', system_prompt: false, future_prompt: { keep: true } }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'p', enabled: true, future_order: 42 }] }],
    future_root: { keep: ['unchanged'] },
  };
  const presets = new Map([['A', structuredClone(raw)], ['B', structuredClone(raw)]]);
  let name = 'A', epoch = 0, saveCalls = 0;
  let notify = () => {};
  let saveGate: ReturnType<typeof deferred<Snapshot>> | null = null;
  let readGate: ReturnType<typeof deferred<Snapshot>> | null = null;
  const snapshot = (): Snapshot => ({ name, names: [...presets.keys()], activeGroupId: 100001, raw: structuredClone(presets.get(name)!), revision: `${epoch}:${name}:${JSON.stringify(presets.get(name))}` });
  const adapter: PresetAdapter = {
    async read() { const gate = readGate; readGate = null; return gate ? gate.promise : snapshot(); },
    async select(next) { name = next; epoch++; return snapshot(); },
    async save(expected, next) {
      saveCalls++;
      assert.equal(expected.name, name);
      assert.equal(expected.revision, snapshot().revision);
      presets.set(name, structuredClone(next));
      const gate = saveGate; saveGate = null;
      return gate ? gate.promise : snapshot();
    },
    async create() { throw Error('not used'); },
    async rename() { throw Error('not used'); },
    async remove() { throw Error('not used'); },
    subscribe(fn) { notify = fn; return () => { notify = () => {}; }; },
  };
  return {
    adapter, snapshot, presets,
    get saveCalls() { return saveCalls; },
    holdSave() { saveGate = deferred<Snapshot>(); return saveGate; },
    holdRead() { readGate = deferred<Snapshot>(); return readGate; },
    externalSelect(next: string) { name = next; epoch++; notify(); },
  };
}

test('notification during save synchronizes a later external preset selection', async () => {
  const f = fixture(), controller = createController(f.adapter);
  await controller.refresh();
  const gate = f.holdSave();
  await controller.toggle('p'); const pending = controller.saveChanges();
  const savedA = f.snapshot();
  f.externalSelect('B');
  gate.resolve(savedA);
  await pending;
  assert.equal(controller.state.snapshot?.name, 'B');
  assert.equal(controller.state.busy, false);
  assert.match(controller.state.notice, /外部切换|同步/);
  controller.dispose();
});

test('dirty editor blocks internal preset switching until explicitly cancelled', async () => {
  const f = fixture(), controller = createController(f.adapter); await controller.refresh();
  controller.edit('p'); controller.draft({ content: '未保存草稿' }); await controller.select('B');
  assert.equal(controller.state.snapshot?.name, 'A'); assert.equal(controller.state.draft?.patch.content, '未保存草稿'); assert.equal(f.saveCalls, 0);
  controller.cancelChanges(); await controller.select('B'); assert.equal(controller.state.snapshot?.name, 'B'); controller.dispose();
});
test('a changed raw baseline never rebases staged work onto external data', async () => {
  const f = fixture(), controller = createController(f.adapter); await controller.refresh();
  controller.edit('p'); controller.draft({ content: '不得覆盖外部改动' });
  f.presets.get('A')!.future_root = { external: 'also matters' }; await controller.refresh(); await controller.saveChanges();
  assert.equal(f.saveCalls, 0); assert.equal(controller.state.draft?.patch.content, '不得覆盖外部改动'); assert.equal(controller.state.conflict, true);
  controller.cancelChanges(); await controller.refresh(); assert.deepEqual(controller.state.snapshot?.raw.future_root, { external: 'also matters' }); controller.dispose();
});

test('notification during export refreshes the selected preset after rejecting stale export', async () => {
  const f = fixture(), controller = createController(f.adapter);
  await controller.refresh();
  const gate = f.holdRead();
  const pending = controller.exportText();
  f.externalSelect('B');
  gate.resolve(f.snapshot());
  await assert.rejects(pending, /更改|改变/);
  assert.equal(controller.state.snapshot?.name, 'B');
  assert.equal(controller.state.busy, false);
  controller.dispose();
});
