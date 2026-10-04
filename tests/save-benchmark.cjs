// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Synthetic local CPU diagnosis only. Not a real-host latency or user-data benchmark.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = ts.createSourceFile('controller.ts', fs.readFileSync(path.join(root, 'controller.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
let declaration;
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'sameRaw') declaration = node;
  ts.forEachChild(node, visit);
}
visit(source); assert(declaration, 'production sameRaw comparator not found');
const compiled = ts.transpileModule(`const sameRaw = ${declaration.initializer.getText(source)}; module.exports = sameRaw;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const context = { module: { exports: {} }, Object, Array, JSON };
vm.runInNewContext(compiled, context, { timeout: 1000 });
const current = context.module.exports;
// Exact comparison strategy from the previous 8bff candidate (sorted JSON serialization).
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
const previous = (a, b) => canonical(a) === canonical(b);
const raw = {
  prompts: Array.from({ length: 500 }, (_, i) => ({ identifier: `synthetic-${i}`, name: `Title ${i}`, role: 'system', system_prompt: false,
    content: 'synthetic text '.repeat(590), future: { nested: [i, true, 'keep'] } })),
  prompt_order: [{ character_id: 100001, order: Array.from({ length: 500 }, (_, i) => ({ identifier: `synthetic-${i}`, enabled: i % 2 === 0, future_order: { slot: i } })), future_group: [1, 2] }],
  future_root: { keep: true },
};
const clone = structuredClone(raw);
const cases = [
  ['equal independently cloned JSON', clone, true],
  ['object keys reordered', Object.fromEntries(Object.entries(clone).reverse()), true],
];
for (const [name, mutate] of [
  ['unknown root addition', r => { r.external = true; }],
  ['unknown Prompt addition', r => { r.prompts[0].external = true; }],
  ['content edit', r => { r.prompts[0].content += 'external'; }],
  ['order entry metadata edit', r => { r.prompt_order[0].order[0].future_order.slot = 7; }],
  ['order group edit', r => { r.prompt_order[0].future_group.push(3); }],
  ['array reordering', r => { r.prompt_order[0].order.reverse(); }],
]) { const changed = structuredClone(raw); mutate(changed); cases.push([name, changed, false]); }
for (const [name, value, expected] of cases) {
  assert.equal(current(raw, value), expected, `production comparator: ${name}`);
  assert.equal(previous(raw, value), expected, `previous comparator: ${name}`);
}
function measure(compare) {
  for (let i = 0; i < 3; i++) compare(raw, clone);
  const samples = [];
  for (let i = 0; i < 11; i++) { const start = performance.now(); assert(compare(raw, clone)); samples.push(performance.now() - start); }
  const sorted = samples.slice().sort((a, b) => a - b);
  return { medianMs: sorted[Math.floor(sorted.length / 2)], samplesMs: samples };
}
const result = { realHost: false, synthetic: true, node: process.version, prompts: 500, jsonBytes: Buffer.byteLength(JSON.stringify(raw)),
  productionComparatorExtractedFromSource: true, correctnessChecks: cases.map(([name]) => name),
  previousCanonicalSerialization: measure(previous), currentTreeComparison: measure(current),
  boundaries: ['Only acknowledgement object comparison CPU measured', 'Not model clone/validation, ST HTTP, disk, apply, Safari or total save latency', 'No wall-clock pass threshold; timing is diagnostic only'] };
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(root, 'evidence/save-performance-benchmark.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
