// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { prepareStatus } = require('../.test-build/status.js');
const { createPresetTools } = require('../.test-build/preset-tools.js');
const { encodeUnicode, decodeUnicode } = require('../.test-build/unicode-chat.js');

const rule = '仅输出本回合有变化的条目即可。';
const wrap = body => '<status>\n' + body + '\n</status>';
const template = [
  '🪪等级: 当前值 🌟EXP: 当前值/100<!-- 等级规则 -->',
  '💪🏼身体状况: 当前值%｜描述',
  '⭕️当前位置: 【地点】',
  '🌀玩家能力:',
  '┣ 掌握忍术: 【能力】',
  '┗ 通灵之术: 【名称】',
].join('\n');
const messages = (body = template) => [{ role: 'system', content:
  '<status_format>\n按现有世界书规则输出。\n' + wrap(body) + '\n</status_format>\n其他规则。' }];
const prior = [
  '🪪等级: 6 🌟EXP: 10/100',
  '💪🏼身体状况: 100%｜健康',
  '⭕️当前位置: 【木叶村·街道】',
  '🌀玩家能力:',
  '┣ 掌握忍术: 【分身术】',
  '┗ 通灵之术: 【无】',
].join('\n');
const assistant = body => ({ mes: '<story_scene>正文</story_scene>\n' + wrap(body) });

test('First status and switched worldbook formats retain the original full prompt', () => {
  const original = messages();
  for (const chat of [[], [{ is_user: true, mes: wrap(prior) }], [assistant('当前位置：木叶村')]]) {
    assert.equal(prepareStatus(original, chat, undefined, assert.fail), undefined);
  }
  assert.equal(prepareStatus(messages(template + '\n装备: 【装备】'), [assistant(prior)], undefined, assert.fail), undefined);
  assert.equal(prepareStatus([{ role: 'system', content: '<status>...</status>' }], [assistant(prior)], undefined, assert.fail), undefined);
  assert.equal(prepareStatus([...original, ...original], [assistant(prior)], undefined, assert.fail), undefined);
  assert(!original[0].content.includes(rule));
});

test('The status engine copies whole changed values into matching titles, preserving order and untouched entries', () => {
  const original = messages();
  const exchange = prepareStatus(original, [assistant(prior)], undefined, assert.fail);
  assert.equal(exchange.messages[0].content, original[0].content.replace('<status>', rule + '\n<status>'));
  const delta = [
    '身体状况：85%｜轻伤（右臂）',
    '┣ 掌握忍术: 【影分身术（入门）】',
    '不存在: 不新增',
    '等级：6 🌟EXP: 30/100',
  ].join('\n');
  const expected = prior.replace('100%｜健康', '85%｜轻伤（右臂）')
    .replace('10/100', '30/100').replace('【分身术】', '【影分身术（入门）】');
  assert.equal(exchange.finish(assistant(delta).mes), assistant(expected).mes);
});

test('No changes, ambiguous updates and missing blocks keep the latest full status', () => {
  let warnings = 0;
  const exchange = prepareStatus(messages(), [assistant(prior)], undefined, () => { warnings++; });
  assert.equal(exchange.finish(assistant('无变化。').mes), assistant(prior).mes);
  const ending = '\n<affinity>已有内容</affinity>\n<npc_log>记录</npc_log>';
  assert.equal(exchange.finish('<story_scene>正文</story_scene>' + ending), assistant(prior).mes + ending);
  assert.equal(exchange.finish(assistant('当前位置: 甲\n当前位置: 乙').mes), assistant(prior).mes);
  assert.equal(exchange.finish('<story_scene>正文</story_scene>\n<status>未完成' + ending), assistant(prior).mes + ending);
  assert.equal(warnings, 2);
});

test('The selected or edited reply supplies status and a re-roll excludes the target floor', () => {
  const edited = assistant(prior.replace('木叶村·街道', '岩隐村·旅店'));
  const other = assistant(prior.replace('木叶村·街道', '砂隐村·街道'));
  const chat = [assistant(prior), { ...edited, swipes: [other.mes, edited.mes], swipe_id: 1 }];
  const raw = assistant('身体状况: 90%｜健康').mes;
  assert.match(prepareStatus(messages(), chat, undefined, assert.fail).finish(raw), /岩隐村·旅店/);
  assert.match(prepareStatus(messages(), chat, 1, assert.fail).finish(raw), /木叶村·街道/);
  assert.match(prepareStatus(messages(), chat.slice(0, 1), undefined, assert.fail).finish(raw), /木叶村·街道/);
  const continued = prepareStatus(messages(), chat, undefined, assert.fail, true);
  assert.equal(continued.messages[0].content, messages()[0].content);
  assert.equal(continued.finish(raw), '<story_scene>正文</story_scene>\n');
});

