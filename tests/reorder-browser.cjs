// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
/* Actual production controller/view + synthetic delayed adapter; never a real-host claim. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const webpack = require('webpack');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), evidence = path.join(root, 'evidence');
fs.mkdirSync(evidence, { recursive: true });
const receipts = [], errors = [], timings = [];
const baselineSHA = 'ac81136caf623ce8f197296294b19c5f2a4f9cf6';
const baselineRoot = path.join(evidence, 'reorder-baseline');
fs.mkdirSync(path.join(baselineRoot, 'tests/helpers'), { recursive: true });
for (const file of ['controller.ts', 'contracts.ts', 'model.ts', 'ui.ts', 'styles.ts', 'icons.ts'])
  fs.writeFileSync(path.join(baselineRoot, file), execFileSync('git', ['show', `${baselineSHA}:${file}`], { cwd: root }));
fs.copyFileSync(path.join(root, 'tests/helpers/reorder-browser-harness.ts'), path.join(baselineRoot, 'tests/helpers/reorder-browser-harness.ts'));
function bundle(source, name) {
  return new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false,
    context: root, entry: path.join(source, 'tests/helpers/reorder-browser-harness.ts'),
    output: { path: evidence, filename: name }, resolve: { extensions: ['.ts', '.js'] },
    module: { rules: [{ test: /\.png$/, type: 'asset/inline' }, { test: /\.ts$/, use: { loader: require.resolve('ts-loader'), options: { transpileOnly: true, configFile: path.join(root, 'tsconfig.json'), compilerOptions: { noEmit: false } } } }] },
    performance: { hints: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));
}
let browser;
async function pageFor(name = 'reorder-harness.js') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.setContent('<!doctype html><html><head><style>body,button,input,textarea{text-shadow:0 0 3px #000}</style></head><body style="margin:0"></body></html>');
  await page.addScriptTag({ path: path.join(evidence, name) });
  await page.locator('.mm-card').first().waitFor();
  return page;
}
const order = page => page.locator('.mm-scroll .mm-card[data-attached=true]').evaluateAll(nodes => nodes.map(n => n.dataset.id));
const settled = page => page.waitForFunction(() => !window.reorderTest.controller.state.busy);
async function dragTo(page, id, target) {
  const from = await page.locator(`.mm-scroll .mm-card[data-id=${id}]`).boundingBox();
  const to = await page.locator(`.mm-scroll .mm-card[data-id=${target}]`).boundingBox();
  await page.mouse.move(from.x + 22, from.y + 18); await page.mouse.down();
  await page.mouse.move(to.x + 22, to.y + 3, { steps: 8 });
  await page.waitForFunction(() => document.querySelector('.mm-drag-active'));
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
}
(async () => {
  await bundle(root, 'reorder-harness.js'); await bundle(baselineRoot, 'reorder-baseline.js');
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  try {
    let page = await pageFor('reorder-baseline.js');
    await page.locator('.mm-card[data-id=a]').getByRole('button', { name: '编辑条目', exact: true }).click();
    const oldShadow = await page.getByRole('button', { name: '保存', exact: true }).evaluate(n => getComputedStyle(n).textShadow);
    assert.notEqual(oldShadow, 'none', 'baseline reproduces host theme shadow'); await page.close();
    page = await pageFor();
    await page.locator('.mm-card[data-id=a]').getByRole('button', { name: '编辑条目', exact: true }).click();
    const saveButton = page.getByRole('button', { name: '保存', exact: true });
    assert.equal(await saveButton.evaluate(n => getComputedStyle(n).textShadow), 'none');
    await page.locator('.mm-editor-dialog .mm-dialog-actions').screenshot({ path: path.join(evidence, 'save-button-no-shadow.png') });
    await page.getByRole('button', { name: '取消', exact: true }).click();
    receipts.push('宿主body和button文字阴影污染可在旧版复现；候选编辑保存按钮text-shadow为none');
    await page.close(); page = await pageFor();
    const names = ['🛡️破甲', '📕文风', '🧠情绪控制', '很长的中文分类名称完整保留不缩小字号', '🌍Wlog Mixed中文Category', '🧩 NPC视角与人物关系', '语言'];
    await page.evaluate(names => window.reorderTest.categories(names), names);
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction(width => Math.abs(document.querySelector('.miemie-pm').getBoundingClientRect().width - Math.min(600,width-20)) < 1, width);
      const measurement = await page.evaluate(() => {
        const bar = document.querySelector('.mm-categorybar'), r = bar.getBoundingClientRect();
        const tabs = [...bar.children].map(node => {
          const rect = node.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(node);
          const text = range.getBoundingClientRect(), css = getComputedStyle(node);
          return { name: node.textContent, left: rect.left, right: rect.right, textLeft: text.left, textRight: text.right,
            height: rect.height, font: css.fontSize, wrap: css.whiteSpace, overflow: css.textOverflow, shrink: css.flexShrink };
        });
        return { tabs, left: r.left, right: r.right, viewport: innerWidth, barScroll: bar.scrollWidth > bar.clientWidth, documentWidth: document.documentElement.scrollWidth, add: document.querySelector('[aria-label="新增条目"]').getBoundingClientRect().toJSON(), actions: document.querySelector('.mm-session-actions').getBoundingClientRect().toJSON(), separators: [...document.querySelectorAll('.mm-separator')].map(n => n.getBoundingClientRect().toJSON()) };
      });
      for (const name of names) assert(measurement.tabs.some(tab => tab.name === name), `Missing category ${name}`);
      for (let i = 0; i < measurement.tabs.length; i++) {
        const tab = measurement.tabs[i];
        assert(tab.textLeft >= tab.left && tab.textRight <= tab.right + 0.1, `${width}: text outside ${tab.name}`);
        assert.equal(tab.shrink, '0'); assert.equal(tab.wrap, 'nowrap'); assert.notEqual(tab.overflow, 'ellipsis');
        assert(tab.height >= 44); assert.equal(tab.font, measurement.tabs[0].font);
        if (i) assert(tab.left >= measurement.tabs[i-1].right + 5, 'category overlap');
      }
      assert(measurement.left >= -0.1 && measurement.right <= width + 0.1, JSON.stringify(measurement)); assert.equal(measurement.documentWidth, width);
      assert.equal(measurement.separators.length, 2);
      assert(measurement.add.right < measurement.separators[0].left && measurement.separators[0].right < measurement.left);
      assert(measurement.right < measurement.separators[1].left && measurement.separators[1].right < measurement.actions.left);
      assert(measurement.actions.right <= width); assert(measurement.actions.height >= 44);
      assert(measurement.barScroll); await page.screenshot({ path: path.join(evidence, `categories-${width}.png`) });
      receipts.push(`冒号/连字符混排的中文/Emoji/English分类 ${width}px 完整包裹、无重叠、水平滚动`);
    }
    await page.close(); page = await pageFor();
    await page.evaluate(() => {
      const title = document.querySelector('.mm-card-title'); const range = document.createRange(); range.selectNodeContents(title);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    });
    assert(await page.evaluate(() => getSelection().toString().length > 0));
    assert.notEqual(await page.locator('.mm-card-title').first().evaluate(n => getComputedStyle(n).userSelect), 'none');
    receipts.push('普通文字选择保持可用');
    await page.evaluate(() => {
      window.originalCards = [...document.querySelectorAll('.mm-scroll .mm-card')];
      window.layoutProbe = [];
      const read = Element.prototype.getBoundingClientRect, insert = Node.prototype.insertBefore;
      Element.prototype.getBoundingClientRect = function(...args) {
        if (document.querySelector('.mm-drag-active') && this.matches('.mm-scroll,.mm-card')) window.layoutProbe.push({ op: 'read', time: performance.now() });
        return read.apply(this, args);
      };
      Node.prototype.insertBefore = function(...args) {
        if (document.querySelector('.mm-drag-active') && this.matches?.('.mm-list')) window.layoutProbe.push({ op: 'write', time: performance.now() });
        return insert.apply(this, args);
      };
    });
    await dragTo(page, 'c', 'a');
    assert.deepEqual(await order(page), ['c', 'a', 'b', 'd'], 'real-time DOM order must change before drop');
    assert.equal(await page.evaluate(() => window.reorderTest.calls.length), 0, 'drag frame cannot save');
    assert.equal(await page.evaluate(() => getSelection().toString()), '');
    assert.equal(await page.locator('.mm-card-title').first().evaluate(n => getComputedStyle(n).userSelect), 'none');
    assert.equal(await page.locator('.mm-card-title').first().evaluate(n => getComputedStyle(n).webkitUserSelect), 'none');
    const layoutProbe = await page.evaluate(() => window.layoutProbe);
    assert(layoutProbe.some(item => item.op === 'write'));
    // With four cards each painted frame reads scroll + the three candidate rectangles first.
    for (let i = 0; i < layoutProbe.length; i++) if (layoutProbe[i].op === 'write')
      assert(layoutProbe.slice(Math.max(0, i - 4), i).every(item => item.op === 'read'), 'layout reads must be batched before a reorder write');
    receipts.push('真实鼠标拖动先局部排序、集中读取布局后写入、清除选区、Safari选择规则生效，拖动帧零save');
    await page.mouse.up();
    assert.deepEqual(await order(page), ['c', 'a', 'b', 'd']);
    assert.equal(await page.evaluate(() => window.reorderTest.calls.length), 0);
    assert.equal(await page.evaluate(() => window.reorderTest.writes), 0);
    assert.equal(await page.locator('.mm-drag-active').count(), 0);
    assert.notEqual(await page.locator('.mm-card-title').first().evaluate(n => getComputedStyle(n).userSelect), 'none');
    assert(await page.getByRole('button', { name: '保存修改', exact: true }).isEnabled());
    receipts.push('拖动和松手均零宿主写入、立即保持新顺序，Selection限制恢复，保存按钮亮起');
    await dragTo(page, 'd', 'c'); await page.mouse.up();
    assert.deepEqual(await order(page), ['d', 'c', 'a', 'b']);
    assert.equal(await page.evaluate(() => window.reorderTest.calls.length), 0);
    receipts.push('连续拖动始终本地更新，不建立后台保存队列');
    await page.getByRole('button', { name: '保存修改', exact: true }).click();
    await page.waitForFunction(() => window.reorderTest.calls.length === 1);
    assert.match(await page.locator('.mm-footer .mm-hint').textContent(),/正在处理并核对/);
    assert.deepEqual(await order(page), ['d', 'c', 'a', 'b']);
    assert(await page.getByRole('button', { name: '保存修改', exact: true }).isDisabled());
    assert(await page.getByRole('button', { name: '关闭预设管理', exact: true }).isDisabled());
    assert(await page.getByRole('button', { name: '重新读取实际状态', exact: true }).isDisabled());
    await page.evaluate(() => window.reorderTest.calls[0].reject()); await settled(page);
    assert.deepEqual(await order(page), ['d', 'c', 'a', 'b']);
    assert(await page.getByRole('button', { name: '保存修改', exact: true }).isEnabled());
    assert.match(await page.locator('.mm-error').innerText(), /失败/);
    receipts.push('显式保存pending锁定重复操作；失败保留本地修改和实际基线，不自动回滚写入');
    await page.getByRole('button', { name: '保存修改', exact: true }).click();
    await page.waitForFunction(() => window.reorderTest.calls.length === 2);
    await page.evaluate(() => window.reorderTest.calls[1].release()); await settled(page);
    assert.deepEqual(await order(page), ['d', 'c', 'a', 'b']);
    assert.equal(await page.evaluate(() => window.reorderTest.writes), 1);
    assert.equal(await page.locator('.mm-footer .mm-hint').textContent(),'全部修改已保存并确认。');
    assert(await page.getByRole('button', { name: '保存修改', exact: true }).isDisabled());
    assert.equal(await page.getByRole('button', { name: '保存修改', exact: true }).evaluate(n => getComputedStyle(n, '::after').display), 'none');
    assert(await page.evaluate(() => window.originalCards.every(n => n.isConnected)));
    receipts.push('安全重试后仅一笔实际写入，确认不跳动且未重建排序卡片');
    await page.close(); page = await pageFor();
    const preset = page.getByLabel('当前使用预设', { exact: true });
    const save = page.getByRole('button', { name: '保存修改', exact: true });
    const reload = page.getByRole('button', { name: '重新读取实际状态', exact: true });
    assert(await save.isDisabled()); assert.equal(await page.getByRole('button', { name: '取消修改', exact: true }).count(), 0);
    const inactiveSave = await save.evaluate(n => ({ background: getComputedStyle(n).backgroundColor, opacity: getComputedStyle(n).opacity, color: getComputedStyle(n).color, dot: getComputedStyle(n, '::after').display }));
    assert.equal(inactiveSave.background, 'rgba(0, 0, 0, 0)'); assert.equal(inactiveSave.opacity, '0.4');
    assert.equal(inactiveSave.dot, 'none');
    assert.equal(inactiveSave.color, await reload.evaluate(n => getComputedStyle(n).color));
    const positions = await page.evaluate(() => {
      const rect = label => document.querySelector(`[aria-label="${label}"]`).getBoundingClientRect().toJSON();
      return { preset: rect('当前使用预设'), save: rect('保存修改'), reload: rect('重新读取实际状态'), add: rect('新增条目'), tabs: document.querySelector('.mm-categorybar').getBoundingClientRect().toJSON(), separators: [...document.querySelectorAll('.mm-separator')].map(n => ({ ...n.getBoundingClientRect().toJSON(), hiddenFromAT: n.getAttribute('aria-hidden') })), footerButtons: document.querySelectorAll('.mm-footer button').length };
    });
    assert(positions.add.right < positions.separators[0].left && positions.separators[0].right < positions.tabs.x);
    assert(positions.tabs.right < positions.separators[1].left && positions.separators[1].right < positions.save.x);
    assert(positions.reload.x >= positions.save.right); assert.equal(positions.footerButtons, 1);
    assert(positions.separators.every(line => line.hiddenFromAT === 'true' && line.width === 1 && line.height === 24));
    assert.equal(await save.textContent(), ''); assert.equal(await save.locator('svg').count(), 1);
    assert.equal(await save.locator('path').count(), 3); assert.equal(await save.getAttribute('title'), '保存修改');
    receipts.push('新增条目｜分类｜软盘SVG保存/重新读取，两条分隔线；无取消修改或底部重复按钮');
    await page.evaluate(() => window.untouchedCards = [...document.querySelectorAll('.mm-scroll .mm-card')].slice(1));
    const cleanListGeometry = await page.locator('.mm-scroll').boundingBox();
    await page.locator('.mm-card[data-id=a]').getByRole('button', { name: '编辑条目', exact: true }).click();
    const editor = page.getByRole('dialog', { name: '编辑条目', exact: true });
    const title = editor.getByLabel('标题', { exact: true }); await title.fill('edited locally');
    assert(await save.isEnabled()); assert(await preset.isDisabled());
    const activeSave = await save.evaluate(n => ({ background: getComputedStyle(n).backgroundColor, opacity: getComputedStyle(n).opacity, color: getComputedStyle(n).color, stroke: getComputedStyle(n.querySelector('svg')).strokeWidth, dot: getComputedStyle(n, '::after').display, dotColor: getComputedStyle(n, '::after').backgroundColor, dotWidth: getComputedStyle(n, '::after').width }));
    assert.equal(activeSave.background, 'rgba(0, 0, 0, 0)'); assert.equal(activeSave.opacity, '1');
    assert.equal(activeSave.color, await reload.evaluate(n => getComputedStyle(n).color)); assert.equal(activeSave.stroke, '1.7px');
    assert.equal(activeSave.dot, 'block'); assert.equal(activeSave.dotColor, 'rgb(119, 245, 164)'); assert.equal(activeSave.dotWidth, '4px');
    await editor.getByRole('button', { name: '保存', exact: true }).click(); await editor.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.mm-card[data-id=a] .mm-card-title').textContent(), 'edited locally');
    assert.equal(await page.evaluate(() => window.reorderTest.calls.length), 0);
    assert(await page.evaluate(() => window.untouchedCards.every(n => n.isConnected)));
    assert.equal(await page.locator('.mm-notice').count(),0);
    assert.equal(await page.locator('.mm-footer .mm-hint').textContent(),'有未保存修改 · 尚未同步酒馆');
    const dirtyListGeometry = await page.locator('.mm-scroll').boundingBox();
    assert.equal(dirtyListGeometry.y,cleanListGeometry.y);assert.equal(dirtyListGeometry.height,cleanListGeometry.height);
    receipts.push('输入即标记未保存，同色同粗细透明保存SVG底部显示绿光点；未修改变暗并隐藏光点；编辑保存零宿主调用且局部更新');
    await reload.click(); let confirm = page.getByRole('dialog', { name: '重新读取实际状态', exact: true });
    await confirm.getByRole('button', { name: '取消', exact: true }).click();
    assert.equal(await page.locator('.mm-card[data-id=a] .mm-card-title').textContent(), 'edited locally');
    assert(await save.isEnabled());
    await reload.click(); confirm = page.getByRole('dialog', { name: '重新读取实际状态', exact: true });
    await confirm.getByRole('button', { name: '重新读取', exact: true }).click(); await confirm.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.mm-card[data-id=a] .mm-card-title').textContent(), '写作-a'); assert(await save.isDisabled());
    assert.equal(await save.evaluate(n => getComputedStyle(n, '::after').display), 'none');
    assert.equal(await page.evaluate(() => window.reorderTest.writes), 0);
    assert.equal(await page.locator('.mm-footer .mm-hint').textContent(),'已重新读取酒馆实际状态，未保存修改已丢弃。');
    await page.locator('.mm-card[data-id=a]').getByRole('switch').click();
    await page.locator('.mm-card[data-id=a]').getByRole('switch').click();
    assert.match(await page.evaluate(()=>reorderTest.controller.state.notice),/已恢复原状态/);
    assert.equal(await page.locator('.mm-footer .mm-hint').textContent(),'已恢复原状态，没有未保存修改。');
    assert.equal(await page.locator('.mm-notice').count(),0);
    const revertedListGeometry = await page.locator('.mm-scroll').boundingBox();
    assert.equal(revertedListGeometry.y,cleanListGeometry.y);assert.equal(revertedListGeometry.height,cleanListGeometry.height);
    assert(await save.isDisabled());assert.equal(await page.evaluate(()=>reorderTest.writes),0);
    receipts.push('恢复原状态后也没有顶部通知模块，列表位置/高度不变；底部和保存图标正常，零宿主写入');
    receipts.push('重新读取有确认提示；取消保留，确认成功恢复宿主，零写入');
    await page.locator('.mm-card[data-id=a]').getByRole('switch').click(); await page.evaluate(() => window.reorderTest.failRead(true));
    await reload.click(); confirm = page.getByRole('dialog', { name: '重新读取实际状态', exact: true });
    await confirm.getByRole('button', { name: '重新读取', exact: true }).click(); await settled(page);
    assert(await confirm.isVisible()); assert.match(await confirm.innerText(), /仍保留/);
    assert.equal(await page.locator('.mm-card[data-id=a]').getByRole('switch').getAttribute('aria-checked'), 'false');
    await confirm.getByRole('button', { name: '取消', exact: true }).click(); await page.evaluate(() => window.reorderTest.failRead(false));
    receipts.push('重新读取失败保留修改，确认窗可取消，不损失本地工作');
    await page.getByRole('button', { name: '关闭预设管理', exact: true }).click();
    confirm = page.getByRole('dialog', { name: '关闭预设管理', exact: true }); await confirm.getByRole('button', { name: '否', exact: true }).click();
    assert(await page.locator('.miemie-pm').isVisible()); assert(await save.isEnabled());
    await page.getByRole('button', { name: '关闭预设管理', exact: true }).click();
    await page.getByRole('dialog', { name: '关闭预设管理', exact: true }).getByRole('button', { name: '是', exact: true }).click();
    assert(await page.locator('.miemie-pm').isHidden());
    await page.evaluate(() => window.reorderTest.view.open());
    assert(await save.isDisabled()); assert.equal(await page.locator('.mm-card[data-id=a]').getByRole('switch').getAttribute('aria-checked'), 'true');
    assert.equal(await page.evaluate(() => window.reorderTest.writes), 0);
    receipts.push('关闭选否保留；选是丢弃未保存修改；再打开显示真实基线，无写入');
    await page.locator('.mm-card[data-id=a]').getByRole('button', { name: '编辑条目', exact: true }).click();
    await page.getByRole('dialog', { name: '编辑条目', exact: true }).getByLabel('内容', { exact: true }).fill('not staged yet');
    await page.getByRole('button', { name: '关闭预设管理', exact: true }).dispatchEvent('click');
    confirm = page.getByRole('dialog', { name: '关闭预设管理', exact: true }); assert(await confirm.isVisible());
    await confirm.getByRole('button', { name: '是', exact: true }).click(); await page.evaluate(() => window.reorderTest.view.open());
    assert.equal(await page.getByRole('dialog', { name: '编辑条目', exact: true }).count(), 0); assert(await save.isDisabled());
    receipts.push('尚未点编辑保存的草稿也参与关闭提示和确认丢弃');
    const unlink = page.locator('.mm-card[data-id=a]').getByRole('button', { name: '解锁并移出当前发送顺序', exact: true });
    const unlinkPaths = await unlink.locator('path').evaluateAll(nodes => nodes.map(n => n.getAttribute('d')));
    assert.equal(unlinkPaths.length, 3); assert.equal(unlinkPaths[2], 'M4 4l16 16');
    await unlink.click();
    const attach = page.locator('.mm-card[data-id=a]').getByRole('button', { name: '重新挂接到发送顺序', exact: true });
    assert.deepEqual(await attach.locator('path').evaluateAll(nodes => nodes.map(n => n.getAttribute('d'))), unlinkPaths.slice(0,2));
    await attach.click(); assert.equal(await page.evaluate(() => window.reorderTest.writes), 0);
    receipts.push('挂接使用原锁链SVG；解绑同一锁链加斜线，操作保持本地');
    await page.screenshot({ path: path.join(evidence, 'plan-b-desktop.png') });
    await page.close(); page = await pageFor();
    await page.evaluate(() => window.reorderTest.controller.toggle('a')); await page.evaluate(() => window.reorderTest.external());
    await page.waitForFunction(() => window.reorderTest.controller.state.conflict);
    assert(await page.getByRole('button', { name: '保存修改', exact: true }).isDisabled());
    assert.equal(await page.evaluate(() => window.reorderTest.writes), 0);
    assert.equal(await page.locator('.mm-card[data-id=a]').getByRole('switch').getAttribute('aria-checked'), 'false');
    await page.getByRole('button', { name: '重新读取实际状态', exact: true }).click();
    await page.getByRole('dialog', { name: '重新读取实际状态', exact: true }).getByRole('button', { name: '重新读取', exact: true }).click();
    await page.waitForFunction(() => !window.reorderTest.controller.state.dirty);
    assert(await page.evaluate(() => window.reorderTest.controller.state.snapshot.raw.prompts[0].external_unknown.added));
    receipts.push('外部通知不丢本地修改、不接受安全新revision，确认重读恢复外部未知字段');
    await page.close(); page = await pageFor();
    await dragTo(page, 'c', 'a'); await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })));
    assert.deepEqual(await order(page), ['a','b','c','d']); assert.equal(await page.locator('.mm-drag-active').count(), 0);
    await page.mouse.up(); assert(await page.getByRole('button', { name: '保存修改', exact: true }).isDisabled());
    receipts.push('pointercancel恢复手势前的本地顺序和选择状态，不产生未保存修改');
    await page.close(); page = await pageFor();
    await page.evaluate(() => window.reorderTest.timed());
    await dragTo(page, 'c', 'a'); const droppedAt = await page.evaluate(() => performance.now()); await page.mouse.up();
    assert.equal(await page.evaluate(() => window.reorderTest.calls.length), 0); assert.equal(await page.evaluate(() => window.reorderTest.writes), 0);
    await page.getByRole('button', { name: '保存修改', exact: true }).click(); await settled(page);
    timings.push(await page.evaluate(droppedAt => ({ realHost: false, droppedAt, marks: window.reorderTest.marks, synthetic: true }), droppedAt));
    assert.deepEqual(await order(page), ['c','a','b','d']); receipts.push('模拟290ms持久化仅在全局保存后开始，松手阶段不执行HTTP/disk/apply');
    await page.close();
    assert.deepEqual(errors, []); receipts.push('无未捕获页面错误');
    const result = { kind: 'offline Plan B production controller/view with synthetic adapter', realHost: false, physicalMobile: false, passed: receipts.length, pageErrors: errors.length, receipts, timings };
    fs.writeFileSync(path.join(evidence, 'reorder-browser.json'), JSON.stringify(result, null, 2)+'\n'); console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
