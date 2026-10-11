// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

export type IconName =
  'sheep' | 'close' | 'edit' | 'copy' | 'unlock' | 'link' | 'trash' | 'plus' | 'import' | 'export' | 'more' | 'back' | 'refresh' | 'save' | 'default' | 'settings' | 'chevron' | 'check' | 'migration' | 'transfer' | 'insert-top' | 'insert-bottom' | 'transfer-all' | 'transfer-text' | 'view';

const paths: Record<Exclude<IconName, 'sheep'>, string[]> = {
  view: ['M3 3h12l6 6v12H3zM15 3v6h6M7 12h10M7 16h8'],
  migration: ['M8 4H3v16h5M16 4h5v16h-5', 'M7 12h10m-4-4 4 4-4 4'],
  'transfer-all': ['M3 3h10v18H3zM6 7h4M6 11h4M6 15h3', 'M14 12h7m-3-3 3 3-3 3'],
  'transfer-text': ['M3 6h10M3 10h10M3 14h7M3 18h7', 'M14 12h7m-3-3 3 3-3 3'],
  transfer: ['M4 7v10M20 7v10M7 12h10m-4-4 4 4-4 4'],
  'insert-top': ['M4 4h16M12 20V8m-5 5 5-5 5 5'],
  'insert-bottom': ['M4 20h16M12 4v12m-5-5 5 5 5-5'],
  chevron: ['m6 9 6 6 6-6'],
  check: ['m5 12 4 4 10-10'],
  settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M9.5 3h5l.5 2.5 2 1.2 2.4-.7 2.5 4.3-1.9 1.7v2l1.9 1.7-2.5 4.3-2.4-.7-2 1.2-.5 2.5h-5L9 20.5l-2-1.2-2.4.7-2.5-4.3L4 14v-2l-1.9-1.7L4.6 6l2.4.7 2-1.2.5-2.5Z'],
  default: ['M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'],
  close: ['M6 6l12 12M18 6 6 18'],
  edit: ['m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z'],
  copy: ['M9 9h11v11H9z', 'M15 5V3H3v12h2'],
  link: ['M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2', 'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'],
  unlock: ['M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2', 'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2', 'M4 4l16 16'],
  trash: ['M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7'],
  plus: ['M12 5v14M5 12h14'],
  import: ['M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5'],
  export: ['M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5'],
  more: ['M5 11v2M12 11v2M19 11v2'],
  back: ['m10 5-7 7 7 7M3 12h18'],
  refresh: ['M20 8a8 8 0 1 0 0 8M20 3v5h-5'],
  save: ['M5 3h12l4 4v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2Z', 'M7 3v6h10V3', 'M7 21v-7h10v7'],
};

/** Only fixed, bundled SVG geometry enters the DOM. Preset data never does. */
export function createIcon(doc: Document, name: IconName): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const data =
    name === 'sheep'
      ? [
          'M7 7a3 3 0 0 1 5-3 3 3 0 0 1 5 3 3 3 0 0 1 2 5 3 3 0 0 1-3 4H8a3 3 0 0 1-3-4 3 3 0 0 1 2-5Z',
          'M8 12v5a4 4 0 0 0 8 0v-5',
          'm8 13-4-2m12 2 4-2M10 16h.01M14 16h.01M11 19h2',
        ]
      : paths[name];
  for (const d of data) {
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
