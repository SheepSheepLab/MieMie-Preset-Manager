// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Production adapter + pinned native methods; all HTTP and host dependencies are synthetic.
const test = require('node:test');
const assert = require('node:assert/strict');
const fixtures = require('./fixtures/st-native-contracts.json');
const { nativeHost, copy } = require('./helpers/st-native-host.cjs');
const { createSTAdapter } = require('../.test-build/st-adapter.js');
const { createController } = require('../.test-build/controller.js');
const reads = f => f.controls.http.filter(r => r.pathname === '/api/settings/get').length;
const writes = f => f.controls.http.filter(r => r.pathname === '/api/presets/save').length;
async function setup(baseline, t) {
  const f = await nativeHost(baseline), adapter = await createSTAdapter(f.host), c = createController(adapter);
  t.after(() => { c.dispose(); f.cleanup(); }); await c.refresh();
  f.controls.http.length = 0; f.controls.changes.length = 0;
  return { f, adapter, c };
}
for (const baseline of fixtures.baselines) {
  const label = `save performance [native ${baseline.id}; mocked host]`;
  test(`${label} edited title keeps all three safety reads but skips covered notification re-read`, async t => {
    const { f, c } = await setup(baseline, t); const before = copy(f.records.get('A'));
    c.edit('custom'); c.draft({ name: 'Changed synthetic title' }); await c.saveEdit(); await c.saveChanges();
    assert.equal(c.state.error, ''); assert.equal(c.state.draft, null); assert.equal(writes(f), 1); assert.equal(reads(f), 3);
    before.prompts.find(p => p.identifier === 'custom').name = 'Changed synthetic title';
    assert.deepEqual(f.records.get('A'), before); assert.deepEqual(c.state.snapshot.raw, before);
  });
  test(`${label} reorder keeps preflight, save readback and post-apply read, without fourth GET`, async t => {
    const { f, c } = await setup(baseline, t);
    await c.move('custom', 'main', c.revision()); await c.saveChanges();
    assert.equal(c.state.error, ''); assert.equal(writes(f), 1); assert.equal(reads(f), 3);
    assert.deepEqual(c.rows().filter(r => r.attached).map(r => r.prompt.identifier), ['custom', 'main']);
  });
  test(`${label} only exact receipts cover notifications; live edits, cloning and newer events invalidate`, async t => {
    const { f, adapter } = await setup(baseline, t); const s = await adapter.read();
    assert.equal(adapter.coversNotifications(s), true); assert.equal(adapter.coversNotifications(copy(s)), false);
    f.live.prompts[1].third_party_added = { retain: true };
    assert.equal(adapter.coversNotifications(s), false); delete f.live.prompts[1].third_party_added;
    assert.equal(adapter.coversNotifications(s), true);
    await f.events.emit('settings', {}); assert.equal(adapter.coversNotifications(s), false);
    const fresh = await adapter.read(); assert.equal(adapter.coversNotifications(fresh), true);
    await f.events.emit('before', {}); assert.equal(adapter.coversNotifications(fresh), false);
  });
  test(`${label} newer external notification after final save read is not swallowed`, async t => {
    const { f, adapter, c } = await setup(baseline, t); const save = adapter.save.bind(adapter);
    adapter.save = async (...args) => {
      const saved = await save(...args), actual = copy(f.records.get('A'));
      actual.prompts[1].late_external = { retained: true };
      f.records.set('A', actual); f.live.prompts[1].late_external = { retained: true };
      await f.events.emit('settings', {}); return saved;
    };
    c.edit('custom'); c.draft({ name: 'Changed' }); await c.saveEdit(); await c.saveChanges();
    assert.equal(reads(f), 4); assert.equal(writes(f), 1);
    assert.deepEqual(c.state.snapshot.raw.prompts[1].late_external, { retained: true });
  });
  test(`${label} event during final HTTP read requires another read even with unchanged live data`, async t => {
    const { f, c } = await setup(baseline, t); const fetch = f.host.fetch.bind(f.host); let count = 0;
    f.host.fetch = async (...args) => {
      const response = await fetch(...args);
      if (new URL(String(args[0])).pathname === '/api/settings/get' && ++count === 3) {
        const json = response.json.bind(response);
        response.json = async () => { const value = await json(); await f.events.emit('settings', {}); return value; };
      }
      return response;
    };
    c.edit('custom'); c.draft({ name: 'Changed' }); await c.saveEdit(); await c.saveChanges();
    assert.equal(c.state.error, ''); assert.equal(reads(f), 4); assert.equal(writes(f), 1);
  });
  test(`${label} explicit refresh during pending save is never discarded as a covered notification`, async t => {
    const { f, c } = await setup(baseline, t); const gate = f.gate('before'); t.after(() => gate.release());
    c.edit('custom'); c.draft({ name: 'Changed' }); await c.saveEdit(); const pending = c.saveChanges();
    await gate.entered; await c.refresh(); gate.remove(); gate.release(); await pending;
    assert.equal(c.state.error, ''); assert.equal(reads(f), 4); assert.equal(writes(f), 1);
  });
  test(`${label} unchanged edit stays local with no read, HTTP write or apply cycle`, async t => {
    const { f, c } = await setup(baseline, t); const before = copy(f.records.get('A'));
    c.edit('custom'); await c.saveEdit(); await c.saveChanges();
    assert.equal(c.state.error, ''); assert.equal(c.state.draft, null);
    assert.equal(reads(f), 0); assert.equal(writes(f), 0); assert.equal(f.controls.changes.length, 0);
    assert.deepEqual(f.records.get('A'), before);
  });
  test(`${label} global Save still rejects a silent external saved-state change`, async t => {
    const { f, c } = await setup(baseline, t); c.edit('custom'); c.draft({ name: 'local' });
    const actual = copy(f.records.get('A')); actual.prompts[1].content = 'synthetic external edit';
    f.records.set('A', actual); f.live.prompts[1].content = 'synthetic external edit';
    await c.saveEdit(); await c.saveChanges();
    assert.equal(writes(f), 0); assert(c.state.dirty); assert(c.state.conflict); assert.match(c.state.error, /修改|保存/);
    assert.deepEqual(f.records.get('A'), actual); assert.equal(c.state.pendingRaw.prompts[1].name, 'local');
  });
}
