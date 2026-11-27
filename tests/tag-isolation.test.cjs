// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { DEFAULT_ISOLATION_TAGS, isolatePresetTags, parseCustomTags, scanPresetTags } = require('../.test-build/tag-isolation.js');
const { createPresetTools } = require('../.test-build/preset-tools.js');
const { prepareStatus } = require('../.test-build/status.js');
const { projectAdaptiveMarkup } = require('../.test-build/adaptive-tag-rendering.js');

const status = '<status>地点：码头</status>';
const scene = '<story_scene>正文 <t_small>语气</t_small></story_scene>';
const statusBodies = (text, names) => scanPresetTags(text, names).blocks.filter(block => block.name === 'status')
  .map(block => text.slice(block.bodyStart, block.bodyEnd));

test('Planning mentions and complete examples stay literal; the real footer still matches', () => {
  for (const example of ['<status>', '<status>示例</status>', '</status>']) {
    const raw = '<story_driver>要输出 ' + example + '</story_driver>\n' + scene + '\n' + status;
    const shown = isolatePresetTags(raw);
    assert.deepEqual(statusBodies(raw), ['地点：码头']);
    assert.deepEqual([...shown.matchAll(/<status>([\s\S]*?)<\/status>/g)].map(match => match[1]), ['地点：码头']);
    assert(shown.includes('<story_driver>要输出 &lt;'));
    assert(shown.includes(scene));
  }
});

test('Orphans, mismatched tags and superseded openers stay literal', () => {
  assert.equal(isolatePresetTags('</status><status>多余\n' + status, ['status']), '&lt;/status&gt;&lt;status&gt;多余\n' + status);
  assert.equal(isolatePresetTags('<status><quest_log>错位</status></quest_log>', ['status', 'quest_log']),
    '<status>&lt;quest_log&gt;错位</status>&lt;/quest_log&gt;');
  assert.equal(isolatePresetTags('<story_driver>未完 <status>\n' + scene + '\n' + status, DEFAULT_ISOLATION_TAGS),
    '&lt;story_driver&gt;未完 &lt;status&gt;\n' + scene + '\n' + status);
});

test('Attributed tags and nested opt-in tags are preserved alongside ordinary HTML', () => {
  const input = scene + '<status><div>地点：码头</div></status>\n<wlog time="00:00">当晚</wlog>' +
    '<UpdateVariable><Analysis>分析</Analysis><JSONPatch>[]</JSONPatch></UpdateVariable>\n<other>';
  assert.equal(isolatePresetTags(input, DEFAULT_ISOLATION_TAGS), input);
  assert.deepEqual(scanPresetTags(input, DEFAULT_ISOLATION_TAGS).blocks.map(block => block.name),
    ['status', 'wlog']);
  const custom = ['t_small', 'UpdateVariable', 'Analysis', 'JSONPatch'];
  assert.equal(isolatePresetTags(input, [...DEFAULT_ISOLATION_TAGS, ...custom]), input);
  assert.deepEqual(scanPresetTags(input, [...DEFAULT_ISOLATION_TAGS, ...custom]).blocks.map(block => block.name),
    ['t_small', 'status', 'wlog', 'analysis', 'jsonpatch', 'updatevariable']);
});

test('Tone, visual HTML and MVU labels require explicit opt-in', () => {
  const names = ['t_big', 't_small', 't_s', 'htmlcontent', 'UpdateVariable', 'Analysis', 'JSONPatch'];
  const examples = names.map(name => `<${name}>`).join(' ');
  const input = '<story_driver>' + examples + '</story_driver>\n' + examples + '\n' + status;
  assert.equal(isolatePresetTags(input, DEFAULT_ISOLATION_TAGS), input);
  assert.equal(scanPresetTags(input, DEFAULT_ISOLATION_TAGS).incompleteStructure, false);
  assert.equal(isolatePresetTags(input, names), input.replaceAll(examples, examples.replaceAll('<', '&lt;').replaceAll('>', '&gt;')));
});

