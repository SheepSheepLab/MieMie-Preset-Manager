// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { createPresetTools, romanizeUserText } = require('../.test-build/preset-tools.js');
const { encodeUnicode, decodeUnicode, decodeChatReply, decodeChatStream } = require('../.test-build/unicode-chat.js');

test('Pinyin resolves common polyphonic phrases while preserving surrounding syntax', () => {
  assert.equal(romanizeUserText('重庆银行，AI你好！\n`变量` https://example.test/中文 {{中文}} <em title="中文">再见</em>'),
    'chong qing yin hang，AI ni hao！\n`变量` https://example.test/中文 {{中文}} <em title="中文">zai jian</em>');
  assert.equal(romanizeUserText('Hello 123 👋'), 'Hello 123 👋');
});

test('Pinyin transforms only the identified native user turn in the outgoing request', () => {
  const eventSource = new EventEmitter();
  const eventTypes = Object.fromEntries([
    'GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED', 'GENERATION_ENDED', 'CHAT_CHANGED',
  ].map(key => [key, key]));
  const saved = new Map();
  const previous = { is_user: true, name: '甲', mes: '昨天见' };
  const user = { is_user: true, name: '甲', mes: '你好' };
  const chat = [previous, user];
  const context = { chatId: 'test-chat', chat, eventSource, eventTypes, mainApi: 'openai', chatCompletionSettings: { preset_settings_openai: '测试预设' } };
  const attachment = { type: 'image_url', image_url: { url: 'synthetic:unchanged' } };
  const text = { type: 'text', text: '甲: 你好\n\n附件' };
  const before = { role: 'user', content: '昨天见', identifier: 'chatHistory-1' };
  const target = { role: 'user', content: [text, attachment], identifier: 'chatHistory-2' };
  const other = { role: 'user', content: '你好', identifier: 'injected-1' };
  const system = { role: 'system', content: '系统' };
  const assistant = { role: 'assistant', content: '回复' };
  const all = [system, before, target, assistant, other];
  const messages = { getCollection: () => [system, { identifier: 'chatHistory', getCollection: () => [before, target, assistant] }, other] };
  const host = { SillyTavern: { getContext: () => context }, TavernHelper: { builtin: { promptManager: { messages } } },
    localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) } };
  const tools = createPresetTools(host);
  const send = ({ type = 'normal', dryRun = false, interrupt } = {}) => {
    eventSource.emit('GENERATION_AFTER_COMMANDS', type, {}, dryRun);
    if (interrupt) eventSource.emit(interrupt);
    const prompt = all.map(({ role, content }) => ({ role, content }));
    eventSource.emit('GENERATE_AFTER_DATA', { prompt }, dryRun);
    return prompt;
  };
  assert.equal(tools.enabled(), false);
  assert.equal(send()[2].content, target.content);
  assert.equal(tools.setEnabled(true), true);
  const result = send();
  assert.deepEqual(result[2].content, [{ type: 'text', text: '甲: ni hao\n\n附件' }, attachment]);
  assert.equal(result[2].content[1], attachment);
  assert.deepEqual(result.filter((_, index) => index !== 2), all.filter(item => item !== target).map(({ role, content }) => ({ role, content })));
  assert.deepEqual(chat, [previous, user]);
  assert.equal(user.mes, '你好');
  assert.equal(text.text, '甲: 你好\n\n附件');
  assert.equal(send({ type: 'quiet' })[2].content, target.content);
  assert.equal(send({ dryRun: true })[2].content, target.content);
  assert.equal(send({ interrupt: 'CHAT_CHANGED' })[2].content, target.content);
  assert.equal(send({ interrupt: 'GENERATION_STOPPED' })[2].content, target.content);
  assert.notEqual(send({ type: 'swipe' })[2].content, target.content);
  tools.dispose();
  assert.equal(send()[2].content, target.content);
  const reopened = createPresetTools(host);
  assert.equal(reopened.enabled(), true);
  reopened.setEnabled(false);
  assert.equal(send()[2].content, target.content);
  reopened.dispose();
});

const story = '<story_scene>\r\n  白瓷🐑 \\u4e2d e\u0301\n\n  - 暗号：柳棠\n</story_scene>\n';
test('Unicode reply preserves exact text and rejects malformed or incomplete JSON strings', () => {
  const encoded = encodeUnicode(story);
  assert.match(encoded, /\\ud83d\\udc11/);
  assert.equal(decodeUnicode(encoded), story);
  for (const malformed of [encoded.slice(0, -1), '"\\uD800"', '"白瓷"', '"ok" extra', '{}', '""']) {
    assert.throws(() => decodeUnicode(malformed), /完整的 Unicode/);
  }
});

