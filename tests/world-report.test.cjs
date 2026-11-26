// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { prepareWorldReport, WORLD_REPORT_PROMPT } = require('../.test-build/world-report.js');
const { createPresetTools } = require('../.test-build/preset-tools.js');

const time = hour => '🕒时间:60年1月15日/' + hour + '/星期一';
const wrap = (hour, body) => '<wlog time="' + time(hour) + '">\n' + body + '\n</wlog>';
const assistant = (body, hour) => ({ mes: '<story_scene>正文</story_scene>\n' + wrap(hour, body) });
const join = modules => modules.join('\n***\n');

const world = '【世界主线】\n中忍选拔｜进行中';
const parallel = '【平行线事件】\n事件A｜当前状态: 出发\n事件B｜当前状态: 待命';
const deaths = '【死亡角色】\n无';
const prior = join([world, parallel, deaths]);
const source = (content = '【世界主线】<!-- 不自编 <wlog> -->\n时间线事件\n***【平行线事件】\n主导NPC｜参与NPC\n***\n【死亡角色】\n角色名') =>
  [{ role: 'system', content: '前文\n<wlog_format>\n保留格式。\n<wlog time="🕒时间:Y年M月D日/HH:MM/星期"><!-- 时间规则 -->\n' +
    content + '\n</wlog>\n</wlog_format>\n后文' }];

test('World report starts with the native prompt and reverts on a changed schema or ambiguous history', () => {
  const req = source();
  for (const history of [[], [assistant(world, '08:00')], [{ ...assistant(prior, '08:00'), is_user: true }]]) {
    assert.equal(prepareWorldReport(req, history, undefined, assert.fail), undefined);
  }
  assert.equal(prepareWorldReport(source('【新模块】\n规则'), [assistant(prior, '08:00')], undefined, assert.fail), undefined);
  assert.equal(prepareWorldReport([...req, ...req], [assistant(prior, '08:00')], undefined, assert.fail), undefined);
});

test('World report keeps reference rules outside the tagged reply and replaces whole modules by title', () => {
  const raw = '【平行线事件】\n事件C｜当前状态: 推进\n【已结束】\n***【死亡角色】\n甲｜乙';
  const req = source();
  const exchange = prepareWorldReport(req, [assistant(prior, '08:00')], undefined, assert.fail);
  const revised = exchange.messages[0].content;
  assert(revised.indexOf('【平行线事件】') < revised.indexOf('<wlog time='));
  assert(revised.includes('<!-- 不自编 <wlog> -->'));
  assert(revised.includes('<!-- 时间规则 -->'));
  assert(revised.includes('<wlog time="🕒时间:Y年M月D日/HH:MM/星期">\n' + WORLD_REPORT_PROMPT + '\n</wlog>'));
  assert(!req[0].content.includes(WORLD_REPORT_PROMPT));
  const suffix = '\n<npc_log>保留</npc_log>';
  assert.equal(exchange.finish(assistant(raw, '09:00').mes + suffix),
    assistant(join([world, '【平行线事件】\n事件C｜当前状态: 推进\n【已结束】', '【死亡角色】\n甲｜乙']), '09:00').mes + suffix);
});

test('World report accepts separated, attached and escaped dividers as well as clean headings', () => {
  const exchange = prepareWorldReport(source(), [assistant(prior, '08:00')], undefined, assert.fail);
  for (const divider of ['\n', '\n***\n', '***', '\\*\\*\\*']) {
    const delta = '***\n【平行线事件】\n新事件' + divider + '【死亡角色】\n甲';
    assert.equal(exchange.finish(assistant(delta, '09:00').mes),
      assistant(join([world, '【平行线事件】\n新事件', '【死亡角色】\n甲']), '09:00').mes);
  }
  assert.equal(exchange.finish(assistant('无变化', '09:00').mes), assistant(prior, '09:00').mes);
});

