// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { NativePrompt, RawPreset, SourcePreset } from './contracts';
import { categoriesFor, clone, copyable, editable, group, patchPrompt, validatePreset } from './model';

export type MigrationPosition = { kind: 'top' | 'bottom' } | { kind: 'category'; name: string };
export function sourcePrompt(source: SourcePreset, id: string): NativePrompt {
  const prompt = source.raw.prompts.find(p => p.identifier === id);
  if (!prompt) throw Error('来源条目已不存在，请重新加载来源。');
  if (typeof prompt.name !== 'string' || !prompt.name.trim()) throw Error('来源标题为空或缺失，无法安全确定条目身份。');
  if (prompt.marker) throw Error('Marker 正文由酒馆提供，不能作为普通提示词迁移。');
  return prompt;
}
export function matchingPrompts(raw: RawPreset, source: NativePrompt): NativePrompt[] {
  return raw.prompts.filter(p => p.name === source.name);
}
export function contentEditable(prompt: NativePrompt): boolean { return editable(prompt) && prompt.marker !== true; }
export function replaceContent(raw: RawPreset, id: string, content: string): RawPreset {
  const prompt = raw.prompts.find(p => p.identifier === id);
  if (!prompt || !contentEditable(prompt)) throw Error('该目标正文受原生保护，不能覆盖。');
  if (content === (prompt.content ?? '')) return raw; // Preserve absent content on no-op.
  return patchPrompt(raw, id, { content });
}
export function insertionCategories(raw: RawPreset, groupId: string | number): Array<{ name: string; count: number; available: boolean }> {
  const cats = categoriesFor(raw.prompts), order = group(raw, groupId).order;
  return [...new Set(cats.values())].filter(name => !['全部', '未分类'].includes(name)).map(name => ({
    name, count: order.filter(e => cats.get(e.identifier) === name).length,
    available: order.some(e => cats.get(e.identifier) === name),
  }));
}
const nativeFields = new Set(['identifier','name','role','content','system_prompt','marker','injection_position',
  'injection_depth','injection_order','injection_trigger','forbid_overrides']);
const referenceLike = /(?:id|ref|link|target|source|prompt|script|code)/i;
/** Conservative proof for unknown data: no text, reference-like keys or executable identity semantics. */
function inertUnknown(value: unknown): boolean {
  if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return true;
  if (Array.isArray(value)) return value.every(inertUnknown);
  return !!value && typeof value === 'object' && Object.entries(value).every(([key, child]) =>
    !referenceLike.test(key) && inertUnknown(child));
}
/** Shared insertion eligibility; batch preflight never clones the target per row. */
export function insertionSource(source: SourcePreset, id: string) {
  const prompt = sourcePrompt(source, id);
  if (!copyable(prompt)) throw Error('仅普通自定义 Prompt 可新增迁移；内建与受保护条目不能生成新身份。');
  for (const [key, value] of Object.entries(prompt)) {
    if (!nativeFields.has(key) && (referenceLike.test(key) || !inertUnknown(value))) throw Error(`来源字段 ${key} 的第三方引用语义无法确认，未迁移、未丢弃数据。`);
  }
  const reference = group(source.raw, source.activeGroupId).order.find(e => e.identifier === id);
  if (reference && Object.keys(reference).some(key => !['identifier','enabled'].includes(key)))
    throw Error('来源含未知 Reference Metadata，无法证明新身份安全；未迁移、未丢弃字段。');
  return {prompt,reference};
}
export function insertPrompt(raw: RawPreset, groupId: string | number, source: SourcePreset,
  id: string, newId: string, position: MigrationPosition): RawPreset {
  validatePreset(raw); validatePreset(source.raw);
  const {prompt,reference} = insertionSource(source,id);
  if (!newId.trim() || raw.prompts.some(p => p.identifier === newId)) throw Error('新 identifier 冲突，未插入。');
  const active = group(raw, groupId);
  let index = position.kind === 'top' ? 0 : active.order.length;
  if (position.kind === 'category') {
    const cats = categoriesFor(raw.prompts);
    index = 0; active.order.forEach((e, i) => { if (cats.get(e.identifier) === position.name) index = i + 1; });
    if (!index || ['全部','未分类'].includes(position.name)) throw Error('该分类没有当前已挂接条目，请选择顶部或底部。');
  }
  // Pinned ST 1.18/1.19 consumes the supplied order; adding an ordinary reference
  // at either end does not remove, move or change any native Marker reference.
  const order = active.order.slice();
  order.splice(index, 0, { identifier: newId, enabled: reference?.enabled ?? true });
  const next = { ...raw, prompts: [...raw.prompts, { ...clone(prompt), identifier: newId }],
    prompt_order: raw.prompt_order.map(g => g === active ? { ...g, order } : g) };
  validatePreset(next); return next;
}

import type { PromptPatch } from './contracts';
import { EDITOR_KEYS } from './prompt-editor-fields';
export type EditorDelta = { patch: PromptPatch; unset: Array<keyof PromptPatch> };
export type MigrationPlan = { sourceId: string; kind:'replace'; targetId:string; delta:EditorDelta; mode:string }
  | { sourceId:string; kind:'insert'; position:MigrationPosition };
