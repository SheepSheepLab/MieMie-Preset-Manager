// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { ManagerController, ManagerState, PresetAdapter, PromptPatch, RawPreset, Snapshot } from './contracts';
import * as model from './model';

const editableKeys = ['name', 'role', 'content', 'injection_position', 'injection_depth', 'injection_order', 'injection_trigger', 'forbid_overrides'] as const;

export function createController(adapter: PresetAdapter): ManagerController {
  const state: ManagerState = { snapshot: null, recovery: null, busy: false, error: '', notice: '', category: '全部', draft: null };
  const listeners = new Set<() => void>();
  const drafts = new Map<string, ManagerState['draft']>();
  const draftBases = new Map<string, string>();
  let disposed = false, refreshEpoch = 0, refreshAfter = false;
  const notify = () => { if (!disposed) listeners.forEach(fn => fn()); };
  const message = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重新读取后重试。';
  const snapshot = () => { if (!state.snapshot) throw Error('预设尚未读取。'); return state.snapshot; };
  function accept(next: Snapshot) {
    model.validatePreset(next.raw);
    model.group(next.raw, next.activeGroupId);
    if (state.snapshot?.name !== next.name) {
      if (state.snapshot && state.draft) drafts.set(state.snapshot.name, model.clone(state.draft));
      state.draft = model.clone(drafts.get(next.name) || null);
      state.category = '全部';
    }
    if (state.draft && draftBases.get(next.name) === JSON.stringify(next.raw)) state.draft.revision = next.revision;
    state.snapshot = next;
  }
  async function refresh() {
    if (disposed) return;
    if (state.busy) { refreshAfter = true; return; }
    const epoch = ++refreshEpoch;
    try {
      const next = await adapter.read();
      if (disposed || epoch !== refreshEpoch) return;
      accept(next); state.error = ''; notify();
    } catch (error) {
      if (!disposed && epoch === refreshEpoch) { state.error = message(error); notify(); }
    }
  }
  async function finishBusy() {
    while (refreshAfter && !disposed) {
      refreshAfter = false;
      try {
        const current = await adapter.read();
        if (!disposed) {
          const switched = state.snapshot?.name !== current.name;
          accept(current);
          if (switched) state.notice = '操作已结束；酒馆当前预设由外部切换，界面已同步。';
        }
      } catch (error) { if (!disposed && !state.error) state.error = message(error); }
    }
    state.busy = false; notify();
  }
  async function run(action: (expected: Snapshot) => Promise<Snapshot>, success: string, onSuccess?: () => void) {
    if (disposed || state.busy) return;
    state.busy = true; state.error = ''; state.notice = ''; refreshEpoch++; notify();
    try {
      const before = snapshot();
      state.recovery = { name: before.name, raw: model.clone(before.raw) };
      const next = await action(before);
      if (disposed) return;
      accept(next); onSuccess?.(); state.notice = success;
    } catch (error) {
      if (!disposed) {
        state.error = message(error);
        // Display actual state after failure. Never apply a previous preset's rollback to the newly selected preset.
        try { const actual = await adapter.read(); if (!disposed) accept(actual); } catch { /* Keep original error and last readable snapshot. */ }
      }
    } finally {
      await finishBusy();
    }
  }
  const patch = (mutate: (raw: RawPreset, current: Snapshot) => RawPreset, success = '已保存到当前预设。') => run(current => {
    const next = mutate(current.raw, current); model.validatePreset(next); return adapter.save(current, next);
  }, success);
  const unsubscribe = adapter.subscribe?.(() => { void refresh(); });
  const controller: ManagerController = {
    state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    refresh,
    rows() {
      if (!state.snapshot) return [];
      const rows = model.rowsFor(state.snapshot.raw, state.snapshot.activeGroupId);
      return state.category === '全部' ? rows : rows.filter(r => r.category === state.category);
    },
    categories() {
      if (!state.snapshot) return ['全部', '未分类'];
      return ['全部', ...new Set([...model.categoriesFor(state.snapshot.raw.prompts).values()].filter(c => !['全部', '未分类'].includes(c))), '未分类'];
    },
    category(name) { state.category = name; notify(); },
    select(name) { return run(s => adapter.select(name, s), '已切换并确认酒馆当前预设。'); },
    async importText(filename, text) {
      let raw: RawPreset;
      try { raw = model.parsePreset(text); } catch (error) { state.error = message(error); notify(); return; }
      return run(s => {
        const base = filename.replace(/\.json$/i, '').trim() || '导入预设';
        const name = model.uniqueName(base, s.names);
        return adapter.create(s, name, raw);
      }, '已导入、保存并切换。同名时会自动添加编号，原预设保留。');
    },
    async exportText() {
      if (disposed || state.busy) throw Error('请等待当前操作完成后再导出。');
      const start = snapshot();
      state.busy = true; notify();
      try {
        const fresh = await adapter.read();
        if (disposed || fresh.name !== start.name || fresh.revision !== start.revision) throw Error('预设已在其他地方更改，请重新读取后导出。');
        model.validatePreset(fresh.raw);
        state.notice = '已导出完整原生预设。'; state.error = '';
        return { name: fresh.name, text: JSON.stringify(fresh.raw, null, 2) };
      } catch (error) { state.error = message(error); throw error; }
      finally { await finishBusy(); }
    },
    exportRecovery() {
      if (!state.recovery) throw Error('本次运行还没有操作前备份。');
      return { name: `${state.recovery.name} 操作前备份`, text: JSON.stringify(state.recovery.raw, null, 2) };
    },
    copyPreset() { return run(s => adapter.create(s, model.uniqueName(s.name, s.names, true), model.clone(s.raw)), '已完整复制并切换，原预设保留。'); },
    newPreset(name) { return run(s => adapter.create(s, model.uniqueName(name, s.names), model.emptyPreset(s.raw)), '已新建并切换，沿用原生内建项及生成设置。'); },
    renamePreset(name) { return run(s => adapter.rename(s, name.trim()), '预设已重命名。'); },
    deletePreset() { return run(s => adapter.remove(s), '预设已删除，并读取当前预设。'); },
    edit(id) {
      if (state.busy) return;
      try {
        const s = snapshot(), p = s.raw.prompts.find(p => p.identifier === id);
        if (!p || !model.editable(p)) throw Error('该条目不可编辑。');
        const values: PromptPatch = {};
        for (const key of editableKeys) if (p[key] !== undefined) (values as Record<string, unknown>)[key] = model.clone(p[key]);
        state.draft = { id, patch: values, revision: s.revision }; draftBases.set(s.name, JSON.stringify(s.raw)); state.error = ''; notify();
      } catch (error) { state.error = message(error); notify(); }
    },
    draft(patch) { if (state.draft && !state.busy) { state.draft.patch = { ...state.draft.patch, ...model.clone(patch) }; } },
    cancelEdit() { if (state.busy) return; if (state.snapshot) { drafts.delete(state.snapshot.name); draftBases.delete(state.snapshot.name); } state.draft = null; notify(); },
    saveEdit() {
      const draft = state.draft && model.clone(state.draft);
      if (!draft) return Promise.resolve();
      return run(s => {
        if (s.revision !== draft.revision) throw Error('打开编辑窗口后预设已改变，草稿已保留。请重新读取并核对，避免覆盖其他修改。');
        return adapter.save(s, model.patchPrompt(s.raw, draft.id, draft.patch));
      }, '条目修改已保存。', () => { if (state.snapshot) { drafts.delete(state.snapshot.name); draftBases.delete(state.snapshot.name); } state.draft = null; });
    },
    addPrompt() { return patch((raw, s) => model.addPrompt(raw, s.activeGroupId, crypto.randomUUID()), '已添加条目，可点击铅笔编辑。'); },
    copyPrompt(id) { return patch((raw, s) => model.copyPrompt(raw, s.activeGroupId, id, crypto.randomUUID()), '已在原条目后复制。'); },
    toggle(id) { return patch((raw, s) => model.togglePrompt(raw, s.activeGroupId, id)); },
    detach(id) { return patch((raw, s) => model.detachPrompt(raw, s.activeGroupId, id), '已解锁：条目退出当前发送顺序，内容仍保留。'); },
    attach(id) { return patch((raw, s) => model.attachPrompt(raw, s.activeGroupId, id), '条目已重新挂接到发送顺序末尾。'); },
    deletePrompt(id) { return patch((raw, s) => model.deletePrompt(raw, id, s.activeGroupId), '条目及各分组中的引用已删除。'); },
    move(id, beforeId, expectedRevision) {
      const visible = controller.rows().filter(r => r.attached).map(r => r.prompt.identifier);
      return patch((raw, s) => {
        if (s.revision !== expectedRevision) throw Error('拖动过程中预设已改变，本次排序未提交。');
        return model.movePrompt(raw, s.activeGroupId, id, beforeId, visible);
      }, state.category === '全部' ? '排序已保存。' : '分类内排序已保存，隐藏条目的位置保持不变。');
    },
    dispose() { if (disposed) return; disposed = true; refreshEpoch++; unsubscribe?.(); adapter.dispose?.(); listeners.clear(); drafts.clear(); draftBases.clear(); state.draft = null; state.recovery = null; },
  };
  return controller;
}
