// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

/* Native method bodies are upstream AST fixtures; the surrounding host is mocked, not actual SillyTavern. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fixtures = require('./fixtures/st-native-contracts.json');
const { nativeHost, deferred, copy } = require('./helpers/st-native-host.cjs');
const { createSTAdapter } = require('../.test-build/st-adapter.js');
const options = { timeout: 2500 };
const turn = () => new Promise(resolve => setImmediate(resolve));

test.describe('Version-pinned native contract snippets with mocked dependencies', { timeout: 12000 }, () => {
for (const baseline of fixtures.baselines) {
  const label = `[native snippets ${baseline.id}; mocked host]`;
  const is18 = baseline.version.startsWith('1.18.');
  test(`${label} selectPreset has the upstream void / promise return contract`, options, async t => {
    const f = await nativeHost(baseline); t.after(() => f.cleanup());
    const completed = deferred();
    f.events.on('changed', payload => { if (payload.name === 'B') completed.resolve(); });
    const result = f.native.manager.selectPreset(f.native.manager.findPreset('B'));
    if (is18) assert.equal(result, undefined);
    else assert.equal(typeof result?.then, 'function');
    await completed.promise; await result;
    assert.equal(f.native.manager.getSelectedPresetName(), 'B');
    assert.deepEqual(copy(f.native.manager.getCompletionPresetByName('B')), f.records.get('B'));
  });

  test(`${label} subscribes before selection and waits through BEFORE + AFTER; wrong events cannot unlock`, options, async t => {
    const f = await nativeHost(baseline);
    const adapter = await createSTAdapter(f.host);
    const before = f.gate('before'), after = f.gate('after');
    t.after(() => { before.release(); after.release(); adapter.dispose(); f.cleanup(); });
    const baselineListeners = f.events.count('changed');
    let settled = false;
    const pending = adapter.select('B', await adapter.read());
    pending.then(() => { settled = true; }, () => { settled = true; });
    await before.entered;
    assert(f.controls.changes.at(-1).completionListenersBeforeTrigger > baselineListeners);
    assert.equal(settled, false);
    await f.events.emit('changed', { apiId: 'textgenerationwebui', name: 'B' });
    await f.events.emit('changed', { apiId: 'openai', name: 'A' });
    await turn(); assert.equal(settled, false);
    before.release(); await after.entered;
    assert.equal(f.live.prompts[0].content, 'B');
    await turn(); assert.equal(settled, false, 'visible settings are not the AFTER completion barrier');
    after.release();
    const selected = await pending;
    assert.equal(selected.name, 'B');
    assert.equal(f.events.count('changed'), baselineListeners);
    assert.equal(f.controls.activeTimers.size, 0);
  });

  test(`${label} native save/create/rename/delete retain complete raw JSON and unrelated presets`, options, async t => {
    const f = await nativeHost(baseline), adapter = await createSTAdapter(f.host);
    t.after(() => { adapter.dispose(); f.cleanup(); });
    const originalA = copy(f.records.get('A')), originalB = copy(f.records.get('B'));
    const a = await adapter.read(), edited = copy(a.raw);
    edited.prompts[1].name = '只改标题';
    const saved = await adapter.save(a, edited);
    assert.deepEqual(saved.raw, edited);
    assert.deepEqual(f.records.get('A'), edited);
    assert.deepEqual(edited.prompt_order, originalA.prompt_order);
    const created = await adapter.create(saved, 'A copy', edited);
    assert.equal(created.name, 'A copy');
    assert.deepEqual(created.raw, edited);
    assert.deepEqual(f.records.get('A'), edited);
    const renamed = await adapter.rename(created, 'Renamed');
    assert.equal(renamed.name, 'Renamed');
    assert(!f.records.has('A copy'));
    assert.deepEqual(f.records.get('Renamed'), edited);
    const deleted = await adapter.remove(renamed);
    assert.equal(deleted.name, 'A');
    assert(!f.records.has('Renamed'));
    assert.deepEqual(f.records.get('A'), edited);
    assert.deepEqual(f.records.get('B'), originalB);
    const saves = f.controls.http.filter(call => call.pathname === '/api/presets/save');
    assert.equal(saves.length, 3);
    for (const call of saves) assert.deepEqual(call.body.preset, edited);
  });

  test(`${label} preserves pollinations_endpoint with the version-specific native live target`, options, async t => {
    for (const bound of [true, false]) {
    const endpoint = 'https://endpoint.invalid/synthetic';
    const f = await nativeHost(baseline, { extra: { pollinations_endpoint: endpoint } });
    f.live.bind_preset_to_connection = bound;
    const adapter = await createSTAdapter(f.host); t.after(() => { adapter.dispose(); f.cleanup(); });
    assert.equal(Object.hasOwn(f.native.settingsToUpdate, 'pollinations_endpoint'), !is18);
    assert.equal(f.live.pollinations_endpoint, is18 ? 'host-default' : endpoint);
    const snapshot = await adapter.read(); assert.equal(snapshot.raw.pollinations_endpoint, endpoint);
    const edited = copy(snapshot.raw); edited.prompts[1].name = 'endpoint preserved';
    await adapter.save(snapshot, edited);
    assert.equal(f.records.get('A').pollinations_endpoint, endpoint);
    f.live.pollinations_endpoint = 'manually changed';
    if (is18 || !bound) assert.equal((await adapter.read()).raw.pollinations_endpoint, endpoint);
    else await assert.rejects(adapter.read(), /未保存修改/);
    }
  });

  test(`${label} preserves unmigrated model values and rejects actual connection edits`, options, async t => {
    const model = is18 ? 'gemini-3.1-flash-lite-preview' : 'constructor';
    const f = await nativeHost(baseline, { extra: { google_model: model } });
    const adapter = await createSTAdapter(f.host); t.after(() => { adapter.dispose(); f.cleanup(); });
    assert.equal(f.live.google_model, model);
    const original = await adapter.read();
    assert.equal((await adapter.save(original, original.raw)).raw.google_model, model);
    f.live.google_model = 'a-different-model';
    await assert.rejects(adapter.read(), /未保存修改/);
  });

  test(`${label} timeout/dispose release subscriptions even while native BEFORE is pending`, options, async t => {
    for (const mode of ['timeout', 'dispose']) {
      const f = await nativeHost(baseline, { timeoutMs: mode === 'timeout' ? 35 : 1000 });
      const adapter = await createSTAdapter(f.host), gate = f.gate('before');
      t.after(() => { gate.release(); adapter.dispose(); f.cleanup(); });
      const subscriptions = f.events.count('changed');
      const pending = adapter.select('B', await adapter.read());
      const rejected = assert.rejects(pending, mode === 'timeout' ? /超时/ : /停用/);
      await gate.entered;
      if (mode === 'dispose') adapter.dispose();
      await rejected;
      assert.equal(f.events.count('changed'), mode === 'dispose' ? 0 : subscriptions);
      assert.equal(f.controls.activeTimers.size, 0);
      gate.release(); await turn();
      adapter.dispose();
      assert.equal(f.events.count('changed'), 0);
    }
  });

  if (!is18) {
    test(`${label} all three google/vertexai migrations are comparison-only and raw remains unchanged`, options, async t => {
      for (const stable of ['gemini-3.1-flash-lite', 'gemini-3.1-flash-image', 'gemini-3-pro-image']) {
        const legacy = stable + '-preview';
        const f = await nativeHost(baseline, { extra: { google_model: legacy, vertexai_model: legacy } });
        const adapter = await createSTAdapter(f.host); t.after(() => { adapter.dispose(); f.cleanup(); });
        assert.equal(f.live.google_model, stable); assert.equal(f.live.vertexai_model, stable);
        const snapshot = await adapter.read();
        assert.equal(snapshot.raw.google_model, legacy); assert.equal(snapshot.raw.vertexai_model, legacy);
        const edited = copy(snapshot.raw); edited.prompts[1].name = 'model migration preserved';
        const saved = await adapter.save(snapshot, edited);
        assert.deepEqual(saved.raw, edited); assert.deepEqual(f.records.get('A'), edited);
        f.live.google_model = 'other-user-selected-model';
        await assert.rejects(adapter.read(), /未保存修改/);
        f.live.google_model = stable; f.live.vertexai_model = 'other-user-selected-model';
        await assert.rejects(adapter.read(), /未保存修改/);
        adapter.dispose();
      }
    });

    test(`${label} PRESET_CHANGED alone cannot trap timeout/dispose in a later native listener`, options, async t => {
      for (const mode of ['timeout', 'dispose']) {
        const f = await nativeHost(baseline, { timeoutMs: mode === 'timeout' ? 35 : 1000 });
        const adapter = await createSTAdapter(f.host), entered = deferred(), release = deferred();
        let tailListener;
        // Register after the adapter's completion listener, while native application is beginning.
        f.events.on('before', () => {
          tailListener = async payload => { if (payload.name === 'B') { entered.resolve(); await release.promise; } };
          f.events.on('changed', tailListener);
        });
        t.after(() => { release.resolve(); adapter.dispose(); f.cleanup(); });
        const permanent = f.events.count('changed');
        let settled = false;
        const pending = adapter.select('B', await adapter.read());
        pending.then(() => { settled = true; }, () => { settled = true; });
        const rejected = assert.rejects(pending, mode === 'timeout' ? /超时/ : /停用/);
        await entered.promise;
        assert.equal(settled, false);
        assert(f.events.history.some(item => item.event === 'changed' && item.payload.name === 'B'));
        if (mode === 'dispose') adapter.dispose();
        await rejected;
        assert.equal(f.controls.activeTimers.size, 0);
        assert.equal(f.events.count('changed'), mode === 'dispose' ? 1 : permanent + 1, 'only fixture tail listener may remain beyond permanent subscriptions');
        release.resolve(); await f.native.getPresetApplicationPromise();
        f.events.removeListener('changed', tailListener); adapter.dispose();
        assert.equal(f.events.count('changed'), 0);
      }
    });
  }
}
});
