// Copyright (C) 2026 SheepSheepLab; SPDX-License-Identifier: GPL-3.0-or-later
// Actual generated production artifacts; never executes downloaded script content.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const {hash,encode,REPOSITORY,SCRIPT_ID}=require('../tools/package-v1.cjs');
const manifest=require('../manifest.json'),pkg=require('../package.json');
const dir=path.join(__dirname,'../delivery'),read=n=>fs.readFileSync(path.join(dir,n));
const metadata=JSON.parse(read('MieMie-Extension-update.json')),bytes=read(metadata.asset.name),script=JSON.parse(bytes);
const hub=import('./fixtures/hub-package-v1/src/extension-packages.js');
const clone=x=>structuredClone(x);
const release={id:201,tag_name:metadata.tag,draft:false,prerelease:true};
function repack(value){const b=encode(value);return {b,m:{...metadata,asset:{...metadata.asset,size:b.length,sha256:hash(b)},contentSha256:hash(value.content||'')}};}
function fixture(t, {version=manifest.version, trees:initial=[],metadataBytes,missingDigest=false}={}) {
 let trees=clone(initial),writes=0;
 const value=clone(script);if(version!==manifest.version)value.content=value.content.replace(/"version":"0.2.1"/,'"version":"'+version+'"');
 const f=repack(value);f.m.version=version;f.m.tag='v'+version;f.m.manifest={...manifest,version};f.m.asset.name='MieMie-Preset-Manager-Extension-'+version+'.json';
 const mb=metadataBytes||encode(f.m),api=REPOSITORY.replace('https://github.com/','https://api.github.com/repos/');
 const asset=(id,name,b)=>({id,name,size:b.length,state:'uploaded',digest:missingDigest?null:'sha256:'+hash(b),url:api+'/releases/assets/'+id,browser_download_url:REPOSITORY+'/releases/download/v'+version+'/'+name});
 const r={...release,tag_name:'v'+version,assets:[asset(301,f.m.asset.name,f.b),asset(302,'MieMie-Extension-update.json',mb)]};
 return hub.then(({createExtensionPackageManager})=>{
 const response=(b,url)=>{const r=new Response(b);Object.defineProperty(r,'url',{value:url});return r;};
 const manager=createExtensionPackageManager({crypto:webcrypto,randomUUID:()=> 'test-only-install-instance',getScriptTrees:()=>clone(trees),updateScriptTreesWith:fn=>{trees=fn(clone(trees));writes++;return clone(trees);},readSavedScript:async id=>clone(trees.find(x=>x.id===id)||null),backup:async()=>{},fetch:async(url,init)=>{
 assert.equal(init.credentials,'omit');assert.equal(init.headers.Authorization,undefined);
 let b;if(url===api)b=encode({private:false,full_name:'SheepSheepLab/MieMie-Preset-Manager'});else if(url.startsWith(api+'/releases?'))b=encode([r]);else if(url===api+'/releases/201')b=encode(r);else if(url===api+'/releases/assets/301')b=f.b;else if(url===api+'/releases/assets/302')b=mb;else throw Error('Unexpected URL: '+url);return response(b,url);
 }});t.after(()=>manager.dispose());return {manager,read:()=>clone(trees),writes:()=>writes};});
}
test('Production package passes pinned Hub Manifest/metadata/package validators and complete identity',async()=>{
 assert.equal(manifest.author,'SheepSheep');assert.equal(pkg.author,manifest.author);assert.equal(pkg.repository.url,manifest.repository+'.git');
 const h=await hub;assert.deepEqual(h.validateExtensionManifest(manifest,REPOSITORY),manifest);
 h.validateExtensionPackageMetadata(metadata,REPOSITORY,release);assert.deepEqual(await h.validateExtensionPackage(bytes,metadata,webcrypto),script);
 assert.deepEqual(h.parseExtensionBuildIdentity(script.content),{schemaVersion:1,productId:manifest.id,version:pkg.version,scriptId:SCRIPT_ID,repository:REPOSITORY});
 assert.deepEqual(JSON.parse(read('manifest.json')),manifest);assert.equal(script.name,manifest.name+' '+pkg.version);assert.equal(metadata.asset.name,`MieMie-Preset-Manager-Extension-${pkg.version}.json`);
});
test('Production release checksums match every raw file; metadata within 64KiB',()=>{
 for(const line of read('SHA256SUMS').toString().trim().split('\n')){const [digest,name]=line.split('  ');assert.equal(hash(read(name)),digest);}
 assert.ok(read('MieMie-Extension-update.json').length<=65536);assert.ok(bytes.length<=16777216);assert.deepEqual(metadata.manifest,manifest);
});
test('Hub rejects missing manifest fields, unsafe icon, long launcher, API and repository mismatch',async()=>{
 const h=await hub;for(const field of ['schemaVersion','apiVersion','id','name','version','author','description','entry','repository','license']){const x=clone(manifest);delete x[field];assert.throws(()=>h.validateExtensionManifest(x,REPOSITORY),undefined,field);}
 for(const patch of [{icon:'../private.png'},{icon:'data:image/png;base64,abc'},{icon:'/private/icon.png'},{contributes:{launcher:{title:manifest.name,icon:'x'.repeat(17)}}},{hubApi:{min:2,max:2}},{repository:'https://github.com/Someone/Else'}])assert.throws(()=>h.validateExtensionManifest({...manifest,...patch},REPOSITORY));
});
test('Hub rejects invalid tags, filename, unknown metadata/download URL, size and identity mismatch',async()=>{
 const h=await hub;for(const patch of [{tag:'v0.2.1-beta'},{version:'0.2.1\n'},{downloadUrl:'https://example.test/unsafe'},{unknown:true},{asset:{...metadata.asset,name:'咩咩.json'}},{asset:{...metadata.asset,name:'../unsafe.json'}},{asset:{...metadata.asset,size:16777217}},{manifest:{...manifest,id:'miemie.other'}},{manifest:{...manifest,version:'0.2.2'}}])assert.throws(()=>h.validateExtensionPackageMetadata({...metadata,...patch},REPOSITORY,release));
 assert.throws(()=>h.validateExtensionPackageMetadata(metadata,REPOSITORY,{...release,tag_name:'v0.2.2'}));
});
test('Hub rejects corrupted bytes, size/hash/content hash, oversized production package',async()=>{
 const h=await hub;await assert.rejects(h.validateExtensionPackage(Buffer.concat([bytes,Buffer.from(' ')]),metadata,webcrypto));
 await assert.rejects(h.validateExtensionPackage(bytes,{...metadata,asset:{...metadata.asset,sha256:'0'.repeat(64)}},webcrypto));
 await assert.rejects(h.validateExtensionPackage(bytes,{...metadata,contentSha256:'0'.repeat(64)},webcrypto));
 await assert.rejects(h.validateExtensionPackage(Buffer.alloc(16777217),metadata,webcrypto));
});
test('Hub rejects public user data, unknown script fields, scriptID/product/repository/version drift',async()=>{
 const h=await hub;for(const patch of [{data:{testOnly:'inert'}},{unknown:true},{id:'changed'},{content:script.content.replace('miemie.preset-manager','miemie.other')},{content:script.content.replace(REPOSITORY,'https://github.com/Someone/Else')},{content:script.content.replace('"version":"0.2.1"','"version":"0.2.2"')}]){const f=repack({...script,...patch});await assert.rejects(h.validateExtensionPackage(f.b,f.m,webcrypto));}
});
test('Actual Hub discovery selects generated package and installs identified instance without executing code',async t=>{
 const f=await fixture(t),candidate=await f.manager.inspect(REPOSITORY);assert.equal(candidate.compatibility,'installable');assert.equal(candidate.version,pkg.version);
 const result=await f.manager.install(candidate);assert.equal(result.ok,true);assert.equal(f.writes(),1);assert.equal(f.read()[0].id,'test-only-install-instance');assert.deepEqual(f.read()[0].data,{});
 const rows=await f.manager.listInstalled();assert.equal(rows[0].id,manifest.id);assert.equal(rows[0].version,pkg.version);assert.equal((await f.manager.check(manifest.id)).available,false);
});
test('Actual Hub future standard package update preserves instance, settings and other scripts',async t=>{
 const old={...clone(script),id:'existing-instance',enabled:false,data:{testOnlySetting:7}},other={...clone(script),id:'other-instance',content:'void 0;'};
 const f=await fixture(t,{version:'0.2.2',trees:[old,other]});const candidate=await f.manager.check(manifest.id);assert.equal(candidate.available,true);
 await f.manager.update(manifest.id,candidate);const saved=f.read();assert.equal(saved[0].id,old.id);assert.deepEqual(saved[0].data,old.data);assert.equal(saved[0].enabled,false);assert.deepEqual(saved[1],other);assert.equal((await f.manager.listInstalled())[0].version,'0.2.2');
});
test('Legacy 0.2.0 identity without repository is not guessed or eligible for update',async t=>{
 const h=await hub,old=clone(script),id=h.parseExtensionBuildIdentity(script.content);delete id.repository;id.version='0.2.0';old.content='// MieMie-Extension-Build: '+JSON.stringify(id)+'\nvoid 0;';
 assert.equal(h.parseExtensionBuildIdentity(old.content),null);const f=await fixture(t,{trees:[old]});assert.deepEqual(await f.manager.listInstalled(),[]);await assert.rejects(f.manager.check(manifest.id));assert.equal(f.writes(),0);
});
test('Hub discovery rejects metadata over 64KiB and missing GitHub digest before writes',async t=>{
 for(const options of [{metadataBytes:Buffer.alloc(65537,32)},{missingDigest:true}]){const f=await fixture(t,options);await assert.rejects(f.manager.inspect(REPOSITORY));assert.equal(f.writes(),0);}
});
test('Package build and pinned Hub modules never enter production runtime',()=>{
 const code=read('preset-manager.js').toString();for(const needle of ['createExtensionPackageManager','validateExtensionPackageMetadata','extensionLegacyPolisherHash','test-only-install-instance'])assert.equal(code.includes(needle),false,needle);
 assert.deepEqual(script.data,{});for(const forbidden of ['/Users/','/.codex/','/private/var/','CODEX_HOME'])assert.equal(script.content.includes(forbidden),false,forbidden);
});
