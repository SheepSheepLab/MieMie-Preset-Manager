// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

type Payload = { css: string; markup: string; script: string };
type Block = { full: string; body: string };
export type AdaptiveBlocks = Map<string, Block[]>;
const markerStart = '<div\\b[^>]*?\\bdata-(?:mafx-tag|miemie-reading)="';
const marker = markerStart + '([^"]+)"[^>]*>';
const payload = '(<script type="application/octet-stream" id="mafxPayload">)([A-Za-z0-9+/=]+)(<\x2fscript>)';
const reader = /function (readLabelOutput|readModule|readSpecialStatus)\([^)]*\) \{\r?\n[\s\S]*?\r?\n[ \t]*\}/;
const rawLookup = 'const raw = message?.extra?.display_text ?? message?.mes;';
const oldPairing = /return (?:matches|reports)\[Math\.max\(0,\s*position\)\]\?\.\[([01])\] \?\? '';/;
const decoder = new TextDecoder();
const encoder = new TextEncoder();

function patchPayload(encoded: string, block: Block): string {
  try {
    const original = JSON.parse(decoder.decode(Uint8Array.from(atob(encoded), character => character.charCodeAt(0)))) as Payload;
    const match = typeof original.script === 'string' ? reader.exec(original.script) : null;
    const capture = match && oldPairing.exec(match[0])?.[1];
    if (!match?.[0].includes(rawLookup) || !capture ||
        typeof original.css !== 'string' || typeof original.markup !== 'string') return encoded;
    // Version 8.0 normally re-reads the stored message and pairs tags again.
    // Substitute only its known reader, with this one validated raw block.
    original.script = original.script.slice(0, match.index) +
      'function ' + match[1] + '() { return ' + JSON.stringify(capture === '0' ? block.full : block.body) + '; }' +
      original.script.slice(match.index + match[0].length);
    const bytes = encoder.encode(JSON.stringify(original));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  } catch { return encoded; }
}

function blockReader(blocks: AdaptiveBlocks) {
  const counts = new Map<string, number>();
  return (name: string) => {
    const index = counts.get(name) ?? 0;
    counts.set(name, index + 1);
    return blocks.get(name)?.[index];
  };
}

export function projectAdaptiveMarkup(markdown: string, blocks: AdaptiveBlocks): string {
  if (!markdown.includes('mafxPayload')) return markdown;
  const lookup = blockReader(blocks);
  const template = new RegExp('(' + marker + '(?:(?!' + markerStart + ')[\\s\\S])*?)' + payload, 'g');
  return markdown.replace(template, (whole, prefix: string, tag: string, open: string, encoded: string, close: string) => {
    const block = lookup(tag);
    return block === undefined ? whole : prefix + open + patchPayload(encoded, block) + close;
  });
}

export function projectAdaptiveRow(row: Element, blocks: AdaptiveBlocks) {
  const lookup = blockReader(blocks), pattern = new RegExp(payload);
  let block: Block | undefined;
  for (const element of row.querySelectorAll('.mes_text [data-mafx-tag], .mes_text [data-miemie-reading], .mes_text pre > code')) {
    const tag = element.getAttribute('data-mafx-tag') ?? element.getAttribute('data-miemie-reading');
    if (tag) { block = lookup(tag); continue; }
    const source = element.textContent;
    const current = block;
    if (!current || !source?.includes('mafxPayload')) continue;
    const next = source.replace(pattern, (_whole, open: string, encoded: string, close: string) =>
      open + patchPayload(encoded, current) + close);
    if (next !== source) element.textContent = next;
    block = undefined;
  }
}
