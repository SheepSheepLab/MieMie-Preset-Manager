// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

/* Executes pinned upstream snippets in a VM. DOM, jQuery, events and HTTP are test doubles. */
const vm = require('node:vm');
const assert = require('node:assert/strict');
const copy = value => JSON.parse(JSON.stringify(value));

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function preset(label = 'A', extra = {}) {
  return {
    temperature: 0.7,
    future_top: { untouched: [label, 2, false] },
    extensions: { another_extension: { opaque: ['keep', label] } },
    prompts: [
      { identifier: 'main', name: 'Main', system_prompt: true, role: 'system', content: label },
      { identifier: 'custom', name: '写作-正文', system_prompt: false, role: 'user', content: 'synthetic content', future_prompt: { x: 1 } },
    ],
    prompt_order: [
      { character_id: 100000, future_group: { untouched: label }, order: [{ identifier: 'custom', enabled: false, future_order: 5 }] },
      { character_id: 100001, future_group: [label], order: [{ identifier: 'main', enabled: true }, { identifier: 'custom', enabled: true, future_order: { keep: true } }] },
    ],
    ...extra,
  };
}

class MockEvents {
  listeners = new Map();
  history = [];
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
  }
  removeListener(event, fn) { this.listeners.get(event)?.delete(fn); }
  count(event) { return this.listeners.get(event)?.size || 0; }
  total() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
  async emit(event, payload) {
    this.history.push({ event, payload: payload && { apiId: payload.apiId, name: payload.name, presetName: payload.presetName } });
    for (const listener of [...(this.listeners.get(event) || [])]) await listener(payload);
  }
}

