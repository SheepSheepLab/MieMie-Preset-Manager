// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../controller';
import { patchParameters, NUMERIC_PARAMETERS, PARAMETER_DEFAULTS, missingParameterDefaults } from '../preset-parameters';
import type { RawPreset, Snapshot, PresetAdapter } from '../contracts';
function fixture() {
  let raw: RawPreset = { temperature: 0.8, reasoning_effort: 'future-level', extensions: { regex: [{ find: 'synthetic' }] },
    future_root: { preserved: true }, prompts: [{ identifier: 'p', name: 'Title', future: { keep: true } }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'p', enabled: true, extra: 1 }] }, { character_id: 'other', order: [], future: 42 }] };
  let saves = 0, name = 'A';
  const read = (): Snapshot => ({ name, names: ['A', 'B'], raw: structuredClone(raw), activeGroupId: 100001, revision: name + JSON.stringify(raw) });
  const adapter: PresetAdapter = { read: async () => read(), save: async (expected, next) => {
    assert.equal(expected.revision, read().revision); saves++; raw = structuredClone(next); return read();
  }, select: async next => { name = next; return read(); }, create: async () => { throw Error('unused'); }, rename: async () => { throw Error('unused'); }, remove: async () => { throw Error('unused'); } };
  return { controller: createController(adapter), get raw() { return raw; }, get saves() { return saves; } };
}
test('opening/cancelling absent parameters does not write, Owner defaults stage only on confirmation', async () => {
  const f = fixture(); await f.controller.refresh(); const before = structuredClone(f.raw);
  f.controller.editParameters(); assert.equal(f.controller.state.dirty, false); f.controller.cancelParameters();
  assert.deepEqual(f.raw, before); assert.equal(f.saves, 0);
  f.controller.editParameters(); f.controller.draftParameters({ temperature: 1.2 }); f.controller.cancelParameters();
  assert.equal(f.controller.state.dirty, false); assert.deepEqual(f.raw, before);
  f.controller.editParameters(); await f.controller.saveParameters();
  assert.equal(f.controller.state.dirty, true); assert.equal(f.saves, 0); assert.deepEqual(f.raw, before);
  assert.equal(f.controller.state.pendingRaw?.openai_max_context, 2000000);
  assert.equal(f.controller.state.pendingRaw?.openai_max_tokens, 30000);
  assert.equal(f.controller.state.pendingRaw?.reasoning_effort, 'future-level');
  assert.equal(f.controller.state.pendingRaw?.temperature, 0.8);
  assert.equal(f.controller.state.pendingRaw?.n, undefined);
  await f.controller.saveChanges(); assert.equal(f.saves, 1); assert.equal(f.raw.show_thoughts, false);
});
test('Owner defaults are exact and never replace explicit false, zero or existing settings', () => {
  const empty = { prompts: [], prompt_order: [] };
  assert.deepEqual(missingParameterDefaults(empty), PARAMETER_DEFAULTS);
  const existing = { ...empty, openai_max_context: 1024, openai_max_tokens: 100, temperature: 0, frequency_penalty: -0.5,
    presence_penalty: 0, top_p: 0, stream_openai: true, show_thoughts: true, reasoning_effort: 'high' };
  assert.deepEqual(missingParameterDefaults(existing), {});
  assert.deepEqual(patchParameters(empty, missingParameterDefaults(empty)), { ...empty, ...PARAMETER_DEFAULTS });
});
test('parameters stage locally and save one root patch, retaining prompts/order/regex', async () => {
  const f = fixture(); await f.controller.refresh(); const before = structuredClone(f.raw);
  f.controller.editParameters(); f.controller.draftParameters({ openai_max_context: 200000, openai_max_tokens: 30000, n: 2, temperature: 1, frequency_penalty: -0.2, presence_penalty: 0.5, top_p: 0.9, stream_openai: false, show_thoughts: false, reasoning_effort: 'min' });
  await f.controller.saveParameters(); assert.equal(f.saves, 0); assert.deepEqual(f.raw, before);
  await f.controller.saveChanges(); assert.equal(f.saves, 1); assert.equal(f.raw.openai_max_tokens, 30000);
  for (const key of ['prompts', 'prompt_order', 'extensions', 'future_root']) assert.deepEqual(f.raw[key], before[key]);
  assert.equal(f.controller.state.dirty, false);
});
test('invalid or unknown parameter patch fails without writing or dropping draft', async () => {
  const f = fixture(); await f.controller.refresh(); f.controller.editParameters(); f.controller.draftParameters({ temperature: null });
  await f.controller.saveParameters(); assert(f.controller.state.parametersDraft); assert.match(f.controller.state.error, /无效/); assert.equal(f.saves, 0);
  assert.throws(() => patchParameters(f.raw, { extensions: {} } as never));
  for (const spec of NUMERIC_PARAMETERS) for (const value of [NaN, Infinity, spec.min - 1]) assert.throws(() => patchParameters(f.raw, { [spec.key]: value }));
  assert.throws(() => patchParameters(f.raw, { n: 1.5 })); assert.throws(() => patchParameters(f.raw, { reasoning_effort: 'minimal' }));
});
test('parameter dirty session blocks preset switches; reload discards, host stays untouched', async () => {
  const f = fixture(); await f.controller.refresh(); f.controller.editParameters(); f.controller.draftParameters({ temperature: 1.5 });
  await f.controller.select('B'); assert.equal(f.controller.state.snapshot?.name, 'A'); assert.equal(f.saves, 0);
  await f.controller.reload(); assert.equal(f.controller.state.parametersDraft, null); assert.equal(f.controller.state.dirty, false); assert.equal(f.raw.temperature, 0.8);
});
test('parameter conflict preserves draft and refuses overwrite', async () => {
  const f = fixture(); await f.controller.refresh(); f.controller.editParameters(); f.controller.draftParameters({ temperature: 1.5 });
  f.raw.future_root = { external: true }; await f.controller.refresh(); await f.controller.saveChanges();
  assert.equal(f.controller.state.conflict, true); assert.equal(f.controller.state.parametersDraft?.patch.temperature, 1.5); assert.equal(f.saves, 0);
});
test('parameter and prompt changes share a single dirty session, without clobbering either', async () => {
  const f = fixture(); await f.controller.refresh(); await f.controller.toggle('p'); f.controller.editParameters(); f.controller.draftParameters({ top_p: 0.75 });
  await f.controller.saveParameters(); await f.controller.saveChanges(); assert.equal(f.saves, 1);
  assert.equal(f.raw.prompt_order[0].order[0].enabled, false); assert.equal(f.raw.top_p, 0.75);
});
