// Copyright (C) 2026 SheepSheepLab; SPDX-License-Identifier: GPL-3.0-or-later
// Read-only public GitHub discovery; installs/updates isolated synthetic trees.
// Never executes a downloaded script, sends credentials, or changes a real host.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {webcrypto}=require('node:crypto');
const {REPOSITORY,hash}=require('./package-v1.cjs');
const manifest=require('../manifest.json');
// Share immutable public responses across isolated update scenarios, without credentials.
const publicResponses=new Map();
const fetchPublic=async(url,options)=>{const key=url+' '+(options?.headers?.Accept||'');if(!publicResponses.has(key))publicResponses.set(key,fetch(url,{...options,headers:{...options?.headers,'User-Agent':'MieMie-Preset-Manager-Package-Validation'}}));return (await publicResponses.get(key)).clone();};
const copy=x=>structuredClone(x);
function embeddedVersion(content){const m=content.match(/JSON\.parse\('([^{\n]*\{[^\n]*"id":"miemie.preset-manager"[^\n]*\})'\)/);assert.ok(m);return JSON.parse(m[1]).version;}
(async()=>{
 const source=process.env.HUB_PACKAGE_MODULE||pathToFileURL(path.join(__dirname,'../tests/fixtures/hub-package-v1/src/extension-packages.js')).href;
 const hub=await import(source);
 const api=REPOSITORY.replace('https://github.com/','https://api.github.com/repos/');
 const report={version:manifest.version,host:'isolated synthetic script tree and persistence; not real Tavern Helper',publicDiscovery:false,freshInstall:false,official021Update:false,official022Update:false,updates:[]};
 function manager(initial=[],running=false){let trees=copy(initial);const scripts=()=>trees.flatMap(x=>x.type==='folder'?x.scripts:[x]);
  const m=hub.createExtensionPackageManager({crypto:webcrypto,fetch:fetchPublic,randomUUID:()=> 'synthetic-public-install',getScriptTrees:()=>copy(trees),
   updateScriptTreesWith:fn=>{trees=fn(copy(trees));return copy(trees);},readSavedScript:async id=>copy(scripts().find(s=>s.id===id)||null),
   backup:async()=>{},getRunningVersion:running?()=>embeddedVersion(scripts().find(s=>s.id==='official-release-installed-instance').content):undefined});
  return {m,read:()=>copy(trees)};
 }
 const fresh=manager();try{
  const candidate=await fresh.m.inspect(REPOSITORY);assert.equal(candidate.compatibility,'installable');assert.equal(candidate.version,manifest.version);report.publicDiscovery=true;
  const releases=await (await fetchPublic(api+'/releases?per_page=100',{credentials:'omit'})).json();
  const release=releases.find(r=>r.id===candidate.releaseId);assert.ok(release);assert.equal(release.draft,false);assert.equal(release.prerelease,true);
  report.releaseURL=release.html_url;report.digests=[];
  for(const name of [`MieMie-Preset-Manager-Extension-${manifest.version}.json`,'MieMie-Extension-update.json','manifest.json','SHA256SUMS']){
   const asset=release.assets.find(a=>a.name===name);assert.ok(asset,name);assert.equal(asset.state,'uploaded');
   const r=await fetchPublic(asset.url,{credentials:'omit',headers:{Accept:'application/octet-stream'}});assert.ok(r.ok);const bytes=Buffer.from(await r.arrayBuffer());
   const digest=hash(bytes);assert.equal(asset.digest,'sha256:'+digest);assert.equal(digest,hash(fs.readFileSync(path.join(__dirname,'../delivery',name))));
   report.digests.push({name,sha256:digest});
  }
  const result=await fresh.m.install(candidate);assert.equal(result.ok,true);
  const installed=fresh.read()[0];assert.equal(installed.id,'synthetic-public-install');assert.deepEqual(installed.data,{});assert.equal(embeddedVersion(installed.content),manifest.version);
  assert.equal((await fresh.m.listInstalled())[0].version,manifest.version);report.freshInstall=true;
 }finally{fresh.m.dispose();}
 for(const [oldVersion,oldDigest] of [['0.2.1','071a97a35721688312f631e2c19b4eb6382edef64fef55d97a1573999d60d7c0'],['0.2.2','7ef1df562a850097212aba5fd322bdffe7ca50d7b6149002fe876ce440fbcd58']]){
 const oldBytes=fs.readFileSync(path.join(__dirname,`../delivery/MieMie-Preset-Manager-Extension-${oldVersion}.json`));assert.equal(hash(oldBytes),oldDigest);
 const oldRelease=await (await fetchPublic(api+'/releases/tags/v'+oldVersion,{credentials:'omit'})).json();
 const oldAsset=oldRelease.assets.find(a=>a.name===`MieMie-Preset-Manager-Extension-${oldVersion}.json`);assert.ok(oldAsset);assert.equal(oldAsset.digest,'sha256:'+oldDigest);
 const publicOld=Buffer.from(await (await fetchPublic(oldAsset.url,{credentials:'omit',headers:{Accept:'application/octet-stream'}})).arrayBuffer());assert.equal(hash(publicOld),oldDigest);assert.deepEqual(publicOld,oldBytes);
 for(const enabled of [false,true]){
  const old=JSON.parse(oldBytes);old.id='official-release-installed-instance';old.enabled=enabled;old.data={syntheticSetting:7};
  const other={...copy(old),id:'unrelated-script',name:'Synthetic unrelated',content:'void 0;'};
  const folder={type:'folder',enabled:true,name:'Synthetic folder',id:'existing-folder',icon:'',color:'',scripts:[other,old]};
  const update=manager([folder],enabled);try{
   const c=await update.m.check(manifest.id);assert.equal(c.currentVersion,oldVersion);assert.equal(c.version,manifest.version);assert.equal(c.available,true);
   const result=await update.m.update(manifest.id,c);assert.equal(result.persistence,'confirmed');assert.equal(result.runtimeConfirmed,enabled);
   const saved=update.read()[0],changed=saved.scripts[1];assert.deepEqual({...saved,scripts:undefined},{...folder,scripts:undefined});assert.deepEqual(saved.scripts[0],other);
   assert.deepEqual({...changed,name:old.name,content:old.content},old);assert.equal(embeddedVersion(changed.content),manifest.version);
   assert.equal(hub.parseExtensionBuildIdentity(changed.content).version,manifest.version);assert.equal(changed.name,'咩咩预设管理 '+manifest.version);
   const row=(await update.m.listInstalled())[0];assert.equal(row.version,manifest.version);assert.equal(row.memoryVersion,manifest.version);assert.equal(row.persistenceError,'');
   report.updates.push({from:oldVersion,to:manifest.version,enabled,instanceIdPreserved:changed.id===old.id,dataFolderOrderAndOtherScriptsPreserved:true,displayAndRuntimeConfirmed:true,persistedReadback:row.version});
  }finally{update.m.dispose();}
 }
 }
 report.official021Update=true;report.official022Update=true;report.contentSha256=JSON.parse(fs.readFileSync(path.join(__dirname,'../delivery/MieMie-Extension-update.json'))).contentSha256;
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