test('The built-in output tags work inside any prose wrapper, including unwrapped prose', () => {
  const decorations = '<locator>码头</locator>\n<t_big>等等！</t_big>\n' +
    '<parallel_line_drive>另一边的安排</parallel_line_drive><parallel_line>另一边的剧情</parallel_line>';
  for (const wrapper of ['story_scene', 'opening', 'content', '']) {
    const body = wrapper ? `<${wrapper}>${decorations}</${wrapper}>` : decorations;
    const plan = '<story_driver>提到 <locator> 和 <status></story_driver>\n';
    const raw = plan + body + '\n' + status;
    const expected = plan.replace('<locator>', '&lt;locator&gt;').replace('<status>', '&lt;status&gt;') + body + '\n' + status;
    assert.equal(isolatePresetTags(raw), expected);
    assert.equal(isolatePresetTags(raw, wrapper ? [wrapper] : []), expected);
  }
  const examples = '<story_scene>、<opening>、<status_format>、<think>、<thinking>';
  assert.equal(isolatePresetTags('<story_driver>' + examples + '</story_driver>'), '<story_driver>' + examples + '</story_driver>');
});

test('Custom names follow the same boundaries and accept Chinese names without allowing pattern syntax', () => {
  const custom = parseCustomTags('quest_log, <任务记录>\n</quest_log>，<status>\n.*');
  assert.deepEqual(custom, { names: ['quest_log', '任务记录', 'status'], invalid: ['.*'] });
  const raw = '<combat_driver><任务记录>示例</任务记录><quest_log></combat_driver>\n<quest_log>有效</quest_log>';
  assert.equal(isolatePresetTags(raw), raw);
  assert.equal(isolatePresetTags(raw, custom.names),
    '<combat_driver>&lt;任务记录&gt;示例&lt;/任务记录&gt;&lt;quest_log&gt;</combat_driver>\n<quest_log>有效</quest_log>');
});

test('Quoted Markdown and commented markup cannot supply the active status block', () => {
  const input = scene + '\n参考 `<status>`\n\n```text\n<status>示例</status>\n```\n<!-- <status> -->\n' + status;
  assert.deepEqual(statusBodies(input, ['status']), ['地点：码头']);
  assert.equal([...isolatePresetTags(input, ['status']).matchAll(/<status>/g)].length, 1);
});

test('Built-ins are scoped to identifiable replies, and explicit names also work in other formats', () => {
  const examples = '参考 `<story_scene>示例</story_scene>`\n<!-- <combat_driver>示例</combat_driver> -->\n';
  const raw = examples + '<think>提到 <status> 和 <quest_log></think>\n' + status + '\n<quest_log>接任务</quest_log>';
  assert.equal(isolatePresetTags(raw), raw);
  const explicit = isolatePresetTags(raw, ['quest_log']);
  assert.equal(explicit, raw.replace('和 <quest_log></think>', '和 &lt;quest_log&gt;</think>'));
  assert.equal(isolatePresetTags(raw, ['status']), raw.replace('提到 <status>', '提到 &lt;status&gt;'));
  const footers = '<memory_log>回忆</memory_log><wlog time="03:00">行动</wlog>';
  assert(isolatePresetTags('<status>误提\n' + footers + status).startsWith('&lt;status&gt;'));
});

test('State engine uses the same valid status offsets only while isolation is selected', () => {
  const previous = { mes: '<story_driver><status>假状态</status></story_driver>\n' + status };
  const messages = [{ role: 'system', content: '<status_format>\n<status>地点：值</status>\n</status_format>' }];
  assert.equal(prepareStatus(messages, [previous], undefined, assert.fail), undefined);
  let warned = false;
  const apply = prepareStatus(messages, [previous], undefined, () => { warned = true; }, false, undefined, []);
  const broken = '<story_driver><status>误提</story_driver>\n' + scene + '\n<status>未闭合';
  assert.equal(apply.finish(broken), broken);
  assert(warned);
  const updated = '<story_driver><status>误提</story_driver>\n' + scene + '\n<status>地点：街道</status>';
  assert.equal(apply.finish(updated), updated);
});

