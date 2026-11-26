// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

import { bounded } from './async-scope';
import { api, raw, fileMirrorPath, parseCatalog, parseRelease, record, type CatalogItem, type CatalogRelease } from './preset-catalog-data';
export { releaseLink, type CatalogItem, type CatalogRelease } from './preset-catalog-data';

declare const __MIEMIE_PRESET_DOWNLOAD_ORIGIN__: string;
const mirror = typeof __MIEMIE_PRESET_DOWNLOAD_ORIGIN__ === 'string' ? __MIEMIE_PRESET_DOWNLOAD_ORIGIN__ : '';

export async function fetchCatalog(host: Window, signal: AbortSignal): Promise<{
  items: CatalogItem[];
  mirrored: boolean;
  releases: CatalogRelease[];
}> {
  if (mirror) {
    try {
      return await bounded(async request => {
        const response = await host.fetch(`${mirror}/v1/catalog.json`, {
          signal: request, credentials: 'omit', redirect: 'error',
        });
        if (!response.ok) throw Error('官方预设下载服务暂时不可用。');
        const data: unknown = await response.json();
        if (!record(data) || data.schemaVersion !== 1 || !Array.isArray(data.releases))
          throw Error('官方预设下载目录格式无效。');
        const items = parseCatalog(data.catalog);
        const releases = data.releases.flatMap(value => { const release = parseRelease(value); return release ? [release] : []; });
        const byTag = new Map(releases.map(release => [release.tag, release]));
        if (items.some(item => byTag.get(item.tag)?.id !== item.releaseId))
          throw Error('官方预设下载目录中的发行信息不一致。');
        return { items, mirrored: true, releases };
      }, [signal], 2500, '官方预设下载目录读取');
    } catch {
      signal.throwIfAborted();
    }
  }
  const items = await bounded(async request => {
    const response = await host.fetch(`${raw}/main/catalog.json`, { signal: request, credentials: 'omit' });
    if (!response.ok) throw Error(`预设下载目录无法读取（HTTP ${response.status}）。`);
    return parseCatalog(await response.json());
  }, [signal], 10000, '预设下载目录读取');
  return { items, mirrored: false, releases: [] };
}

export function fetchReleases(host: Window, signal: AbortSignal): Promise<CatalogRelease[]> {
  return bounded(async request => {
    const response = await host.fetch(`${api}?per_page=100`, {
      signal: request, credentials: 'omit', headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw Error('GitHub 发行列表暂时无法读取。');
    const list: unknown = await response.json();
    if (!Array.isArray(list)) throw Error('GitHub 发行列表格式无效。');
    return list.flatMap(value => { const release = parseRelease(value); return release ? [release] : []; });
  }, [signal], 8000, '发行列表读取');
}

export function fetchRelease(host: Window, item: CatalogItem, signal: AbortSignal): Promise<CatalogRelease | undefined> {
  return bounded(async request => {
    const response = await host.fetch(`${api}/tags/${encodeURIComponent(item.tag)}`, {
      signal: request, credentials: 'omit', headers: { Accept: 'application/vnd.github+json' },
    });
    if (response.status === 404) return undefined;
    if (!response.ok) throw Error('GitHub 更新日志暂时无法读取。');
    const release = parseRelease(await response.json());
    if (release?.tag !== item.tag || release.id !== item.releaseId) throw Error('发行版本与下载目录不一致。');
    return release;
  }, [signal], 8000, '更新日志读取');
}

export function fetchCatalogFile(host: Window, item: CatalogItem, signal: AbortSignal,
  progress: (bytes: number) => void, mirrored = false): Promise<Uint8Array<ArrayBuffer>> {
  return bounded(async request => {
    const getFile = (url: string, fetchSignal: AbortSignal) =>
      host.fetch(url, { signal: fetchSignal, credentials: 'omit', redirect: 'error' });
    let response: Response | undefined;
    if (mirror && mirrored) {
      const direct = new AbortController();
      const cancel = () => direct.abort();
      request.addEventListener('abort', cancel, { once: true });
      try {
        response = await bounded(async deadline => {
          deadline.addEventListener('abort', cancel, { once: true });
          const result = await getFile(mirror + fileMirrorPath(item), direct.signal);
          if (!result.ok) {
            void result.body?.cancel().catch(() => {});
            throw Error('官方预设下载服务暂时不可用。');
          }
          return result;
        }, [request], 2500, '官方预设下载连接');
      } catch {
        request.throwIfAborted();
      }
    }
    // Responses from either source must match the catalog's size and digest.
    response ??= await getFile(`${raw}/${encodeURIComponent(item.tag)}/${item.path}`, request);
    if (!response.ok) throw Error(`无法读取「${item.name}」（HTTP ${response.status}）。`);
    const bytes = new Uint8Array(item.size);
    const reader = response.body?.getReader();
    if (!reader) throw Error('当前浏览器无法读取下载文件。');
    let loaded = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        if (loaded + next.value.length > bytes.length) throw Error('文件大小与下载目录不一致。');
        bytes.set(next.value, loaded);
        loaded += next.value.length;
        progress(loaded);
      }
    } finally { void reader.cancel().catch(() => {}); }
    if (loaded !== item.size) throw Error('文件大小与下载目录不一致。');
    let digest: string;
    if (host.crypto?.subtle) {
      digest = [...new Uint8Array(await host.crypto.subtle.digest('SHA-256', bytes))]
        .map(byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      const url = new URL('lib.js', host.location.href);
      const { sha256 } = await import(/* webpackIgnore: true */ url.href) as { sha256(bytes: Uint8Array): string };
      digest = sha256(bytes);
    }
    if (digest !== item.sha256) throw Error('下载文件校验失败，请重新读取目录。');
    return bytes;
  }, [signal], 30000, '下载文件');
}
