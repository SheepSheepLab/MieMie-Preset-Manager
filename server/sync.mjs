// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, raw, parseCatalog, parseRelease, fileMirrorPath } from '../preset-catalog-data.ts';

const catalogLimit = 1024 * 1024;
const releaseListLimit = 8 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });

async function readUpstream(request, url, limit, accept) {
  const response = await request(url, {
    redirect: 'error',
    headers: { Accept: accept },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || !response.body) throw Error(`GitHub HTTP ${response.status} · ${url}`);
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.byteLength;
    if (length > limit) throw Error(`GitHub 文件超出允许大小 · ${url}`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}

async function publish(file, bytes) {
  const pending = `${file}.${randomUUID()}.tmp`;
  await mkdir(dirname(file), { recursive: true });
  try {
    await writeFile(pending, bytes, { flag: 'wx', mode: 0o644 });
    await rename(pending, file);
  } finally {
    await rm(pending, { force: true });
  }
}

function verified(bytes, item) {
  return bytes.byteLength === item.size && createHash('sha256').update(bytes).digest('hex') === item.sha256;
}

async function cachedFile(file, item) {
  try {
    return (await stat(file)).size === item.size && verified(await readFile(file), item);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function readReleases(request, items) {
  const needed = new Map();
  for (const item of items) {
    const previous = needed.get(item.tag);
    if (previous !== undefined && previous !== item.releaseId) throw Error('目录中的发行编号不一致。');
    needed.set(item.tag, item.releaseId);
  }
  const releases = [];
  for (let page = 1; page <= 10 && needed.size; page++) {
    const body = await readUpstream(request, `${api}?per_page=100&page=${page}`, releaseListLimit, 'application/vnd.github+json');
    const list = JSON.parse(decoder.decode(body));
    if (!Array.isArray(list)) throw Error('GitHub 发行列表格式无效。');
    for (const value of list) {
      const release = parseRelease(value);
      if (!release || needed.get(release.tag) !== release.id || !release.publishedAt) continue;
      needed.delete(release.tag);
      releases.push({
        tag_name: release.tag, id: release.id, published_at: release.publishedAt, body: release.body, draft: false,
      });
    }
    if (list.length < 100) break;
  }
  if (needed.size) throw Error('目录所引用的公开发行版本尚未同步。');
  return releases.sort((a, b) => a.id - b.id);
}

export async function syncPresetDownloads(directory, request = fetch) {
  const source = await readUpstream(request, `${raw}/main/catalog.json`, catalogLimit, 'application/json');
  const catalog = JSON.parse(decoder.decode(source));
  const items = parseCatalog(catalog);
  if (!items.length || items.length > 500) throw Error('预设下载目录的文件数量无效。');
  const releases = await readReleases(request, items);
  for (const item of items) {
    const file = join(directory, '.' + fileMirrorPath(item));
    if (await cachedFile(file, item)) continue;
    const bytes = await readUpstream(request, `${raw}/${encodeURIComponent(item.tag)}/${item.path}`, item.size, 'application/json');
    if (!verified(bytes, item)) throw Error(`文件大小或 SHA-256 不匹配 · ${item.filename}`);
    JSON.parse(decoder.decode(bytes));
    await publish(file, bytes);
  }
  const snapshot = Buffer.from(JSON.stringify({ schemaVersion: 1, catalog, releases }) + '\n');
  const manifest = join(directory, 'v1', 'catalog.json');
  const previous = await readFile(manifest).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return undefined;
  });
  if (!previous?.equals(snapshot)) await publish(manifest, snapshot);
  return { items: items.length, releases: releases.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.env.STATE_DIRECTORY || process.argv[2];
  if (!directory) throw Error('请提供缓存目录。');
  const result = await syncPresetDownloads(directory);
  console.log(`已同步 ${result.items} 个文件及 ${result.releases} 份发行记录。`);
}