export function fullOverrideReason(source: NativePrompt, target: NativePrompt): string {
  if (!copyable(target) || !editable(target)) return '内建、Marker 或受保护目标不能覆盖全部属性；可单独核对正文模式。';
  for (const [key,value] of Object.entries(source)) {
    if (!nativeFields.has(key) && (referenceLike.test(key) || !inertUnknown(value)))
      return `来源字段 ${key} 的第三方语义无法确认，不能声称安全覆盖全部属性；目标未知字段始终保留。`;
  }
  if (source.forbid_overrides === true && !['main','jailbreak'].includes(target.identifier))
    return '来源禁止角色卡覆盖属性不适用于此目标，无法完整覆盖。';
  return '';
}
export function editorDelta(original: NativePrompt, edited: NativePrompt): EditorDelta {
  const patch: PromptPatch={}, unset: Array<keyof PromptPatch>=[];
  for (const key of EDITOR_KEYS) {
    if (Object.is(original[key],edited[key]) || (typeof original[key]==='object' && typeof edited[key]==='object' && JSON.stringify(original[key])===JSON.stringify(edited[key]))) continue;
    if (edited[key]===undefined) unset.push(key);
    else (patch as Record<string,unknown>)[key]=typeof edited[key]==='object'?clone(edited[key]):edited[key];
  }
  return {patch,unset};
}
export function applyEditorDelta(raw: RawPreset, id: string, delta: EditorDelta): RawPreset {
  const original=raw.prompts.find(p=>p.identifier===id);
  if (!original || !contentEditable(original)) throw Error('目标属性受原生保护。');
  if (!Object.keys(delta.patch).length && !delta.unset.length) return raw;
  let next=patchPrompt(raw,id,delta.patch);
  for (const key of delta.unset) {
    if (!EDITOR_KEYS.includes(key) || (key==='forbid_overrides'&&!['main','jailbreak'].includes(id))) throw Error('该属性不可安全取消设置。');
    delete next.prompts.find(p=>p.identifier===id)![key];
  }
  validatePreset(next);return next;
}
export function fullOverride(source: NativePrompt, target: NativePrompt): NativePrompt {
  const reason=fullOverrideReason(source,target);if(reason)throw Error(reason);
  const next=clone(target);
  for(const key of EDITOR_KEYS) {
    if(key==='forbid_overrides'&&!['main','jailbreak'].includes(target.identifier))continue;
    if(source[key]===undefined)delete next[key];else (next as Record<string,unknown>)[key]=clone(source[key]);
  }
  // The same official patch validation proves business fields; target identity/unknowns stay authoritative.
  return applyEditorDelta({prompts:[target],prompt_order:[]},target.identifier,editorDelta(target,next)).prompts[0];
}
/** Pure plan evaluator. Only returns a final tree; failures cannot partially stage or write. */
export function applyMigrationPlans(raw: RawPreset, groupId:string|number, source:SourcePreset, plans:MigrationPlan[], newId:()=>string):RawPreset {
  const sourceIds=new Set<string>(),targets=new Set<string>(),titles=new Map<string,MigrationPlan['kind']>();
  let next=raw;
  for(const plan of plans) {
    if(sourceIds.has(plan.sourceId))throw Error('批次重复来源，请重新核对。');sourceIds.add(plan.sourceId);
    const p=sourcePrompt(source,plan.sourceId);
    const title=plan.kind==='replace' ? (plan.delta.patch.name ?? raw.prompts.find(p=>p.identifier===plan.targetId)?.name) : p.name;
    if(titles.has(p.name!)&&(plan.kind==='insert'||titles.get(p.name!)==='insert'))throw Error(`本批次新增来源标题重复：${p.name}；请选择明确的一项，其他项主动跳过。`);titles.set(p.name!,plan.kind);
    if(plan.kind==='replace') {
      if(targets.has(plan.targetId))throw Error('多个来源指向同一目标，请重新选择或主动跳过。');targets.add(plan.targetId);
      next=applyEditorDelta(next,plan.targetId,plan.delta);
    } else if(raw.prompts.some(p=>p.name===title))throw Error('新增标题已有目标，必须明确选择同名处理，不能隐式新增。');
  }
  const additions:Array<{index:number;prompt:NativePrompt;reference:ReturnType<typeof group>['order'][number]}>=[];
  const active=group(raw,groupId);
  for(const plan of plans)if(plan.kind==='insert') {
    const one=insertPrompt(raw,groupId,source,plan.sourceId,newId(),plan.position);
    const prompt=one.prompts.at(-1)!;
    if(next.prompts.some(p=>p.name===prompt.name))throw Error('本批次目标标题与新增条目冲突，请重新选择或主动跳过。');
    if(next.prompts.some(p=>p.identifier===prompt.identifier)||additions.some(a=>a.prompt.identifier===prompt.identifier))throw Error('批次新 identifier 冲突。');
    const order=group(one,groupId).order,index=order.findIndex(e=>e.identifier===prompt.identifier);
    additions.push({index,prompt,reference:order[index]});
  }
  if(additions.length) {
    const order=active.order.flatMap((ref,index)=>[...additions.filter(a=>a.index===index).map(a=>a.reference),ref]);
    order.push(...additions.filter(a=>a.index===active.order.length).map(a=>a.reference));
    next={...next,prompts:[...next.prompts,...additions.map(a=>a.prompt)],prompt_order:next.prompt_order.map(g=>g===active?{...g,order}:g)};
  }
  validatePreset(next);return next;
}
