// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require('node:assert/strict');
const test = require('node:test');
const { prepareAffinity } = require('../.test-build/affinity.js');
const { createPresetTools } = require('../.test-build/preset-tools.js');
const { encodeUnicode, decodeUnicode } = require('../.test-build/unicode-chat.js');
const { EventEmitter } = require('node:events');

const template = (metric = '🤝信任') => [{ role: 'system', content:
  'before<affinity_format>\n<affinity>\n【本回合变动】\n保留预设规则。\n***\n💞好感: 0｜' + metric + ': 0｜🔗关系: 路人\n</affinity>\n</affinity_format>after' }];
const roster = (rows, metric = '🤝信任') => ({ mes: '正文\n<affinity>\n【本回合变动】\n无\n***\n' +
  rows.map(([name, affection, secondary]) => name + ' 💞好感: ' + affection + '｜' + metric + ': ' + secondary + '｜🔗关系: 朋友').join('\n') +
  '\n</affinity>' });
const response = changes => '<story_scene>正文</story_scene>\n<affinity>\n' + changes.join('\n') + '\n</affinity>\n<npc_log>记录</npc_log>';

test('An omitted member stays in the full roster; bounds and relationship changes follow the profile', () => {
  const names = Array.from({ length: 60 }, (_, index) => '角色' + (index + 1));
  const opening = roster(names.map((name, index) => [name, index === 0 ? 98 : -4, 10]));
  const messages = template();
  const exchange = prepareAffinity(messages, [opening], undefined, assert.fail);
  assert.equal(exchange.messages[0].content, 'before<affinity_format>\n<affinity>\n【本回合变动】\n保留预设规则。\n</affinity>\n</affinity_format>after');
  assert.match(exchange.messages[0].content, /^before[\s\S]*after$/);
  assert.doesNotMatch(messages[0].content, /好感度引擎/);
  const output = exchange.finish(response([
    '角色1｜好感+5｜信任+2｜关系=挚友',
    '角色2｜好感-5｜信任+0',
    '阿岚｜好感+0｜信任-2｜关系=路人',
  ]));
  assert.equal((output.match(/💞好感:/g) || []).length, 61);
  assert.match(output, /角色1\(好感\+2\/信任\+2\/关系→挚友\)/);
  assert.match(output, /角色2 💞好感: -9｜🤝信任: 10/);
  assert.match(output, /阿岚 💞好感: 0｜🤝信任: -2/);
  assert.match(output, /<npc_log>记录<\/npc_log>$/);
});

test('Copied opening, selected branch, regeneration and empty independent conversations derive their own snapshots', () => {
  const first = roster([['阿岚', 10, 20]]);
  const selected = roster([['阿岚', 15, 30], ['白羽', -10, 1]]);
  const pasted = { mes: selected.mes };
  const restart = prepareAffinity(template(), [pasted], undefined, assert.fail);
  assert.match(restart.finish(response(['无'])), /阿岚 💞好感: 15/);
  assert.match(restart.finish(response(['无'])), /白羽 💞好感: -10/);
  const regenerated = prepareAffinity(template(), [first, selected], 1, assert.fail);
  assert.match(regenerated.finish(response(['阿岚｜好感+5｜信任+0'])), /阿岚 💞好感: 15/);
  assert.doesNotMatch(regenerated.finish(response(['无'])), /白羽/);
  const userPaste = { mes: selected.mes, is_user: true };
  const invalid = { mes: '<affinity>截断' };
  assert.match(prepareAffinity(template(), [first, invalid, userPaste], undefined, assert.fail).finish(response(['无'])), /阿岚 💞好感: 10/);
  assert.doesNotMatch(prepareAffinity(template(), [], undefined, assert.fail).finish(response(['无'])), /阿岚|白羽/);
  const continued = prepareAffinity(template(), [selected], undefined, assert.fail, true);
  assert.equal(continued.messages[0].content, restart.messages[0].content);
  assert.equal(continued.finish('继续正文<affinity>[]</affinity>'), '继续正文');
  assert.equal(restart.finish('调用正文<affinity>[{"id":1,"affection":8}]</affinity>', true), '调用正文');
  let warned = false;
  const editable = { mes: first.mes };
  const inFlight = prepareAffinity(template(), [editable], undefined, () => { warned = true; });
  editable.mes = selected.mes;
  assert.match(inFlight.finish(response(['阿岚｜好感+9｜信任+0'])), /阿岚 💞好感: 15/);
  assert(warned);
});

