// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
const test=require('node:test'),assert=require('node:assert/strict');
const {nativeHost}=require('./helpers/st-native-host.cjs');
const fixtures=require('./fixtures/st-native-contracts.json');
const {createSTAdapter}=require('../.test-build/st-adapter.js');
const {createController}=require('../.test-build/controller.js');
for(const id of ['1.18.0','1.19.0'])test(`Preset parameters ${id}: native save/readback aliases preserve non-parameter data (mocked dependencies)`,async t=>{
 const f=await nativeHost(fixtures.baselines.find(b=>b.id===id));const adapter=await createSTAdapter(f.host),controller=createController(adapter);t.after(()=>{controller.dispose();f.cleanup();});
 await controller.refresh();const before=structuredClone(controller.state.snapshot.raw);controller.editParameters();
 controller.draftParameters({openai_max_context:200000,openai_max_tokens:30000,n:2,stream_openai:false,temperature:1.1,frequency_penalty:0.3,presence_penalty:-0.2,top_p:0.75,show_thoughts:true,reasoning_effort:'max'});
 await controller.saveParameters();await controller.saveChanges();assert.equal(controller.state.error,'');assert.equal(controller.state.dirty,false);
 await controller.refresh();const raw=controller.state.snapshot.raw;assert.equal(raw.temperature,1.1);assert.equal(raw.openai_max_tokens,30000);assert.equal(f.live.temp_openai,1.1);assert.equal(f.live.reasoning_effort,'max');
 for(const key of ['prompts','prompt_order','extensions','future_top'])assert.deepEqual(raw[key],before[key]);
});
for(const id of ['1.18.0','1.19.0'])test(`Preset parameter Owner defaults ${id}: missing native fields persist after explicit confirmation (mocked dependencies)`,async t=>{
 const f=await nativeHost(fixtures.baselines.find(b=>b.id===id));const adapter=await createSTAdapter(f.host),controller=createController(adapter);t.after(()=>{controller.dispose();f.cleanup();});
 await controller.refresh();const before=structuredClone(controller.state.snapshot.raw);controller.editParameters();assert.equal(controller.state.dirty,false);await controller.saveParameters();assert.equal(controller.state.dirty,true);assert.equal(controller.state.snapshot.raw.openai_max_context,undefined);
 await controller.saveChanges();assert.equal(controller.state.error,'');await controller.refresh();const raw=controller.state.snapshot.raw;
 assert.equal(raw.openai_max_context,2000000);assert.equal(raw.openai_max_tokens,30000);assert.equal(raw.temperature,0.7);assert.equal(raw.top_p,0.9);assert.equal(raw.stream_openai,false);assert.equal(raw.show_thoughts,false);assert.equal(raw.reasoning_effort,'auto');assert.deepEqual(raw.prompts,before.prompts);assert.deepEqual(raw.prompt_order,before.prompt_order);assert.deepEqual(raw.extensions,before.extensions);
});
