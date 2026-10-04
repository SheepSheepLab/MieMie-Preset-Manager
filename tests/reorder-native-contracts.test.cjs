// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Production adapter and upstream native method bodies; host/HTTP dependencies remain mocked.
const test = require('node:test');
const assert = require('node:assert/strict');
const fixtures = require('./fixtures/st-native-contracts.json');
const { nativeHost, copy } = require('./helpers/st-native-host.cjs');
const { createSTAdapter } = require('../.test-build/st-adapter.js');
const { createController } = require('../.test-build/controller.js');
for (const baseline of fixtures.baselines) {
  test(`reorder [native snippets ${baseline.id}; mocked host] B1 protects live-added Prompt/order metadata before HTTP writes`, { timeout: 3000 }, async t => {
    for (const mutate of [
      f => { f.live.prompts[1].external_unknown = { preserve: true }; },
      f => { f.live.prompt_order[1].order[0].external_unknown = { preserve: true }; },
      f => { f.live.prompt_order[0].external_unknown = { preserve: true }; },
    ]) {
      const f = await nativeHost(baseline), adapter = await createSTAdapter(f.host), c = createController(adapter);
      t.after(() => { c.dispose(); f.cleanup(); }); await c.refresh();
      const original = copy(f.records.get('A')); mutate(f); const external = copy(f.live);
      await c.move('custom', 'main', c.revision()); await c.saveChanges();
      assert.match(c.state.error, /保存修改失败.*未保存修改/);
      assert.deepEqual(copy(f.live), external); assert.deepEqual(f.records.get('A'), original);
      assert.equal(f.controls.http.filter(r => r.pathname === '/api/presets/save').length, 0);
      assert.equal(c.state.dirty, true);
    }
  });
  test(`session [native snippets ${baseline.id}; mocked host] local moves consolidate into one native save retaining all raw metadata`, { timeout: 3000 }, async t => {
    const f = await nativeHost(baseline), adapter = await createSTAdapter(f.host), c = createController(adapter);
    const gate = f.gate('before'); t.after(() => { gate.release(); c.dispose(); f.cleanup(); });
    await c.refresh(); const before = copy(c.state.snapshot.raw);
    await c.move('custom', 'main', c.revision());
    await c.move('main', 'custom', c.revision());
    assert.equal(c.state.dirty, false); assert.equal(f.controls.http.filter(r => r.pathname === '/api/presets/save').length, 0);
    await c.move('custom', 'main', c.revision()); const pending = c.saveChanges(); await gate.entered;
    assert.equal(f.controls.http.filter(r => r.pathname === '/api/presets/save').length, 1);
    gate.remove(); gate.release(); await pending;
    before.prompt_order[1].order.reverse();
    assert.deepEqual(c.state.snapshot.raw, before); assert.deepEqual(f.records.get('A'), before);
    assert.equal(c.state.error, ''); assert.equal(c.state.busy, false); assert.equal(c.state.dirty, false);
  });  test(`session [native snippets ${baseline.id}; mocked host] mixed edit, copy, toggle and order persist once with exact unknown fields/groups`, { timeout: 3000 }, async t => {
    const f = await nativeHost(baseline), adapter = await createSTAdapter(f.host), c = createController(adapter);
    t.after(() => { c.dispose(); f.cleanup(); }); await c.refresh(); const before = copy(f.records.get('A'));
    f.controls.http.length = 0;
    c.edit('custom'); c.draft({ name: 'locally changed title', content: 'synthetic staged content' }); await c.saveEdit();
    await c.copyPrompt('custom'); await c.toggle('custom'); await c.move('custom', 'main', c.revision());
    assert.equal(f.controls.http.length, 0); assert.deepEqual(f.records.get('A'), before);
    const expected = copy(c.state.pendingRaw); await c.saveChanges();
    assert.equal(c.state.error, ''); assert.equal(c.state.dirty, false);
    assert.equal(f.controls.http.filter(r => r.pathname === '/api/presets/save').length, 1);
    assert.equal(f.controls.http.filter(r => r.pathname === '/api/settings/get').length, 3);
    assert.deepEqual(f.records.get('A'), expected); assert.deepEqual(c.state.snapshot.raw, expected);
    assert.deepEqual(expected.prompt_order[0], before.prompt_order[0]);
    assert.deepEqual(expected.prompts[1].future_prompt, before.prompts[1].future_prompt);
  });

}
