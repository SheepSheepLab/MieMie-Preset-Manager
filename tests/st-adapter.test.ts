// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import assert from 'node:assert/strict';
import test from 'node:test';
import { createSTAdapter, PresetOperationError } from '../st-adapter';
import type { RawPreset } from '../contracts';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function preset(content = 'text'): RawPreset {
  return {
    temperature: 0.7, future_top: { untouched: ['x', 2] },
    prompts: [{ identifier: 'main', name: 'Main', system_prompt: true, role: 'system', content },
      { identifier: 'custom', name: 'Custom', system_prompt: false, role: 'user', content: 'custom', future_prompt: { x: 1 } }],
    prompt_order: [
      { character_id: 100000, future_group: 1, order: [{ identifier: 'custom', enabled: false, future_order: 5 }] },
      { character_id: 100001, order: [{ identifier: 'main', enabled: true }, { identifier: 'custom', enabled: true }] },
    ],
  };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
function fake(version = '1.19.0') {
  const records = new Map<string, RawPreset>([['A', preset()], ['B', preset('other')]]);
  const names: Record<string, number> = { A: 0, B: 1 };
  const presets: RawPreset[] = [copy(records.get('A')!), copy(records.get('B')!)];
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const events = { OAI_PRESET_CHANGED_BEFORE: 'before', PRESET_CHANGED: 'changed', PRESET_DELETED: 'deleted', PRESET_RENAMED: 'renamed', SETTINGS_UPDATED: 'settings' };
  const on = (event: string, fn: (...args: unknown[]) => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(fn);
  };
  const emit = (event: string, payload?: unknown) => { for (const fn of [...(listeners.get(event) ?? [])]) fn(payload); };
  let selected = 'A';
  const live: Record<string, unknown> = {};
  const controls = {
    failSave: false, failDelete: false, diskFailure: false,
    saveGate: undefined as undefined | ReturnType<typeof deferred>,
    saveStarted: undefined as undefined | ReturnType<typeof deferred>,
    deleteGate: undefined as undefined | ReturnType<typeof deferred>,
    deleteStarted: undefined as undefined | ReturnType<typeof deferred>,
    saveCalls: 0,
  };
  const applyLive = (name: string) => {
    const raw = presets[names[name]];
    Object.keys(live).forEach(key => delete live[key]);
    Object.assign(live, copy(raw), { temp_openai: raw.temperature, bind_preset_to_connection: false, extensions: raw.extensions ?? {} });
  };
  const manager = {
    getSelectedPresetName: () => selected,
    findPreset: (name: string) => names[name],
    getCompletionPresetByName: (name: string) => presets[names[name]],
    getPresetList: () => ({ presets, preset_names: names, settings: live }),
    selectPreset(value: number): void | Promise<void> {
      const application = (async () => {
        const name = Object.keys(names).find(key => names[key] === value)!;
        if (!name) throw new Error('Missing name');
        selected = name;
        emit('before', { presetName: name });
        await Promise.resolve();
        applyLive(name);
        emit('changed', { apiId: 'openai', name });
      })();
      return version.startsWith('1.18.') ? undefined : application;
    },
    updateList(name: string, value: RawPreset) {
      if (names[name] === undefined) names[name] = presets.length;
      presets[names[name]] = copy(value);
      void manager.selectPreset(names[name]);
    },
    async savePreset(name: string, value: RawPreset, options: { skipUpdate: boolean }) {
      assert.equal(options.skipUpdate, true);
      controls.saveCalls++;
      controls.saveStarted?.resolve();
      await controls.saveGate?.promise;
      if (controls.failSave) throw new Error('Network failure');
      records.set(name, copy(value));
    },
    async deletePreset(name: string) {
      delete names[name]; // Native code changes cache before receiving the server response.
      controls.deleteStarted?.resolve();
      await controls.deleteGate?.promise;
      if (controls.failDelete) return false;
      records.delete(name);
      return true;
    },
  };
  applyLive('A');
  const ctx = {
    getPresetManager: () => manager,
    getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'fixture' }),
    chatCompletionSettings: live,
    eventTypes: events,
    eventSource: { on, removeListener: (event: string, fn: (...args: unknown[]) => void) => listeners.get(event)?.delete(fn) },
  };
  const promptManager = { configuration: { promptOrder: { strategy: 'global', dummyId: 100001 } } };
  const host = {
    location: { href: 'http://localhost:8000/' },
    SillyTavern: { getContext: () => ctx },
    TavernHelper: { getTavernVersion: () => version, builtin: { promptManager } },
    fetch: async (url: string, init: RequestInit) => {
      assert.equal(url, 'http://localhost:8000/api/settings/get');
      assert.equal(init.method, 'POST');
      if (controls.diskFailure) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => ({ openai_setting_names: [...records.keys()], openai_settings: [...records.values()].map(value => JSON.stringify(value)) }) };
    },
    setTimeout, clearTimeout,
  } as unknown as Window;
  return { host, records, names, presets, live, controls, manager, listeners, ctx, promptManager };
}

