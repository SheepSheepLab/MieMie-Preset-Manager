// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { syncPresetDownloads } from './sync.mjs';
import { api, raw, releaseLink } from '../preset-catalog-data.ts';

const version = '2027.1.0';
const tag = `miemie-preset-v${version}`;
const name = 'preset.json';
const body = '{"prompts":[]}';
const hash = value => createHash('sha256').update(value).digest('hex');
const metadata = {
  schemaVersion: 1, regex: [], presets: [{
    id: 'miemie.preset', version, release: { tag, id: 91, url: releaseLink(tag) },
    variants: [{
      id: 'standard', name: '预设', path: `presets/ver${version}/${name}`,
      size: Buffer.byteLength(body), sha256: hash(body),
      asset: { name, downloadUrl: releaseLink(tag).replace('/tag/', '/download/') + '/' + name },
    }],
  }],
};

test('publishes a verified snapshot, reuses cached bytes, and retains the prior catalog when the next sync fails', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'miemie-preset-sync-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let manifest = metadata;
  let notes = '首版';
  let assetRequests = 0;
  const path = metadata.presets[0].variants[0].path;
  const request = async url => {
    if (url === `${raw}/main/catalog.json`) return Response.json(manifest);
    if (url === `${api}?per_page=100&page=1`) return Response.json([
      { tag_name: tag, id: 91, published_at: '2026-11-26T14:00:00Z', body: notes, draft: false },
    ]);
    assert.equal(url, `${raw}/${tag}/${path}`);
    assetRequests++;
    return new Response(body);
  };
  const catalogFile = join(directory, 'v1', 'catalog.json');
  assert.deepEqual(await syncPresetDownloads(directory, request), { items: 1, releases: 1 });
  assert.equal(await readFile(join(directory, 'v1', 'files', hash(body), name), 'utf8'), body);
  notes = '更新日志';
  await syncPresetDownloads(directory, request);
  assert.equal(assetRequests, 1);
  const saved = await readFile(catalogFile, 'utf8');
  assert.equal(JSON.parse(saved).releases[0].body, notes);

  manifest = structuredClone(metadata);
  manifest.presets[0].variants[0].sha256 = 'a'.repeat(64);
  await assert.rejects(syncPresetDownloads(directory, request), /SHA-256/);
  assert.equal(await readFile(catalogFile, 'utf8'), saved);

  manifest.presets[0].variants[0].path = '../../outside.json';
  await assert.rejects(syncPresetDownloads(directory, request), /附件路径/);
  assert.equal(await readFile(catalogFile, 'utf8'), saved);
});