test('Unicode response decodes all choices and preserves stream metadata and tool fields', () => {
  const encoded = encodeUnicode(story);
  const tool = { id: 'x', type: 'function', function: { name: 'lookup', arguments: '{"id":"原样"}' } };
  const json = { choices: [{ message: { content: encoded, tool_calls: [tool] } },
    { message: { content: null, tool_calls: [tool] } }] };
  assert.equal(decodeChatReply(json).choices[0].message.content, story);
  assert.deepEqual(json.choices[1].message, { content: null, tool_calls: [tool] });
  const events = [
    { choices: [{ index: 0, delta: { content: encoded.slice(0, 22), reasoning: 'think' } }] },
    { choices: [{ index: 1, delta: { content: encodeUnicode('替代回复') } }] },
    { choices: [{ index: 0, delta: { content: encoded.slice(22), tool_calls: [tool] }, finish_reason: 'stop' }] },
  ];
  const sse = events.map(frame => 'data: ' + JSON.stringify(frame)).join('\r\n\r\n') + '\r\n\r\ndata: [DONE]\r\n\r\n';
  const result = decodeChatStream(sse).split('\n\n').filter(x => x.startsWith('data: {')).map(x => JSON.parse(x.slice(6)));
  assert.deepEqual(result.map(frame => frame.choices[0].delta.content), ['', '替代回复', story]);
  assert.equal(result[0].choices[0].delta.reasoning, 'think');
  assert.deepEqual(result[2].choices[0].delta.tool_calls, [tool]);
  const gemini = 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [
    { text: 'think', thought: true }, { text: encoded, thoughtSignature: 'sig' },
  ] } }] }) + '\n\n';
  assert.deepEqual(JSON.parse(decodeChatStream(gemini, 'makersuite').trim().slice(6)).candidates[0].content.parts,
    [{ text: 'think', thought: true }, { text: story, thoughtSignature: 'sig' }]);
  assert.throws(() => decodeChatStream('data: {"choices":[{"delta":{"content":"raw"}}]}\n\n'));
});

test('Unicode only transforms the native request and decodes its reply before the host reads it', async () => {
  const eventSource = new EventEmitter();
  const eventTypes = Object.fromEntries([
    'GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED', 'GENERATION_ENDED', 'CHAT_CHANGED',
    'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY',
  ].map(key => [key, key]));
  const chat = [{ is_user: true, mes: '你好' }];
  const context = { chatId: 'test-chat', chat, eventSource, eventTypes, mainApi: 'openai', chatCompletionSettings: { preset_settings_openai: '测试预设' } };
  const stored = new Map([['miemie_preset_manager_pinyin_v1', 'true']]);
  const requests = [];
  let upstream = story;
  const nativeFetch = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return Response.json({ choices: [{ message: { content: upstream } }] });
  };
  const host = {
    SillyTavern: { getContext: () => context }, TavernHelper: { builtin: { promptManager: {} } },
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    fetch: nativeFetch, location: { href: 'http://localhost:8000/' }, setTimeout, clearTimeout,
  };
  const tools = createPresetTools(host);
  const messages = [{ role: 'system', content: story }, { role: 'assistant', content: '原回复' },
    { role: 'user', content: [{ type: 'text', text: chat[0].mes }, { type: 'image_url', image_url: { url: 'fixture' } }] },
    { role: 'tool', content: '{"正文":"工具结果"}', tool_call_id: 'call-x' }];
  const ready = (type = 'normal') => {
    eventSource.emit('GENERATION_AFTER_COMMANDS', type, {}, false);
    eventSource.emit('CHAT_COMPLETION_PROMPT_READY', { chat: messages, dryRun: false });
    eventSource.emit('GENERATE_AFTER_DATA', { prompt: messages }, false);
    const request = { type, messages: messages.slice(), stream: false };
    eventSource.emit('CHAT_COMPLETION_SETTINGS_READY', request);
    return request;
  };
  const dispatch = async request => host.fetch('/api/backends/chat-completions/generate', {
    method: 'POST', body: JSON.stringify(request),
  });
  assert.equal(tools.enabled(), true);
  assert.deepEqual(tools.settings(), { input: 'pinyin', reply: 'plain', tagIsolation: true });
  assert(tools.setSettings({ input: 'unicode' }));
  assert.equal(tools.enabled(), false);
  const rawReply = await dispatch(ready());
  assert.equal((await rawReply.json()).choices[0].message.content, story);
  assert.deepEqual(requests[0].messages.slice(1).map(x => x.role), messages.map(x => x.role));
  assert.equal(decodeUnicode(requests[0].messages[1].content), story);
  assert.equal(decodeUnicode(requests[0].messages[3].content[0].text), '你好');
  assert.deepEqual(requests[0].messages[3].content[1], messages[2].content[1]);
  assert.equal(decodeUnicode(requests[0].messages[4].content), messages[3].content);
  assert.equal(requests[0].messages[4].tool_call_id, 'call-x');
  assert.equal(requests[0]._miemieUnicodeRequest, undefined);
  assert.equal(chat[0].mes, '你好');
  assert.equal(messages[0].content, story);
  tools.setSettings({ reply: 'encoded' });
  upstream = encodeUnicode(story);
  const decodedReply = await dispatch(ready('swipe'));
  assert.equal((await decodedReply.json()).choices[0].message.content, story);
  const unrelated = { type: 'quiet', messages, stream: false };
  await dispatch(unrelated);
  assert.deepEqual(requests[2], unrelated);
  const stale = ready();
  eventSource.emit('CHAT_CHANGED');
  await assert.rejects(dispatch(stale), { name: 'AbortError' });
  assert.equal(requests.length, 3);
  upstream = '"\\u12';
  await assert.rejects(dispatch(ready()), /完整的 Unicode/);
  tools.dispose();
  assert.equal(host.fetch, nativeFetch);
  const reopened = createPresetTools(host);
  assert.deepEqual(reopened.settings(), { input: 'unicode', reply: 'encoded', tagIsolation: true });
  reopened.dispose();
});

