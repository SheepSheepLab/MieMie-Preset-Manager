// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

/* Offline Chromium evidence only; physical keyboards, Safari, and real ST/Hub need a separate run. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.argv[2] ? path.join(path.resolve(process.argv[2]), 'playwright') : 'playwright');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'evidence');
const previewPath = path.join(root, 'delivery', 'preview.js');
const previewUrl = pathToFileURL(path.join(root, 'delivery', 'preview.html')).href;
const receipts = [];
const measurements = [];
const errors = [];
const screenshots = [];
const safeNames = ['top', 'right', 'bottom', 'left'];
const sourceFiles = fs.readdirSync(root).filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts'));
assert(sourceFiles.every(name => fs.statSync(path.join(root, name)).mtimeMs <= fs.statSync(previewPath).mtimeMs),
  'Rebuild the current sources before running mobile-responsive.cjs');
fs.mkdirSync(evidence, { recursive: true });

async function resize(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(({ width, height }) => {
    const r = document.querySelector('.miemie-pm')?.getBoundingClientRect();
    return r && r.width <= Math.min(600, width - 20) + 1 && r.height <= Math.min(780, height - 20) + 1 && r.left >= 9 && r.top >= 9;
  }, { width, height });
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(evidence, name), fullPage: false });
  screenshots.push(name);
}

async function hitVisible(locator, viewport, safe = { top: 0, right: 0, bottom: 0, left: 0 }) {
  const result = await locator.evaluate((node, { viewport, safe }) => {
    const r = node.getBoundingClientRect();
    const point = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      name: node.getAttribute('aria-label') || node.textContent,
      box: { x: r.x, y: r.y, width: r.width, height: r.height },
      inside: r.left >= safe.left - 1 && r.right <= viewport.width - safe.right + 1 &&
        r.top >= safe.top - 1 && r.bottom <= viewport.height - safe.bottom + 1,
      hit: point === node || node.contains(point),
    };
  }, { viewport, safe });
  assert(result.inside, `Control outside usable viewport: ${JSON.stringify(result)}`);
  assert(result.hit, `Control covered at its center: ${JSON.stringify(result)}`);
  return result;
}

async function checkLayout(page, viewport) {
  await resize(page, viewport.width, viewport.height);
  const result = await page.evaluate(() => {
    const panel = document.querySelector('.miemie-pm');
    const root = panel.getBoundingClientRect();
    const shown = node => node.getClientRects().length && !node.closest('[hidden]');
    const controls = [...panel.querySelectorAll('.mm-frame button,.mm-frame select,.mm-card')].filter(shown);
    const horizontal = controls.filter(node => !node.closest('.mm-categorybar')).filter(node => {
      const r = node.getBoundingClientRect();
      return r.left < root.left - 1 || r.right > root.right + 1;
    }).map(node => node.getAttribute('aria-label') || node.className);
    const smallTargets = [...panel.querySelectorAll('.mm-frame button')].filter(shown).filter(node => {
      const r = node.getBoundingClientRect();
      return r.bottom > root.top && r.top < root.bottom && r.right > root.left && r.left < root.right &&
        (r.width < 43.9 || r.height < 43.9);
    }).map(node => ({ name: node.getAttribute('aria-label') || node.textContent, width: node.offsetWidth, height: node.offsetHeight }));
    const list = panel.querySelector('.mm-scroll').getBoundingClientRect();
    return { horizontal, smallTargets, listHeight: list.height, panelCount: document.querySelectorAll('.miemie-pm').length };
  });
  assert.deepEqual(result.horizontal, [], `${viewport.width}×${viewport.height}: horizontal overflow`);
  assert.deepEqual(result.smallTargets, [], `${viewport.width}×${viewport.height}: touch target below 44px`);
  assert.equal(result.panelCount, 1, 'Responsive layout must retain one manager panel');
  assert(result.listHeight >= 44, `${viewport.width}×${viewport.height}: list cannot show one touch target`);
  await hitVisible(page.getByRole('button', { name: '关闭预设管理', exact: true }), viewport);
  await hitVisible(page.getByRole('button', { name: '新增条目', exact: true }), viewport);
  measurements.push({ viewport, ...result });
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(previewUrl);
    await page.locator('.mm-card').first().waitFor();
    const demo = page.locator('.mm-card[data-id="demo-0"]');
    await demo.getByRole('button', { name: '编辑条目', exact: true }).click();
    let editor = page.getByRole('dialog', { name: '编辑条目', exact: true });
    const titleText = '同一个预设 · 横竖屏和电脑切换仍保留草稿';
    const contentText = '第一行：手机编辑的未保存草稿。\n第二行：保持选区与光标。\n第三行：桌面继续编辑。';
    await editor.getByLabel('标题', { exact: true }).fill(titleText);
    await editor.getByLabel('内容', { exact: true }).fill(contentText);
    await page.evaluate(() => {
      const panel = document.querySelector('.miemie-pm');
      const editor = panel.querySelector('.mm-editor-dialog');
      const title = editor.querySelector('input[type=text]');
      const content = editor.querySelector('textarea');
      content.focus();
      content.setSelectionRange(5, 16, 'forward');
      window.__mmResponsiveRefs = { panel, editor, title, content };
    });
    for (const viewport of [
      { width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 },
      { width: 320, height: 400 }, { width: 1280, height: 900 },
    ]) {
      await resize(page, viewport.width, viewport.height);
      const state = await page.evaluate(() => {
        const refs = window.__mmResponsiveRefs;
        return {
          samePanel: refs.panel === document.querySelector('.miemie-pm'),
          sameEditor: refs.editor === document.querySelector('.mm-editor-dialog'),
          sameTitle: refs.title === document.querySelector('.mm-editor-dialog input[type=text]'),
          sameContent: refs.content === document.querySelector('.mm-editor-dialog textarea'),
          title: refs.title.value, content: refs.content.value,
          selection: [refs.content.selectionStart, refs.content.selectionEnd, refs.content.selectionDirection],
          focused: document.activeElement === refs.content,
        };
      });
      assert.deepEqual(state, {
        samePanel: true, sameEditor: true, sameTitle: true, sameContent: true,
        title: titleText, content: contentText, selection: [5, 16, 'forward'], focused: true,
      }, `Draft and editor identity must survive ${viewport.width}×${viewport.height}`);
      await hitVisible(editor.getByRole('button', { name: '保存', exact: true }), viewport);
      if (viewport.width === 320) await screenshot(page, 'responsive-editor-320x400.png');
      if (viewport.width === 844) await screenshot(page, 'responsive-editor-landscape.png');
    }
    receipts.push('同一页面、面板和编辑节点在桌面→手机→横屏→短视口→桌面保留草稿、焦点和选区');
    await editor.getByRole('button', { name: '取消', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });

    for (const viewport of [
      { width: 320, height: 740 }, { width: 360, height: 800 }, { width: 390, height: 844 },
      { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 844, height: 390 },
      { width: 1280, height: 900 },
    ]) {
      await checkLayout(page, viewport);
      if ([320, 390, 768, 844, 1280].includes(viewport.width))
        await screenshot(page, `responsive-${viewport.width}x${viewport.height}.png`);
    }
    receipts.push('320/360/390/430/768/844横屏/1280布局无横向溢出，主操作触摸目标至少44px');

    // Commit an intentionally long title to exercise real row rendering, not a DOM-only fixture.
    await demo.getByRole('button', { name: '编辑条目', exact: true }).click();
    editor = page.getByRole('dialog', { name: '编辑条目', exact: true });
    const longTitle = '写作-' + '很长的中文条目名称'.repeat(16) + 'UnbrokenToken'.repeat(12);
    await editor.getByLabel('标题', { exact: true }).fill(longTitle);
    await editor.getByRole('button', { name: '保存', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    await checkLayout(page, { width: 320, height: 740 });
    assert.equal(await demo.locator('.mm-card-title').textContent(), longTitle);
    await demo.scrollIntoViewIfNeeded();
    await hitVisible(demo.getByRole('button', { name: '编辑条目', exact: true }), { width: 320, height: 740 });
    await screenshot(page, 'responsive-long-title-320.png');
    receipts.push('中英文超长标题完整保留且不挤出条目操作');

    for (const viewport of [{ width: 844, height: 320 }, { width: 320, height: 400 }]) {
      await resize(page, viewport.width, viewport.height);
      await page.getByRole('button', { name: '更多预设操作', exact: true }).click();
      const menu = page.locator('.mm-menu');
      await menu.waitFor({ state: 'visible' });
      const buttons = menu.locator('button');
      const names = [];
      for (let index = 0; index < await buttons.count(); index++) {
        const item = buttons.nth(index);
        await item.scrollIntoViewIfNeeded();
        names.push((await hitVisible(item, viewport)).name);
      }
      assert.equal(names.length, 4, 'All preset menu actions must remain reachable');
      measurements.push({ viewport, menuItemsReachable: names });
      if (viewport.width === 320) await screenshot(page, 'responsive-menu-320x400.png');
      await page.keyboard.press('Escape');
      await menu.waitFor({ state: 'hidden' });
    }
    receipts.push('844×320及320×400低高度下全部更多操作均可滚动触达且未被遮挡');

    for (const { viewport, safe } of [
      { viewport: { width: 390, height: 844 }, safe: { top: 32, right: 16, bottom: 24, left: 12 } },
      { viewport: { width: 844, height: 390 }, safe: { top: 8, right: 35, bottom: 20, left: 35 } },
    ]) {
      await resize(page, viewport.width, viewport.height);
      await page.locator('.miemie-pm').evaluate((panel, safe) => {
        for (const [side, pixels] of Object.entries(safe)) panel.style.setProperty(`--mm-safe-${side}`, `${pixels}px`);
        window.dispatchEvent(new Event('resize'));
      }, safe);
      await hitVisible(page.getByRole('button', { name: '关闭预设管理', exact: true }), viewport, safe);
      await hitVisible(page.getByRole('button', { name: '新增条目', exact: true }), viewport, safe);
      await demo.scrollIntoViewIfNeeded();
      await demo.getByRole('button', { name: '编辑条目', exact: true }).click();
      editor = page.getByRole('dialog', { name: '编辑条目', exact: true });
      await hitVisible(editor.getByRole('button', { name: '取消编辑', exact: true }), viewport, safe);
      await hitVisible(editor.getByRole('button', { name: '保存', exact: true }), viewport, safe);
      await screenshot(page, `responsive-safe-area-${viewport.width}.png`);
      await editor.getByRole('button', { name: '取消', exact: true }).click();
      await editor.waitFor({ state: 'hidden' });
      await page.locator('.miemie-pm').evaluate((panel, sides) => {
        for (const side of sides) panel.style.removeProperty(`--mm-safe-${side}`);
        window.dispatchEvent(new Event('resize'));
      }, safeNames);
    }
    receipts.push('自定义安全区模拟下，竖屏/横屏主面板与编辑保存、关闭按钮均避让四边');

    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const touchPage = await touchContext.newPage();
    touchPage.on('pageerror', error => errors.push(error.message));
    await touchPage.goto(previewUrl);
    await touchPage.locator('.mm-card').first().waitFor();
    const rowOrder = () => touchPage.locator('.mm-card[data-attached=true]').evaluateAll(rows => rows.map(row => row.dataset.id));
    const before = await rowOrder();
    await touchPage.locator('.mm-card[data-id="demo-0"]').getByRole('button', { name: '编辑条目', exact: true }).tap();
    const touchEditor = touchPage.getByRole('dialog', { name: '编辑条目', exact: true });
    await touchEditor.waitFor({ state: 'visible' });
    assert.equal(await touchPage.locator('.mm-drag-ghost').count(), 0, 'Tapping edit must not begin drag');
    assert.deepEqual(await rowOrder(), before, 'Tapping edit must not reorder rows');
    await touchEditor.getByRole('button', { name: '取消', exact: true }).tap();
    await touchEditor.waitFor({ state: 'hidden' });
    assert.deepEqual(await rowOrder(), before);
    assert.equal(await touchPage.locator('.mm-drag-ghost').count(), 0);
    receipts.push('真实触摸事件轻点编辑/取消不会触发拖动或改变排序');
    const touchClient = await touchContext.newCDPSession(touchPage);
    const source = await touchPage.locator('.mm-card[data-id="demo-0"]').boundingBox();
    await touchClient.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: Math.round(source.x + 12), y: Math.round(source.y + 15), id: 1 }],
    });
    await touchPage.waitForFunction(() => document.querySelector('.mm-drag-ghost'));
    await resize(touchPage, 844, 390);
    await touchPage.waitForFunction(() => !document.querySelector('.mm-drag-ghost'));
    await touchClient.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.deepEqual(await rowOrder(), before, 'Resizing an active touch drag must cancel without sorting');
    receipts.push('触摸长按生成拖影后旋转视口会取消拖动，松手不改变排序');
    await touchContext.close();

    // The layout viewport deliberately stays tall while a visualViewport stub simulates keyboard occlusion/panning.
    const keyboardContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await keyboardContext.addInitScript(() => {
      const viewport = Object.assign(new EventTarget(), { width: 390, height: 844, offsetTop: 0, offsetLeft: 0, scale: 1 });
      Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
      window.__mmMockVisualViewport = viewport;
    });
    const keyboardPage = await keyboardContext.newPage();
    keyboardPage.on('pageerror', error => errors.push(error.message));
    await keyboardPage.goto(previewUrl);
    await keyboardPage.locator('.mm-card').first().waitFor();
    await keyboardPage.locator('.mm-card[data-id="demo-0"]').getByRole('button', { name: '编辑条目', exact: true }).click();
    const keyboardEditor = keyboardPage.getByRole('dialog', { name: '编辑条目', exact: true });
    await keyboardEditor.getByLabel('内容', { exact: true }).fill(contentText);
    await keyboardPage.evaluate(() => {
      const content = document.querySelector('.mm-editor-dialog textarea');
      content.focus();
      content.setSelectionRange(5, 16, 'forward');
      window.__mmKeyboardContent = content;
      Object.assign(window.__mmMockVisualViewport, { height: 340, offsetTop: 100 });
      window.__mmMockVisualViewport.dispatchEvent(new Event('resize'));
      window.__mmMockVisualViewport.dispatchEvent(new Event('scroll'));
    });
    await keyboardPage.waitForFunction(() => {
      const r = document.querySelector('.miemie-pm').getBoundingClientRect();
      return Math.abs(r.height - 320) <= 1 && Math.abs(r.top - 110) <= 1;
    });
    const keyboardState = await keyboardPage.evaluate(() => {
      const r = document.querySelector('.miemie-pm').getBoundingClientRect();
      const content = window.__mmKeyboardContent;
      return {
        windowHeight: window.innerHeight, panel: { x: r.x, y: r.y, width: r.width, height: r.height },
        sameContent: content === document.querySelector('.mm-editor-dialog textarea'), value: content.value,
        selection: [content.selectionStart, content.selectionEnd, content.selectionDirection],
        focused: document.activeElement === content,
      };
    });
    assert.deepEqual(keyboardState, {
      windowHeight: 844, panel: { x: 10, y: 110, width: 370, height: 320 },
      sameContent: true, value: contentText, selection: [5, 16, 'forward'], focused: true,
    });
    await hitVisible(keyboardEditor.getByRole('button', { name: '保存', exact: true }),
      { width: 390, height: 440 }, { top: 100, right: 0, bottom: 0, left: 0 });
    await screenshot(keyboardPage, 'responsive-visual-viewport-keyboard-simulation.png');
    measurements.push({ visualViewportSimulation: keyboardState });
    receipts.push('模拟visualViewport缩短至340px且上沿偏移100px时，布局视口不变、面板贴合可视区且草稿选区及保存保持可用');
    await keyboardContext.close();
    await context.close();
    assert.deepEqual(errors, []);
    receipts.push('响应式预览无未捕获页面错误');
    const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'delivery', name))).digest('hex');
    const result = {
      kind: 'offline-responsive-preview', realHost: false, physicalDevice: false,
      browser: await browser.version(), generatedAt: new Date().toISOString(),
      build: { previewSha256: hash('preview.js'), scriptSha256: hash('preset-manager.js') },
      checks: receipts, measurements, screenshots, errors,
      boundaries: ['真实SillyTavern与真实Hub未连接', '安全区为CSS变量模拟', '软键盘为缩短视口及visualViewport桩模拟', '未验证iOS Safari及物理设备'],
    };
    fs.writeFileSync(path.join(evidence, 'mobile-responsive.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ passed: receipts.length, checks: receipts, screenshots }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
