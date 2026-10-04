// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

/* Local preview only. A real ST/Hub run is a separate acceptance gate. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.argv[2] ? path.join(path.resolve(process.argv[2]), 'playwright') : 'playwright');
const root = path.resolve(__dirname, '..');
const receipts = [];
(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'delivery', 'preview.html')).href);
    await page.locator('.mm-card').first().waitFor();
    const officialPNG = fs.readFileSync(path.join(root, 'assets', 'preset-manager-icon.png'));
    await page.waitForFunction(() => { const img = document.querySelector('[data-miemie-preset-manager-standalone] img'); return img?.complete && img.naturalWidth === 1254 && img.naturalHeight === 1254; });
    const officialIconURL = await page.locator('[data-miemie-preset-manager-standalone] img').getAttribute('src');
    assert.match(officialIconURL, /^data:image\/png;base64,/);
    assert.deepEqual(Buffer.from(officialIconURL.split(',')[1], 'base64'), officialPNG);
    receipts.push('正式 PNG 产品图标原样内嵌并在浏览器加载成功');
    const card = id => page.locator(`.mm-card[data-id="${id}"]`);
    const exported = async () => {
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出完整预设', exact: true }).click()]);
      return JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    };
    const original = await exported();
    await card('demo-0').getByRole('button', { name: '编辑条目', exact: true }).click();
    let editor = page.getByRole('dialog', { name: '编辑条目', exact: true });
    await editor.getByLabel('标题', { exact: true }).fill('未保存的标题');
    await editor.getByRole('button', { name: '取消', exact: true }).click();
    assert.deepEqual(await exported(), original); receipts.push('编辑取消零数据变化');
    await card('demo-0').getByRole('button', { name: '编辑条目', exact: true }).click();
    editor = page.getByRole('dialog', { name: '编辑条目', exact: true });
    await editor.getByLabel('标题', { exact: true }).fill('写作-修改后的正文');
    await editor.getByLabel('身份', { exact: true }).selectOption('user');
    await editor.getByLabel('内容', { exact: true }).fill('<script>window.INJECTED=true</script> 安全文本');
    await editor.getByRole('button', { name: '保存', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    let raw = await exported();
    assert.equal(raw.prompts.find(p => p.identifier === 'demo-0').role, 'user');
    assert.equal(raw.prompts.find(p => p.identifier === 'demo-0').future_prompt_option.keep, true);
    assert.equal(await page.evaluate(() => window.INJECTED), undefined); receipts.push('编辑提交与未知字段保留、注入文本保持惰性');
    await card('demo-0').getByRole('button', { name: '复制条目', exact: true }).click();
    raw = await exported();
    const order = raw.prompt_order.find(g => g.character_id === 100001).order;
    const index = order.findIndex(e => e.identifier === 'demo-0');
    assert.notEqual(order[index + 1].identifier, 'demo-0');
    assert.match(raw.prompts.find(p => p.identifier === order[index + 1].identifier).name, /copy$/);
    const copied = order[index + 1].identifier; receipts.push('条目完整复制紧跟原项');
    await card('demo-0').getByRole('switch').click();
    assert.equal((await exported()).prompt_order[1].order.find(e => e.identifier === 'demo-0').enabled, false);
    await card(copied).getByRole('button', { name: '解锁并移出当前发送顺序' }).click();
    await card(copied).getByRole('button', { name: '删除条目', exact: true }).click();
    let confirm = page.getByRole('dialog', { name: '删除条目', exact: true });
    await confirm.getByRole('button', { name: '取消', exact: true }).click();
    assert((await exported()).prompts.some(p => p.identifier === copied));
    await card(copied).getByRole('button', { name: '删除条目', exact: true }).click();
    confirm = page.getByRole('dialog', { name: '删除条目', exact: true });
    await confirm.getByRole('button', { name: '删除', exact: true }).click();
    assert(!(await exported()).prompts.some(p => p.identifier === copied)); receipts.push('开关、解锁、删除取消及确认');
    await page.getByRole('button', { name: '写作', exact: true }).click();
    await card('demo-2').focus(); await page.keyboard.press('Alt+ArrowUp');
    raw = await exported(); assert.deepEqual(raw.prompt_order[1].order.slice(1, 4).map(e => e.identifier), ['demo-0', 'demo-2', 'demo-1']);
    await page.getByRole('button', { name: '全部', exact: true }).click(); receipts.push('分类过滤和键盘排序');
    // Whole-card mouse sorting, deliberately away from controls.
    const before = await card('demo-0').boundingBox(), moved = await card('demo-1').boundingBox();
    await page.mouse.move(moved.x + 28, moved.y + 20); await page.mouse.down();
    await page.mouse.move(before.x + 30, before.y + 3, { steps: 12 }); await page.mouse.up();
    raw = await exported(); assert.equal(raw.prompt_order[1].order[1].identifier, 'demo-1'); receipts.push('桌面整卡拖动排序');
    await page.getByRole('button', { name: '复制当前预设', exact: true }).click();
    assert.match(await page.getByLabel('当前使用预设', { exact: true }).inputValue(), /copy$/); receipts.push('完整预设复制并切换');
    const imported = structuredClone(original); imported.unknown_root = { future: ['kept'] };
    await page.locator('input[type=file]').setInputFiles({ name: '原生复杂测试.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
    await page.waitForFunction(() => document.querySelector('[aria-label="当前使用预设"]').value === '原生复杂测试');
    assert.deepEqual(await exported(), imported); receipts.push('原生JSON导入自动切换与无修改完整往返');
    fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'evidence', 'desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(root, 'evidence', 'mobile-390.png'), fullPage: true });
    await page.setViewportSize({ width: 320, height: 740 });
    await page.waitForFunction(() => document.querySelector('.miemie-pm').getBoundingClientRect().width <= 320);
    const overflow = await page.evaluate(() => {
      const root = document.querySelector('.miemie-pm').getBoundingClientRect();
      return [...document.querySelectorAll('.miemie-pm button:not(.mm-tab),.miemie-pm select,.mm-card')].filter(e => e.getClientRects().length).filter(e => { const r = e.getBoundingClientRect(); return r.right > root.right + 1 || r.left < root.left - 1; }).map(e => e.getAttribute('aria-label') || e.className);
    });
    assert.deepEqual(overflow, []);
    await card('demo-0').getByRole('button', { name: '编辑条目', exact: true }).click();
    await page.screenshot({ path: path.join(root, 'evidence', 'mobile-editor-320.png'), fullPage: true });
    await page.setViewportSize({ width: 320, height: 400 });
    await page.waitForFunction(() => document.querySelector('.miemie-pm').getBoundingClientRect().height <= 400);
    const saveBounds = await page.getByRole('dialog', { name: '编辑条目', exact: true }).getByRole('button', { name: '保存', exact: true }).boundingBox();
    assert(saveBounds.y >= 0 && saveBounds.y + saveBounds.height <= 400); receipts.push('390/320窄屏无控件横向溢出，缩短视口编辑按钮可达');
    await context.close();
    // B2: actual shared UI/controller with an offline Hub Surface contract model.
    // DOM hiding alone cannot change this model's Surface/Launcher state.
    const lifecycle = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const panelPage = await lifecycle.newPage(); panelPage.on('pageerror', error => errors.push(error.message));
    await panelPage.goto(pathToFileURL(path.join(root, 'delivery', 'preview.html')).href);
    await panelPage.locator('.mm-card').first().waitFor();
    // The editor overlay blocks header pointer taps; dispatch exercises that UI
    // close route while retaining a draft, rather than claiming a physical tap.
    const closeManager = (withDraft = false) => {
      const button = panelPage.getByRole('button', { name: '关闭预设管理', exact: true });
      return withDraft ? button.dispatchEvent('click') : button.click();
    };
    const launcher = () => panelPage.locator('[data-miemie-preset-manager-standalone]');
    await closeManager(); await launcher().waitFor({ state: 'visible' });
    await launcher().click(); await panelPage.locator('.mm-card').first().waitFor();
    await panelPage.keyboard.press('Escape'); await launcher().waitFor({ state: 'visible' });
    await launcher().click(); receipts.push('B2 Standalone button/Escape close and reopen');
    await panelPage.locator('.mm-card[data-id="demo-0"]').getByRole('button', { name: '编辑条目', exact: true }).click();
    await panelPage.getByRole('dialog', { name: '编辑条目', exact: true }).getByLabel('标题', { exact: true }).fill('synthetic lifecycle draft');
    await panelPage.evaluate(async () => {
      const source = window.__MieMiePresetManagerSource;
      const originalPanel = document.querySelector('.miemie-pm');
      window.makeTestHub = () => {
        const record = { state: 'closed', launcherSuspended: false, closes: 0, panels: [], instances: [], signals: [], cleanups: [] };
        const hub = { apiVersion: 1, extensions: { provide(manifest, factory) {
          const ctrl = new AbortController(); record.signals.push(ctrl);
          const instance = factory({ signal: ctrl.signal, onCleanup(fn) { record.cleanups.push(fn); },
            attachPanel(panel) { record.panels.push(panel); panel.hidden = true; panel.inert = true; },
            showPanel() { record.state = 'preset'; record.launcherSuspended = true; record.panels[0].hidden = false; record.panels[0].inert = false; return true; },
            closePanel() {
              record.closes++;
              // Keep the panel visible until the formal Surface transition ends.
              return new Promise(resolve => setTimeout(() => {
                record.state = 'closed'; record.launcherSuspended = false;
                record.panels[0].hidden = true; record.panels[0].inert = true; resolve(true);
              }, 20));
            }
          }); record.instances.push(instance);
          return { ok: true, ready: instance.activate(), release() { ctrl.abort(); instance.deactivate(); record.cleanups.splice(0).forEach(fn => fn()); } };
        } } };
        return { hub, record };
      };
      window.lifecyclePanel = originalPanel; window.firstTestHub = window.makeTestHub();
      window.__MieMieHub = window.firstTestHub.hub;
      window.dispatchEvent(new CustomEvent('miemie:hub-ready'));
      await source.settled(); await window.firstTestHub.record.instances[0].open();
    });
    const hubState = () => panelPage.evaluate(() => {
      const r = window.firstTestHub.record;
      return { state: r.state, launcherSuspended: r.launcherSuspended, closes: r.closes,
        panels: r.panels.length, instances: r.instances.length, samePanel: r.panels[0] === window.lifecyclePanel };
    });
    for (let i = 1; i <= 5; i++) {
      await closeManager(true);
      await panelPage.waitForFunction(() => window.firstTestHub.record.state === 'closed');
      assert.deepEqual(await hubState(), { state: 'closed', launcherSuspended: false, closes: i, panels: 1, instances: 1, samePanel: true });
      await panelPage.evaluate(() => window.firstTestHub.record.instances[0].open());
      assert.equal(await panelPage.getByRole('dialog', { name: '编辑条目', exact: true }).getByLabel('标题', { exact: true }).inputValue(), 'synthetic lifecycle draft');
    }
    receipts.push('B2 Hub close restores Surface/Launcher and reopens one panel for five cycles');
    receipts.push('B2 editor draft survives Hub arrival and repeated close/reopen');
    await panelPage.evaluate(async () => {
      const old = window.__MieMieHub; delete window.__MieMieHub;
      window.dispatchEvent(new CustomEvent('miemie:hub-disposed', { detail: old }));
      await window.__MieMiePresetManagerSource.settled();
    });
    await launcher().waitFor({ state: 'visible' }); assert.equal(await launcher().count(), 1);
    await launcher().click();
    assert.equal(await panelPage.getByRole('dialog', { name: '编辑条目', exact: true }).getByLabel('标题', { exact: true }).inputValue(), 'synthetic lifecycle draft');
    await closeManager(true); await launcher().waitFor({ state: 'visible' });
    receipts.push('B2 Hub disposal restores Standalone launcher and retained draft');
    await panelPage.evaluate(async () => {
      window.secondTestHub = window.makeTestHub(); window.__MieMieHub = window.secondTestHub.hub;
      for (let i = 0; i < 5; i++) window.dispatchEvent(new CustomEvent('miemie:hub-ready'));
      await window.__MieMiePresetManagerSource.settled(); await window.secondTestHub.record.instances[0].open();
    });
    assert.equal(await launcher().count(), 0);
    await closeManager(true); await panelPage.waitForFunction(() => window.secondTestHub.record.state === 'closed');
    assert.deepEqual(await panelPage.evaluate(() => ({ instances: window.secondTestHub.record.instances.length,
      panels: window.secondTestHub.record.panels.length, same: window.secondTestHub.record.panels[0] === window.firstTestHub.record.panels[0], oldCloses: window.firstTestHub.record.closes,
      newCloses: window.secondTestHub.record.closes })), { instances: 1, panels: 1, same: true, oldCloses: 5, newCloses: 1 });
    receipts.push('B2 Hub rejoin/repeated ready reuse one business panel and current close route');
    await lifecycle.close();
    // Isolated touch context for real touch event paths.
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const mobile = await touch.newPage(); mobile.on('pageerror', error => errors.push(error.message));
    await mobile.goto(pathToFileURL(path.join(root, 'delivery', 'preview.html')).href);
    await mobile.locator('.mm-card').first().waitFor();
    const client = await touch.newCDPSession(mobile);
    const rowOrder = () => mobile.locator('.mm-card[data-attached=true]').evaluateAll(rows => rows.map(r => r.dataset.id));
    const a = await mobile.locator('.mm-card[data-id="demo-0"]').boundingBox();
    const start = { x: Math.round(a.x + 35), y: Math.round(a.y + 14) };
    const touchEvent = (type, point) => client.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ ...point, id: 1 }] : [] });
    let ids = await rowOrder();
    await touchEvent('touchStart', start);
    await touchEvent('touchMove', { x: start.x, y: start.y - 65 });
    await touchEvent('touchEnd');
    assert.deepEqual(await rowOrder(), ids); receipts.push('触屏滑动列表不误排序');
    await mobile.reload();
    await mobile.locator('.mm-card').first().waitFor();
    const from = await mobile.locator('.mm-card[data-id="demo-1"]').boundingBox();
    const to = await mobile.locator('.mm-card[data-id="demo-0"]').boundingBox();
    await touchEvent('touchStart', { x: Math.round(from.x + 30), y: Math.round(from.y + 15) });
    await mobile.waitForTimeout(400);
    assert.equal(await mobile.locator('.mm-drag-ghost').count(), 1, 'long press should activate drag');
    await touchEvent('touchMove', { x: Math.round(to.x + 30), y: Math.round(to.y + 2) });
    await touchEvent('touchEnd');
    assert.equal((await rowOrder())[1], 'demo-1', 'touch drop order');
    receipts.push('触屏长按整卡排序');
    assert.deepEqual(errors, []); receipts.push('预览无未捕获页面错误');
    fs.writeFileSync(path.join(root, 'evidence', 'browser-check.json'), JSON.stringify({ kind: 'offline-preview', browser: await browser.version(), checks: receipts, errors, realHost: false }, null, 2));
    console.log(JSON.stringify({ passed: receipts.length, checks: receipts }, null, 2));
    await touch.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
