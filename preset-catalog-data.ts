// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

const repository = 'SheepSheepLab/MieMie-Presets';
const web = `https://github.com/${repository}/releases`;
export const api = `https://api.github.com/repos/${repository}/releases`;
export const raw = `https://raw.githubusercontent.com/${repository}`;
const maxFileBytes = 8 * 1024 * 1024;
export const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export interface CatalogItem {
  key: string;
  kind: 'preset' | 'regex';
  name: string;
  version: string;
  variant: string;
  tag: string;
  releaseId: number;
  path: string;
  filename: string;
  size: number;
  sha256: string;
  compatiblePresets: readonly string[];
}

export interface CatalogRelease {
  tag: string;
  id: number;
  publishedAt?: string;
  body: string;
}

export function releaseLink(tag: string): string {
  return `${web}/tag/${encodeURIComponent(tag)}`;
}

export function fileMirrorPath(item: CatalogItem): string {
  return `/v1/files/${item.sha256}/${item.filename}`;
}

export function parseCatalog(data: unknown): CatalogItem[] {
  if (!record(data) || data.schemaVersion !== 1 || !Array.isArray(data.presets) || !Array.isArray(data.regex)) {
    throw Error('预设下载目录格式不兼容。');
  }
  const items: CatalogItem[] = [];
  const keys = new Set<string>();
  for (const kind of ['preset', 'regex'] as const) {
    const entries: unknown[] = kind === 'preset' ? data.presets : data.regex;
    for (const entry of entries) {
      if (!record(entry) || entry.id !== (kind === 'preset' ? 'miemie.preset' : 'miemie.preset.regex') ||
          typeof entry.version !== 'string' || !/^\d+(?:\.\d+){1,2}$/.test(entry.version) ||
          !record(entry.release) || !Array.isArray(entry.variants)) throw Error('下载目录包含无效的版本记录。');
      const version = entry.version;
      const tag = `miemie-preset${kind === 'regex' ? '-regex' : ''}-v${version}`;
      const releaseId = entry.release.id;
      if (entry.release.tag !== tag || entry.release.url !== releaseLink(tag) || typeof releaseId !== 'number' ||
          !Number.isSafeInteger(releaseId) || releaseId <= 0) throw Error('下载目录中的发行信息不一致。');
      for (const item of entry.variants) {
        if (!record(item) || typeof item.id !== 'string' || !/^[a-z0-9-]+$/.test(item.id) ||
            typeof item.name !== 'string' || !item.name.trim() || typeof item.size !== 'number' ||
            !Number.isSafeInteger(item.size) || item.size <= 0 || item.size > maxFileBytes ||
            typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256) || !record(item.asset) ||
            typeof item.asset.name !== 'string' || !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.json$/.test(item.asset.name)) {
          throw Error('下载目录包含无效的 JSON 附件记录。');
        }
        const filename = item.asset.name;
        const path = `${kind === 'preset' ? 'presets' : 'regex'}/ver${version}/${filename}`;
        const key = `${tag}/${item.id}`;
        if (item.path !== path || item.asset.downloadUrl !== `${web}/download/${tag}/${filename}` || keys.has(key)) {
          throw Error('下载目录中的附件路径或标识不一致。');
        }
        keys.add(key);
        const compatiblePresets = Array.isArray(entry.compatiblePresets) ? entry.compatiblePresets.flatMap(preset =>
          record(preset) && preset.id === 'miemie.preset' && typeof preset.version === 'string' &&
          (!Array.isArray(preset.variantIds) || preset.variantIds.includes(item.id)) ? [preset.version] : []) : [];
        items.push({ key, kind, name: item.name, version, variant: item.id, tag, releaseId, path, filename,
          size: item.size, sha256: item.sha256, compatiblePresets });
      }
    }
  }
  return items.sort((a, b) => b.version.localeCompare(a.version, 'en', { numeric: true }));
}

export function parseRelease(value: unknown): CatalogRelease | undefined {
  if (!record(value) || typeof value.tag_name !== 'string' || typeof value.id !== 'number' || value.draft === true) return;
  const publishedAt = typeof value.published_at === 'string' && Number.isFinite(Date.parse(value.published_at)) ? value.published_at : undefined;
  return { tag: value.tag_name, id: value.id, publishedAt, body: typeof value.body === 'string' ? value.body.trim() : '' };
}
