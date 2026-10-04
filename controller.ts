// Copyright (C) 2026 louisSSR, SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { ManagerController, ManagerState, PresetAdapter, PromptPatch, RawPreset, Snapshot } from './contracts';
import * as model from './model';

const editableKeys = ['name', 'role', 'content', 'injection_position', 'injection_depth', 'injection_order', 'injection_trigger', 'forbid_overrides'] as const;

export function createController(adapter: PresetAdapter): ManagerController {
  const state: ManagerState = { snapshot: null, recovery: null, pendingRaw: null, dirty: false, conflict: false, localRevision: 0,
    busy: false, error: '', notice: '', category: '全部', draft: null };
  const listeners = new Set<() => void>();
  let disposed = false, refreshEpoch = 0, refreshAfter = false, forceRefreshAfter = false;
  let observed: Snapshot | null = null;
  const notify = () => { if (!disposed) listeners.forEach(fn => fn()); };
  const message = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重新读取后重试。';
  const snapshot = () => { if (!state.snapshot) throw Error('预设尚未读取。'); return state.snapshot; };
  const currentRaw = () => state.pendingRaw ?? snapshot().raw;
  const sameRaw = (a: RawPreset, b: RawPreset) => {
    // Compare JSON trees without serializing full Prompt bodies; shared unchanged
    // subtrees are skipped. No shared references are introduced inside either tree.
    const pairs: Array<[unknown, unknown]> = [[a, b]];
    while (pairs.length) {
      const [left, right] = pairs.pop()!;
      if (left === right) continue;
      if (!left || !right || typeof left !== 'object' || typeof right !== 'object'
        || Array.isArray(left) !== Array.isArray(right)) return false;
      if (Array.isArray(left) && Array.isArray(right) && left.length !== right.length) return false;
      const l = left as Record<string, unknown>, r = right as Record<string, unknown>;
      const keys = Object.keys(l);
      if (keys.length !== Object.keys(r).length) return false;
      for (const key of keys) { if (!Object.hasOwn(r, key)) return false; pairs.push([l[key], r[key]]); }
    }
    return true;
  };
  const same = (a: unknown, b: unknown) => a === b || (a !== null && b !== null &&
    typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));
  function updateDirty() {
    const original = state.draft && currentRaw().prompts.find(p => p.identifier === state.draft!.id);
    state.dirty = state.pendingRaw !== null || Boolean(state.draft && original &&
      Object.entries(state.draft.patch).some(([key, value]) => !same(original[key], value)));
  }
  function accept(next: Snapshot) {
    model.validatePreset(next.raw); model.group(next.raw, next.activeGroupId);
    if (state.snapshot?.name !== next.name) { state.category = '全部'; state.draft = null; }
    state.snapshot = next;
  }
  function observe(next: Snapshot) {
    model.validatePreset(next.raw); model.group(next.raw, next.activeGroupId);
    const before = state.snapshot;
    if (state.dirty && before && (next.name !== before.name || next.revision !== before.revision ||
      String(next.activeGroupId) !== String(before.activeGroupId))) {
      observed = next; state.conflict = true;
      state.error = '酒馆预设已被外部修改或切换。未保存内容仍保留；请重新读取实际状态，避免覆盖外部数据。';
      return;
    }
    accept(next);
  }
  async function refresh(notification = false) {
    if (disposed) return;
    if (state.busy) { refreshAfter = true; if (!notification) forceRefreshAfter = true; return; }
    const epoch = ++refreshEpoch;
    try {
      const next = await adapter.read();
      if (disposed || epoch !== refreshEpoch) return;
      observe(next); if (!state.conflict) state.error = ''; notify();
    } catch (error) {
      if (!disposed && epoch === refreshEpoch) { if (state.dirty) state.conflict = true; state.error = message(error); notify(); }
    }
  }
  function coveredNotifications(confirmed: Snapshot | undefined) {
    if (forceRefreshAfter || !confirmed) return false;
    try { return adapter.coversNotifications?.(confirmed) === true; } catch { return false; }
  }
  async function finishBusy(confirmed?: Snapshot) {
    while (refreshAfter && !disposed) {
      if (coveredNotifications(confirmed)) { refreshAfter = false; break; }
      refreshAfter = false; forceRefreshAfter = false;
      try {
        const current = await adapter.read();
        if (!disposed) {
          const switched = state.snapshot?.name !== current.name;
          observe(current); confirmed = current;
          if (switched && !state.conflict) state.notice = '操作已结束；酒馆当前预设由外部切换，界面已同步。';
        }
      } catch (error) { if (!disposed) { if (state.dirty) state.conflict = true; if (!state.error) state.error = message(error); } }
    }
    state.busy = false; notify();
  }
  function cleanRequired() {
    if (!state.dirty && !state.conflict) return true;
    state.error = '请先保存修改或重新读取实际状态，再进行预设操作。'; notify(); return false;
  }
  async function run(action: (expected: Snapshot) => Promise<Snapshot>, success: string) {
    if (disposed || state.busy || !cleanRequired()) return;
    state.busy = true; state.error = ''; state.notice = ''; refreshEpoch++; state.draft = null; notify();
    let confirmed: Snapshot | undefined;
    try {
      const before = snapshot();
      state.recovery = { name: before.name, raw: model.clone(before.raw) };
      const next = await action(before);
      if (disposed) return;
      accept(next); confirmed = next; state.notice = success;
    } catch (error) {
      if (!disposed) {
        state.error = message(error);
        try { const actual = await adapter.read(); if (!disposed) observe(actual); } catch { /* Preserve original error. */ }
      }
    } finally { await finishBusy(confirmed); }
  }
  function stage(next: RawPreset, success = '修改尚未保存，点击“保存修改”后同步酒馆。') {
    state.pendingRaw = sameRaw(next, snapshot().raw) ? null : next;
    state.localRevision++; updateDirty();
    if (!state.conflict) state.error = '';
    state.notice = state.dirty ? success : '已恢复原状态，没有未保存修改。'; notify();
  }
  async function patch(mutate: (raw: RawPreset, current: Snapshot) => RawPreset) {
    if (disposed || state.busy) return;
    try { const next = mutate(currentRaw(), snapshot()); model.validatePreset(next); stage(next); }
    catch (error) { state.error = message(error); notify(); }
  }
  function editedRaw() {
    const draft = state.draft;
    if (!draft) return currentRaw();
    if (draft.revision !== snapshot().revision) throw Error('打开编辑窗口后预设已改变，草稿已保留。');
    return model.patchPrompt(currentRaw(), draft.id, draft.patch);
  }
  function cancelChanges() {
    if (disposed || state.busy) return;
    const needsRead = state.conflict;
    state.pendingRaw = null; state.draft = null; state.dirty = false; state.conflict = false;
    state.localRevision++; state.error = ''; state.notice = '已取消未保存修改，酒馆数据未被写入。';
    refreshEpoch++;
    if (observed) { accept(observed); observed = null; }
    notify();
    // Cancellation never writes an old backup over current host data.
    if (needsRead) void refresh();
  }
  async function reload() {
    if (disposed || state.busy) return;
    state.busy = true; refreshEpoch++; notify();
    let confirmed: Snapshot | undefined;
    try {
      const next = await adapter.read();
      if (disposed) return;
      model.validatePreset(next.raw); model.group(next.raw, next.activeGroupId);
      state.pendingRaw = null; state.draft = null; state.dirty = false; state.conflict = false; observed = null;
      state.localRevision++; accept(next); confirmed = next; state.error = '';
      state.notice = '已重新读取酒馆实际状态，未保存修改已丢弃。';
    } catch (error) { if (!disposed) state.error = `重新读取失败，未保存修改仍保留：${message(error)}`; }
    finally { await finishBusy(confirmed); }
  }
  async function saveChanges() {
    if (disposed || state.busy || !state.dirty) return;
    if (state.conflict) { state.error = '存在外部修改冲突，请重新读取实际状态。未保存内容没有被覆盖。'; notify(); return; }
    let next: RawPreset;
    try { next = editedRaw(); model.validatePreset(next); }
    catch (error) { state.error = message(error); notify(); return; }
    const before = snapshot();
    state.busy = true; state.error = ''; state.notice = ''; refreshEpoch++; notify();
    let confirmed: Snapshot | undefined;
    try {
      state.recovery = { name: before.name, raw: model.clone(before.raw) };
      const saved = sameRaw(next, before.raw) ? await adapter.read() : await adapter.save(before, next);
      if (disposed) return;
      model.validatePreset(saved.raw); model.group(saved.raw, saved.activeGroupId);
      if (saved.name !== before.name || String(saved.activeGroupId) !== String(before.activeGroupId) || !sameRaw(saved.raw, next))
        throw Error('保存确认期间酒馆预设被外部修改或切换，未保存内容已保留，请核对实际状态。');
      state.pendingRaw = null; state.draft = null; state.dirty = false; state.conflict = false; observed = null;
      state.localRevision++; accept(saved); confirmed = saved; state.notice = '全部修改已保存并确认。';
    } catch (error) {
      if (!disposed) {
        state.error = `保存修改失败：${message(error)}`;
        // Keep the local session on failure. Read actual host state, never issue a
        // compensating write or silently rebase local patches onto another revision.
        try { const actual = await adapter.read(); if (!disposed) observe(actual); } catch { /* Keep local work and original error. */ }
      }
    } finally { await finishBusy(confirmed); }
  }
  const unsubscribe = adapter.subscribe?.(() => { void refresh(true); });
  const controller: ManagerController = {
    state, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, refresh, reload, saveChanges, cancelChanges,
    revision() { return `${state.snapshot?.revision ?? ''}:${state.localRevision}`; },
    rows() {
      if (!state.snapshot) return [];
      const rows = model.rowsFor(currentRaw(), state.snapshot.activeGroupId);
      return state.category === '全部' ? rows : rows.filter(r => r.category === state.category);
    },
    categories() {
      if (!state.snapshot) return ['全部', '未分类'];
      return ['全部', ...new Set([...model.categoriesFor(currentRaw().prompts).values()].filter(c => !['全部', '未分类'].includes(c))), '未分类'];
    },
    category(name) { state.category = name; notify(); },
    select(name) { return run(s => adapter.select(name, s), '已切换并确认酒馆当前预设。'); },
    async importText(filename, text) {
      if (!cleanRequired()) return;
      let raw: RawPreset;
      try { raw = model.parsePreset(text); } catch (error) { state.error = message(error); notify(); return; }
      return run(s => adapter.create(s, model.uniqueName(filename.replace(/\.json$/i, '').trim() || '导入预设', s.names), raw), '已导入、保存并切换。同名时会自动添加编号，原预设保留。');
    },
    async exportText() {
      if (disposed || state.busy) throw Error('请等待当前操作完成后再导出。');
      if (!cleanRequired()) throw Error('请先保存修改或重新读取实际状态，再导出实际预设。');
      const start = snapshot(); state.busy = true; refreshEpoch++; notify();
      try {
        const fresh = await adapter.read();
        if (disposed || fresh.name !== start.name || fresh.revision !== start.revision) throw Error('预设已在其他地方更改，请重新读取后导出。');
        model.validatePreset(fresh.raw); state.notice = '已导出完整原生预设。'; state.error = '';
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
      if (disposed || state.busy) return;
      try {
        const s = snapshot(), p = currentRaw().prompts.find(p => p.identifier === id);
        if (!p || !model.editable(p)) throw Error('该条目不可编辑。');
        const values: PromptPatch = {};
        for (const key of editableKeys) if (p[key] !== undefined) (values as Record<string, unknown>)[key] = model.clone(p[key]);
        state.draft = { id, patch: values, revision: s.revision }; updateDirty(); if (!state.conflict) state.error = ''; notify();
      } catch (error) { state.error = message(error); notify(); }
    },
    draft(patch) { if (state.draft && !state.busy) { state.draft.patch = { ...state.draft.patch, ...model.clone(patch) }; updateDirty(); notify(); } },
    cancelEdit() { if (state.busy) return; state.draft = null; updateDirty(); notify(); },
    async saveEdit() {
      if (disposed || state.busy || !state.draft) return;
      try { const next = editedRaw(); state.draft = null; stage(next); }
      catch (error) { state.error = message(error); notify(); }
    },
    addPrompt() { return patch((raw, s) => model.addPrompt(raw, s.activeGroupId, crypto.randomUUID())); },
    copyPrompt(id) { return patch((raw, s) => model.copyPrompt(raw, s.activeGroupId, id, crypto.randomUUID())); },
    toggle(id) { return patch((raw, s) => model.togglePrompt(raw, s.activeGroupId, id)); },
    detach(id) { return patch((raw, s) => model.detachPrompt(raw, s.activeGroupId, id)); },
    attach(id) { return patch((raw, s) => model.attachPrompt(raw, s.activeGroupId, id)); },
    deletePrompt(id) { return patch((raw, s) => model.deletePrompt(raw, id, s.activeGroupId)); },
    async move(id, beforeId, expectedRevision) {
      if (disposed || state.busy) return;
      try {
        if (controller.revision() !== expectedRevision) throw Error('拖动过程中预设已改变，本次排序未提交。');
        const raw = currentRaw(), group = model.group(raw, snapshot().activeGroupId);
        const visible = new Set(controller.rows().filter(row => row.attached).map(row => row.prompt.identifier));
        const slots: number[] = [], items = group.order.filter((e, i) => { if (!visible.has(e.identifier)) return false; slots.push(i); return true; });
        const index = items.findIndex(e => e.identifier === id);
        if (index < 0 || (beforeId !== null && !items.some(e => e.identifier === beforeId))) throw Error('拖动目标已改变，请重新操作。');
        if (id === beforeId) return;
        const [item] = items.splice(index, 1);
        items.splice(beforeId === null ? items.length : items.findIndex(e => e.identifier === beforeId), 0, item);
        const order = group.order.slice(); slots.forEach((slot, i) => { order[slot] = items[i]; });
        // Copy only the changed ordering arrays/group. All Prompt bodies and unknown
        // fields remain untouched; no clone/serialization/host I/O on drop.
        stage({ ...raw, prompt_order: raw.prompt_order.map(g => g === group ? { ...g, order } : g) });
      } catch (error) { state.error = message(error); notify(); }
    },
    dispose() { if (disposed) return; disposed = true; refreshEpoch++; unsubscribe?.(); adapter.dispose?.(); listeners.clear(); state.draft = null; state.pendingRaw = null; state.dirty = false; state.recovery = null; observed = null; },
  };
  return controller;
}