for (const version of ['1.14.0', '1.15.0', '1.16.0', '1.17.0']) {
  test(version + ' preserves a newer preset setting absent from the live host', async () => {
    const f = fake(version);
    f.records.get('A')!.pollinations_endpoint = 'https://example.invalid/v1';
    const adapter = await createSTAdapter(f.host);
    try {
      const snapshot = await adapter.read();
      assert.equal(snapshot.raw.pollinations_endpoint, 'https://example.invalid/v1');
      f.live.temp_openai = 1.4;
      await assert.rejects(adapter.read(), /未保存/);
      assert.equal(f.controls.saveCalls, 0);
    } finally {
      adapter.dispose!();
    }
  });
}

test('TT Agent markers and native order additions preserve raw data and reject other live edits', async t => {
  const f = fake();
  const adapterHost = Object.assign(f.host, {
    __TAURITAVERN_HOST__: {}, __TAURI_INTERNALS__: { invoke() {} },
  });
  const older = await createSTAdapter(adapterHost);
  assert.deepEqual((await older.read()).raw, f.records.get('A'));
  older.dispose?.();
  Object.assign(f.promptManager, {
    ensureAgentPromptOrderReferences() {},
    normalizeAgentPromptMarkerDefinitions() {},
  });
  const adapter = await createSTAdapter(adapterHost);
  t.after(() => adapter.dispose?.());
  const original = copy(f.records.get('A')!);
  const live = f.live as unknown as RawPreset;
  const markers = [
    ['agentSystemPrompt', 'Agent System Prompt', 'system'],
    ['agentTask', 'Agent Task', 'user'],
    ['agentResults', 'Agent Results', 'system'],
  ] as const;
  for (const [identifier, name, role] of markers) {
    live.prompts.push({ identifier, name, role, content: '', system_prompt: true, marker: true });
  }
  for (const group of live.prompt_order) {
    const [system, task, results] = markers.map(([identifier]) => ({ identifier, enabled: true }));
    if (group.character_id === 100001) group.order.unshift(system);
    else group.order.push(system);
    group.order.push(task, results);
  }
  assert.deepEqual((await adapter.read()).raw, original);
  const regular = await createSTAdapter({ ...f.host, __TAURITAVERN_HOST__: undefined } as Window);
  t.after(() => regular.dispose?.());
  await assert.rejects(regular.read(), /未保存修改/);
  live.prompts[1].content = 'native unsaved content';
  await assert.rejects(adapter.read(), /未保存修改/);
  live.prompts[1].content = original.prompts[1].content;
  live.prompt_order[1].order.at(-1)!.enabled = false;
  await assert.rejects(adapter.read(), /未保存修改/);
  assert.deepEqual(f.records.get('A'), original);
  assert.equal(f.controls.saveCalls, 0);
});

test('TT writes the preset filename as its internal name while verifying all other data', async t => {
  const f = fake();
  const order = (characterId: number) => [
    ...(characterId === 100001 ? ['agentSystemPrompt', 'main', 'custom'] : ['custom', 'agentSystemPrompt']),
    'agentTask', 'agentResults',
  ];
  const setup = (raw: RawPreset) => {
    raw.prompts.push(
      { identifier: 'agentSystemPrompt', name: 'Agent System Prompt', role: 'system', content: '', system_prompt: true, marker: true },
      { identifier: 'agentTask', name: 'Agent Task', role: 'user', content: '', system_prompt: true, marker: true },
      { identifier: 'agentResults', name: 'Agent Results', role: 'system', content: '', system_prompt: true, marker: true },
    );
    for (const group of raw.prompt_order) group.order = order(Number(group.character_id)).map(identifier => ({ identifier, enabled: true }));
  };
  setup(f.records.get('A')!);
  setup(f.live as unknown as RawPreset);
  const adapter = await createSTAdapter(Object.assign(f.host, {
    __TAURITAVERN_HOST__: {}, __TAURI_INTERNALS__: { invoke() {} },
  }));
  t.after(() => adapter.dispose?.());
  const source = await adapter.read();
  const raw = copy(source.raw);
  raw.name = 'Default';
  const output = await adapter.create(source, 'New TT preset', raw);
  assert.deepEqual(output.raw, { ...raw, name: 'New TT preset' });
  assert.deepEqual(f.records.get('A'), source.raw);
  const next = copy(output.raw);
  next.prompts[1].content = 'explicitly saved prompt';
  assert.deepEqual((await adapter.save(output, next)).raw, next);
  assert.equal(f.controls.saveCalls, 2);
});

