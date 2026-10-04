// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Local edit session with synthetic host; not real-host acceptance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../controller';
import type { PresetAdapter, RawPreset, Snapshot } from '../contracts';
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  let raw: RawPreset = { prompts: ['a', 'b', 'c', 'd'].map(id => ({ identifier: id, name: `${id === 'b' || id === 'd' ? '角色' : '写作'}-${id}`, role: 'system', content: 'synthetic', system_prompt: false, future: { keep: id } })),
    prompt_order: [{ character_id: 100001, order: ['a', 'b', 'c', 'd'].map(identifier => ({ identifier, enabled: true, meta: identifier })), extra: true },
      { character_id: 'other', order: [{ identifier: 'a', enabled: false, privateFuture: ['keep'] }], meta: { keep: true } }], futureRoot: { unknown: true } };
  let name = 'A', epoch = 0, writes = 0, reads = 0, selects = 0, notify = () => {};
  let fail = false, gate: Promise<void> | null = null, release = () => {}, late: (() => void) | null = null;
  const snap = (): Snapshot => ({ name, names: ['A', 'B'], raw: structuredClone(raw), activeGroupId: 100001, revision: `${epoch}:${name}:${JSON.stringify(raw)}` });
  const adapter: PresetAdapter = {
    async read() { reads++; return snap(); },
    async save(expected, next) { if (gate) await gate; if (fail) throw Error('synthetic failure'); if (expected.revision !== snap().revision) throw Error('external modification'); raw = structuredClone(next); epoch++; writes++; late?.(); return snap(); },
    async select(next) { selects++; name = next; epoch++; return snap(); },
    async create() { throw Error('unused'); }, async rename() { throw Error('unused'); }, async remove() { throw Error('unused'); },
    subscribe(fn) { notify = fn; return () => { notify = () => {}; }; },
  };
  return { adapter, snap, get raw() { return raw; }, get writes() { return writes; }, get reads() { return reads; }, get selects() { return selects; },
    fail(value = true) { fail = value; }, hold() { gate = new Promise(done => { release = done; }); }, release() { release(); gate = null; },
    external(next = name) { name = next; raw.prompts[0].external = { retained: true }; epoch++; notify(); },
    silent() { raw.prompts[0].external = { retained: true }; epoch++; }, late(fn: () => void) { late = fn; },
  };
}
async function setup() { const f = fixture(), c = createController(f.adapter); await c.refresh(); return { f, c }; }
const ids = (c: ReturnType<typeof createController>) => c.rows().filter(r => r.attached).map(r => r.prompt.identifier);