test('EVA applies both AT boundaries; malformed or ambiguous updates retain the prior roster', () => {
  const prior = roster([['真嗣', 100, '1%'], ['绫波', 12, '98%']], '🔶AT力场');
  let warnings = 0;
  const exchange = prepareAffinity(template('🔶AT力场'), [prior], undefined, () => { warnings++; });
  const output = exchange.finish(response(['真嗣(好感+2/AT-5%)、绫波(好感+0/AT+8%)']));
  assert.match(output, /真嗣\(好感\+0\/AT-1%\)/);
  assert.match(output, /绫波\(好感\+0\/AT\+2%\)/);
  assert.match(output, /🔶AT力场: 0%/);
  assert.match(output, /🔶AT力场: 100%/);
  for (const invalid of [
    response(['真嗣｜好感+0｜AT+1%', '真嗣｜好感+0｜AT+1%']),
    response(['真嗣｜好感+0｜信任+1']),
    response(['真嗣｜好感+3｜AT+1']),
    response(['无名氏｜好感+3｜AT+1%｜关系=朋友']),
    '<story_scene>正文</story_scene><affinity>[<npc_log>记录</npc_log>',
  ]) {
    const preserved = exchange.finish(invalid);
    assert.match(preserved, /真嗣 💞好感: 100｜🔶AT力场: 1%/);
    assert.match(preserved, /<npc_log>记录<\/npc_log>/);
  }
  assert.equal(warnings, 5);
  const annotated = exchange.finish(response(['真嗣｜好感+0｜AT+1%｜关系=挚友(主动帮忙)', '绫波｜好感+1｜AT+0%｜关系=还在熟悉彼此习惯的临时搭档（共同执行过一次外出任务）']));
  assert.match(annotated, /真嗣 💞好感: 100｜🔶AT力场: 2%｜🔗关系: 挚友\(主动帮忙\)/);
  assert.match(annotated, /绫波 💞好感: 13｜🔶AT力场: 98%｜🔗关系: 还在熟悉彼此习惯的临时搭档（共同执行过一次外出任务）/);
  const retained = prepareAffinity(template('🔶AT力场'), [{ mes: annotated }], undefined, assert.fail).finish(response(['无']));
  assert.match(retained, /绫波 💞好感: 13｜🔶AT力场: 98%｜🔗关系: 还在熟悉彼此习惯的临时搭档（共同执行过一次外出任务）/);
  assert.equal(prepareAffinity([{ role: 'system', content: '<affinity_format>自填</affinity_format>' }], [prior], undefined, assert.fail), undefined);
});

test('Affinity and Unicode compose in one native request, before display and without storing a roster separately', async () => {
  const keys = ['GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED', 'GENERATION_ENDED',
    'CHAT_CHANGED', 'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY'];
  const eventTypes = Object.fromEntries(keys.map(key => [key, key]));
  const eventSource = new EventEmitter(), writes = new Map();
  const c = { mainApi: 'openai', chatId: 'chat-a', chat: [roster([['阿岚', 10, 20]])], eventSource, eventTypes };
  const host = {
    SillyTavern: { getContext: () => c }, location: { href: 'http://localhost/' }, setTimeout, clearTimeout,
    localStorage: { getItem: key => writes.get(key), setItem: (key, value) => writes.set(key, value) },
    fetch: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.match(decodeUnicode(request.messages[1].content), /保留预设规则。/);
      assert.doesNotMatch(decodeUnicode(request.messages[1].content), /好感度引擎|💞好感/);
      return Response.json({ choices: [{ message: { content: encodeUnicode(response(['阿岚｜好感+4｜信任+0'])) } }] });
    },
  };
  const tools = createPresetTools(host);
  tools.setSettings({ input: 'unicode', reply: 'encoded', affinity: true });
  const messages = template();
  const request = { type: 'normal', messages: messages.slice() };
  eventSource.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  eventSource.emit('CHAT_COMPLETION_PROMPT_READY', { chat: messages, dryRun: false });
  eventSource.emit('GENERATE_AFTER_DATA', { prompt: messages }, false);
  eventSource.emit('CHAT_COMPLETION_SETTINGS_READY', request);
  const received = await host.fetch('/api/backends/chat-completions/generate', { method: 'POST', body: JSON.stringify(request) });
  assert.match((await received.json()).choices[0].message.content, /阿岚 💞好感: 14/);
  assert.match(c.chat[0].mes, /阿岚 💞好感: 10/);
  assert.deepEqual([...writes.values()].map(JSON.parse), [{ input: 'unicode', reply: 'encoded', affinity: true }]);
  tools.dispose();
});


