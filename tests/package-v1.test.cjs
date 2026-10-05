// Copyright (C) 2026 SheepSheepLab; SPDX-License-Identifier: GPL-3.0-or-later
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {validateReleaseIdentity, createPackage, hash} = require('../tools/package-v1.cjs');
const manifest = require('../manifest.json'), pkg = require('../package.json');
test('Package v1 version gate rejects suffixes, leading zero, newline and drift', () => {
  validateReleaseIdentity(pkg, manifest);
  assert.equal(manifest.author, 'SheepSheep');
  for (const version of ['0.2.1-beta', '00.2.1', '0.2.1\n', '0.2.0', 1, null]) assert.throws(() => validateReleaseIdentity({...pkg, version}, manifest));
  for (const field of ['id','repository','name','license','entry','author']) assert.throws(() => validateReleaseIdentity(pkg, {...manifest,[field]:'incorrect'}));
});
test('Product package author and official repository must match release manifest', () => {
  assert.equal(pkg.author, 'SheepSheep');
  assert.equal(pkg.author, manifest.author);
  assert.equal(pkg.repository.url, manifest.repository + '.git');
  for (const author of ['Test Contributor', 'Test Namespace', '', undefined]) {
    assert.throws(() => validateReleaseIdentity({...pkg, author}, manifest));
    assert.throws(() => validateReleaseIdentity(pkg, {...manifest, author}));
    assert.throws(() => validateReleaseIdentity({...pkg, author}, {...manifest, author}));
  }
  const otherRepository = 'https://github.com/AnotherNamespace/MieMie-Preset-Manager';
  assert.throws(() => validateReleaseIdentity({...pkg, repository: {...pkg.repository, url: otherRepository + '.git'}}, manifest));
  assert.throws(() => validateReleaseIdentity(pkg, {...manifest, repository: otherRepository}));
  assert.throws(() => validateReleaseIdentity({...pkg, repository: {...pkg.repository, url: otherRepository + '.git'}}, {...manifest, repository: otherRepository}));
});
test('Runtime and display identity derive from package manifest, embedded PNG remains Runtime icon', () => {
  const runtime = require('../.test-build/dual-mode.js').PRESET_MANAGER_MANIFEST;
  const display = require('../.test-build/product-identity.js').PRESET_MANAGER_PRODUCT;
  assert.deepEqual({...runtime, icon: manifest.icon}, manifest);
  assert.ok(runtime.icon.startsWith('data:image/png;base64,'));
  assert.equal(display.version, manifest.version); assert.equal(display.name, manifest.name);
});
test('Build identity, metadata and checksums have distinct byte and content hashes', () => {
  const built = createPackage(manifest,'void 0;');
  assert.equal(built.metadata.asset.sha256,hash(built.outputs[built.metadata.asset.name]));
  assert.equal(built.metadata.contentSha256,hash(built.artifact.content));
  assert.notEqual(built.metadata.asset.sha256,built.metadata.contentSha256);
  assert.deepEqual(built.artifact.data,{}); assert.equal(Object.keys(built.artifact).length,9);
});
test('Pinned Hub Package validator and upstream tests retain exact provenance bytes', () => {
  const dir=path.join(__dirname,'fixtures/hub-package-v1'), provenance=require('./fixtures/hub-package-v1/provenance.json');
  assert.equal(provenance.commit,'928362c1eb224afe780801060c6d867e01cf5013');
  for(const [file,digest] of Object.entries(provenance.sha256)) assert.equal(hash(fs.readFileSync(path.join(dir,file))),digest,file);
});
