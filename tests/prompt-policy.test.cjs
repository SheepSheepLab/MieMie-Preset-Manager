// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const crypto = require('node:crypto');
const m = require('../.test-build/model.js');
const { createController } = require('../.test-build/controller.js');
const native = require('./fixtures/st-prompt-policy-contracts.json');
const clone = value => structuredClone(value);
function raw(prompt = {}) {
  return { future: { nested: [false, 0, 'keep'] }, extensions: { opaque: { keep: true } },
    prompts: [{ identifier: 'main', name: 'Main', system_prompt: true, content: 'main' },
      { identifier: 'custom', name: 'Custom', role: 'system', content: 'body', system_prompt: false, marker: false,
        future: { nested: [{ keep: true }] }, ...prompt }],
    prompt_order: [{ character_id: 100001, future: { keep: true }, order: [
      { identifier: 'main', enabled: true }, { identifier: prompt.identifier || 'custom', enabled: true, future: { x: [1, 2] } }] },
      { character_id: 7, opaque: [0, false], order: [{ identifier: prompt.identifier || 'custom', enabled: false, opaque: 'keep' }] }] };
}
function upstream(baseline, data) {
  for (const s of Object.values(baseline.snippets))
    assert.equal(crypto.createHash('sha256').update(s.text).digest('hex'), s.sha256);
  const code = 'class Manager {' + Object.values(baseline.snippets).map(s => s.text).join('\n') + '} Manager';
  const Manager = vm.runInNewContext(code, { PromptCollection: class { constructor() { this.items = []; } add(p) { this.items.push(p); } } });
  const manager = new Manager(); manager.serviceSettings = clone(data); manager.activeCharacter = { id: 100001 };
  manager.configuration = { toggleDisabled: [] }; manager.preparePrompt = p => clone(p); return manager;
}
const cases = [
  ['custom', {}, true, true, true, true, true],
  ['system role custom', { role: 'system' }, true, true, true, true, true],
  ['system flag', { system_prompt: true }, true, true, false, false, false],
  ['custom Marker', { marker: true }, false, false, false, true, false],
  ['known Marker', { identifier: 'charDescription', marker: true, system_prompt: true }, true, true, false, false, false],
  ['protected false', { identifier: 'jailbreak' }, true, true, false, true, false],
  ['missing system flag', { system_prompt: undefined }, true, true, false, false, false],
  ['missing marker flag', { marker: undefined }, true, true, true, true, true],
];
for (const [name, attrs, edit, toggle, copy, detach, del] of cases) test('Owner Prompt policy: ' + name, () => {
  const data = JSON.parse(JSON.stringify(raw(attrs))), p = data.prompts[1]; m.validatePreset(data);
  assert.deepEqual([m.editable(p), m.copyable(p), m.detachable(p), m.deletable(p)], [edit, copy, detach, del]);
  const row = m.rowsFor(data, 100001).find(r => r.prompt.identifier === p.identifier);
  assert.deepEqual([row.editable, row.toggleable, row.copyable, row.detachable, row.deletable], [edit, toggle, copy, detach, del]);
  for (const b of native.baselines) {
    const n = upstream(b, data);
    assert.equal(n.isPromptEditAllowed(p), edit); assert.equal(n.isPromptToggleAllowed(p), toggle);
    assert.equal(n.isPromptDeletionAllowed(p), detach);
  }
  if (!copy) assert.throws(() => m.copyPrompt(data, 100001, p.identifier, crypto.randomUUID()));
  if (!del) assert.throws(() => m.deletePrompt(data, p.identifier, 100001));
  if (!detach) assert.throws(() => m.detachPrompt(data, 100001, p.identifier));
});
for (const attrs of [{ marker: true }, { identifier: 'jailbreak' }]) test('Special detach preserves definitions/groups and native generation collection: ' + JSON.stringify(attrs), () => {
  const data = raw(attrs), before = clone(data), id = data.prompts[1].identifier;
  const detached = m.detachPrompt(data, 100001, id), expected = clone(data);
  expected.prompt_order[0].order = expected.prompt_order[0].order.filter(e => e.identifier !== id);
  assert.deepEqual(detached, expected); assert.deepEqual(data, before);
  const row = m.rowsFor(detached, 100001).find(r => r.prompt.identifier === id);
  assert.equal(row.detachable, false); assert.equal(row.deletable, false); assert.equal(row.copyable, false);
  assert.throws(() => m.detachPrompt(detached, 100001, id), /不在/);
  for (const b of native.baselines) {
    const n = upstream(b, data); n.detachPrompt(n.getPromptById(id), n.activeCharacter);
    assert.deepEqual(n.serviceSettings, detached);
    const expectedCollection = n.getPromptCollection('normal').items;
    const actualCollection = upstream(b, detached).getPromptCollection('normal').items;
    assert.deepEqual(actualCollection, expectedCollection); assert(!actualCollection.some(p => p.identifier === id));
  }
  assert.deepEqual(m.parsePreset(JSON.stringify(detached)), detached);
});
test('Ordinary copy and delete preserve unknown fields and all unrelated groups', () => {
  const data = raw(), before = clone(data), id = crypto.randomUUID();
  const copied = m.copyPrompt(data, 100001, 'custom', id);
  assert.deepEqual(copied.prompts.find(p => p.identifier === id), { ...data.prompts[1], identifier: id, name: 'Custom copy' });
  assert.deepEqual(copied.prompt_order[0].order[2], { ...data.prompt_order[0].order[1], identifier: id });
  assert.deepEqual(copied.prompt_order[1], data.prompt_order[1]);
  assert.throws(() => m.deletePrompt(data, 'custom', 100001), /先解锁/);
  const deleted = m.deletePrompt(m.detachPrompt(data, 100001, 'custom'), 'custom', 100001);
  const expected = clone(data); expected.prompts.splice(1, 1); expected.prompt_order.forEach(g => g.order = g.order.filter(e => e.identifier !== 'custom'));
  assert.deepEqual(deleted, expected); assert.deepEqual(data, before);
});
test('Malformed raw fails safely before special detach', () => {
  for (const change of [r => r.prompts[1].marker = 'yes', r => r.prompts.push(clone(r.prompts[1])),
    r => r.prompt_order[0].order.push({ identifier: 'missing', enabled: true }),
    r => r.prompt_order[0].order.push(clone(r.prompt_order[0].order[1]))]) {
    const data = raw({ marker: true }); change(data); const before = clone(data);
    assert.throws(() => m.detachPrompt(data, 100001, 'custom')); assert.deepEqual(data, before);
  }
});
for (const operation of ['copyPrompt', 'detach', 'deletePrompt']) test('Dirty/save/reload/conflict remains guarded for ' + operation, async () => {
  let saved = raw(), writes = 0, revision = 1, fail = false;
  const snapshot = () => ({ name: 'A', names: ['A'], raw: clone(saved), activeGroupId: 100001, revision: String(revision) });
  const adapter = { read: async () => snapshot(), save: async (expected, next) => {
    if (fail) throw Error('synthetic save failure'); assert.equal(expected.revision, String(revision));
    writes++; saved = clone(next); revision++; return snapshot();
  } };
  const c = createController(adapter); await c.refresh();
  async function stage() { if (operation === 'deletePrompt') await c.detach('custom'); await c[operation]('custom'); }
  await stage(); assert(c.state.dirty && c.state.pendingRaw); assert.equal(writes, 0);
  c.cancelChanges(); assert.equal(c.state.dirty, false); assert.deepEqual(c.state.snapshot.raw, saved);
  await stage(); await c.reload(); assert.equal(c.state.dirty, false); assert.equal(writes, 0);
  await stage(); const pending = clone(c.state.pendingRaw); fail = true; await c.saveChanges();
  assert.equal(writes, 0); assert.deepEqual(c.state.pendingRaw, pending); assert(c.state.dirty);
  fail = false; await c.saveChanges(); assert.equal(writes, 1); assert.deepEqual(saved, pending); assert.equal(c.state.dirty, false);
  saved = raw(); revision++; await c.reload(); await stage();
  saved.future.external = true; revision++; await c.refresh(); await c.saveChanges();
  assert(c.state.conflict && c.state.dirty); assert.equal(writes, 1); assert.equal(saved.future.external, true);
  c.dispose();
});