test('Expanded modules keep author rules and separators while settling each directed pair separately', () => {
  const list = '\n***\n<Loop & Update: all>角色名 💞好感: 数值｜🤝信任: 数值｜🔗关系: 关系\n';
  const player = '【本回合变动】\n<!--\n***\n-->\n角色名｜好感±｜信任±｜关系=？';
  const npc = '【本回合变动】\n角色名→角色名｜好感±｜信任±｜关系=？';
  const prompt = body => '<affinity_format>\n<affinity>\n' + body + '\n</affinity>\n</affinity_format>';
  const messages = [{ role: 'system', content: prompt('[自定名字]\n' + player + list + '[/自定名字]\n***\n' +
    '[其他名字]\n' + npc + list + '[/其他名字][自填]\n自填内容\n[/自填]') }];
  const past = { role: 'assistant', content: '此前的聊天与完整名单' };
  const exchange = prepareAffinity([...messages, past], [], undefined, assert.fail);
  assert.equal(exchange.messages[0].content, prompt('[自定名字]\n' + player + '\n[/自定名字]\n***\n' +
    '[其他名字]\n' + npc + '\n[/其他名字][自填]\n自填内容\n[/自填]'));
  assert.equal(exchange.messages[1], past);
  const initial = exchange.finish(response(['[自定名字]', '阿岚｜好感+0｜信任+0｜关系=同学', '[/自定名字]', '***',
    '[其他名字]', '阿岚 → 白羽｜好感+3｜信任+1｜关系=朋友', '白羽→阿岚｜好感-1｜信任+0｜关系=？', '[/其他名字]']));
  assert.match(initial, /阿岚 💞好感: 0｜🤝信任: 0｜🔗关系: 同学/);
  assert.match(initial, /阿岚→白羽 💞好感: 3｜🤝信任: 1｜🔗关系: 朋友/);
  assert.match(initial, /白羽→阿岚 💞好感: -1｜🤝信任: 0｜🔗关系: 路人/);
  assert.match(initial, /\[\/自定名字\]\n\*\*\*\n\[其他名字\]/);
  const separated = exchange.finish(response(['[自定名字]', '无', '[/自定名字]', '[其他名字]', '无', '[/其他名字]']));
  assert.match(separated, /\[\/自定名字\]\n\[其他名字\]/);
  let warnings = 0;
  const next = prepareAffinity(messages, [{ mes: initial }], undefined, () => { warnings++; });
  const result = next.finish(response(['[自定名字]', '阿岚｜好感+2｜信任-1', '[/自定名字]', '***',
    '[其他名字]', '阿岚→白羽｜好感+3｜信任+1', '阿岚→白羽｜好感+3｜信任+1', '[/其他名字]']));
  assert.match(result, /阿岚 💞好感: 2｜🤝信任: -1｜🔗关系: 同学/);
  assert.match(result, /阿岚→白羽 💞好感: 3｜🤝信任: 1｜🔗关系: 朋友/);
  assert.equal(warnings, 1);
});