const replyCall = args => ({ index: 0, id: 'call-output', type: 'function',
  function: { name: 'deliver_reply', arguments: args } });
const sse = frames => frames.map(frame => `data: ${JSON.stringify(frame)}\n\n`).join('') + 'data: [DONE]\n\n';

test('Tool reply is opt-in, preserves the native messages and makes one request per turn', async () => {
  const eventSource = new EventEmitter();
  const eventTypes = Object.fromEntries(['GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED',
    'GENERATION_ENDED', 'CHAT_CHANGED', 'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY'].map(key => [key, key]));
  const context = { chatId: 'test-chat', chat: [{ is_user: true, mes: '继续' }], eventSource, eventTypes, mainApi: 'openai', chatCompletionSettings: { preset_settings_openai: '测试预设' } };
  const stored = new Map(), requests = [];
  const plain = { choices: [{ message: { content: story } }] };
  let upstream = plain;
  const host = {
    SillyTavern: { getContext: () => context }, location: { href: 'http://localhost/' }, setTimeout, clearTimeout,
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    fetch: async (_url, init) => { requests.push(JSON.parse(init.body)); return Response.json(upstream); },
  };
  const messages = [{ role: 'system', content: '预设与世界书' }, { role: 'user', content: '继续' }];
  const ready = (changes = {}) => {
    const request = { type: 'normal', chat_completion_source: 'custom', messages: messages.slice(), ...changes };
    eventSource.emit('GENERATION_AFTER_COMMANDS', request.type, {}, false);
    eventSource.emit('CHAT_COMPLETION_PROMPT_READY', { chat: messages, dryRun: false });
    eventSource.emit('GENERATE_AFTER_DATA', { prompt: messages }, false);
    eventSource.emit('CHAT_COMPLETION_SETTINGS_READY', request);
    return request;
  };
  const dispatch = async request => (await host.fetch('/api/backends/chat-completions/generate', {
    method: 'POST', body: JSON.stringify(request),
  })).json();
  const tools = createPresetTools(host);
  assert.equal(await dispatch(ready()).then(data => data.choices[0].message.content), story);
  assert.equal(requests.at(-1).tools, undefined);
  assert(tools.setSettings({ toolReply: true }));
  upstream = { choices: [{ finish_reason: 'tool_calls', message: { content: null,
    tool_calls: [replyCall(JSON.stringify({ text: story }))] } }], usage: { total_tokens: 9 } };
  const restored = await dispatch(ready({ type: 'swipe' }));
  assert.deepEqual(restored, { choices: [{ finish_reason: 'stop', message: { content: story } }], usage: { total_tokens: 9 } });
  assert.deepEqual(requests.at(-1).messages, messages);
  assert.deepEqual(requests.at(-1).tools.map(tool => tool.function.name), ['deliver_reply']);
  assert.deepEqual(requests.at(-1).tool_choice, { type: 'function', function: { name: 'deliver_reply' } });
  assert.equal(requests.at(-1)._miemieUnicodeRequest, undefined);
  upstream = plain;
  assert.deepEqual(await dispatch(ready()), plain);
  const foreign = { type: 'function', function: { name: 'lookup' } };
  for (const changes of [{ tools: [foreign], tool_choice: 'auto' }, { type: 'continue' }, { type: 'quiet' },
    { json_schema: { name: 'schema' } }, { assistant_prefill: 'start' }, { n: 2 }, { chat_completion_source: 'claude' }]) {
    assert.deepEqual(await dispatch(ready(changes)), plain);
    assert.deepEqual(requests.at(-1).tools, changes.tools);
    assert.deepEqual(requests.at(-1).tool_choice, changes.tool_choice);
  }
  upstream = { choices: [{ finish_reason: 'length', message: { tool_calls: [replyCall('{"text":"断')] } }] };
  const count = requests.length;
  await assert.rejects(dispatch(ready()), /完整的工具调用回复/);
  assert.equal(requests.length, count + 1);
  const canceled = ready();
  eventSource.emit('CHAT_CHANGED');
  await assert.rejects(dispatch(canceled), { name: 'AbortError' });
  assert.equal(requests.length, count + 1);
  tools.dispose();
  const reopened = createPresetTools(host);
  assert.equal(reopened.settings().toolReply, true);
  reopened.dispose();
});

