// SPDX-License-Identifier: GPL-3.0-or-later
const test=require('node:test'),assert=require('node:assert/strict');const{bounded}=require('../.test-build/async-scope.js');
test('deadline aborts transport and resolves wait even for non-cooperative promise',async()=>{let signal;await assert.rejects(bounded(s=>{signal=s;return new Promise(()=>{});},[],10),/超时/);assert(signal.aborted);});
test('already-aborted lifetime never starts operation',async()=>{const c=new AbortController();c.abort();let calls=0;await assert.rejects(bounded(async()=>{calls++;},[c.signal]));assert.equal(calls,0);});
test('normal completion removes abort listeners; late abort cannot change result',async()=>{const c=new AbortController();assert.equal(await bounded(async()=>42,[c.signal]),42);c.abort();});
