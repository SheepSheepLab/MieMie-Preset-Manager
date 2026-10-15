// SPDX-License-Identifier: GPL-3.0-or-later
const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../.test-build/preset-binding.js');
const chat={kind:'single',key:'avatar/one',avatar:'role.png',filename:'one',characterName:'Role'};
function setup(){const s={schemaVersion:2,revision:1,defaultBindingId:null,bindings:{}};const a=c.register(s,'A'),b=c.register(s,'B');s.defaultBindingId=a;return{s,a,b};}
const bound=id=>({schemaVersion:2,presetBindingId:id,chatKey:chat.key});
test('v2 isolated namespace leaves v1 out of business storage',()=>assert.equal(c.BINDING_NAMESPACE,'miemie.preset-manager.binding-v2'));
test('new chat is initializing, existing binding stays independent of default',()=>{const{s,a,b}=setup();assert.equal(c.resolve(s,chat,null).mode,'initializing');s.defaultBindingId=b;assert.equal(c.resolve(s,chat,bound(a)).targetName,'A');});
test('copied metadata belongs to the old file; new identity initializes current default',()=>{const{s,a,b}=setup();s.defaultBindingId=b;assert.equal(c.resolve(s,{...chat,key:'avatar/two'},bound(a)).targetName,'B');});
test('rename preserves stable ID; known deletion never resurrects on same-name create',()=>{const{s,b}=setup();c.renamed(s,'B','B2');assert.equal(c.resolve(s,chat,bound(b)).targetName,'B2');c.syncDirectory(s,['A']);assert(s.bindings[b].tombstone);assert.notEqual(c.register(s,'B2'),b);});
test('existing unreadable preset is not deletion',()=>{const{s,a}=setup();assert.throws(()=>c.syncDirectory(s,['B'],['A','B']));assert.equal(s.defaultBindingId,a);assert(!s.bindings[a].tombstone);});
test('confirmed missing default uses supported native order, empty means no target',()=>{const{s}=setup();c.syncDirectory(s,['C','B']);assert.equal(c.resolve(s,chat,null).defaultName,'C');c.syncDirectory(s,[]);assert.equal(s.defaultBindingId,null);});
test('malformed v2 rejected without overwrite; absent namespace bootstraps',()=>{assert.equal(c.parseGlobal(undefined),null);assert.throws(()=>c.parseGlobal({schemaVersion:2}));assert.throws(()=>c.parseChat({schemaVersion:2,presetBindingId:'x'}));const{s}=setup();assert.deepEqual(c.parseGlobal(s),s);});
test('CHAT_RENAMED request filename maps to exact ST sanitize-filename response name',()=>{for(const v of require('./fixtures/chat-filename-contract.json'))assert.equal(c.nativeChatFilename(v.input),v.expected,v.input)});
test('pending rename receipts validate shape and binding IDs, without clearing unrelated fields',()=>{const{s,a}=setup();s.chatRenames={'new':{fromKey:'old',presetBindingId:a}};assert.deepEqual(c.parseGlobal(s),s);s.chatRenames.new.presetBindingId='unknown';assert.throws(()=>c.parseGlobal(s));});
