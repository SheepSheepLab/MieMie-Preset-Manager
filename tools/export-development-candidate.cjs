// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Run npm run build first. Only labels a local artifact; never allocates a release version.
const fs=require('node:fs'),path=require('node:path'),{createPackage}=require('./package-v1.cjs');
const root=path.resolve(__dirname,'..'),destination=path.resolve(process.argv[2]||path.join(root,'delivery/MieMie-Preset-Manager-Native-Position-Combined-DEV.json'));
if(!path.basename(destination).endsWith('-DEV.json'))throw Error('Development output must end with -DEV.json');
const manifest=require('../manifest.json'),code=fs.readFileSync(path.join(root,'delivery/preset-manager.js'),'utf8');
const {artifact}=createPackage(manifest,code);
artifact.name=`咩咩预设管理 · 窗口定位修复合并开发候选（基于 ${manifest.version}）`;
artifact.info='LOCAL DEVELOPMENT CANDIDATE · Native Position Fix + Batch Migration UX + Single-item Categories · 未发布，正式版本待 Owner 决定。\n'+artifact.info;
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(artifact,null,2)+'\n');console.log(destination);