test('Tool reply restores fragmented OpenAI responses and native Gemini function calls', () => {
  const identity = text => text;
  const args = JSON.stringify({ text: story });
  const openai = [
    { choices: [{ index: 0, delta: { content: '前言', reasoning: '思考' } }] },
    { choices: [{ index: 0, delta: { tool_calls: [replyCall(args.slice(0, 27))] } }] },
    { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(27) } }] } }] },
    { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
  ];
  const frames = text => text.split('\n\n').filter(frame => frame.startsWith('data: {')).map(frame => JSON.parse(frame.slice(6)));
  const openaiResult = frames(decodeChatStream(sse(openai), 'custom', identity, true)).map(frame => frame.choices[0]);
  assert.equal(openaiResult.map(choice => choice.delta.content ?? '').join(''), story);
  assert.equal(openaiResult[0].delta.reasoning, '思考');
  assert.equal(openaiResult.at(-1).finish_reason, 'stop');
  assert(openaiResult.every(choice => !choice.delta.tool_calls));
  const incomplete = [openai[1], openai.at(-1)];
  assert.throws(() => decodeChatStream(sse(incomplete), 'custom', identity, true), /完整的工具调用回复/);
  const foreign = { type: 'function', function: { name: 'lookup', arguments: '{}' } };
  const other = { choices: [{ message: { tool_calls: [foreign] }, finish_reason: 'tool_calls' }] };
  assert.deepEqual(decodeChatReply(structuredClone(other), identity, 'custom'), other);
  const fallback = { choices: [{ message: { content: story, tool_calls: [replyCall('{}')] }, finish_reason: 'tool_calls' }] };
  assert.deepEqual(decodeChatReply(fallback, identity, 'custom').choices[0], { message: { content: story }, finish_reason: 'stop' });
  const geminiCall = { functionCall: { name: 'deliver_reply', args: { text: story } }, thoughtSignature: 'sig' };
  const gemini = { choices: [{ message: { content: '' } }], responseContent: { parts: [structuredClone(geminiCall)] } };
  assert.equal(decodeChatReply(gemini, identity, 'makersuite').choices[0].message.content, story);
  assert.deepEqual(gemini.responseContent.parts, [{ text: story, thoughtSignature: 'sig' }]);
  const geminiStream = [
    { candidates: [{ content: { parts: [{ thought: true, text: '思考' }] } }] },
    { candidates: [{ content: { parts: [{ text: '前言' }, geminiCall] } }] },
    { candidates: [{ finishReason: 'STOP' }] },
  ];
  const result = frames(decodeChatStream(sse(geminiStream), 'vertexai', identity, true));
  assert.deepEqual(result[0].candidates[0].content.parts, [{ thought: true, text: '思考' }]);
  assert.deepEqual(result[1].candidates[0].content.parts, [{ text: story, thoughtSignature: 'sig' }]);
  const tokenLimit = [geminiStream[1], { candidates: [{ finishReason: 'MAX_TOKENS' }] }];
  assert.deepEqual(frames(decodeChatStream(sse(tokenLimit), 'makersuite', identity, true))[0].candidates[0].content.parts,
    [{ text: '前言' }]);
});

