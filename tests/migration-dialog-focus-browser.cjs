// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Exercise native modal focus with pointer and keyboard; use synthetic presets only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { activeMigrationDialog } = require('./helpers/migration-dialog.cjs');
const root = path.resolve(__dirname, '..');
const out = process.env.MIGRATION_FOCUS_OUT || path.join(root, 'evidence/migration-dialog-focus');
fs.mkdirSync(out, { recursive: true });
const checks = [], focus = [], errors = [];
const settled = view => view.evaluate(async e => {
  await Promise.all(e.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {})));
});

async function run(browser, width, mode) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root, 'delivery/preview.html')).href + '?binding=1');
  await page.waitForFunction(() => __MieMieBindingDemo.binding.state.status === 'ready');
  await page.evaluate(async () => {
    const c = __MieMieBindingDemo.controller;
    const target = structuredClone(c.state.snapshot.raw), source = structuredClone(target);
    source.prompts.find(p => p.identifier === 'demo-0').content = 'Synthetic comparison body';
    source.prompts.push({ identifier: 'focus-new', name: 'Synthetic insertion', content: 'Synthetic only', role: 'system', marker: false, system_prompt: false });
    source.prompt_order[1].order.push({ identifier: 'focus-new', enabled: true });
    await c.importText('Focus Source.json', JSON.stringify(source));
    await c.importText('Focus Target.json', JSON.stringify(target));
  });
  const active = activeMigrationDialog(page);
  const parent = page.getByRole('dialog', { name: '预设条目迁移', exact: true, includeHidden: true });
  const batch = page.getByRole('dialog', { name: '批量迁移确认', exact: true, includeHidden: true });
  const child = page.locator('.mm-migration-child:not(.mm-migration-batch)');
  const check = text => checks.push(`${width} ${mode}: ${text}`);
  async function activate(button) {
    if (mode === 'keyboard') { await button.focus(); await page.keyboard.press('Enter'); }
    else await button.click();
  }
  async function rootFocus(name, view = active) {
    await settled(view);
    const state = await view.evaluate(e => {
      const s = getComputedStyle(e);
      return {
        name: e.getAttribute('aria-label'), focused: document.activeElement === e,
        focusVisible: e.matches(':focus-visible'), outlineStyle: s.outlineStyle,
        outlineWidth: s.outlineWidth, border: s.border, shadow: s.boxShadow,
        defaultActionFocused: [...e.querySelectorAll('.mm-migration-actions button')]
          .some(b => b === document.activeElement)
      };
    });
    focus.push({ width, mode, stage: name, ...state });
    const expectedLabel = {
      'first migration open': '预设条目迁移', comparison: '对比与合并', insertion: '选择插入位置',
      'batch confirmation': '批量迁移确认', 'nested comparison': '对比与合并', 'nested insertion': '选择插入位置'
    }[name];
    if (expectedLabel) assert.equal(state.name, expectedLabel);
    assert.equal(state.focused, true);
    assert.equal(state.outlineStyle, 'none');
    assert.equal(state.border, '1px solid rgb(91, 72, 127)');
    assert.notEqual(state.shadow, 'none');
    assert.equal(state.defaultActionFocused, false);
    if (mode === 'keyboard') assert.equal(state.focusVisible, true);
    check(`${name}: focus stays on dialog, no browser outline or preselected action; themed border/shadow retained`);
  }
  async function keyboardRing() {
    await page.keyboard.press('Tab');
    const state = await active.evaluate(e => {
      const a = document.activeElement, s = getComputedStyle(a);
      return { inside: a !== e && e.contains(a), visible: a.matches(':focus-visible'),
        style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
    });
    assert.deepEqual(state, { inside: true, visible: true, style: 'solid', width: '2px', color: 'rgb(196, 154, 245)' });
    check('Tab still shows the themed focus ring on an interactive control');
  }
  async function returned(view, name) {
    if (mode === 'pointer') await rootFocus(name, view);
    else {
      assert(await view.evaluate(e => {
        const a = document.activeElement, s = getComputedStyle(a);
        return a !== e && e.contains(a) && a.matches(':focus-visible') &&
          s.outlineStyle === 'solid' && s.outlineColor === 'rgb(196, 154, 245)' &&
          getComputedStyle(e).outlineStyle === 'none';
      }));
      check(`${name}: keyboard focus returns to the invoking control without a window outline`);
    }
  }
  async function openMain() {
    await activate(page.getByRole('button', { name: '更多预设操作', exact: true }));
    await activate(page.getByRole('button', { name: '预设条目迁移', exact: true }));
    await page.waitForFunction(() => !__MieMieBindingDemo.controller.migration.state.loading);
  }
  await openMain();
  await rootFocus('first migration open');
  await keyboardRing();
  await parent.getByRole('combobox').click();
  await parent.getByRole('option', { name: 'Focus Source', exact: true }).click();
  await page.waitForFunction(() => !__MieMieBindingDemo.controller.migration.state.loading);
  const source = parent.locator('[aria-label=来源条目]');
  const select = id => source.locator(`[data-id=${id}] .mm-migration-card-main`).click();
  const bridge = () => active.getByRole('button', { name: '迁移条目', exact: true });
  const cancel = () => active.getByRole('button', { name: '取消', exact: true });
  await select('demo-0');
  await activate(bridge());
  await rootFocus('comparison');
  await keyboardRing();
  await activate(cancel());
  await child.waitFor({ state: 'detached' });
  await returned(parent, 'comparison cancel');
  await select('demo-0'); await select('focus-new');
  await activate(bridge());
  await rootFocus('insertion');
  await keyboardRing();
  await activate(cancel());
  await child.waitFor({ state: 'detached' });
  await returned(parent, 'insertion cancel');
  await select('demo-0');
  await activate(bridge());
  await rootFocus('batch confirmation');
  await page.mouse.move(0, 0);
  await page.screenshot({ path: path.join(out, `batch-${width}-${mode}.png`) });
  await keyboardRing();
  for (const [id, stage] of [['demo-0', 'nested comparison'], ['focus-new', 'nested insertion']]) {
    await activate(active.locator(`[data-batch-source=${id}]`).getByRole('button', { name: '核对方案', exact: true }));
    await rootFocus(stage);
    await keyboardRing();
    await activate(cancel());
    await child.waitFor({ state: 'detached' });
    await returned(batch, `${stage} cancel`);
  }
  await activate(active.getByRole('button', { name: '取消本批次', exact: true }));
  await batch.waitFor({ state: 'detached' });
  await returned(parent, 'batch cancel');
  assert.equal(await page.evaluate(() => __MieMieBindingDemo.controller.state.pendingRaw), null);
  check('focus transitions and cancellations do not create Pending changes');
  await activate(parent.getByRole('button', { name: '返回预设管理', exact: true }));
  await parent.waitFor({ state: 'detached' });
  await openMain();
  await settled(active);
  assert(await active.evaluate(e => getComputedStyle(e).outlineStyle === 'none'));
  check('reopening the retained migration page has no window outline');
  await keyboardRing();
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium', headless: true });
  try {
    for (const width of [1280, 390]) for (const mode of ['keyboard', 'pointer']) await run(browser, width, mode);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ realHost: false, passed: checks.length, checks, focus, pageErrors: errors }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, pageErrors: errors }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
