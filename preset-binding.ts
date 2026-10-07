// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
export const BINDING_NAMESPACE = 'miemie.preset-manager';
export interface BindingRecord { nativeName: string; tombstone?: true }
export interface GlobalBindingSettings {
  schemaVersion: 1; revision: number; defaultBindingId: string | null;
  bindings: Record<string, BindingRecord>;
}
export interface ChatBinding { schemaVersion: 1; presetBindingId: string }
export type ChatIdentity = { kind: 'none'; key: 'none' } |
  { kind: 'single'; key: string; avatar: string; filename: string; characterName: string } |
  { kind: 'group'; key: string; groupId: string; filename: string };
export type BindingMode = 'no-chat' | 'inherit' | 'override' | 'missing';
export type ApplicationStatus = 'starting' | 'reconciling' | 'ready' | 'paused-dirty' | 'error';
export interface BindingState {
  chat: ChatIdentity; mode: BindingMode; status: ApplicationStatus;
  defaultName: string | null; targetName: string | null; appliedName: string | null;
  error: string; epoch: number; operation: number;
}
export const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => same(v, b[i]));
  if (!object(a) || !object(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && same(a[k], b[k]));
}
export function parseGlobal(value: unknown): GlobalBindingSettings | null {
  if (value === undefined) return null;
  if (!object(value) || value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0
    || !(value.defaultBindingId === null || typeof value.defaultBindingId === 'string') || !object(value.bindings))
    throw Error('预设绑定配置无效；已停止自动应用，原配置未覆盖。');
  for (const [id, record] of Object.entries(value.bindings)) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      || !object(record) || typeof record.nativeName !== 'string' || !record.nativeName.trim()
      || (record.tombstone !== undefined && record.tombstone !== true)) throw Error('预设绑定映射无效，已停止操作。');
  }
  if (typeof value.defaultBindingId === 'string' && !Object.hasOwn(value.bindings, value.defaultBindingId))
    throw Error('默认预设映射缺失，已停止操作。');
  return structuredClone(value) as unknown as GlobalBindingSettings;
}
export function parseChat(value: unknown): ChatBinding | null {
  if (value === undefined) return null;
  if (!object(value) || value.schemaVersion !== 1 || typeof value.presetBindingId !== 'string' || !value.presetBindingId)
    throw Error('当前对话的预设绑定无效，未覆盖原 metadata。');
  return { schemaVersion: 1, presetBindingId: value.presetBindingId };
}
export function register(settings: GlobalBindingSettings, name: string, fresh = false, uuid = () => crypto.randomUUID()): string {
  if (!fresh) for (const [id, item] of Object.entries(settings.bindings))
    if (!item.tombstone && item.nativeName === name) return id;
  if (fresh) for (const item of Object.values(settings.bindings)) if (item.nativeName === name) item.tombstone = true;
  const id = uuid();
  if (Object.hasOwn(settings.bindings, id)) throw Error('绑定 ID 重复，已停止操作。');
  settings.bindings[id] = { nativeName: name }; return id;
}
export function renamed(settings: GlobalBindingSettings, from: string, to: string): void {
  for (const item of Object.values(settings.bindings)) if (!item.tombstone && item.nativeName === from) item.nativeName = to;
}
export function resolve(settings: GlobalBindingSettings, chat: ChatIdentity, binding: ChatBinding | null) {
  const name = (id: string | null) => id && Object.hasOwn(settings.bindings, id) && !settings.bindings[id].tombstone
    ? settings.bindings[id].nativeName : null;
  const defaultName = name(settings.defaultBindingId);
  const override = binding ? name(binding.presetBindingId) : null;
  return { defaultName, targetName: override ?? defaultName,
    mode: (chat.kind === 'none' ? 'no-chat' : binding ? override ? 'override' : 'missing' : 'inherit') as BindingMode };
}
export function syncDirectory(settings: GlobalBindingSettings, supported: string[], names = supported): void {
  for (const item of Object.values(settings.bindings)) if (!names.includes(item.nativeName)) item.tombstone = true;
  const current = settings.defaultBindingId && settings.bindings[settings.defaultBindingId];
  if (current && !current.tombstone && !supported.includes(current.nativeName))
    throw Error('默认预设仍存在但无法安全读取，未将读取失败当作删除。');
  if (!current || current.tombstone) settings.defaultBindingId = supported.length ? register(settings, supported[0]) : null;
}