test('Each selected reply supplies one whole snapshot, including manual edits and empty or absent modules', () => {
  const wrap = (title, body) => `[${title}]\n${body}\n[/${title}]`;
  const modulePrompt = (title, name) => wrap(title, '【本回合变动】\n' + name + '｜好感±｜信任±\n***\n' +
    '角色名 💞好感: 数值｜🤝信任: 数值｜🔗关系: 关系');
  const messages = [{ role: 'system', content: '<affinity_format>\n<affinity>\n' +
    modulePrompt('同学', '角色名') + '\n' + modulePrompt('同学之间', '甲→乙') + '\n</affinity>\n</affinity_format>' }];
  const record = (title, ...rows) => wrap(title, '【本回合变动】\n无\n***\n' + rows.join('\n'));
  const entry = (name, affection) => `${name} 💞好感: ${affection}｜🤝信任: 0｜🔗关系: 朋友`;
  const old = { mes: response([record('同学', entry('阿岚', 10)), record('同学之间', entry('阿岚→白羽', 12))]) };
  const other = response([record('同学', entry('阿岚', 20), entry('白羽', 4)), record('同学之间', entry('白羽→阿岚', 6))]);
  const selected = { mes: other, swipes: [other, old.mes], swipe_id: 0 };
  const chat = [old, selected, { is_user: true, mes: '继续' }];
  const delta = response([wrap('同学', '阿岚｜好感+1｜信任+0'), wrap('同学之间', '无')]);
  const send = (history = chat) => prepareAffinity(messages, history, undefined, assert.fail).finish(delta);
  assert.match(send(), /阿岚 💞好感: 21/);
  assert.match(send(), /白羽→阿岚 💞好感: 6/);
  assert.doesNotMatch(send(), /阿岚→白羽/);

  selected.swipe_id = 1;
  selected.mes = selected.swipes[1].replace('阿岚 💞好感: 10', '阿岚 💞好感: 73');
  assert.match(send(), /阿岚 💞好感: 74/);
  assert.match(send(), /阿岚→白羽 💞好感: 12/);
  assert.doesNotMatch(send(), /白羽 💞好感: 4|白羽→阿岚/);
  assert.match(send([old, chat.at(-1)]), /阿岚 💞好感: 11/);

  selected.mes = '<affinity>\n' + record('同学', entry('阿岚', 25)) + '\n</affinity>\n<affinity>\n' +
    record('同学之间', entry('白羽→阿岚', 8)) + '\n</affinity>';
  assert.match(send(), /阿岚 💞好感: 26/);
  assert.match(send(), /白羽→阿岚 💞好感: 8/);

  selected.mes = response([record('同学', '无')]);
  assert.match(send(), /阿岚 💞好感: 1/);
  assert.doesNotMatch(send(), /阿岚→白羽|白羽→阿岚/);

  selected.mes = response([record('同学', entry('阿岚', 88)), record('同学之间', '格式损坏')]);
  assert.match(send(), /阿岚 💞好感: 11/);
  assert.match(send(), /阿岚→白羽 💞好感: 12/);
  selected.mes = response([record('同学', entry('阿岚', 88)), '[同学之间]\n缺少闭合标签']);
  assert.match(send(), /阿岚 💞好感: 11/);
});

test('Native re-roll keeps the previous floor even if the host changes the target object before fetch', async () => {
  const eventTypes = Object.fromEntries(['GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED', 'GENERATION_ENDED',
    'CHAT_CHANGED', 'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY'].map(key => [key, key]));
  const eventSource = new EventEmitter();
  const old = roster([['阿岚', 10, 20]]);
  const target = roster([['阿岚', 70, 30], ['白羽', 20, 4]]);
  const c = { mainApi: 'openai', chatId: 'chat-a', chat: [old, { mes: '继续', is_user: true }, target], eventSource, eventTypes };
  const host = {
    SillyTavern: { getContext: () => c }, location: { href: 'http://localhost/' }, setTimeout, clearTimeout,
    localStorage: { getItem: () => null, setItem() {} },
    fetch: async () => Response.json({ choices: [{ message: { content: response(['阿岚｜好感+1｜信任+0']) } }] }),
  };
  const tools = createPresetTools(host);
  tools.setSettings({ affinity: true });
  async function reroll(type, changeTarget) {
    const messages = template();
    eventSource.emit('GENERATION_AFTER_COMMANDS', type, {}, false);
    changeTarget();
    eventSource.emit('CHAT_COMPLETION_PROMPT_READY', { chat: messages, dryRun: false });
    eventSource.emit('GENERATE_AFTER_DATA', { prompt: messages }, false);
    const request = { type, messages: messages.slice() };
    eventSource.emit('CHAT_COMPLETION_SETTINGS_READY', request);
    const received = await host.fetch('/api/backends/chat-completions/generate', { method: 'POST', body: JSON.stringify(request) });
    const output = (await received.json()).choices[0].message.content;
    assert.match(output, /阿岚 💞好感: 11/);
    assert.doesNotMatch(output, /白羽/);
  }
  await reroll('swipe', () => { c.chat[2] = { ...target }; });
  await reroll('regenerate', () => { c.chat.pop(); });
  await reroll('regenerate', () => {}); // The last entry is already a user message.
  tools.dispose();
});
