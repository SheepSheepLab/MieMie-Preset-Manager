// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const SCRIPT_ID = '98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1';
const REPOSITORY = 'https://github.com/SheepSheepLab/MieMie-Preset-Manager';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
function validateReleaseIdentity(pkg, manifest) {
  if (typeof pkg.version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$(?![\s\S])/.test(pkg.version)
    || pkg.version !== manifest.version || manifest.id !== 'miemie.preset-manager' || manifest.repository !== REPOSITORY
    || pkg.author !== manifest.author || manifest.author !== 'SheepSheep' || manifest.name !== '咩咩预设管理' || manifest.contributes?.launcher?.title !== manifest.name
    || pkg.repository?.url !== REPOSITORY + '.git'
    || manifest.license !== pkg.license || manifest.entry !== 'preset-manager.js') throw Error('Package / Manifest release identity mismatch');
}
function createPackage(manifest, code) {
  const version = manifest.version;
  const identity = {schemaVersion: 1, productId: manifest.id, version, scriptId: SCRIPT_ID, repository: manifest.repository};
  const artifact = {type: 'script', enabled: true, name: `${manifest.name} ${version}`, id: SCRIPT_ID,
    content: '// MieMie-Extension-Build: ' + JSON.stringify(identity) + '\n' + code,
    info: '咩咩预设管理。原生 Chat Completion 预设、局部编辑、未知字段保留、MieMie Hub API v1 / standalone。测试版；请先使用备份预设验证。',
    button: {enabled: false, buttons: []}, data: {}, export_with: {data: true, button: true}};
  const bytes = encode(artifact), name = `MieMie-Preset-Manager-Extension-${version}.json`;
  const metadata = {schemaVersion: 1, format: 'tavern-helper-script', productId: manifest.id, version, tag: 'v' + version,
    scriptId: SCRIPT_ID, manifest, asset: {name, size: bytes.length, sha256: hash(bytes)}, contentSha256: hash(Buffer.from(artifact.content, 'utf8'))};
  const outputs = {[name]: bytes, 'MieMie-Extension-update.json': encode(metadata), 'manifest.json': encode(manifest)};
  if (bytes.length > 16 * 1024 * 1024 || outputs['MieMie-Extension-update.json'].length > 64 * 1024) throw Error('Hub Package v1 size limit exceeded');
  outputs.SHA256SUMS = Buffer.from(Object.entries(outputs).map(([file, data]) => `${hash(data)}  ${file}\n`).join(''));
  return {artifact, metadata, outputs};
}
function writePackage(dir, built) {
  fs.mkdirSync(dir, {recursive: true});
  for (const [file, bytes] of Object.entries(built.outputs)) fs.writeFileSync(path.join(dir, file), bytes);
  // Never generate the obsolete private component metadata alongside Package v1.
  fs.rmSync(path.join(dir, 'component-update-manifest.json'), {force: true});
}
module.exports = {SCRIPT_ID, REPOSITORY, hash, encode, validateReleaseIdentity, createPackage, writePackage};