for (const version of ['1.18.0', '1.19.0']) {
test(version + ' migration source read is disk-only, detached, never select/apply/save or target receipt', async () => {
  const f = fake(version), adapter = await createSTAdapter(f.host), before = await adapter.read();
  const live = copy(f.live); let selections = 0;
  const select = f.manager.selectPreset; f.manager.selectPreset = value => { selections++; return select(value); };
  const other = await adapter.readPresetByName!('B');
  assert.equal(other.name, 'B'); assert.equal(f.manager.getSelectedPresetName(), 'A');
  assert.deepEqual(f.live, live); assert.equal(selections, 0); assert.equal(f.controls.saveCalls, 0);
  assert.equal((await adapter.read()).revision, before.revision);
  assert.equal(adapter.coversNotifications!(other as never), false);
  other.raw.prompts[0].content = 'temporary'; assert.notEqual(f.records.get('B')!.prompts[0].content, 'temporary');
  const original = await adapter.readPresetByName!('B'); f.records.get('B')!.prompts[0].content = 'source mutation';
  assert.notEqual((await adapter.readPresetByName!('B')).fingerprint, original.fingerprint);
  f.live.temp_openai = 1.4; await adapter.readPresetByName!('B'); await assert.rejects(adapter.read(), /未保存/);
  f.records.delete('B'); await assert.rejects(adapter.readPresetByName!('B'), /删除或重命名/);
  adapter.dispose!(); await assert.rejects(adapter.readPresetByName!('A'), /停用/);
});
test(version + ' missing real capabilities fail before any persistence', async () => {
  const mutations = [
    (f: ReturnType<typeof fake>) => Object.assign(f.manager, { updateList: undefined }),
    (f: ReturnType<typeof fake>) => Object.assign(f.ctx.eventSource, { on: true }),
    (f: ReturnType<typeof fake>) => Object.assign(f.ctx.eventTypes, { PRESET_CHANGED: '' }),
    (f: ReturnType<typeof fake>) => Object.assign(f.ctx.eventTypes, { OAI_PRESET_CHANGED_BEFORE: undefined }),
    (f: ReturnType<typeof fake>) => Object.assign(f.ctx, { chatCompletionSettings: null }),
  ];
  for (const mutate of mutations) {
    const f = fake(version);
    const original = copy([...f.records]);
    mutate(f);
    await assert.rejects(createSTAdapter(f.host), /缺少已核验/);
    assert.equal(f.controls.saveCalls, 0);
    assert.deepEqual([...f.records], original);
    assert.equal([...f.listeners.values()].reduce((sum, set) => sum + set.size, 0), 0);
  }
});

test(version + ' adapter reads the disk object unchanged and preserves defaults/unknown fields', async () => {
  const f = fake(version);
  f.live.show_thoughts = false; // Native default absent from raw is not an unsaved edit.
  const adapter = await createSTAdapter(f.host);
  const snapshot = await adapter.read();
  assert.deepEqual(snapshot.raw, f.records.get('A'));
  snapshot.raw.prompts[0].content = 'local draft';
  assert.equal(f.records.get('A')!.prompts[0].content, 'text');
  adapter.dispose!();
  assert.equal([...f.listeners.values()].reduce((count, set) => count + set.size, 0), 0);
});

test(version + ' adapter blocks unsaved native changes and stale saved revisions', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const snapshot = await adapter.read();
  f.live.temp_openai = 1;
  await assert.rejects(adapter.save(snapshot, snapshot.raw), /未保存修改/);
  assert.equal(f.controls.saveCalls, 0);
  f.live.temp_openai = 0.7;
  f.records.get('A')!.future_top = 'externally saved';
  await assert.rejects(adapter.save(snapshot, snapshot.raw), /其他地方改变/);
  assert.equal(f.controls.saveCalls, 0);
  adapter.dispose!();
});

