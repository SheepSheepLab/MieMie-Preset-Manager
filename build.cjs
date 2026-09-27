// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

/* Build the standalone Tavern Helper package and its isolated preview. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const webpack = require('webpack');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = __dirname;
const version = require('./package.json').version;
const licenseBanner = 'MieMie Preset Manager — Copyright (C) 2026 louisSSR\nSPDX-License-Identifier: GPL-3.0-or-later\nDistributed without warranty; see LICENSE.\nSource: https://github.com/SheepSheepLab/MieMie-Preset-Manager\n\nBundled webpack runtime license:\n' + fs.readFileSync(path.join(root, 'licenses', 'webpack-MIT.txt'), 'utf8');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (['.git', '.test-build', 'delivery', 'node_modules', 'evidence'].includes(e.name) ? [] : walk(path.join(dir, e.name))) : [path.join(dir, e.name)]); }
function compileTests() {
  const files = walk(root).filter(f => f.endsWith('.ts'));
  for (const file of files) {
    const out = path.join(root, '.test-build', path.relative(root, file).replace(/\.ts$/, '.js'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText);
  }
  const tests = walk(path.join(root, 'tests')).filter(f => /\.test\.cjs$/.test(f)).concat(files.filter(f => /\.test\.ts$/.test(f)).map(f => path.join(root, '.test-build', path.relative(root, f).replace(/\.ts$/, '.js'))));
  const result = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit', cwd: root });
  if (result.status !== 0) process.exit(result.status || 1);
}
function bundle(entry, filename) {
  return new Promise((resolve, reject) => webpack({
    context: root, mode: 'development', entry: path.join(root, entry), target: ['web', 'es2022'], devtool: false,
    output: { path: path.join(root, 'delivery'), filename, iife: true },
    resolve: { extensions: ['.ts', '.js'] },
    module: { rules: [{ test: /\.ts$/, exclude: /node_modules/, use: { loader: require.resolve('ts-loader'), options: { transpileOnly: true, configFile: path.join(root, 'tsconfig.json'), compilerOptions: { noEmit: false } } } }] },
    plugins: [new webpack.BannerPlugin({ banner: licenseBanner })],
    optimization: { minimize: false }, performance: { hints: false },
  }, (error, stats) => { if (error || stats.hasErrors()) reject(error || Error(stats.toString({ all: false, errors: true }))); else resolve(); }));
}
(async () => {
  if (process.argv.includes('--test')) { compileTests(); return; }
  const checked = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.json')], { stdio: 'inherit' });
  if (checked.status !== 0) process.exit(checked.status || 1);
  compileTests();
  await bundle('index.ts', 'preset-manager.js');
  await bundle('preview.ts', 'preview.js');
  const header = '// MieMie-Extension-Build: ' + JSON.stringify({ schemaVersion: 1, productId: 'miemie.preset-manager', version, scriptId: '98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1' }) + '\n';
  const artifact = { type: 'script', enabled: true, name: `咩咩预设管理 ${version}`, id: '98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1', content: header + fs.readFileSync(path.join(root, 'delivery', 'preset-manager.js'), 'utf8'), info: '咩咩预设管理。原生 Chat Completion 预设、局部编辑、未知字段保留、MieMie Hub API v1 / standalone。测试版；请先使用备份预设验证。', button: { enabled: false, buttons: [] }, data: {}, export_with: { data: true, button: true } };
  new vm.Script(artifact.content, { filename: `MieMie-Preset-Manager-Extension-${version}.js` });
  const artifactPath = path.join(root, 'delivery', `MieMie-Preset-Manager-Extension-${version}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'delivery', 'component-update-manifest.json'), JSON.stringify({ schemaVersion: 1, deliveryMode: 'component', artifacts: [{ kind: 'helper-script', id: artifact.id, relativePath: path.basename(artifactPath), sha256: crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex') }] }, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'delivery', 'preview.html'), '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content"><title>咩咩预设管理 · 本地预览</title><style>body{margin:0;background:#100d19;color:#d5c9ee;font-family:system-ui}body>p{margin:24px;max-width:38em}</style><p>本地演示数据 · 操作只保存在本页内存。此预览不代表真实酒馆验收。</p><script src="preview.js"></script></html>');
  console.log('Built: ' + path.join(root, 'delivery', `MieMie-Preset-Manager-Extension-${version}.json`));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