test('The opt-in status and affinity engines compose with encoded replies through the native events', async () => {
  const eventTypes = Object.fromEntries(['GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED',
    'GENERATION_ENDED', 'CHAT_CHANGED', 'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY'].map(key => [key, key]));
  const eventSource = new EventEmitter();
  const chat = [assistant(prior)];
  const context = { chatId: 'test', mainApi: 'openai', chat, eventSource, eventTypes };
  const stored = new Map();
  const custom = '只列出变化。\n每项单独一行。';
  let activeRule = custom;
  let useToolReply = false;
  const affinityTemplate = '<affinity_format><affinity>\n【本回合变动】\n规则\n***\n💞好感: 0｜🤝信任: 0｜🔗关系: 路人\n</affinity></affinity_format>';
  const raw = assistant('当前位置: 【火影楼】').mes + '\n<affinity>\n阿岚｜好感+3｜信任+1\n</affinity>';
  const host = {
    SillyTavern: { getContext: () => context }, location: { href: 'http://localhost/' }, setTimeout, clearTimeout,
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    fetch: async (_url, init) => {
      const req = JSON.parse(init.body);
      const template = decodeUnicode(req.messages[1].content);
      assert(template.includes(activeRule + '\n<status>'));
      if (activeRule === custom) assert(!template.includes(rule));
      assert(!template.includes('💞好感: 0'));
      assert.equal(decodeUnicode(req.messages[2].content), chat[0].mes);
      const content = encodeUnicode(raw);
      if (!useToolReply) return Response.json({ choices: [{ message: { content } }] });
      assert.equal(req.tools[0].function.name, 'deliver_reply');
      assert.match(decodeUnicode(req.messages[1].content), /<status_format>/);
      assert.match(req.messages[0].content, /deliver_reply/);
      return Response.json({ choices: [{ finish_reason: 'tool_calls', message: { tool_calls: [{ type: 'function',
        function: { name: 'deliver_reply', arguments: JSON.stringify({ text: content }) } }] } }] });
    },
  };
  const tools = createPresetTools(host);
  assert(!tools.settings().status);
  tools.setSettings({ status: true, affinity: true, input: 'unicode', reply: 'encoded', statusPrompt: '  ' + custom + '  ' });
  tools.dispose();
  const reopened = createPresetTools(host);
  assert.equal(reopened.settings().statusPrompt, custom);
  const prompt = [{ role: 'system', content: messages()[0].content + affinityTemplate },
    { role: 'assistant', content: chat[0].mes }];
  async function send() {
    const req = { type: 'normal', messages: prompt.slice(), chat_completion_source: 'custom' };
    eventSource.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
    eventSource.emit('CHAT_COMPLETION_PROMPT_READY', { chat: prompt, dryRun: false });
    eventSource.emit('GENERATE_AFTER_DATA', { prompt }, false);
    eventSource.emit('CHAT_COMPLETION_SETTINGS_READY', req);
    const received = await host.fetch('/api/backends/chat-completions/generate', { method: 'POST', body: JSON.stringify(req) });
    return (await received.json()).choices[0].message.content;
  }
  const result = await send();
  assert(result.includes(wrap(prior.replace('【木叶村·街道】', '【火影楼】'))));
  assert.match(result, /阿岚 💞好感: 3｜🤝信任: 1/);
  assert.equal(chat[0].mes, assistant(prior).mes);
  reopened.setSettings({ statusPrompt: ' \n ' });
  activeRule = rule;
  assert.equal(await send(), result);
  assert.deepEqual([...stored.values()].map(JSON.parse), [{ input: 'unicode', reply: 'encoded', status: true, affinity: true }]);
  useToolReply = true;
  reopened.setSettings({ toolReply: true });
  assert.equal(await send(), result);
  reopened.dispose();
});
