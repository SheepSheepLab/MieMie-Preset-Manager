// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

/** Native JSON stays authoritative. Unknown keys at every level are retained. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type NativePrompt = { identifier: string; name?: string; role?: string; content?: string; system_prompt?: boolean; marker?: boolean; injection_position?: number; injection_depth?: number; injection_order?: number; injection_trigger?: string[]; forbid_overrides?: boolean; [key: string]: unknown };
export type OrderEntry = { identifier: string; enabled: boolean; [key: string]: unknown };
export type OrderGroup = { character_id: string | number; order: OrderEntry[]; [key: string]: unknown };
export type RawPreset = { prompts: NativePrompt[]; prompt_order: OrderGroup[]; [key: string]: unknown };
export type Snapshot = { name: string; names: string[]; raw: RawPreset; activeGroupId: string | number; revision: string; version?: string };
export interface PresetAdapter {
  read(): Promise<Snapshot>;
  select(name: string, expected: Snapshot): Promise<Snapshot>;
  save(expected: Snapshot, next: RawPreset): Promise<Snapshot>;
  create(expected: Snapshot, name: string, raw: RawPreset): Promise<Snapshot>;
  rename(expected: Snapshot, name: string): Promise<Snapshot>;
  remove(expected: Snapshot): Promise<Snapshot>;
  subscribe?(callback: () => void): () => void;
  dispose?(): void;
}
export type PromptPatch = Partial<Pick<NativePrompt, 'name' | 'role' | 'content' | 'injection_position' | 'injection_depth' | 'injection_order' | 'injection_trigger' | 'forbid_overrides'>>;
export type Row = { prompt: NativePrompt; enabled: boolean; attached: boolean; category: string; editable: boolean; removable: boolean; canDetach: boolean; toggleable: boolean };
export interface ManagerState { snapshot: Snapshot | null; recovery: { name: string; raw: RawPreset } | null; busy: boolean; error: string; notice: string; category: string; draft: { id: string; patch: PromptPatch; revision: string } | null; }
export interface ManagerController {
  state: ManagerState;
  subscribe(fn: () => void): () => void;
  refresh(): Promise<void>;
  rows(): Row[];
  categories(): string[];
  category(name: string): void;
  select(name: string): Promise<void>;
  importText(name: string, text: string): Promise<void>;
  exportText(): Promise<{ name: string; text: string }>;
  exportRecovery(): { name: string; text: string };
  copyPreset(): Promise<void>;
  newPreset(name: string): Promise<void>;
  renamePreset(name: string): Promise<void>;
  deletePreset(): Promise<void>;
  edit(id: string): void;
  draft(patch: PromptPatch): void;
  cancelEdit(): void;
  saveEdit(): Promise<void>;
  addPrompt(): Promise<void>;
  copyPrompt(id: string): Promise<void>;
  toggle(id: string): Promise<void>;
  detach(id: string): Promise<void>;
  attach(id: string): Promise<void>;
  deletePrompt(id: string): Promise<void>;
  move(id: string, beforeId: string | null, expectedRevision: string): Promise<void>;
  dispose(): void;
}
export interface ManagerView {
  panel: HTMLElement;
  open(): void;
  /** Local hiding for lifecycle cleanup; user actions go through the installed route. */
  close(): void;
  setCloseHandler(handler: (() => unknown) | null): void;
  dispose(): void;
}