test('drop is synchronous local order with zero host calls, no busy state or raw baseline mutation', async () => {
  const { f, c } = await setup(); const before = structuredClone(c.state.snapshot), reads = f.reads;
  const pending = c.move('c', 'a', c.revision());
  assert.deepEqual(ids(c), ['c', 'a', 'b', 'd']); assert.equal(c.state.busy, false); assert.equal(c.state.dirty, true);
  assert.deepEqual(c.state.snapshot, before); assert.equal(f.writes, 0); assert.equal(f.reads, reads); await pending; c.dispose();
});
test('rapid successive moves persist once only on explicit Save Changes', async () => {
  const { f, c } = await setup(); await c.move('a', null, c.revision()); await c.move('c', 'b', c.revision()); await c.move('d', 'c', c.revision());
  assert.deepEqual(ids(c), ['d', 'c', 'b', 'a']); assert.equal(f.writes, 0); await c.saveChanges();
  assert.equal(f.writes, 1); assert.equal(c.state.dirty, false); assert.deepEqual(c.state.snapshot!.raw, f.raw); c.dispose();
});
test('cancel restores raw/display baseline with no write or compensating rollback', async () => {
  const { f, c } = await setup(); const before = structuredClone(f.raw); await c.move('a', null, c.revision()); await c.toggle('b');
  c.edit('a'); c.draft({ content: 'unsaved' }); c.cancelChanges();
  assert.deepEqual(ids(c), ['a', 'b', 'c', 'd']); assert.equal(c.state.draft, null); assert.equal(c.state.dirty, false); assert.deepEqual(f.raw, before); assert.equal(f.writes, 0); c.dispose();
});
test('pending global save blocks additional edits, discard, preset operations and duplicate save', async () => {
  const { f, c } = await setup(); await c.move('a', null, c.revision()); f.hold(); const pending = c.saveChanges();
  await c.move('c', 'b', c.revision()); await c.toggle('b'); c.cancelChanges(); await c.select('B'); await c.saveChanges();
  assert.equal(c.state.busy, true); assert.equal(c.state.dirty, true); assert.deepEqual(ids(c), ['b', 'c', 'd', 'a']); assert.equal(f.selects, 0);
  f.release(); await pending; assert.equal(f.writes, 1); assert.equal(c.state.dirty, false); c.dispose();
});
test('rejected save preserves all local work and allows safe retry on unchanged host', async () => {
  const { f, c } = await setup(); await c.move('a', null, c.revision()); f.fail(); await c.saveChanges();
  assert.equal(c.state.dirty, true); assert.equal(c.state.busy, false); assert.equal(c.state.conflict, false); assert.match(c.state.error, /失败/);
  assert.deepEqual(ids(c), ['b', 'c', 'd', 'a']); assert.equal(f.writes, 0); f.fail(false); await c.saveChanges(); assert.equal(f.writes, 1); assert.equal(c.state.dirty, false); c.dispose();
});
test('external edit while dirty marks conflict and never rebases or writes; cancel reveals external state', async () => {
  const { f, c } = await setup(); const revision = c.state.snapshot!.revision; await c.move('a', null, c.revision()); f.external(); await tick();
  assert.equal(c.state.snapshot!.revision, revision); assert.equal(c.state.conflict, true); assert.equal(c.state.dirty, true); await c.saveChanges(); assert.equal(f.writes, 0);
  c.cancelChanges(); await tick(); assert.deepEqual(c.state.snapshot!.raw.prompts[0].external, { retained: true }); assert.equal(c.state.dirty, false); c.dispose();
});
test('silent external edit at save is caught by exact revision; local work survives', async () => {
  const { f, c } = await setup(); await c.toggle('a'); f.silent(); await c.saveChanges();
  assert.equal(f.writes, 0); assert.equal(c.state.conflict, true); assert.equal(c.state.dirty, true); assert.equal(c.rows()[0].enabled, false); c.dispose();
});
test('external switch while global save pending never writes into new preset', async () => {
  const { f, c } = await setup(); await c.toggle('a'); f.hold(); const pending = c.saveChanges(); f.external('B'); f.release(); await pending;
  assert.equal(f.writes, 0); assert.equal(c.state.snapshot!.name, 'A'); assert.equal(c.state.conflict, true); c.cancelChanges(); await tick(); assert.equal(c.state.snapshot!.name, 'B'); c.dispose();
});
test('late save read returning unrelated external raw cannot clear local changes as confirmed', async () => {
  const { f, c } = await setup(); await c.toggle('a'); f.late(() => f.silent()); await c.saveChanges();
  assert.equal(f.writes, 1); assert.equal(c.state.dirty, true); assert.equal(c.state.conflict, true); assert.match(c.state.error, /外部/); c.dispose();
});
test('filtered local sorting keeps hidden slots, all group and entry metadata', async () => {
  const { f, c } = await setup(); const before = structuredClone(f.raw); c.category('写作'); await c.move('c', 'a', c.revision());
  assert.deepEqual(c.state.pendingRaw!.prompt_order[0].order.map(e => e.identifier), ['c', 'b', 'a', 'd']);
  await c.saveChanges(); assert.deepEqual(f.raw.prompt_order[1], before.prompt_order[1]); assert.deepEqual(f.raw.futureRoot, before.futureRoot);
  for (const e of f.raw.prompt_order[0].order) assert.equal(e.meta, e.identifier); c.dispose();
});
test('stale gesture token cannot commit against newer local changes', async () => {
  const { f, c } = await setup(); const revision = c.revision(); await c.toggle('a'); await c.move('a', null, revision);
  assert.deepEqual(ids(c), ['a', 'b', 'c', 'd']); assert.match(c.state.error, /拖动/); assert.equal(f.writes, 0); c.dispose();
});
test('returning order and toggle to baseline makes buttons clean without saving', async () => {
  const { f, c } = await setup(); await c.move('a', null, c.revision()); await c.move('a', 'b', c.revision()); assert.equal(c.state.dirty, false);
  await c.toggle('a'); await c.toggle('a'); assert.equal(c.state.dirty, false); await c.saveChanges(); assert.equal(f.writes, 0); c.dispose();
});
test('editor typing and Save only stage locally; Cancel Edit leaves prior staged work intact', async () => {
  const { f, c } = await setup(); c.edit('a'); assert.equal(c.state.dirty, false); c.draft({ name: 'changed' }); assert.equal(c.state.dirty, true);
  await c.saveEdit(); assert.equal(c.state.draft, null); assert.equal(c.rows()[0].prompt.name, 'changed'); assert.equal(f.writes, 0);
  c.edit('a'); c.draft({ content: 'later' }); c.cancelEdit(); assert.equal(c.state.dirty, true); await c.saveChanges(); assert.equal(f.writes, 1); assert.equal(f.raw.prompts[0].content, 'synthetic'); c.dispose();
});
test('global Save includes open editor draft and preserves unknown fields', async () => {
  const { f, c } = await setup(); c.edit('a'); c.draft({ content: 'changed' }); await c.saveChanges();
  assert.equal(f.writes, 1); assert.equal(f.raw.prompts[0].content, 'changed'); assert.deepEqual(f.raw.prompts[0].future, { keep: 'a' }); assert.equal(c.state.draft, null); c.dispose();
});
test('invalid editor draft remains open without a write; correcting then saving works', async () => {
  const { f, c } = await setup(); c.edit('a'); c.draft({ name: ' ' }); await c.saveEdit(); assert(c.state.draft); assert.match(c.state.error, /标题/);
  await c.saveChanges(); assert.equal(f.writes, 0); c.draft({ name: 'valid' }); await c.saveChanges(); assert.equal(f.writes, 1); c.dispose();
});
test('preset switching, import, copy, rename, delete and export reject dirty session', async () => {
  const { f, c } = await setup(); await c.toggle('a'); await c.select('B'); await c.copyPreset(); await c.newPreset('C'); await c.renamePreset('C'); await c.deletePreset(); await c.importText('C', JSON.stringify(f.raw));
  await assert.rejects(c.exportText(), /保存修改/); assert.equal(f.selects, 0); assert.equal(f.writes, 0); assert.equal(c.state.snapshot!.name, 'A'); assert.equal(c.state.dirty, true); c.dispose();
});
test('unchanged notification/read while dirty does not drop local order or editor draft', async () => {
  const { c } = await setup(); await c.move('a', null, c.revision()); c.edit('b'); c.draft({ content: 'pending' }); await c.refresh();
  assert.deepEqual(ids(c), ['b', 'c', 'd', 'a']); assert.equal(c.state.draft!.patch.content, 'pending'); assert.equal(c.state.conflict, false); assert.equal(c.state.dirty, true); c.dispose();
});
test('all Prompt operations remain local until one save; cancel erases additions and deletions', async () => {
  const { f, c } = await setup(); const before = structuredClone(f.raw); await c.copyPrompt('a'); await c.addPrompt(); await c.detach('b'); await c.deletePrompt('b');
  assert.equal(f.writes, 0); assert.equal(c.rows().length, 5); c.cancelChanges(); assert.deepEqual(f.raw, before); assert.equal(c.rows().length, 4);
  await c.detach('a'); await c.attach('a'); await c.saveChanges(); assert.equal(f.writes, 1); assert.deepEqual(f.raw.prompts, before.prompts); c.dispose();
});
test('draft revert and editor Cancel produce no dirty state, reads or writes', async () => {
  const { f, c } = await setup(); const reads = f.reads; c.edit('a'); c.draft({ name: 'change' }); c.draft({ name: '写作-a' }); assert.equal(c.state.dirty, false);
  await c.saveEdit(); assert.equal(c.state.dirty, false); assert.equal(f.reads, reads); c.edit('a'); c.draft({ content: 'unsaved' }); c.cancelEdit(); assert.equal(c.state.dirty, false); assert.equal(f.writes, 0); c.dispose();
});
test('dispose while save pending prevents late acknowledgement from mutating UI state', async () => {
  const { f, c } = await setup(); await c.toggle('a'); f.hold(); const pending = c.saveChanges(); c.dispose(); f.release(); await pending;
  assert.equal(c.state.pendingRaw, null); assert.equal(c.state.dirty, false); c.dispose();
});

