// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../.test-build/model.js');
const { createController } = require('../.test-build/controller.js');
for (const version of ['1.18.0', '1.19.0']) {
test(`official ST ${version} default fixture and injected future fields round-trip`, () => {
  const native = structuredClone(require(`./fixtures/st-${version}-default.json`));
  native.future_root = { nested: [null, false, 'kept'] };
  native.prompts[0].future_prompt = { retained: true };
  native.prompt_order[0].future_group = [1, 2, 3];
  assert.deepEqual(m.parsePreset(JSON.stringify(native)), native);
  const next = m.patchPrompt(native, native.prompts[0].identifier, { name: 'fixture title' });
  const expected = structuredClone(native); expected.prompts[0].name = 'fixture title';
  assert.deepEqual(next, expected);
});
}
function fixture() {
  return {
    temperature: 0.72, openai_max_tokens: 2200, future_top: { nested: ['秘密不上传', 3, false] },
    prompts: [
      { identifier: 'main', name: 'Main Prompt', role: 'system', content: 'main', system_prompt: true, forbid_overrides: true },
      ...['A1', 'B1', 'A2', 'B2', 'A3'].map(id => ({ identifier: id, name: `${id[0]}-${id.slice(1)}`, role: 'system', content: `<img src=x onerror=alert(1)> ${id}`, system_prompt: false, injection_trigger: ['normal', 'future-trigger'], future_prompt: { a: 99 } })),
      { identifier: 'chatHistory', name: 'Chat History', marker: true, system_prompt: true },
    ],
    prompt_order: [
      { character_id: 100000, future_group: [8], order: [{ identifier: 'A1', enabled: false, future_entry: 12 }] },
      { character_id: 100001, future_group: { untouched: true }, order: ['main', 'A1', 'B1', 'A2', 'B2', 'A3', 'chatHistory'].map(identifier => ({ identifier, enabled: true, order_extra: identifier })) },
    ],
    extensions: { another_extension: { keep: 'yes' } },
  };
}
test('unchanged native JSON round trip retains every field and group', () => {
  const raw = fixture(); assert.deepEqual(m.parsePreset(JSON.stringify(raw)), raw);
});
test('editing only a title changes exactly one field', () => {
  const raw = fixture(), expected = structuredClone(raw); expected.prompts[1].name = 'changed';
  assert.deepEqual(m.patchPrompt(raw, 'A1', { name: 'changed' }), expected);
  assert.equal(raw.prompts[1].name, 'A-1');
});
test('category detection is local and never mutates titles', () => {
  const raw = fixture(), before = structuredClone(raw); const cats = m.categoriesFor(raw.prompts);
  assert.equal(cats.get('A1'), 'A'); assert.equal(cats.get('main'), '未分类'); assert.deepEqual(raw, before);
  assert.deepEqual([...m.categoriesFor([{ identifier: 'a', name: '【文风】正文' }, { identifier: 'b', name: '【文风】限制' }]).values()], ['文风', '文风']);
  const mixed = ['🕋难度-地狱(多选一)', '🕋难度:普通', '📕文风:FateZero', '📕文风-简洁', '📕文风：叙事',
    'Language::English', 'Language : 中文', '单条:保持未分类', '无前缀'].map((name, i) => ({ identifier: String(i), name }));
  const untouched = structuredClone(mixed);
  assert.deepEqual([...m.categoriesFor(mixed).values()], ['🕋难度', '🕋难度', '📕文风', '📕文风', '📕文风', 'Language', 'Language', '未分类', '未分类']);
  assert.deepEqual(mixed, untouched, 'category parsing never rewrites original names');
});
test('filtered reorder only permutes visible slots including all per-entry metadata', () => {
  const raw = fixture(); const next = m.movePrompt(raw, 100001, 'A3', 'A1', ['A1', 'A2', 'A3']);
  assert.deepEqual(next.prompt_order[1].order.map(e => e.identifier), ['main', 'A3', 'B1', 'A1', 'B2', 'A2', 'chatHistory']);
  assert.deepEqual(next.prompt_order[0], raw.prompt_order[0]);
  assert.equal(next.prompt_order[1].order[1].order_extra, 'A3');
});
test('copy retains nested prompt and order fields, inserts directly after original', () => {
  const raw = fixture(), next = m.copyPrompt(raw, 100001, 'A1', 'copy-id');
  assert.deepEqual(next.prompts.find(p => p.identifier === 'copy-id'), { ...raw.prompts[1], identifier: 'copy-id', name: 'A-1 copy' });
  assert.deepEqual(next.prompt_order[1].order.slice(1, 3).map(e => e.identifier), ['A1', 'copy-id']);
  assert.deepEqual(next.prompt_order[0], raw.prompt_order[0]); assert.equal(m.uniqueName('A', ['A copy', 'A copy 2'], true), 'A copy 3');
});
test('toggle changes active group enabled only', () => {
  const raw = fixture(), expected = structuredClone(raw); expected.prompt_order[1].order[1].enabled = false;
  assert.deepEqual(m.togglePrompt(raw, 100001, 'A1'), expected);
});
test('detach keeps definition and other groups, delete removes all references', () => {
  const raw = fixture(), detached = m.detachPrompt(raw, 100001, 'A1');
  assert.deepEqual(detached.prompts, raw.prompts); assert.deepEqual(detached.prompt_order[0], raw.prompt_order[0]);
  const deleted = m.deletePrompt(detached, 'A1', 100001);
  assert(!deleted.prompts.some(p => p.identifier === 'A1'));
  assert(deleted.prompt_order.every(g => !g.order.some(e => e.identifier === 'A1')));
  assert.equal(deleted.prompt_order[0].future_group[0], 8);
});
test('protected native prompts cannot be deleted or edited as ordinary content', () => {
  assert.throws(() => m.deletePrompt(fixture(), 'main', 100001));
  assert.throws(() => m.patchPrompt(fixture(), 'chatHistory', { content: 'bad' }));
  assert.throws(() => m.patchPrompt(fixture(), 'A1', { forbid_overrides: true }));
  assert.equal(m.patchPrompt(fixture(), 'main', { forbid_overrides: false }).prompts[0].forbid_overrides, false);
});
test('unknown marker uses native toggle protection and is still preserved', () => {
  const raw = fixture(); raw.prompts.push({ identifier: 'future-marker', name: 'Marker', marker: true, system_prompt: true });
  raw.prompt_order[1].order.push({ identifier: 'future-marker', enabled: true });
  assert.equal(m.rowsFor(raw, 100001).find(r => r.prompt.identifier === 'future-marker').toggleable, false);
  assert.throws(() => m.togglePrompt(raw, 100001, 'future-marker'));
  assert.deepEqual(m.parsePreset(JSON.stringify(raw)), raw);
});
test('malformed input is rejected without repair', () => {
  for (const mutate of [r => r.prompts.push(r.prompts[1]), r => r.prompt_order[1].order.push({ identifier: 'missing', enabled: true }), r => r.prompt_order[1].order[0].enabled = 'yes', r => r.prompts[0].content = {}, r => r.future_top = Infinity]) {
    const raw = fixture(); mutate(raw); assert.throws(() => m.validatePreset(raw));
  }
  assert.throws(() => m.parsePreset('{broken'));
});
test('unknown future role can remain unchanged during title edit', () => {
  const raw = fixture(); raw.prompts[1].role = 'future-role';
  assert.equal(m.patchPrompt(raw, 'A1', { name: 'new', role: 'future-role' }).prompts[1].role, 'future-role');
});
function fakeAdapter() {
  let raw = fixture(), name = 'A', saveCount = 0, reject = false, release;
  const read = async () => ({ raw: structuredClone(raw), name, names: ['A', 'B'], activeGroupId: 100001, revision: JSON.stringify([name, raw]) });
  return {
    read, get saves() { return saveCount; }, fail() { reject = true; },
    switch(name_) { name = name_; }, hold() { return new Promise(resolve => { release = resolve; }); }, release() { release?.(); },
    async save(expected, next) { saveCount++; if (reject) throw Error('模拟存盘失败'); if (expected.name !== name || expected.revision !== (await read()).revision) throw Error('冲突'); raw = structuredClone(next); return read(); },
    async select(next) { name = next; return read(); }, async create(_s, next, data) { name = next; raw = data; return read(); },
    rename: async () => { throw Error('not used'); }, remove: async () => { throw Error('not used'); },
  };
}
test('cancelled edit does not invoke persistence; successful edit does', async () => {
  const adapter = fakeAdapter(), controller = createController(adapter); await controller.refresh();
  controller.edit('A1'); controller.draft({ content: 'draft' }); controller.cancelEdit(); assert.equal(adapter.saves, 0);
  controller.edit('A1'); controller.draft({ content: 'saved' }); await controller.saveEdit(); await controller.saveChanges();
  assert.equal(adapter.saves, 1); assert.equal(controller.state.draft, null);
  assert.equal(controller.state.snapshot.raw.prompts[1].content, 'saved');
});
test('failed save preserves actual state and unsaved draft without success notice', async () => {
  const adapter = fakeAdapter(), controller = createController(adapter); await controller.refresh(); const before = controller.state.snapshot.raw;
  controller.edit('A1'); controller.draft({ content: 'draft' }); adapter.fail(); await controller.saveEdit(); await controller.saveChanges();
  assert.deepEqual(controller.state.snapshot.raw, before); assert.equal(controller.state.pendingRaw.prompts[1].content, 'draft');
  assert.match(controller.state.error, /失败/); assert.equal(controller.state.notice, '');
});
test('stale snapshot cannot write another preset; pending work survives until explicit reload', async () => {
  const adapter = fakeAdapter(), controller = createController(adapter); await controller.refresh();
  controller.edit('A1'); controller.draft({ content: 'draft A' }); adapter.switch('B'); await controller.saveEdit(); await controller.saveChanges();
  assert.equal(controller.state.snapshot.name, 'A'); assert.equal(controller.state.conflict, true);
  assert.equal(controller.state.pendingRaw.prompts[1].content, 'draft A'); assert.match(controller.state.error, /外部/);
  await controller.reload(); assert.equal(controller.state.snapshot.name, 'B'); assert.notEqual(controller.state.snapshot.raw.prompts[1].content, 'draft A');
  assert.equal(controller.state.dirty, false); assert.equal(controller.state.draft, null);
});
test('invalid import cannot create or replace a preset', async () => {
  const adapter = fakeAdapter(), controller = createController(adapter); await controller.refresh();
  await controller.importText('A.json', '{broken'); assert.equal(controller.state.snapshot.name, 'A'); assert.equal(adapter.saves, 0);
});
test('export revalidates identity and emits untouched full native JSON', async () => {
  const adapter = fakeAdapter(), controller = createController(adapter); await controller.refresh();
  const result = await controller.exportText(); assert.deepEqual(JSON.parse(result.text), fixture());
  adapter.switch('B'); await assert.rejects(controller.exportText(), /更改/);
});

module.exports.fixture = fixture;
