// SPDX-License-Identifier: GPL-3.0-or-later
// Synthetic transport/state dependencies; upstream functions are unchanged fixtures.
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { nativeHost, deferred, copy } = require('./st-native-host.cjs');
const nativePresets = require('../fixtures/st-native-contracts.json');
const bindingSources = require('../fixtures/st-binding-contracts.json');
const NS = 'miemie.preset-manager';
const quiet = { log() {}, debug() {}, warn() {}, trace() {}, error() {} };
async function bindingNativeHost(version) {
  const f = await nativeHost(nativePresets.baselines.find(b => b.version === version));
  const baseline = bindingSources.baselines.find(b => b.version === version);
  vm.runInContext('__native.manager.getAllPresets = function ' + baseline.snippets.getAllPresets.text, f.vmContext);
  const ectx = vm.createContext({ console: quiet, localStorage: { getItem: () => null } });
  vm.runInContext(baseline.snippets.EventEmitter.text, ectx);
  const emitter = new ectx.EventEmitter();
  f.events.on = emitter.on.bind(emitter); f.events.removeListener = emitter.removeListener.bind(emitter);
  f.events.count = key => emitter.events[key]?.length || 0; f.events.emit = emitter.emit.bind(emitter);
  const existing = f.host.SillyTavern.getContext();
  Object.assign(existing.eventTypes, { CHAT_CHANGED: 'chat', PRESET_RENAMED_BEFORE: 'rename-before',
    GENERATION_STARTED: 'start', GENERATION_AFTER_COMMANDS: 'commands', CHAT_COMPLETION_SETTINGS_READY: 'request', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stopped' });
  const files = new Map(), metadata = new Map();
  const key = (kind, filename) => kind + ':' + filename;
  for (const filename of ['one', 'two', 'three']) for (const kind of ['single', 'group']) {
    const meta = { unrelated: { keep: filename }, integrity: 'synthetic-' + filename };
    metadata.set(key(kind, filename), meta); files.set(key(kind, filename), copy(meta));
  }
  let current = { kind: 'single', filename: 'one' };
  const globals = { unrelated_extension: { preserved: true } };
  let diskGlobals = copy(globals), metadataGate = null, globalGate = null;
  const faults = { chatMismatch: false, globalMismatch: false, globalSave: false, chatSave: false, chatRead: false, globalRead: false };
  const controls = { ...f.controls, metadataSaved: [], settingsSaved: 0, sent: [], generationStreaming: false, prepareGate: null };
  function chatContext() {
    return { ...existing, characterId: current.kind === 'single' ? 0 : undefined,
      groupId: current.kind === 'group' ? 'group-1' : null, chatId: current.kind === 'none' ? undefined : current.filename,
      characters: [{ name: 'synthetic role', avatar: 'synthetic.png' }],
      chatMetadata: metadata.get(key(current.kind, current.filename)) ?? {}, extensionSettings: globals,
      saveMetadata: () => persistence.saveMetadata(),
      saveSettingsDebounced() {
        void (async () => {
          if (globalGate) await globalGate.promise;
          if (!faults.globalSave) { diskGlobals = copy(globals); if (faults.globalMismatch) delete diskGlobals[NS]; }
          controls.settingsSaved++; await f.events.emit(existing.eventTypes.SETTINGS_UPDATED);
        })();
      },
      stopGeneration: () => generation.stopGeneration(),
    };
  }
  f.host.SillyTavern.getContext = chatContext;
  const autoContext = vm.createContext({ console: quiet, main_api: 'openai', selected_group: null, this_chid: 0,
    characters: [{ name: 'A' }], getPresetManager: () => f.native.manager });
  vm.runInContext(baseline.snippets.autoSelectPreset.text, autoContext);
  const originalFetch = f.host.fetch;
  f.host.fetch = async (url, init) => {
    const pathname = new URL(url).pathname, body = JSON.parse(init.body);
    if (pathname === '/api/settings/get') {
      if (faults.globalRead) return { ok: false };
      const original = await originalFetch(url, init);
      const data = await original.json(); return { ok: true, json: async () => ({ ...data, settings: JSON.stringify({ extension_settings: diskGlobals }) }) };
    }
    if (pathname === '/api/chats/get' || pathname === '/api/chats/group/get') {
      if (faults.chatRead) return { ok: false };
      const k = key(pathname.includes('/group/') ? 'group' : 'single', body.file_name ?? body.id);
      return { ok: true, json: async () => [{ chat_metadata: copy(files.get(k) ?? {}) }] };
    }
    return originalFetch(url, init);
  };
  const persistence = vm.createContext({ console: quiet, selected_group: null, isChatSaving: false, DEFAULT_SAVE_EDIT_TIMEOUT: 1,
    waitUntilCondition: async () => { if (metadataGate) await metadataGate.promise; },
    cancelDebouncedChatSave() {}, saveTokenCache() {}, saveItemizedPrompts() {}, getCurrentChatId: () => current.filename,
    saveChat: async () => saveCurrent(), saveGroupChat: async () => saveCurrent() });
  function saveCurrent() {
    if (faults.chatSave) throw Error('Synthetic save failure');
    const k = key(current.kind, current.filename), value = copy(chatContext().chatMetadata);
    if (faults.chatMismatch) delete value[NS]; files.set(k, value); controls.metadataSaved.push({ key: k, metadata: value });
  }
  vm.runInContext(['saveMetadata', 'saveChatConditional'].map(n => baseline.snippets[n].text.replace(/^export /, '')).join('\n'), persistence);

  // Execute the exact native Generate prefix through AFTER_COMMANDS. Prompt assembly
  // is a synthetic dependency; full pinned Generate is retained/audited for abort
  // controller writes, and the actual streaming/non-streaming request functions run.
  const fullGenerate = baseline.snippets.Generate.text;
  const marker = "    if (main_api == 'kobold'";
  const prefix = fullGenerate.slice(0, fullGenerate.indexOf(marker)).replace(/^export /, '');
  assert(prefix.includes('await eventSource.emit(event_types.GENERATION_AFTER_COMMANDS'));
  assert.equal((fullGenerate.match(/abortController\s*=\s*new AbortController/g) || []).length, 1);
  const group = baseline.snippets.generateGroupWrapper.text;
  assert(group.includes('signal:') || group.includes('params.signal'));
  const groupPrefix = group.slice(0, group.indexOf("    if (online_status"));
  const generation = vm.createContext({ console: quiet, AbortController, AbortSignal,
    eventSource: f.events, event_types: existing.eventTypes, streamingProcessor: null,
    setGenerationProgress() {}, unshallowCharacter: async () => {}, this_chid: 0,
    power_user: { instruct: { enabled: false } }, main_api: 'openai', selected_group: null,
    $: () => ({ val: () => '' }), processCommands: async () => false, unblockGeneration() {}, hideStopButton() {},
    getChatCompletionModel: () => 'synthetic-model', oai_settings: f.live,
    createGenerationParameters: async settings => {
      const generate_data = { temperature: settings.temp_openai, prompts: copy(settings.prompts) };
      if (controls.prepareGate) await controls.prepareGate.promise;
      return { generate_data, stream: false };
    }, getRequestHeaders: () => ({ 'Content-Type': 'application/json' }),
    checkQuotaError() {}, checkModerationError() {}, parseChatCompletionLogprobs: () => null, delay: async () => {}, saveLogprobsForActiveMessage() {},
    fetch: async (_url, init) => {
      if (init.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      controls.sent.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ synthetic: true }) };
    },
    streamingFixture: () => controls.generationStreaming,
  });
  const code = 'let abortController = new AbortController(); let generation_started;\n' +
    ['stopGeneration', 'sendGenerationRequest', 'sendStreamingRequest'].map(n => baseline.snippets[n].text.replace(/^export /, '')).join('\n') + '\n' +
    baseline.snippets.sendOpenAIRequest.text + '\n' +
    groupPrefix + '\n throwIfAborted(); return await sendGenerationRequest(type, {prompt: []});\n}\n' +
    prefix + '\n if(selected_group) return await generateGroupWrapper(false,type,{signal:abortController.signal});' +
    '\n if(streamingFixture()){ streamingProcessor={abortController:new AbortController(),onStopStreaming(){this.abortController.abort();}}; return await sendStreamingRequest(type,{prompt: []}); }' +
    '\n return await sendGenerationRequest(type,{prompt: []});\n}';
  vm.runInContext(code, generation);
  return { ...f, baseline, emitter, metadata, files, globals, faults, controls, generation,
    current: () => ({ ...current }),
    setChat(kind, filename = 'one') { current = { kind, filename }; persistence.selected_group = kind === 'group' ? 'group-1' : null; generation.selected_group = persistence.selected_group; },
    async changeChat(kind, filename) { this.setChat(kind, filename); await f.events.emit(existing.eventTypes.CHAT_CHANGED); },
    autoSelect: () => autoContext.autoSelectPreset(),
    async manual(name) { const done = deferred(); const fn = payload => { if (payload?.name === name) done.resolve(); }; f.events.on('changed', fn);
      const result = f.native.manager.selectPreset(f.native.manager.findPreset(name)); await done.promise; await result; f.events.removeListener('changed', fn); },
    async generate() { try { return await generation.Generate('normal'); } finally { await f.events.emit('end'); } },
    metadataGate() { metadataGate = deferred(); return metadataGate; }, globalGate() { globalGate = deferred(); return globalGate; },
    diskGlobal: () => copy(diskGlobals), setDiskGlobal(value) { diskGlobals = copy(value); },
  };
}
module.exports = { bindingNativeHost, NS };
