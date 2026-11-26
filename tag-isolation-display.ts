// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

import { escapeIsolatedTags, scanPresetTags } from './tag-isolation';
import { projectAdaptiveMarkup, projectAdaptiveRow, type AdaptiveBlocks } from './adaptive-tag-rendering';

type Message = {
  mes?: string;
  is_user?: boolean;
  is_system?: boolean;
  extra?: { display_text?: string };
};
type FormatMessage = (text: string, message: { isUser: boolean; isSystem: boolean; isReasoning: boolean; messageId: number }) => string;
const activeProjection = Symbol.for('miemie.preset-manager.tag-isolation-format');
type Projection = { before?: FormatMessage; after?: FormatMessage };
type Formatter = {
  addHook(hook: FormatMessage, options: { stage: 'beforeRegex' | 'afterRegex' }): void;
  [activeProjection]?: Projection;
};
export interface DisplayContext {
  chat: Message[];
  messageFormatter?: Formatter;
  updateMessageBlock?(id: number, message: Message): void;
}

function projection(text: string, names?: readonly string[]) {
  if (!names || !text.includes('<')) return { text };
  const scan = scanPresetTags(text, names);
  if (!scan.isolated.length) return { text };
  const blocks: AdaptiveBlocks = new Map();
  for (const block of scan.blocks) {
    const value = { full: text.slice(block.start, block.end), body: text.slice(block.bodyStart, block.bodyEnd) };
    const group = blocks.get(block.name);
    if (group) group.push(value); else blocks.set(block.name, [value]);
  }
  return { text: escapeIsolatedTags(text, scan.isolated), blocks };
}

export function createTagIsolationDisplay(document: Document, context: () => DisplayContext | undefined,
  recreateFrames: (id: number) => void = () => {}) {
  const initial = context();
  const formatter = initial?.messageFormatter;
  const modern = typeof formatter?.addHook === 'function';
  const available = modern || (typeof initial?.updateMessageBlock === 'function' && Boolean(document));
  const projected = new WeakSet<Element>();
  const pending = new Map<number, AdaptiveBlocks>();
  let names: readonly string[] | undefined;
  let slot: Formatter[typeof activeProjection];
  const before: FormatMessage = (text, message) => {
    pending.delete(message.messageId);
    if (!names || message.isUser || message.isSystem || message.isReasoning) return text;
    const result = projection(text, names);
    if (result.blocks?.size) pending.set(message.messageId, result.blocks);
    return result.text;
  };
  const after: FormatMessage = (text, message) => {
    const blocks = pending.get(message.messageId);
    pending.delete(message.messageId);
    return blocks ? projectAdaptiveMarkup(text, blocks) : text;
  };

  function refresh(id?: number, previous?: readonly string[], reconfigure = false) {
    const ctx = context();
    if (!ctx?.updateMessageBlock || !document) return;
    const selector = Number.isSafeInteger(id) && id! >= 0 ? `#chat > .mes[mesid="${id}"]` : '#chat > .mes[mesid]';
    for (const row of document.querySelectorAll(selector)) {
      if (row.querySelector('#curEditTextarea')) continue;
      const index = Number(row.getAttribute('mesid')), message = ctx.chat[index];
      if (!message || message.is_user || message.is_system) continue;
      const raw = message.extra?.display_text ?? message.mes;
      if (typeof raw !== 'string') continue;
      const guarded = projection(raw, names);
      if (guarded.text === raw && !projected.has(row) && projection(raw, previous).text === raw) continue;
      const hadAdaptiveFrame = reconfigure && row.querySelector('.mes_text [data-mafx-tag], .mes_text [data-miemie-reading]') &&
        row.querySelector('.mes_text .TH-render iframe');
      if (guarded.text !== raw) projected.add(row);
      else projected.delete(row);
      // Pass a display-only copy. The message, its swipes and saved text stay untouched.
      if (modern || guarded.text === raw) ctx.updateMessageBlock(index, message);
      else {
        ctx.updateMessageBlock(index, { ...message, extra: { ...message.extra, display_text: guarded.text } });
        if (guarded.blocks?.size) projectAdaptiveRow(row, guarded.blocks);
      }
      if (hadAdaptiveFrame) recreateFrames(index);
    }
  }

  return {
    available, modern, refresh,
    set(next: readonly string[] | undefined) {
      if (!available || (!names && !next)) return;
      const previous = names;
      names = next;
      if (modern) {
        // ST's formatter does not expose removal. Use one reusable hook per host.
        slot = formatter[activeProjection];
        if (!slot) {
          const registered: Projection = {};
          formatter.addHook((text, message) => registered.before?.(text, message) ?? text, { stage: 'beforeRegex' });
          formatter.addHook((text, message) => registered.after?.(text, message) ?? text, { stage: 'afterRegex' });
          formatter[activeProjection] = slot = registered;
        }
        slot.before = names ? before : undefined;
        slot.after = names ? after : undefined;
      }
      pending.clear();
      refresh(undefined, previous, true);
    },
    dispose() {
      if (!names) return;
      const previous = names;
      names = undefined;
      pending.clear();
      if (slot?.before === before) { slot.before = undefined; slot.after = undefined; }
      refresh(undefined, previous, true);
    },
  };
}