test(version + ' adapter waits for native selection and verifies current name', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const snapshot = await adapter.select('B', await adapter.read());
  assert.equal(snapshot.name, 'B');
  assert.equal(snapshot.raw.prompts[0].content, 'other');
  adapter.dispose!();
});

test(version + ' save is lossless, persists first, and applies the saved raw', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const snapshot = await adapter.read();
  const next = copy(snapshot.raw);
  next.prompts[1].name = 'Edited title';
  const result = await adapter.save(snapshot, next);
  assert.deepEqual(result.raw, next);
  assert.deepEqual(f.records.get('A'), next);
  assert.deepEqual(f.presets[f.names.A], next);
  assert.deepEqual(result.raw.prompt_order[0], snapshot.raw.prompt_order[0]);
  adapter.dispose!();
});

test(version + ' failed saves do not modify native cache or disk', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const snapshot = await adapter.read();
  f.controls.failSave = true;
  const next = copy(snapshot.raw); next.prompts[1].name = 'Not saved';
  await assert.rejects(adapter.save(snapshot, next), /保存失败/);
  assert.deepEqual(f.presets[f.names.A], snapshot.raw);
  assert.deepEqual(f.records.get('A'), snapshot.raw);
  assert.equal(f.manager.getSelectedPresetName(), 'A');
  adapter.dispose!();
});

test(version + ' external switch during save preserves B and reports persistence to A', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const snapshot = await adapter.read();
  f.controls.saveGate = deferred(); f.controls.saveStarted = deferred();
  const next = copy(snapshot.raw); next.prompts[1].name = 'Saved A';
  const operation = adapter.save(snapshot, next);
  await f.controls.saveStarted.promise;
  await f.manager.selectPreset(f.names.B);
  f.controls.saveGate.resolve();
  await assert.rejects(operation, error => error instanceof PresetOperationError && error.persistedName === 'A');
  assert.equal(f.manager.getSelectedPresetName(), 'B');
  assert.equal((f.live.prompts as RawPreset['prompts'])[0].content, 'other');
  assert.deepEqual(f.records.get('A'), next);
  adapter.dispose!();
});

test(version + ' same-preset live edits during save are preserved and persistence is reported', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const snapshot = await adapter.read();
  f.controls.saveGate = deferred(); f.controls.saveStarted = deferred();
  const next = copy(snapshot.raw); next.prompts[1].name = 'Saved title';
  const operation = adapter.save(snapshot, next);
  await f.controls.saveStarted.promise;
  (f.live.prompts as RawPreset['prompts'])[1].content = 'Unsaved native edit';
  f.controls.saveGate.resolve();
  await assert.rejects(operation, error => error instanceof PresetOperationError && error.persistedName === 'A' && /未保存修改/.test(error.message));
  assert.equal((f.live.prompts as RawPreset['prompts'])[1].content, 'Unsaved native edit');
  assert.equal(f.manager.getSelectedPresetName(), 'A');
  assert.deepEqual(f.records.get('A'), next);
  adapter.dispose!();
});

test(version + ' create preserves source, generates native cache entry, and switches', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const original = await adapter.read();
  const next = await adapter.create(original, 'A copy', original.raw);
  assert.equal(next.name, 'A copy');
  assert.deepEqual(f.records.get('A'), original.raw);
  assert.deepEqual(f.records.get('A copy'), original.raw);
  await assert.rejects(adapter.create(next, 'A COPY', next.raw), /同名/);
  adapter.dispose!();
});

test(version + ' disposal during save reports completed persistence without applying', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const snapshot = await adapter.read();
  f.controls.saveGate = deferred(); f.controls.saveStarted = deferred();
  const operation = adapter.create(snapshot, 'Copied while closing', snapshot.raw);
  await f.controls.saveStarted.promise;
  adapter.dispose!();
  f.controls.saveGate.resolve();
  await assert.rejects(operation, error => error instanceof PresetOperationError && error.persistedName === 'Copied while closing');
  assert.equal(f.manager.getSelectedPresetName(), 'A');
  assert(f.records.has('Copied while closing'));
});

test(version + ' rename failure reports both saved names; delete failure restores original cache', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  f.controls.failDelete = true;
  await assert.rejects(adapter.rename(await adapter.read(), 'Renamed'), error => error instanceof PresetOperationError && error.persistedName === 'Renamed');
  assert(f.records.has('A')); assert(f.records.has('Renamed'));
  assert(f.names.A !== undefined);
  await assert.rejects(adapter.remove(await adapter.read()), /删除失败/);
  assert(f.records.has('A')); assert(f.names.A !== undefined);
  adapter.dispose!();
});