async function nativeHost(baseline, { extra = {}, timeoutMs = 1000 } = {}) {
  const snippets = baseline.snippets;
  const records = new Map([['A', preset('A', extra)], ['B', preset('B', extra)]]);
  const names = { A: 0, B: 1 };
  const presets = [...records.values()].map(copy);
  const live = { bind_preset_to_connection: true, preset_settings_openai: 'A', pollinations_endpoint: 'host-default' };
  const events = new MockEvents();
  const eventTypes = {
    OAI_PRESET_CHANGED_BEFORE: 'before', OAI_PRESET_CHANGED_AFTER: 'after', PRESET_CHANGED: 'changed',
    PRESET_DELETED: 'deleted', PRESET_RENAMED: 'renamed', SETTINGS_UPDATED: 'settings',
  };
  const controls = { activeTimers: new Set(), http: [], changes: [] };
  const select = { kind: 'select', options: [
    { kind: 'option', value: '0', text: 'A', selected: true },
    { kind: 'option', value: '1', text: 'B', selected: false },
  ] };
  select.options.forEach(option => { option.parent = select; });
  let native;
  const widgets = new Map();
  class JQuery {
    constructor(items) { this.items = items; }
    val(value) {
      if (arguments.length === 0) {
        const item = this.items[0];
        return item?.kind === 'select' ? item.options.find(option => option.selected)?.value : item?.value;
      }
      for (const item of this.items) {
        if (item.kind === 'select') item.options.forEach(option => { option.selected = option.value === String(value); });
        else item.value = value;
      }
      return this;
    }
    text() { return this.items.map(item => item.text || '').join(''); }
    map(fn) { const values = this.items.map((item, i) => fn(i, item)); return { toArray: () => values }; }
    filter(fn) { return new JQuery(this.items.filter((item, i) => fn.call(item, i, item))); }
    find(query) {
      const options = this.items.flatMap(item => item.options || []);
      if (query === 'option') return new JQuery(options);
      if (query === 'option:selected' || query === ':selected') return new JQuery(options.filter(option => option.selected));
      const value = query.match(/^option\[value="(.*)"\]$/)?.[1];
      return new JQuery(options.filter(option => option.value === value));
    }
    prop(key, value) {
      if (arguments.length === 1) return this.items[0]?.[key];
      for (const item of this.items) {
        if (key === 'selected' && value && item.parent) item.parent.options.forEach(option => { option.selected = option === item; });
        else item[key] = value;
      }
      return this;
    }
    attr(key, value) { return this.prop(key, value); }
    empty() { return this; }
    append(value) {
      for (const item of value.items) {
        item.parent = select;
        if (item.selected) select.options.forEach(option => { option.selected = false; });
        select.options.push(item);
      }
      return this;
    }
    remove() {
      for (const item of this.items) {
        if (item.parent) item.parent.options = item.parent.options.filter(option => option !== item);
      }
      if (!select.options.some(option => option.selected) && select.options[0]) select.options[0].selected = true;
      return this;
    }
    trigger(event) {
      if (event === 'change' && this.items.includes(select)) {
        controls.changes.push({ selected: this.val(), completionListenersBeforeTrigger: events.count('changed') });
        native.onSettingsPresetChange();
      }
      return this;
    }
  }
  function $(value, attributes) {
    if (typeof value !== 'string') return new JQuery([value]);
    if (value === '#settings_preset_openai') return new JQuery([select]);
    if (value === '<option></option>') return new JQuery([{ kind: 'option', ...attributes, value: String(attributes.value) }]);
    if (!widgets.has(value)) widgets.set(value, { kind: 'input', value: undefined });
    return new JQuery([widgets.get(value)]);
  }
  async function fetch(url, init) {
    const pathname = new URL(String(url), 'http://native-contract.invalid/').pathname;
    assert.equal(init.method, 'POST');
    const body = JSON.parse(init.body);
    controls.http.push({ pathname, body: copy(body) });
    if (pathname === '/api/settings/get') return { ok: true, json: async () => ({ openai_setting_names: [...records.keys()], openai_settings: [...records.values()].map(value => JSON.stringify(value)) }) };
    if (pathname === '/api/presets/save') {
      assert.equal(body.apiId, 'openai');
      records.set(body.name, copy(body.preset));
      return { ok: true, json: async () => ({ name: body.name }) };
    }
    if (pathname === '/api/presets/delete') {
      assert.equal(body.apiId, 'openai');
      records.delete(body.name);
      return { ok: true, json: async () => ({}) };
    }
    throw Error('Unexpected mocked request: ' + pathname);
  }
  const context = vm.createContext({
    $, structuredClone, fetch, eventSource: events, event_types: eventTypes,
    oai_settings: live, openai_settings: presets, openai_setting_names: names,
    getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-Test-Only': 'mock' }),
    saveSettingsDebounced() {}, saveOpenAIPreset() { throw Error('Unexpected native fallback save'); },
    console: { ...console, debug() {} }, toastr: { info() {}, error() {} },
    t: strings => strings.join(''),
    // These enums are only dependencies of the migration snippet; test payloads do not use their legacy values.
    character_names_behavior: { COMPLETION: 1 }, chat_completion_sources: { MAKERSUITE: 'makersuite' },
    custom_prompt_post_processing_types: { CLAUDE: 'claude', MERGE: 'merge' },
  });
  const required = name => { assert(snippets[name]?.text, `${baseline.id}: missing exact fixture ${name}`); return snippets[name].text; };
  const methods = ['selectPreset', 'savePreset', 'updateList', 'getPresetList', 'getSelectedPresetName', 'findPreset', 'getCompletionPresetByName', 'deletePreset'];
  const application = snippets['openai.presetApplicationPromise']?.text || '';
  const applicationGetter = snippets['openai.getPresetApplicationPromise']?.text.replace(/^export\s+/, '') || '';
  const code = [
    `const settingsToUpdate = ${required('openai.settingsToUpdateInitializer')};`,
    required('openai.migrateChatCompletionSettings'), application, applicationGetter,
    required('openai.onSettingsPresetChange'),
    `class NativePresetManager { constructor(){ this.apiId='openai'; this.select='#settings_preset_openai'; } isKeyedApi(){return false;} getSelectedPreset(){return $(this.select).val();}`,
    ...methods.map(method => required('PresetManager.' + method)), '}',
    `globalThis.__native = { manager: new NativePresetManager(), onSettingsPresetChange, settingsToUpdate${applicationGetter ? ', getPresetApplicationPromise' : ''} };`,
  ].join('\n');
  vm.runInContext(code, context, { timeout: 1000, filename: `upstream-native-contract-${baseline.id}.js` });
  native = context.__native;
  const host = {
    location: { href: 'http://native-contract.invalid/' }, fetch,
    setTimeout(callback, ms) {
      const timer = setTimeout(() => { controls.activeTimers.delete(timer); callback(); }, Math.min(ms, timeoutMs));
      controls.activeTimers.add(timer); return timer;
    },
    clearTimeout(timer) { controls.activeTimers.delete(timer); clearTimeout(timer); },
    TavernHelper: { getTavernVersion: () => baseline.version, builtin: { promptManager: { configuration: { promptOrder: { strategy: 'global', dummyId: 100001 } } } } },
    SillyTavern: { getContext: () => ({
      getPresetManager: api => { assert.equal(api, 'openai'); return native.manager; },
      getRequestHeaders: context.getRequestHeaders, chatCompletionSettings: live, eventTypes, eventSource: events,
    }) },
  };
  const first = deferred();
  const initialListener = payload => { if (payload?.apiId === 'openai' && payload?.name === 'A') first.resolve(); };
  events.on('changed', initialListener);
  const result = native.manager.selectPreset(native.manager.findPreset('A'));
  await first.promise; await result;
  events.removeListener('changed', initialListener);
  return {
    host, native, records, names, presets, live, events, controls, vmContext: context,
    gate(event) {
      const entered = deferred(), release = deferred();
      const listener = async () => { entered.resolve(); await release.promise; };
      events.on(event, listener);
      return { entered: entered.promise, release: release.resolve, remove: () => events.removeListener(event, listener) };
    },
    cleanup() { for (const timer of controls.activeTimers) clearTimeout(timer); controls.activeTimers.clear(); events.listeners.clear(); },
  };
}

module.exports = { nativeHost, deferred, preset, copy };