test('Preset tools migrate legacy values once, isolate preferences, and follow verified rename and deletion', () => {
  const eventSource = new EventEmitter();
  const eventTypes = Object.fromEntries(
    ['GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED', 'GENERATION_ENDED',
      'CHAT_CHANGED', 'PRESET_CHANGED', 'PRESET_RENAMED', 'PRESET_DELETED',
      'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY'].map(key => [key, key]));
  const chatCompletionSettings = { preset_settings_openai: '甲' };
  const context = { chatCompletionSettings, eventSource, eventTypes, chat: [], mainApi: 'openai',
    messageFormatter: { addHook() {} } };
  const key = 'miemie_preset_manager_message_tools_v1';
  const stored = new Map([[key, JSON.stringify({ affinity: true, statusPrompt: '原有提示词', customTags: ['prior_tag'] })]]);
  const host = { SillyTavern: { getContext: () => context }, fetch: async () => Response.json({}),
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) } };
  const tools = createPresetTools(host);
  assert(tools.settings().affinity);
  assert.equal(tools.settings().statusPrompt, '原有提示词');
  assert(tools.setSettings({ lowThinking: true }));
  chatCompletionSettings.preset_settings_openai = '乙';
  eventSource.emit('PRESET_CHANGED', { apiId: 'openai', name: '乙' });
  assert.deepEqual(tools.settings(), { input: 'off', reply: 'plain', tagIsolation: true });
  assert(!tools.setSettings({ lowThinking: true }, '甲'), 'A stale editor cannot write into either preset');
  assert(tools.setSettings({ worldReport: true, tagIsolation: false, customTags: ['my_tag'] }));
  chatCompletionSettings.preset_settings_openai = '甲-新';
  eventSource.emit('PRESET_RENAMED', { apiId: 'openai', oldName: '甲', newName: '甲-新' });
  assert(tools.settings().lowThinking);
  assert.deepEqual(tools.settings().customTags, ['prior_tag']);
  assert(!tools.settings('甲').affinity);
  eventSource.emit('PRESET_DELETED', { apiId: 'openai', name: '甲-新' });
  assert(!tools.settings().lowThinking);
  tools.dispose();
  chatCompletionSettings.preset_settings_openai = '乙';
  const reopened = createPresetTools(host);
  assert(reopened.settings().worldReport);
  assert.equal(reopened.settings().tagIsolation, false);
  assert.deepEqual(reopened.settings().customTags, ['my_tag']);
  assert(!reopened.settings('甲-新').affinity);
  reopened.dispose();
});

test('MieMie defaults follow the signed description and preserve per-preset overrides', () => {
  const eventSource = new EventEmitter();
  const eventTypes = Object.fromEntries([
    'GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED', 'GENERATION_ENDED',
    'CHAT_CHANGED', 'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY',
  ].map(key => [key, key]));
  const description = content => ({ name: '📜说明', content });
  const presets = new Map([
    ['重命名的预设', { prompts: [description('使用说明\r\n—— SheepSheep\r\n')] }],
    ['旧版', { prompts: [description('作者：SheepSheep')] }],
    ['仅提到作者', { prompts: [description('感谢 SheepSheep 提供的条目')] }],
    ['署名在别处', { prompts: [description('其他说明'), { name: '其他条目', content: 'SheepSheep' }] }],
    ['MieMiePreset-ver2027.1.0', { prompts: [description('作者：SheepSheepLab')] }],
  ]);
  let selected = '重命名的预设';
  const manager = { getSelectedPresetName: () => selected, getCompletionPresetByName: name => presets.get(name) };
  const context = { getPresetManager: () => manager, eventSource, eventTypes, chat: [], mainApi: 'openai' };
  const stored = new Map();
  const host = { SillyTavern: { getContext: () => context }, fetch: async () => Response.json({}),
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) } };
  const tools = createPresetTools(host);
  const defaults = { input: 'off', reply: 'plain', tagIsolation: true };
  const miemieDefaults = { ...defaults, lowThinking: true, toolReply: true, affinity: true, status: true, worldReport: true };
  assert.deepEqual(tools.settings(), miemieDefaults);
  assert.deepEqual(tools.settings('旧版'), miemieDefaults);
  for (const name of ['MieMiePreset-ver2027.1.0', '仅提到作者', '署名在别处']) {
    assert.deepEqual(tools.settings(name), defaults);
  }
  assert(tools.setSettings({ toolReply: false }));
  const { toolReply, ...custom } = miemieDefaults;
  assert.deepEqual(tools.settings(), custom);
  selected = '旧版';
  assert.deepEqual(tools.settings(), miemieDefaults);
  tools.dispose();
  selected = '重命名的预设';
  const reopened = createPresetTools(host);
  assert.deepEqual(reopened.settings(), custom);
  reopened.dispose();
});

