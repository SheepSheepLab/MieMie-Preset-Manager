// SPDX-License-Identifier: GPL-3.0-or-later
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../.test-build/preset-binding.js');
const chat = { kind: 'single', key: 'single/one', avatar: 'synthetic.png', filename: 'one', characterName: 'Synthetic' };
function registry() { const settings = { schemaVersion: 1, revision: 1, defaultBindingId: null, bindings: {} };
  const a = core.register(settings, 'A'), b = core.register(settings, 'B'); settings.defaultBindingId = a; return { settings, a, b }; }
const cases = {
  'absent metadata inherits': () => assert.equal(core.parseChat(undefined), null),
  'inherit resolves global default': () => { const {settings} = registry(); assert.equal(core.resolve(settings,chat,null).targetName,'A'); },
  'override resolves stable binding': () => { const {settings,b} = registry(); assert.equal(core.resolve(settings,chat,{schemaVersion:1,presetBindingId:b}).targetName,'B'); },
  'set default resolves new inherited target': () => { const {settings,b} = registry(); settings.defaultBindingId=b; assert.equal(core.resolve(settings,chat,null).targetName,'B'); },
  'absence remains inherit after choosing default': () => { const {settings} = registry(); assert.equal(core.resolve(settings,chat,core.parseChat(undefined)).mode,'inherit'); },
  'default change affects inherit': () => { const {settings,b} = registry(); settings.defaultBindingId=b; assert.equal(core.resolve(settings,chat,null).targetName,'B'); },
  'default change preserves other overrides': () => { const {settings,a,b} = registry(); settings.defaultBindingId=b; assert.equal(core.resolve(settings,chat,{schemaVersion:1,presetBindingId:a}).targetName,'A'); },
  'bootstrap only absence, invalid configuration fails closed': () => { assert.equal(core.parseGlobal(undefined),null); assert.throws(()=>core.parseGlobal({})); },
  'register preserves existing active ID': () => { const {settings,a} = registry(); assert.equal(core.register(settings,'A'),a); },
  'create obtains fresh UUID': () => { const {settings,a} = registry(); assert.notEqual(core.register(settings,'Created',true),a); },
  'copy obtains different ID': () => { const {settings,b} = registry(); assert.notEqual(core.register(settings,'B copy',true),b); },
  'rename retains ID and chat references': () => { const {settings,b} = registry(); core.renamed(settings,'B','B2'); assert.equal(core.resolve(settings,chat,{schemaVersion:1,presetBindingId:b}).targetName,'B2'); },
  'delete retains override as missing and falls back': () => { const {settings,b} = registry(); core.syncDirectory(settings,['A']); assert.equal(settings.bindings[b].tombstone,true); assert.deepEqual(core.resolve(settings,chat,{schemaVersion:1,presetBindingId:b}),{mode:'missing',defaultName:'A',targetName:'A'}); },
  'default delete uses first supported native order': () => { const {settings} = registry(); core.syncDirectory(settings,['C','B']); assert.equal(core.resolve(settings,chat,null).defaultName,'C'); },
  'empty supported directory sets default None': () => { const {settings} = registry(); core.syncDirectory(settings,[]); assert.equal(settings.defaultBindingId,null); },
  'invalid registry ID rejected': () => { const {settings} = registry(); settings.bindings['bad']={nativeName:'bad'}; assert.throws(()=>core.parseGlobal(settings)); },
  'missing mapping is missing rather than inherit': () => { const {settings} = registry(); assert.equal(core.resolve(settings,chat,{schemaVersion:1,presetBindingId:'unknown'}).mode,'missing'); },
  'same-name new preset never resurrects tombstone': () => { const {settings,b} = registry(); core.syncDirectory(settings,['A']); const fresh=core.register(settings,'B'); assert.notEqual(fresh,b); assert.equal(settings.bindings[b].tombstone,true); },
  'copied branch metadata keeps binding, blank chat inherits': () => { const {settings,b} = registry(); const branch=structuredClone({schemaVersion:1,presetBindingId:b}); assert.equal(core.resolve(settings,chat,branch).targetName,'B'); assert.equal(core.resolve(settings,chat,null).targetName,'A'); },
  'unsupported existing preset is not a confirmed deletion': () => { const {settings,a,b} = registry(); assert.throws(()=>core.syncDirectory(settings,['B'],['A','B']),/仍存在/); assert.equal(settings.defaultBindingId,a); assert.equal(settings.bindings[a].tombstone,undefined); core.syncDirectory(settings,['A'],['A','B']); assert.equal(settings.bindings[b].tombstone,undefined); },
  'literal dotted namespace remains a single key': () => assert.equal(core.BINDING_NAMESPACE,'miemie.preset-manager'),
};
for (const [name, fn] of Object.entries(cases)) test('Binding core: '+name,fn);