test('World report ignores planning mentions, retains previous data on ambiguous changes and uses the target history boundary', () => {
  let warnings = 0;
  const previous = assistant(prior, '08:00');
  const newer = assistant(prior.replace('事件A', '另一条历史事件'), '08:15');
  const exchange = prepareWorldReport(source(), [previous, newer], 1, () => { warnings++; });
  const plan = '<story_driver>提到 <wlog time="假">，也引用了 </wlog>。</story_driver>\n';
  assert.equal(exchange.finish(plan + assistant('无变化', '09:00').mes), plan + assistant(prior, '09:00').mes);
  assert.equal(exchange.finish(assistant('【平行线事件】\n甲\n【平行线事件】\n乙', '09:00').mes), assistant(prior, '09:00').mes);
  const untimed = '<story_scene>正文</story_scene>\n<wlog>【平行线事件】\n新事件</wlog>';
  assert.equal(exchange.finish(untimed), untimed);
  assert.equal(warnings, 2);
  const continuation = prepareWorldReport(source(), [previous], 1, assert.fail, true);
  assert.equal(continuation.messages[0].content, source()[0].content);
  assert.equal(continuation.finish(assistant('无变化', '09:00').mes), '<story_scene>正文</story_scene>\n');
});

test('Preset tools can independently enable reports and compose with the status engine through native events', async () => {
  const eventTypes = Object.fromEntries(['GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED',
    'GENERATION_ENDED', 'CHAT_CHANGED', 'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY'].map(key => [key, key]));
  const eventSource = new EventEmitter();
  const chat = [{ mes: assistant(prior, '08:00').mes + '\n<status>位置: 门口</status>' }];
  const context = { chatId: 'test', mainApi: 'openai', chatCompletionSettings: { preset_settings_openai: '测试预设' }, chat, eventSource, eventTypes };
  const stored = new Map();
  const custom = '仅提交变动模块。\n标题单独成行。';
  let activePrompt = custom;
  const host = {
    SillyTavern: { getContext: () => context }, location: { href: 'http://localhost/' }, setTimeout, clearTimeout,
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    fetch: async (_url, init) => {
      const req = JSON.parse(init.body);
      assert(req.messages[0].content.includes('\n' + activePrompt + '\n</wlog>'));
      if (activePrompt === custom) assert(!req.messages[0].content.includes(WORLD_REPORT_PROMPT));
      assert(req.messages[0].content.includes('<status>\n仅输出本回合有变化的条目即可。\n</status>'));
      assert.equal(req.messages[1].content, chat[0].mes);
      const content = assistant('【平行线事件】\n新事件', '09:00').mes + '\n<status>位置: 校园</status>';
      return Response.json({ choices: [{ message: { content } }] });
    },
  };
  const initial = createPresetTools(host);
  assert(!initial.settings().worldReport);
  assert(initial.setSettings({ worldReport: true, status: true, worldReportPrompt: '  ' + custom + '  ' }));
  initial.dispose();
  const tools = createPresetTools(host);
  try {
    assert.equal(tools.settings().worldReport, true);
    assert.equal(tools.settings().worldReportPrompt, custom);
    const prompt = [{ role: 'system', content: source()[0].content + '\n<status_format><status>位置: 地点</status></status_format>' },
      { role: 'assistant', content: chat[0].mes }];
    async function send() {
      const request = { type: 'normal', messages: prompt.slice() };
      eventSource.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
      eventSource.emit('CHAT_COMPLETION_PROMPT_READY', { chat: prompt, dryRun: false });
      eventSource.emit('GENERATE_AFTER_DATA', { prompt }, false);
      eventSource.emit('CHAT_COMPLETION_SETTINGS_READY', request);
      const response = await host.fetch('/api/backends/chat-completions/generate', { method: 'POST', body: JSON.stringify(request) });
      return (await response.json()).choices[0].message.content;
    }
    const expected = assistant(join([world, '【平行线事件】\n新事件', deaths]), '09:00').mes + '\n<status>位置: 校园</status>';
    assert.equal(await send(), expected);
    assert(tools.setSettings({ worldReportPrompt: '  ' }));
    assert.equal(tools.settings().worldReportPrompt, undefined);
    activePrompt = WORLD_REPORT_PROMPT;
    assert.equal(await send(), expected);
  } finally { tools.dispose(); }
});