test('Low thinking applies only to the scoped native generation and keeps unsupported requests usable', async () => {
  const eventSource = new EventEmitter();
  const eventTypes = Object.fromEntries(
    ['GENERATION_AFTER_COMMANDS', 'GENERATE_AFTER_DATA', 'GENERATION_STOPPED', 'GENERATION_ENDED',
      'CHAT_CHANGED', 'CHAT_COMPLETION_PROMPT_READY', 'CHAT_COMPLETION_SETTINGS_READY'].map(key => [key, key]));
  const chatCompletionSettings = { preset_settings_openai: '甲' };
  const context = { chatId: 'chat', chatCompletionSettings, eventSource, eventTypes, mainApi: 'openai', chat: [] };
  const warnings = [];
  const host = { SillyTavern: { getContext: () => context }, TavernHelper: { getTavernVersion: () => '1.18.0' },
    fetch: async () => Response.json({}), toastr: { warning: message => warnings.push(message) },
    localStorage: { getItem: () => null, setItem() {} } };
  const tools = createPresetTools(host);
  async function send(requestFields = {}, { switchTo, dryRun = false, started = true } = {}) {
    const messages = [{ role: 'user', content: '开场提示词' }];
    if (started) {
      eventSource.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, dryRun);
      eventSource.emit('CHAT_COMPLETION_PROMPT_READY', { chat: messages, dryRun });
      eventSource.emit('GENERATE_AFTER_DATA', { prompt: messages }, dryRun);
    }
    if (switchTo) chatCompletionSettings.preset_settings_openai = switchTo;
    const request = { type: 'normal', chat_completion_source: 'custom', model: 'gemini-3.8-flash',
      custom_url: 'http://127.0.0.1:8800/v1', reasoning_effort: 'high', include_reasoning: true, messages, ...requestFields };
    for (const listener of eventSource.listeners('CHAT_COMPLETION_SETTINGS_READY')) await listener(request);
    assert.deepEqual(request.messages, [{ role: 'user', content: '开场提示词' }]);
    eventSource.emit('GENERATION_ENDED');
    return request;
  }
  assert((await send()).include_reasoning);
  assert(tools.setSettings({ lowThinking: true }));
  for (const model of ['gemini-3.8-flash', 'gemini-4-neon', 'gemini-4-hydrogen']) {
    const request = await send({ model });
    assert.equal(request.include_reasoning, false);
    assert.deepEqual(JSON.parse(request.custom_include_body), { reasoning_effort: 'low', include_reasoning: false });
  }
  assert.equal((await send({ chat_completion_source: 'makersuite' })).reasoning_effort, 'low');
  assert.equal((await send({ chat_completion_source: 'makersuite', model: 'gemini-3.6-flash' })).reasoning_effort, 'min');
  const official = await send({ model: 'gemini-4-argon', custom_url: 'https://generativelanguage.googleapis.com/v1beta/openai/' });
  assert.deepEqual(JSON.parse(official.custom_include_body), { extra_body: { google: {
    thinking_config: { thinking_level: 'low', include_thoughts: false },
  } } });
  const fallback = await send({ model: 'custom-alias' });
  assert.equal(fallback.include_reasoning, false);
  assert.equal(fallback.reasoning_effort, 'high');
  assert.equal(fallback.custom_include_body, undefined);
  await send({ model: 'custom-alias' });
  assert.equal(warnings.length, 1);
  assert((await send({}, { dryRun: true })).include_reasoning);
  assert((await send({}, { started: false })).include_reasoning);
  assert((await send({}, { switchTo: '乙' })).include_reasoning);
  assert((await send()).include_reasoning);
  chatCompletionSettings.preset_settings_openai = '甲';
  assert(tools.setSettings({ lowThinking: false }));
  assert((await send()).include_reasoning);
  tools.dispose();
});