test('Native rendering defaults on, scopes protection, persists explicit off and reuses callbacks', () => {
  const original = '<story_driver><quest_log></story_driver>\n<quest_log>有效</quest_log>';
  const store = new Map(), callbacks = new Map();
  const eventSource = new EventEmitter();
  const formatter = { addHook(callback, options) { assert(!callbacks.has(options.stage)); callbacks.set(options.stage, callback); } };
  const host = {
    SillyTavern: { getContext: () => ({ eventSource, eventTypes: {}, chat: [], chatCompletionSettings: { preset_settings_openai: '测试预设' }, messageFormatter: formatter }) },
    localStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) },
  };
  const tools = createPresetTools(host);
  assert(tools.tagIsolationAvailable);
  assert.equal(tools.settings().tagIsolation, true);
  assert.equal(callbacks.size, 2);
  const before = callbacks.get('beforeRegex');
  const official = '<story_driver>说明 <status></story_driver>' + status;
  assert(before(official, {}).includes('&lt;status&gt;'));
  assert.equal(before('<status>孤立', {}), '<status>孤立');
  assert(tools.setSettings({ customTags: ['quest_log'] }));
  assert(before(original, {}).includes('&lt;quest_log&gt;'));
  assert.equal(before(original, { isUser: true }), original);
  assert.equal(before(original, { isReasoning: true }), original);
  tools.dispose();
  assert.equal(before(original, {}), original);
  const reopened = createPresetTools(host);
  assert.equal(callbacks.size, 2);
  assert(before(original, {}).includes('&lt;quest_log&gt;'));
  reopened.setSettings({ tagIsolation: false });
  assert.equal(before(original, {}), original);
  reopened.dispose();
  const explicitlyOff = createPresetTools(host);
  assert.equal(explicitlyOff.settings().tagIsolation, false);
  assert.equal(before(official, {}), official);
  explicitlyOff.dispose();
});

test('Adaptive rendering reads the selected block even when the original contains the same tag earlier', () => {
  const encode = script => Buffer.from(JSON.stringify({ css: '', markup: '', script })).toString('base64');
  const original = `function readLabelOutput(tag) {
  const raw = message?.extra?.display_text ?? message?.mes;
  return matches[Math.max(0, position)]?.[0] ?? '';
}
draw(readLabelOutput("status"));`;
  const unrelated = encode('unrelated()');
  const card = (name, contents) => `<div data-mafx-tag="${name}" hidden></div>\n<script type="application/octet-stream" id="mafxPayload">${contents}</script>`;
  const body = '地</script>点"\\n：码头';
  const full = '<status>' + body + '</status>';
  const shown = projectAdaptiveMarkup(card('story_driver', unrelated) + card('status', encode(original)),
    new Map([['story_driver', [{ full: 'unrelated', body: '' }]], ['status', [{ full, body }]]]));
  const encoded = [...shown.matchAll(/id="mafxPayload">([^<]+)/g)].map(match => match[1]);
  assert.equal(encoded[0], unrelated);
  const { script } = JSON.parse(Buffer.from(encoded[1], 'base64').toString());
  assert(script.includes('function readLabelOutput() { return ' + JSON.stringify(full) + '; }'));
  assert(script.endsWith('draw(readLabelOutput("status"));'));
});

test('Legacy rendering updates a display-only copy after a swipe and restores raw rendering on toggle off', () => {
  const eventSource = new EventEmitter(), writes = [];
  const row = { querySelector: () => null, querySelectorAll: () => [], getAttribute: () => '0' };
  const chat = [{ mes: '<status>孤立', extra: { unrelated: true } }];
  const context = { chat, chatCompletionSettings: { preset_settings_openai: '测试预设' }, eventSource, eventTypes: { MESSAGE_SWIPED: 'swipe' },
    updateMessageBlock: (id, message) => writes.push({ id, message }) };
  const host = { document: { querySelectorAll: () => [row] }, SillyTavern: { getContext: () => context },
    localStorage: { getItem: () => null, setItem() {} } };
  const tools = createPresetTools(host);
  assert.equal(writes.length, 0);
  tools.setSettings({ customTags: ['status'] });
  assert.deepEqual(writes.at(-1).message.extra, { unrelated: true, display_text: '&lt;status&gt;孤立' });
  assert.deepEqual(chat[0], { mes: '<status>孤立', extra: { unrelated: true } });
  chat[0] = { mes: '<story_driver><status>例</story_driver>' + status };
  eventSource.emit('swipe', 0);
  assert(writes.at(-1).message.extra.display_text.includes('&lt;status&gt;例'));
  tools.setSettings({ tagIsolation: false });
  assert.equal(writes.at(-1).message, chat[0]);
  tools.dispose();
  assert.equal(eventSource.listenerCount('swipe'), 0);
});