test(version + ' delete selects a survivor and verifies old preset absence', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const result = await adapter.remove(await adapter.read());
  assert.equal(result.name, 'B');
  assert(!f.records.has('A'));
  assert.equal(f.names.A, undefined);
  adapter.dispose!();
});

test(version + ' rename preserves an old preset changed after the new copy was saved', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const originalSelect = f.manager.selectPreset;
  f.manager.selectPreset = async value => {
    await originalSelect(value);
    if (f.manager.getSelectedPresetName() === 'Renamed') f.records.get('A')!.future_top = 'Changed during rename';
  };
  await assert.rejects(adapter.rename(await adapter.read(), 'Renamed'), error => error instanceof PresetOperationError && error.persistedName === 'Renamed');
  assert.equal(f.records.get('A')!.future_top, 'Changed during rename');
  assert(f.records.has('Renamed'));
  assert.equal(f.names.A, 0);
  adapter.dispose!();
});

test(version + ' delete failure does not replace native edits made in the surviving preset', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  f.controls.failDelete = true;
  f.controls.deleteGate = deferred(); f.controls.deleteStarted = deferred();
  const operation = adapter.remove(await adapter.read());
  await f.controls.deleteStarted.promise;
  (f.live.prompts as RawPreset['prompts'])[0].content = 'Unsaved B';
  f.controls.deleteGate.resolve();
  await assert.rejects(operation, /删除失败/);
  assert.equal(f.manager.getSelectedPresetName(), 'B');
  assert.equal((f.live.prompts as RawPreset['prompts'])[0].content, 'Unsaved B');
  assert(f.records.has('A'));
  adapter.dispose!();
});

test(version + ' legacy migration and unsupported hosts fail before writes', async () => {
  const f = fake(version);
  const adapter = await createSTAdapter(f.host);
  const snapshot = await adapter.read();
  const legacy = copy(snapshot.raw); legacy.main_prompt = 'legacy';
  await assert.rejects(adapter.create(snapshot, 'Legacy', legacy), /旧格式迁移/);
  assert.equal(f.controls.saveCalls, 0);
  adapter.dispose!();
  const helper = (f.host as unknown as { TavernHelper: { getTavernVersion(): string } }).TavernHelper;
  for (const unsupported of ['1.13.5', '1.20.0']) {
    helper.getTavernVersion = () => unsupported;
    await assert.rejects(createSTAdapter(f.host), /1\.14\.x–1\.19\.x/);
  }
});

}

for (const version of ['1.18.0', '1.19.0']) {
  test(version + ' exact enabled Helper projection is read-only; other native edits still conflict', async () => {
    const f = fake(version);
    Object.assign(f.records.get('A')!, { openai_max_context: 4096, max_context_unlocked: false });
    Object.assign(f.live, { openai_max_context: 2000000, max_context_unlocked: true });
    Object.assign(f.ctx, { extensionSettings: { tavern_helper: { optimize: { maximize_preset_context_length: true } } } });
    const a = await createSTAdapter(f.host), original = copy(f.records.get('A'));
    const read = await a.read(); assert.deepEqual(read.raw, original);
    f.live.temp_openai = 0.9; await assert.rejects(a.read(), /未保存/); f.live.temp_openai = 0.7;
    f.live.openai_max_context = 12345; await assert.rejects(a.read(), /未保存/);
    f.live.openai_max_context = 2000000;
    Object.assign(f.ctx, { extensionSettings: { tavern_helper: { optimize: { maximize_preset_context_length: false } } } });
    await assert.rejects(a.read(), /未保存/); assert.deepEqual(f.records.get('A'), original); a.dispose!();
  });
  test(version + ' aborted and disposed reads finish even if transport ignores signal', async () => {
    const f = fake(version), a = await createSTAdapter(f.host), controller = new AbortController();
    let observed: AbortSignal | undefined;
    Object.assign(f.host, { fetch: (_url: string, init: RequestInit) => { observed = init.signal as AbortSignal; return new Promise(() => {}); } });
    const reading = a.read(controller.signal); await new Promise(r => setImmediate(r)); controller.abort();
    await assert.rejects(reading, /取消/); assert(observed?.aborted);
    const second = a.read(); await new Promise(r => setImmediate(r)); a.dispose!(); await assert.rejects(second, /取消/);
  });
}
