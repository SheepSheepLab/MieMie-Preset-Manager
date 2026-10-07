// SPDX-License-Identifier: GPL-3.0-or-later
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const {nativeHost}=require('./helpers/st-native-host.cjs');
const baselines=require('./fixtures/st-native-contracts.json').baselines;
for(const version of ['1.18.0','1.19.0'])test(`Entry ${version}: missing binding capability releases previously initialized Adapter`,async t=>{
 const f=await nativeHost(baselines.find(b=>b.version===version));t.after(()=>f.cleanup());
 let error='';const frameListeners=new Map();
 f.host.toastr={error(message){error=message;}};
 const frame={parent:f.host,addEventListener(key,fn){frameListeners.set(key,fn);},removeEventListener(key){frameListeners.delete(key);}};
 const filename=path.resolve(__dirname,'../.test-build/index.js');
 const sandbox=vm.createContext({window:frame,$:fn=>fn(),require:createRequire(filename),exports:{},console,Error});
 vm.runInContext(fs.readFileSync(filename,'utf8'),sandbox,{filename});
 for(let i=0;i<1000&&!error;i++)await new Promise(r=>setImmediate(r));
 assert.match(error,/缺少安全绑定/);assert.equal(frameListeners.size,0);
 assert.equal(f.events.count('before'),0);assert.equal(f.events.count('changed'),0);
 assert.equal(f.host.__MieMiePresetManagerSource,undefined);
});