test('explicit reload discards both local session and open editor only after successful fresh read', async () => {
  const { f, c } = await setup(); await c.move('a', null, c.revision()); c.edit('b'); c.draft({ content: 'draft' }); f.silent(); await c.reload();
  assert.equal(c.state.dirty, false); assert.equal(c.state.draft, null); assert.equal(c.state.pendingRaw, null); assert.deepEqual(c.state.snapshot!.raw, f.raw); assert.equal(f.writes, 0); c.dispose();
});
test('failed explicit reload preserves unsaved local work without any host write', async () => {
  const { f, c } = await setup(); await c.toggle('a'); f.adapter.read = async () => { throw Error('read failure'); }; await c.reload();
  assert.equal(c.state.dirty, true); assert.equal(c.rows()[0].enabled, false); assert.match(c.state.error, /仍保留/); assert.equal(f.writes, 0); c.dispose();
});

test('typing and staging a long Prompt never stringify the complete body or raw tree', async () => {
  const { f, c } = await setup(); f.raw.prompts[0].content = 'synthetic text '.repeat(100000); await c.refresh(); c.edit('a');
  const stringify = JSON.stringify;
  try {
    JSON.stringify = (() => { throw Error('unexpected serialization on local edit'); }) as typeof JSON.stringify;
    c.draft({ content: f.raw.prompts[0].content + ' local change' }); assert.equal(c.state.dirty, true);
    await c.saveEdit(); assert.equal(c.state.error, ''); assert.equal(c.state.draft, null); assert.equal(c.state.dirty, true); assert.equal(f.writes, 0);
  } finally { JSON.stringify = stringify; c.dispose(); }
});
