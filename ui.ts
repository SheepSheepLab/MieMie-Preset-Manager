// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { ManagerController, ManagerView, Row } from './contracts';
import { createIcon, type IconName } from './icons';
import { NUMERIC_PARAMETERS, REASONING_EFFORTS, missingParameterDefaults } from './preset-parameters';
import { managerStyles } from './styles';
import { ICON } from './product-icon';
import { PRESET_MANAGER_PRODUCT } from './product-identity';
import { mountCharacterHeader, protectNativeControls } from './official-presentation';
import { createParameterPresentation } from './parameter-presentation';

const TRIGGERS = [
  ['normal', '普通生成'],
  ['continue', '继续'],
  ['impersonate', '代写用户'],
  ['swipe', '滑动重试'],
  ['regenerate', '重新生成'],
  ['quiet', '静默生成'],
] as const;
const INTERACTIVE = 'button,input,select,textarea,a,summary,[role="switch"],[contenteditable="true"]';

export function createManagerView(host: Window, controller: ManagerController): ManagerView {
  const doc = host.document;
  let disposed = false;
  let localError = '';
  let fileBusy = false;
  let editorKey = '';
  let cardPreset: string | undefined;
  const cardCache = new Map<string, { key: string; node: HTMLElement }>();
  let returnFocus: HTMLElement | null = null;
  let editorReturnFocus: HTMLElement | null = null;
  let confirmClose: (() => void) | null = null;
  const cleanup: Array<() => void> = [];
  const urls = new Set<string>();
  const timers = new Set<number>();

  function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
    const node = doc.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function listen(target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(type, listener, options);
    cleanup.push(() => target.removeEventListener(type, listener, options));
  }
  function button(label: string, icon?: IconName, action?: () => void, className = 'mm-icon') {
    const node = el('button', `mm-button ${className}`);
    node.type = 'button';
    node.title = label;
    node.setAttribute('aria-label', label);
    if (icon) node.append(createIcon(doc, icon));
    if (!className.split(/\s+/).includes('mm-icon')) node.append(doc.createTextNode(label));
    if (action) node.addEventListener('click', action);
    return node;
  }
  function writeControl<T extends HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    node: T,
    permitted = true,
  ): T {
    node.dataset.write = 'true';
    node.dataset.permitted = String(permitted);
    node.disabled = !permitted || controller.state.busy || fileBusy || !controller.state.snapshot;
    return node;
  }
  function showLocalError(error: unknown) {
    localError = error instanceof Error ? error.message : String(error);
    renderStatus();
  }
  async function run(action: () => Promise<unknown>) {
    if (disposed || controller.state.busy || fileBusy) return;
    localError = '';
    try {
      await action();
    } catch (error) {
      if (!disposed) showLocalError(error);
    }
    if (!disposed) render();
  }
  function reorder(id: string, before: string | null, revision: string) {
    if (disposed || fileBusy || controller.state.busy) return;
    localError = '';
    void controller.move(id, before, revision).catch(showLocalError);
  }
  function download(name: string, text: string) {
    if (disposed) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    urls.add(url);
    const link = el('a');
    link.href = url;
    link.download = `${name.replace(/[\\/:*?"<>|]/g, '_')}.json`;
    panel.append(link);
    link.click();
    link.remove();
    const timer = host.setTimeout(() => {
      URL.revokeObjectURL(url);
      urls.delete(url);
      timers.delete(timer);
    }, 1000);
    timers.add(timer);
  }
  const panel = el('div', 'miemie-pm');
  panel.hidden = true;
  panel.inert = true;
  panel.tabIndex = -1;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', PRESET_MANAGER_PRODUCT.name);
  panel.dataset.presentation = 'local';
  if (controller.binding) panel.dataset.binding = 'true';
  const style = el('style');
  style.textContent = managerStyles;
  const frame = el('section', 'mm-frame');
  frame.tabIndex = -1;
  panel.append(style, frame);
  const header = el('header', 'mm-header');
  const brandline = el('div', 'mm-brandline');
  const logo = el('div', 'mm-logo');
  const productImage = el('img');
  productImage.src = ICON; productImage.alt = ''; productImage.draggable = false;
  productImage.dataset.toolIcon = 'preset-manager'; logo.append(productImage);
  const brand = el('div', 'mm-brand');
  const subtitle = el('div', 'mm-subtitle');
  brand.append(el('h2', '', `${PRESET_MANAGER_PRODUCT.name} ${PRESET_MANAGER_PRODUCT.version}`), subtitle);
  const characterHeader = mountCharacterHeader(host,subtitle);
  cleanup.push(() => characterHeader.dispose());
  let closeHandler: (() => unknown) | null = null;
  const closeButton = button('关闭预设管理', undefined, requestClose, 'mm-secondary mm-return');
  closeButton.textContent = '返回';
  brandline.append(logo, brand);
  const toolbar = el('div', 'mm-toolbar');
  const presetField = el('div', 'mm-preset-field');
  const presetControl = el('div', 'mm-preset-control');
  const presetSelect = writeControl(el('select'));
  presetSelect.setAttribute('aria-label', '当前使用预设');
  presetSelect.addEventListener('change', () => {
    delete presetControl.dataset.keyboardFocus;
    cancelDrag();
    void run(() => controller.select(presetSelect.value));
  });
  // Native selects retain focus after their picker closes. Only keyboard
  // navigation should draw our shared focus ring, never a settled mouse pick.
  listen(doc, 'keydown', ((event: KeyboardEvent) => {
    if (event.key === 'Tab' || presetControl.contains(event.target as Node))
      presetControl.dataset.keyboardFocus = 'true';
  }) as EventListener);
  listen(doc, 'pointerdown', (() => { delete presetControl.dataset.keyboardFocus; }) as EventListener, { capture: true });
  const presetLabel = el('span', 'mm-preset-label', '当前使用预设');
  presetControl.append(presetSelect);
  presetField.append(presetLabel, presetControl);
  const actions = el('div', 'mm-actions');
  const defaultButton = button('将当前预设设为默认', 'default', () => void run(async () => { await controller.binding?.setDefault(); }));
  defaultButton.classList.add('mm-default'); defaultButton.hidden = !controller.binding;
  defaultButton.setAttribute('aria-pressed', 'false');
  const dot = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('cx', '12'); dot.setAttribute('cy', '12'); dot.setAttribute('r', '3'); dot.classList.add('mm-default-dot');
  defaultButton.querySelector('svg')?.append(dot);
  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.hidden = true;
  const importButton = writeControl(button('导入预设', 'import', () => fileInput.click()));
  const exportButton = writeControl(
    button(
      '导出完整预设',
      'export',
      () =>
        void run(async () => {
          const result = await controller.exportText();
          download(result.name, result.text);
          closePresetMenu();
        }),
      '',
    ),
  );
  const copyButton = writeControl(button('复制当前预设', 'copy', () => void run(async () => {
    await controller.copyPreset();
    closePresetMenu();
  }), ''));
  const moreWrap = el('div', 'mm-more-wrap');
  const menu = el('div', 'mm-menu');
  menu.hidden = true;
  const moreButton = button('更多预设操作', 'more', () => {
    menu.hidden = !menu.hidden;
    moreButton.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) positionMenu();
  });
  moreButton.setAttribute('aria-expanded', 'false');
  function closePresetMenu() {
    menu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
  }
  menu.append(
    exportButton,
    copyButton,
    writeControl(
      button('新建预设', 'plus', () => nameDialog('新建预设', '', value => controller.newPreset(value)), ''),
    ),
    writeControl(
      button(
        '重命名预设',
        'edit',
        () => nameDialog('重命名预设', controller.state.snapshot?.name ?? '', value => controller.renamePreset(value)),
        '',
      ),
    ),
    writeControl(
      button(
        '删除当前预设',
        'trash',
        () =>
          confirmDialog(
            '删除预设',
            `确定删除「${controller.state.snapshot?.name ?? ''}」吗？\n此操作将删除整个预设。`,
            () => controller.deletePreset(),
          ),
        '',
      ),
    ),
  );
  moreWrap.append(moreButton, menu);
  for (const node of [presetSelect, importButton, exportButton, copyButton, ...menu.querySelectorAll<HTMLButtonElement>('[data-write]')])
    node.dataset.clean = 'true';
  if (controller.binding) presetControl.append(defaultButton);
  actions.append(importButton, moreWrap, fileInput);
  toolbar.append(presetField, actions);
  header.append(brandline, toolbar);
  const errorBox = el('div', 'mm-status mm-error');
  errorBox.setAttribute('role', 'alert');
  errorBox.hidden = true;
  const tabs = el('nav', 'mm-categorybar');
  tabs.setAttribute('aria-label', '按条目名称分类');
  const categoryRow = el('div', 'mm-category-row');
  const sessionActions = el('div', 'mm-session-actions');
  sessionActions.setAttribute('aria-label', '未保存修改操作');
  const saveChangesButton = button('保存修改', 'save', () => {
    cancelDrag(); void run(() => controller.saveChanges());
  }, 'mm-icon mm-save');
  const refreshButton = button('重新读取实际状态', 'refresh', requestReload);
  sessionActions.append(saveChangesButton, refreshButton);
  const addButton = writeControl(button('新增条目', 'plus', () => void run(() => controller.addPrompt()), 'mm-secondary'));
  const separator = () => {
    const line = el('span', 'mm-separator');
    line.setAttribute('aria-hidden', 'true');
    return line;
  };
  categoryRow.append(addButton, separator(), tabs, separator(), sessionActions);
  const scroll = el('div', 'mm-scroll');
  const attachedList = el('div', 'mm-list');
  attachedList.setAttribute('aria-label', '发送顺序');
  const unlockedHead = el('div', 'mm-unlocked-head');
  unlockedHead.append(
    el('h3', '', '已解锁条目'),
    el('p', 'mm-hint', '已退出当前发送顺序，可重新挂接；删除仍遵循原生规则。'),
  );
  const detachedList = el('div', 'mm-list');
  const parametersButton = writeControl(button('预设参数设置', 'settings', () => {
    cancelDrag(); editorReturnFocus = doc.activeElement as HTMLElement | null; controller.editParameters();
  }, 'mm-parameter-entry'));
  scroll.append(parametersButton, attachedList, unlockedHead, detachedList);
  const footer = el('footer', 'mm-footer');
  const footerHint = el('span', 'mm-hint', '本地管理 · 内容不会上传');
  footerHint.setAttribute('role', 'status');
  footerHint.setAttribute('aria-live', 'polite');
  footerHint.setAttribute('aria-atomic', 'true');
  footer.append(footerHint, closeButton);
  const editorLayer = el('div', 'mm-modal-layer');
  editorLayer.tabIndex = -1;
  editorLayer.hidden = true;
  const confirmLayer = el('div', 'mm-modal-layer mm-confirm-layer');
  confirmLayer.hidden = true;
  frame.append(header, errorBox, categoryRow, scroll, footer);
  panel.append(editorLayer, confirmLayer);
  const parameterPresentation = createParameterPresentation(host, editorLayer, parametersButton);
  let parameterMotionEpoch = 0;
  cleanup.push(() => parameterPresentation.dispose());
  doc.documentElement.append(panel);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file || disposed || controller.state.busy || fileBusy) return;
    const expected = controller.state.snapshot;
    fileBusy = true;
    render();
    void file
      .text()
      .then(async text => {
        if (disposed) return;
        if (
          controller.state.snapshot?.revision !== expected?.revision ||
          controller.state.snapshot?.name !== expected?.name
        )
          throw new Error('读取文件期间当前预设已变化，请重新导入。');
        fileBusy = false;
        await run(() => controller.importText(file.name.replace(/\.json$/i, ''), text));
      })
      .catch(showLocalError)
      .finally(() => {
        fileBusy = false;
        if (!disposed) render();
      });
  });

  function assertDialogContext(name: string | undefined, revision: string | undefined) {
    const current = controller.state.snapshot;
    if (current?.name !== name || current?.revision !== revision)
      throw new Error('当前预设已变化，已取消这次操作。请重新打开确认窗口。');
  }
  function dialog(
    title: string,
    body: HTMLElement,
    submitLabel: string,
    submit: () => Promise<void>,
    dangerous = false,
    cancelLabel = '取消',
  ) {
    menu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    confirmClose?.();
    const previous = doc.activeElement as HTMLElement | null;
    const expected = controller.state.snapshot;
    const expectedLocal = controller.revision();
    const box = el('section', 'mm-dialog');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', title);
    const heading = el('div', 'mm-dialog-head');
    heading.append(el('h3', '', title));
    const bodyWrap = el('div', 'mm-dialog-body');
    bodyWrap.append(body);
    const dialogError = el('div', 'mm-inline-error');
    dialogError.setAttribute('role', 'alert');
    bodyWrap.append(dialogError);
    const row = el('div', 'mm-dialog-actions');
    const dismiss = () => {
      confirmLayer.replaceChildren();
      confirmLayer.hidden = true;
      confirmClose = null;
      previous?.isConnected && previous.focus();
    };
    let submitting = false;
    const cancel = button(cancelLabel, undefined, dismiss, 'mm-secondary');
    const accept = writeControl(
      button(
        submitLabel,
        undefined,
        () => {
          if (submitting) return;
          try {
            assertDialogContext(expected?.name, expected?.revision);
            if (controller.revision() !== expectedLocal) throw new Error('未保存内容已变化，请重新确认。');
          } catch (error) {
            dismiss();
            showLocalError(error);
            return;
          }
          submitting = true;
          accept.dataset.permitted = 'false';
          accept.disabled = true;
          cancel.disabled = true;
          void run(async () => {
            await submit();
          }).then(() => {
            if (disposed) return;
            if (!controller.state.error && !localError) dismiss();
            else {
              dialogError.textContent = controller.state.error || localError;
              submitting = false;
              accept.dataset.permitted = 'true';
              accept.disabled = false;
              cancel.disabled = false;
            }
          });
        },
        dangerous ? 'mm-danger' : 'mm-primary',
      ),
    );
    row.append(cancel, accept);
    box.append(heading, bodyWrap, row);
    confirmLayer.replaceChildren(box);
    confirmLayer.hidden = false;
    confirmClose = () => {
      if (!controller.state.busy) dismiss();
    };
    (body.querySelector<HTMLElement>('input') ?? cancel).focus();
  }
  function confirmDialog(title: string, text: string, submit: () => Promise<void>) {
    dialog(title, el('p', 'mm-confirm-copy', text), '删除', submit, true);
  }
  function nameDialog(title: string, initial: string, submit: (value: string) => Promise<void>) {
    const label = el('label', 'mm-field');
    const input = writeControl(el('input'));
    input.type = 'text';
    input.value = initial;
    input.maxLength = 200;
    label.append(el('span', '', '预设名称'), input);
    if (title === '新建预设')
      label.append(el('p', 'mm-hint', '沿用当前生成、连接设置和内建条目，清除自定义提示词。当前预设保持不变。'));
    dialog(title, label, '保存', async () => {
      const value = input.value.trim();
      if (!value) throw new Error('请输入预设名称。');
      await submit(value);
    });
    input.select();
  }
  function field(label: string, input: HTMLElement) {
    const wrapper = el('label', 'mm-field');
    wrapper.append(el('span', '', label), input);
    return wrapper;
  }
  function option(select: HTMLSelectElement, value: string, label: string) {
    const item = el('option', '', label);
    item.value = value;
    select.append(item);
  }
  function renderParametersEditor() {
    const state = controller.state, draft = state.parametersDraft;
    if (!draft || !state.snapshot) return;
    const key = `${state.snapshot.name}\0preset-parameters`;
    if (editorKey === key && editorLayer.dataset.parameterMotion !== 'closing') return;
    const motionEpoch = ++parameterMotionEpoch;
    parameterPresentation.cancel();
    editorKey = key;
    const base = state.pendingRaw ?? state.snapshot.raw;
    const raw = { ...base, ...missingParameterDefaults(base), ...draft.patch };
    const box = el('section', 'mm-dialog mm-editor-dialog mm-parameters-dialog');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '预设参数设置');
    const head = el('div', 'mm-dialog-head');
    head.append(createIcon(doc, 'settings'), el('h3', '', '预设参数设置'));
    const form = el('form', 'mm-dialog-body');
    const intro = el('div', 'mm-parameters-intro');
    intro.append(el('p', 'mm-parameters-preset', state.snapshot.name), el('p', 'mm-hint', '先在此保存修改，再点击列表上方的保存图标同步酒馆。'));
    form.append(intro);
    const section = (title: string) => {
      const group = el('section', 'mm-parameters-section');
      group.append(el('h4', 'mm-parameters-section-title', title)); form.append(group); return group;
    };
    const lengthGroup = section('生成长度'), samplingGroup = section('采样设置');
    for (const spec of NUMERIC_PARAMETERS) {
      const input = writeControl(el('input'));
      input.type = 'number'; input.min = String(spec.min); input.max = String(spec.max); input.step = String(spec.step);
      input.setAttribute('aria-label', spec.label);
      input.value = typeof raw[spec.key] === 'number' ? String(raw[spec.key]) : '';
      input.placeholder = raw[spec.key] === undefined ? '原生默认' : '保留原值';
      const wrap = el('div', 'mm-parameter-field');
      wrap.append(el('span', 'mm-parameter-label', spec.label), input);
      let range: HTMLInputElement | undefined;
      const paintRange = () => {
        if (!range) return;
        const progress = 100 * (Number(range.value) - spec.min) / (spec.max - spec.min);
        range.style.setProperty('--mm-range-progress', `${Math.max(0, Math.min(100, progress))}%`);
      };
      // Length fields stay exact numbers; native model/unlock limits remain authoritative.
      if (spec.step !== 1) {
        wrap.classList.add('mm-parameter-sampling');
        range = writeControl(el('input')); range.type = 'range'; range.min = input.min; range.max = input.max; range.step = input.step;
        range.value = input.value || String(spec.min); range.setAttribute('aria-label', `${spec.label}滑块`); paintRange();
        range.addEventListener('input', () => {
          input.value = range!.value; paintRange(); controller.draftParameters({ [spec.key]: Number(input.value) });
        });
        wrap.append(range);
      }
      input.addEventListener('input', () => {
        controller.draftParameters({ [spec.key]: input.value === '' ? null : Number(input.value) });
        if (range && input.value !== '' && input.validity.valid) { range.value = input.value; paintRange(); }
      });
      (spec.step === 1 ? lengthGroup : samplingGroup).append(wrap);
    }
    lengthGroup.append(el('p', 'mm-hint', '实际可用上下文长度取决于当前模型及酒馆的上下文解锁设置。'));
    const outputGroup = section('输出与推理');
    for (const [name, label, hint] of [
      ['stream_openai', '流式传输', '生成时逐字显示；关闭后一次性显示。'],
      ['show_thoughts', '请求思维链', '只控制返回的思维链是否可见。'],
    ] as const) {
      const wrap = el('label', 'mm-parameter-switch'), copy = el('span', 'mm-parameter-switch-copy');
      copy.append(el('span', 'mm-parameter-label', label), el('span', 'mm-hint', hint));
      const input = writeControl(el('input')); input.type = 'checkbox'; input.setAttribute('role', 'switch'); input.setAttribute('aria-label', label);
      input.checked = raw[name] === true; input.indeterminate = typeof raw[name] !== 'boolean';
      input.addEventListener('change', () => { input.indeterminate = false; controller.draftParameters({ [name]: input.checked }); });
      const track = el('span', 'mm-parameter-switch-track'); track.setAttribute('aria-hidden', 'true');
      wrap.append(copy, input, track); outputGroup.append(wrap);
    }
    // A local select-only combobox: no platform picker, no native-select overlay.
    const pickerField = el('div', 'mm-parameter-picker-field');
    const picker = writeControl(button('推理强度', undefined, undefined, 'mm-parameter-picker'));
    picker.setAttribute('role', 'combobox'); picker.setAttribute('aria-haspopup', 'listbox'); picker.setAttribute('aria-expanded', 'false');
    const pickerValue = el('span', 'mm-parameter-picker-value'), arrow = createIcon(doc, 'chevron');
    picker.replaceChildren(pickerValue, arrow);
    const choices = el('div', 'mm-parameter-picker-menu'); choices.hidden = true;
    choices.id = `mm-reasoning-${crypto.randomUUID()}`; choices.setAttribute('role', 'listbox'); choices.setAttribute('aria-label', '推理强度选项');
    picker.setAttribute('aria-controls', choices.id);
    const values: Array<readonly [string, string]> = [...REASONING_EFFORTS];
    let selected = String(raw.reasoning_effort ?? '');
    if (!values.some(([id]) => id === selected)) values.push([selected, `保留原值：${selected}`]);
    const options: HTMLButtonElement[] = [];
    const closePicker = (focus = false) => { choices.hidden = true; picker.setAttribute('aria-expanded', 'false'); if (focus) picker.focus({ preventScroll: true }); };
    const showValue = () => {
      pickerValue.textContent = values.find(([id]) => id === selected)?.[1] ?? selected;
      picker.dataset.value = selected;
      options.forEach((node, index) => node.setAttribute('aria-selected', String(values[index][0] === selected)));
    };
    const openPicker = (keyboard = false) => {
      if (picker.disabled) return;
      choices.hidden = false; picker.setAttribute('aria-expanded', 'true');
      const current = Math.max(0, values.findIndex(([id]) => id === selected && REASONING_EFFORTS.some(([known]) => known === id)));
      if (keyboard) options[current]?.focus({ preventScroll: true });
      choices.scrollIntoView({ block: 'nearest' });
    };
    values.forEach(([id, label]) => {
      const known = REASONING_EFFORTS.some(([value]) => value === id);
      const item = writeControl(button(label, undefined, () => {
        selected = id; showValue(); controller.draftParameters({ reasoning_effort: id }); closePicker(true);
      }, 'mm-parameter-option'), known);
      item.setAttribute('role', 'option'); item.tabIndex = -1;
      item.append(createIcon(doc, 'check')); choices.append(item); options.push(item);
    });
    picker.addEventListener('click', () => choices.hidden ? openPicker() : closePicker());
    pickerField.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !choices.hidden) { event.preventDefault(); event.stopPropagation(); closePicker(true); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (choices.hidden) { openPicker(true); return; }
      const enabled = options.filter(item => !item.disabled), index = enabled.indexOf(doc.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 :
        (Math.max(0, index) + (event.key === 'ArrowDown' ? 1 : enabled.length - 1)) % enabled.length;
      enabled[next]?.focus();
    });
    pickerField.addEventListener('focusout', event => { if (!pickerField.contains(event.relatedTarget as Node | null)) closePicker(); });
    box.addEventListener('pointerdown', event => { if (!pickerField.contains(event.target as Node)) closePicker(); });
    showValue(); pickerField.append(el('span', 'mm-parameter-label', '推理强度'), picker, choices); outputGroup.append(pickerField);
    form.append(el('p', 'mm-hint', '实际支持情况沿用酒馆和模型规则，未显示的参数保持不变。'));
    const error = el('div', 'mm-inline-error'); error.dataset.editorError = 'true'; error.setAttribute('role', 'alert'); form.append(error);
    const actions = el('div', 'mm-dialog-actions');
    actions.append(button('取消', undefined, () => controller.cancelParameters(), 'mm-secondary'),
      writeControl(button('保存', undefined, () => { if (form.reportValidity()) void run(() => controller.saveParameters()); }, 'mm-primary')));
    form.addEventListener('submit', event => event.preventDefault());
    box.append(head, form, actions); editorLayer.replaceChildren(box); editorLayer.hidden = false;
    form.scrollTop = 0;
    void parameterPresentation.run(box, true).then(() => {
      if (!disposed && motionEpoch === parameterMotionEpoch && !panel.hidden && controller.state.parametersDraft && box.isConnected)
        form.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    });
  }
  function renderEditor() {
    const state = controller.state;
    if (state.parametersDraft) { renderParametersEditor(); return; }
    const draft = state.draft;
    const key = draft ? `${state.snapshot?.name}\0${draft.id}` : '';
    if (!draft) {
      const parametersBox = editorLayer.querySelector<HTMLElement>('.mm-parameters-dialog');
      if (parametersBox && editorKey) {
        if (editorLayer.dataset.parameterMotion === 'closing') return;
        const motionEpoch = ++parameterMotionEpoch;
        void parameterPresentation.run(parametersBox, false).then(() => {
          if (disposed || motionEpoch !== parameterMotionEpoch || controller.state.parametersDraft || controller.state.draft) return;
          editorLayer.replaceChildren(); editorLayer.hidden = true; editorKey = '';
          if (!panel.hidden && editorReturnFocus?.isConnected) editorReturnFocus.focus({ preventScroll: true });
        });
        return;
      }
      if (editorKey) {
        editorLayer.replaceChildren();
        editorLayer.hidden = true;
        editorReturnFocus?.isConnected && editorReturnFocus.focus();
      }
      editorKey = '';
      return;
    }
    if (key === editorKey) return;
    ++parameterMotionEpoch; parameterPresentation.cancel();
    const prompt = (state.pendingRaw ?? state.snapshot?.raw)?.prompts.find(item => item.identifier === draft.id);
    if (!prompt) return;
    editorKey = key;
    const value = { ...prompt, ...draft.patch };
    const box = el('section', 'mm-dialog mm-editor-dialog');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '编辑条目');
    const head = el('div', 'mm-dialog-head');
    head.append(
      el('h3', '', '编辑条目'),
      button('取消编辑', 'close', () => {
        if (!controller.state.busy) controller.cancelEdit();
      }),
    );
    const form = el('form');
    form.className = 'mm-dialog-body';
    const title = writeControl(el('input'));
    title.type = 'text';
    title.value = value.name ?? '';
    title.addEventListener('input', () => controller.draft({ name: title.value }));
    const role = writeControl(el('select'));
    role.setAttribute('aria-label', '身份');
    const roles = [
      ['system', '系统'],
      ['user', '用户'],
      ['assistant', 'AI 助手'],
    ];
    for (const [id, name] of roles) option(role, id, name);
    if (value.role === undefined || !roles.some(([id]) => id === value.role))
      option(role, value.role ?? '', value.role === undefined ? '未设置（保留原值）' : `保留原值：${value.role}`);
    role.value = value.role ?? '';
    role.addEventListener('change', () => controller.draft({ role: role.value }));
    const content = writeControl(el('textarea'), !prompt.marker);
    content.value = value.content ?? '';
    content.spellcheck = false;
    content.addEventListener('input', () => controller.draft({ content: content.value }));
    form.append(
      el('p', 'mm-hint', '此处保存只更新未保存修改；点击分类右侧的保存图标后才同步酒馆。'),
      field('标题', title),
      field('身份', role),
      field(prompt.marker ? '内容（由 SillyTavern 动态生成）' : '内容', content),
    );
    const details = el('details');
    details.append(el('summary', '', '高级设置'));
    const advanced = el('div', 'mm-advanced');
    const position = writeControl(el('select'));
    option(position, '0', '相对位置（Relative）');
    option(position, '1', '聊天中（In-Chat）');
    if (value.injection_position === undefined || ![0, 1].includes(value.injection_position))
      option(position, String(value.injection_position ?? ''), '保留原值');
    position.value = String(value.injection_position ?? '');
    position.addEventListener('change', () => {
      if (position.value !== '') controller.draft({ injection_position: Number(position.value) });
    });
    const numericRow = el('div', 'mm-field-row');
    for (const [keyName, label] of [
      ['injection_depth', '深度（Depth）'],
      ['injection_order', '顺序（Order）'],
    ] as const) {
      const input = writeControl(el('input'));
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.placeholder = '保留默认';
      input.value = value[keyName] === undefined ? '' : String(value[keyName]);
      input.addEventListener('input', () => {
        input.setCustomValidity('');
        if (input.value === '' && controller.state.draft?.patch[keyName] !== undefined) {
          input.setCustomValidity('请填写整数；要放弃本次修改，请取消编辑。');
        } else if (input.value !== '' && input.validity.valid && Number.isSafeInteger(Number(input.value))) {
          controller.draft({ [keyName]: Number(input.value) });
        }
      });
      numericRow.append(field(label, input));
    }
    const triggers = el('div', 'mm-checks');
    const known = new Set<string>(TRIGGERS.map(([id]) => id));
    const selected = new Set(value.injection_trigger ?? []);
    const triggerValues: Array<readonly [string, string]> = [
      ...TRIGGERS,
      ...[...selected].filter(id => !known.has(id)).map(id => [id, `保留触发值：${id}`] as const),
    ];
    for (const [id, label] of triggerValues) {
      const wrap = el('label', 'mm-check');
      const input = writeControl(el('input'), known.has(id));
      input.type = 'checkbox';
      input.checked = selected.has(id);
      input.addEventListener('change', () => {
        if (input.checked) selected.add(id);
        else selected.delete(id);
        controller.draft({ injection_trigger: [...selected] });
      });
      wrap.append(input, doc.createTextNode(label));
      triggers.append(wrap);
    }
    const triggerGroup = el('div', 'mm-field');
    triggerGroup.append(el('span', '', '触发条件（空选表示全部）'), triggers);
    advanced.append(field('插入位置（Position）', position), numericRow, triggerGroup);
    if (['main', 'jailbreak'].includes(prompt.identifier)) {
      const wrap = el('label', 'mm-check');
      const check = writeControl(el('input'));
      check.type = 'checkbox';
      check.checked = !!value.forbid_overrides;
      check.addEventListener('change', () => controller.draft({ forbid_overrides: check.checked }));
      wrap.append(check, doc.createTextNode('禁止角色卡覆盖'));
      advanced.append(wrap);
    }
    advanced.append(el('p', 'mm-hint', '未显示的原生字段会完整保留。'));
    details.append(advanced);
    form.append(details);
    const error = el('div', 'mm-inline-error');
    error.dataset.editorError = 'true';
    error.setAttribute('role', 'alert');
    form.append(error);
    const row = el('div', 'mm-dialog-actions');
    row.append(
      button(
        '取消',
        undefined,
        () => {
          if (!controller.state.busy) controller.cancelEdit();
        },
        'mm-secondary',
      ),
      writeControl(
        button(
          '保存',
          undefined,
          () => {
            if (!form.reportValidity()) return;
            void run(() => controller.saveEdit());
          },
          'mm-primary',
        ),
      ),
    );
    form.addEventListener('submit', event => event.preventDefault());
    box.append(head, form, row);
    editorLayer.replaceChildren(box);
    editorLayer.hidden = false;
    title.focus();
  }
  function card(row: Row): HTMLElement {
    const prompt = row.prompt;
    const node = el('article', 'mm-card');
    node.dataset.id = prompt.identifier;
    node.dataset.attached = String(row.attached);
    node.tabIndex = 0;
    node.setAttribute(
      'aria-label',
      `${prompt.name ?? prompt.identifier}${row.attached ? '，Alt 加上下键排序' : '，已解锁'}`,
    );
    const text = el('div', 'mm-card-text');
    const title = el('div', 'mm-card-title', prompt.name || prompt.identifier);
    title.title = prompt.name || prompt.identifier;
    const kind = prompt.marker
      ? '动态 Marker'
      : prompt.system_prompt !== false
        ? '内建条目'
        : ({ system: '系统', user: '用户', assistant: 'AI 助手' }[prompt.role ?? ''] ?? '自定义身份');
    text.append(title, el('div', 'mm-card-meta', kind));
    const controls = el('div', 'mm-card-actions');
    controls.append(
      writeControl(
        button('编辑条目', 'edit', () => {
          editorReturnFocus = doc.activeElement as HTMLElement;
          controller.edit(prompt.identifier);
        }),
        row.editable,
      ),
    );
    const copy = writeControl(
      button('复制条目', 'copy', () => void run(() => controller.copyPrompt(prompt.identifier))),
      row.removable,
    );
    if (copy.dataset.permitted === 'false') copy.title = '内建与 Marker 条目不支持直接复制';
    controls.append(copy);
    if (row.attached) {
      const unlock = writeControl(
        button('解锁并移出当前发送顺序', 'unlock', () => void run(() => controller.detach(prompt.identifier))),
        row.canDetach,
      );
      controls.append(unlock);
    } else {
      controls.append(
        writeControl(button('重新挂接到发送顺序', 'link', () => void run(() => controller.attach(prompt.identifier)))),
        writeControl(
          button('删除条目', 'trash', () =>
            confirmDialog(
              '删除条目',
              `确定删除「${prompt.name || prompt.identifier}」吗？\n此操作会从当前预设删除该条目及其排序引用。`,
              () => controller.deletePrompt(prompt.identifier),
            ),
          ),
          row.removable,
        ),
      );
    }
    const toggle = writeControl(el('button', 'mm-toggle'), row.attached && row.toggleable);
    toggle.type = 'button';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', String(row.enabled));
    toggle.setAttribute('aria-label', `${prompt.name || prompt.identifier}：${row.enabled ? '关闭' : '开启'}`);
    toggle.title = !row.toggleable ? '该 Marker 的开关由酒馆管理' : row.attached ? '切换激活状态' : '重新挂接后可激活';
    toggle.addEventListener('click', () => void run(() => controller.toggle(prompt.identifier)));
    controls.append(toggle);
    node.append(text, controls);
    return node;
  }
  function renderStatus() {
    errorBox.textContent = localError || controller.state.error;
    errorBox.hidden = !errorBox.textContent;
    const editorError = editorLayer.querySelector<HTMLElement>('[data-editor-error]');
    if (editorError) editorError.textContent = localError || controller.state.error;
  }
  function updateSessionControls() {
    const state = controller.state;
    saveChangesButton.disabled = state.busy || fileBusy || !state.dirty || state.conflict;
    closeButton.disabled = state.busy || fileBusy;
    refreshButton.disabled = state.busy || fileBusy;
    for (const node of panel.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('[data-clean]'))
      node.disabled = state.busy || fileBusy || !state.snapshot || state.dirty || state.conflict || Boolean(controller.binding && controller.binding.state.status !== 'ready');
    sessionActions.dataset.dirty = String(state.dirty);
    refreshButton.title = state.dirty ? '放弃未保存修改并重新读取酒馆实际状态' : '重新读取实际状态';
    const binding = controller.binding?.state;
    updateBindingControls();
    const bindingHint = binding?.status === 'paused-dirty' ? '预设有未保存修改；处理后将应用当前对话预设。'
      : binding?.error || (binding?.status === 'reconciling' ? '正在协调当前对话预设 · 确认前暂停生成'
      : binding?.mode === 'missing' ? '当前对话绑定的预设已不存在，正在使用默认预设。' : '');
    const footerMessage = fileBusy ? '正在读取导入文件…'
      : state.busy ? '正在处理并核对酒馆状态…'
      : bindingHint ? bindingHint
      : state.dirty ? '有未保存修改 · 尚未同步酒馆'
      : (!localError && !state.error && state.notice) || (state.category === '全部' ? '本地管理 · 内容不会上传' : '分类排序只调整可见条目，其他条目位置保留');
    if (footerHint.textContent !== footerMessage) footerHint.textContent = footerMessage;
    footerHint.title = footerMessage;
  }
  function updateBindingControls() {
    const binding = controller.binding?.state;
    if (!binding) return;
    const labels = { 'no-chat': '无对话', inherit: '跟随默认', override: '此对话', missing: '此对话 · 绑定缺失' };
    presetLabel.textContent = `当前使用预设 · ${labels[binding.mode]}`;
    const applied = binding.appliedName;
    presetSelect.value = applied ?? ''; presetSelect.title = applied ?? '正在确认酒馆实际状态';
    const isDefault = Boolean(applied && applied === binding.defaultName);
    defaultButton.setAttribute('aria-pressed', String(isDefault));
    defaultButton.title = isDefault ? '当前为默认预设' : '将当前预设设为默认';
    defaultButton.setAttribute('aria-label', defaultButton.title);
    defaultButton.disabled = !applied || binding.status !== 'ready' || controller.state.busy || controller.state.dirty || fileBusy;
  }
  let lastRender: { snapshot: unknown; pending: unknown; draft: unknown; parameters: unknown; revision: number; category: string; busy: boolean; file: boolean } | null = null;
  function render() {
    if (disposed) return;
    const state = controller.state;
    const key = { snapshot: state.snapshot, pending: state.pendingRaw, draft: state.draft, parameters: state.parametersDraft, revision: state.localRevision, category: state.category, busy: state.busy, file: fileBusy };
    if (lastRender && Object.keys(key).every(k => key[k as keyof typeof key] === lastRender![k as keyof typeof key])) {
      updateSessionControls(); renderStatus(); return;
    }
    lastRender = key;
    if (drag && (drag.revision !== controller.revision() || drag.category !== state.category || state.busy))
      cancelDrag();
    const namesKey = JSON.stringify([state.snapshot?.name, state.snapshot?.names]);
    if (presetSelect.dataset.names !== namesKey) {
      presetSelect.replaceChildren();
      for (const name of state.snapshot?.names ?? []) option(presetSelect, name, name);
      if (controller.binding) option(presetSelect, '', '正在确认实际预设…');
      if (!state.snapshot) option(presetSelect, '', '尚未读取预设');
      presetSelect.value = state.snapshot?.name ?? '';
      presetSelect.title = state.snapshot?.name ?? '';
      presetSelect.dataset.names = namesKey;
    }
    // A native select briefly changes before its asynchronous operation; reset it to the confirmed state.
    presetSelect.value = state.snapshot?.name ?? '';
    const categories = [...new Set(['全部', ...controller.categories()])];
    const tabsKey = JSON.stringify([state.category, categories]);
    if (tabs.dataset.key !== tabsKey) {
      tabs.replaceChildren();
      for (const name of categories) {
        const tab = el('button', 'mm-tab', name);
        tab.type = 'button';
        tab.setAttribute('aria-pressed', String(name === state.category));
        tab.addEventListener('click', () => {
          cancelDrag();
          controller.category(name);
        });
        tabs.append(tab);
      }
      tabs.dataset.key = tabsKey;
    }
    const rows = controller.rows();
    if (cardPreset !== state.snapshot?.name) { cardCache.clear(); cardPreset = state.snapshot?.name; }
    const existingIds = new Set((state.pendingRaw ?? state.snapshot?.raw)?.prompts.map(prompt => prompt.identifier) ?? []);
    for (const id of cardCache.keys()) if (!existingIds.has(id)) cardCache.delete(id);
    const previousFocus = doc.activeElement as HTMLElement | null;
    const focusedCard = previousFocus?.closest<HTMLElement>('.mm-card');
    const nodes = (items: Row[]) => items.map(item => {
      // Only displayed properties; never serialize full Prompt bodies for UI keys.
      const key = JSON.stringify([item.prompt.name, item.prompt.role, item.prompt.marker, item.prompt.system_prompt,
        item.enabled, item.attached, item.editable, item.removable, item.canDetach, item.toggleable]);
      let cached = cardCache.get(item.prompt.identifier);
      if (!cached || cached.key !== key) {
        cached = { key, node: card(item) }; cardCache.set(item.prompt.identifier, cached);
      }
      return cached.node;
    });
    mountCards(attachedList, nodes(rows.filter(row => row.attached)), Boolean(drag?.active));
    mountCards(detachedList, nodes(rows.filter(row => !row.attached)));
    unlockedHead.hidden = !detachedList.childElementCount;
    if (!attachedList.childElementCount)
      attachedList.append(el('p', 'mm-empty', state.snapshot ? '这个分类中没有已挂接条目' : '读取预设后，提示词条目会显示在这里'));
    if (previousFocus?.isConnected && doc.activeElement !== previousFocus) previousFocus.focus({ preventScroll: true });
    else if (focusedCard && previousFocus === focusedCard) cardCache.get(focusedCard.dataset.id!)?.node.focus({ preventScroll: true });
    renderEditor();
    renderStatus();
    for (const node of panel.querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('[data-write]'))
      node.disabled = state.busy || fileBusy || !state.snapshot || node.dataset.permitted === 'false' || (node.dataset.clean === 'true' && (state.dirty || state.conflict));
    updateSessionControls();
    frame.setAttribute('aria-busy', String(state.busy || fileBusy));
  }

  function mountCards(list: HTMLElement, nodes: HTMLElement[], preserveOrder = false) {
    const wanted = new Set(nodes);
    for (const node of [...list.children]) if (!wanted.has(node as HTMLElement)) node.remove();
    nodes.forEach((node, index) => {
      if (preserveOrder) { if (node.parentNode !== list) list.append(node); }
      else if (list.children[index] !== node) list.insertBefore(node, list.children[index] ?? null);
    });
  }
  function syncRowOrder(rows = controller.rows()) {
    const focused = doc.activeElement as HTMLElement | null;
    const cards = new Map([...attachedList.querySelectorAll<HTMLElement>('.mm-card')].map(node => [node.dataset.id!, node]));
    rows.filter(row => row.attached).forEach((row, index) => {
      const node = cards.get(row.prompt.identifier);
      if (node && attachedList.children[index] !== node) attachedList.insertBefore(node, attachedList.children[index] ?? null);
    });
    if (focused && attachedList.contains(focused) && doc.activeElement !== focused) focused.focus({ preventScroll: true });
  }
  function clearDragSelection() {
    const selection = host.getSelection();
    if (selection && (panel.contains(selection.anchorNode) || panel.contains(selection.focusNode))) selection.removeAllRanges();
  }
  type Drag = {
    id: string;
    revision: string;
    category: string;
    presetName: string;
    source: HTMLElement;
    startX: number;
    startY: number;
    x: number;
    y: number;
    active: boolean;
    timer: number | null;
    before: string | null;
    ghost: HTMLElement | null;
    touchId: number | null;
    pointerId: number | null;
    raf: number | null;
    paintedX?: number;
    paintedY?: number;
    scrolling?: boolean;
  };
  let drag: Drag | null = null;
  function cancelDrag(restore = true) {
    if (!drag) return;
    if (drag.timer !== null) host.clearTimeout(drag.timer);
    if (drag.raf !== null) host.cancelAnimationFrame(drag.raf);
    drag.source.classList.remove('mm-drag-source');
    drag.ghost?.remove();
    drag = null;
    panel.classList.remove('mm-drag-active');
    attachedList.classList.remove('mm-drop-end');
    for (const node of attachedList.querySelectorAll('.mm-drop-before')) node.classList.remove('mm-drop-before');
    if (restore) syncRowOrder();
  }
  function beginDrag(
    target: EventTarget | null,
    x: number,
    y: number,
    touchId: number | null,
    pointerId: number | null,
  ) {
    if (controller.state.busy || fileBusy || controller.state.draft || !controller.state.snapshot) return;
    const element = target as Element | null;
    if (!element?.closest || element.closest(INTERACTIVE)) return;
    const source = element.closest<HTMLElement>('.mm-card[data-attached=true]');
    if (!source || !attachedList.contains(source)) return;
    cancelDrag();
    drag = {
      id: source.dataset.id!,
      revision: controller.revision(),
      category: controller.state.category,
      presetName: controller.state.snapshot.name,
      source,
      startX: x,
      startY: y,
      x,
      y,
      active: false,
      timer: null,
      before: null,
      ghost: null,
      touchId,
      pointerId,
      raf: null,
    };
    if (touchId !== null) drag.timer = host.setTimeout(activateDrag, 350);
  }
  function activateDrag() {
    if (!drag || disposed) return;
    const current = drag;
    if (
      current.revision !== controller.revision() ||
      current.category !== controller.state.category ||
      controller.state.busy
    ) {
      cancelDrag();
      return;
    }
    const rect = current.source.getBoundingClientRect();
    current.active = true;
    current.source.classList.add('mm-drag-source');
    panel.classList.add('mm-drag-active');
    clearDragSelection();
    const ghost = current.source.cloneNode(true) as HTMLElement;
    ghost.classList.remove('mm-drag-source');
    ghost.classList.add('mm-drag-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.tabIndex = -1;
    for (const control of ghost.querySelectorAll<HTMLButtonElement>('button')) control.disabled = true;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    current.ghost = ghost;
    panel.append(ghost);
    updateDrag(current.x, current.y);
    const tick = () => {
      if (drag !== current || !current.active) return;
      paintDrag(current);
      current.raf = host.requestAnimationFrame(tick);
    };
    current.raf = host.requestAnimationFrame(tick);
  }
  function updateDrag(x: number, y: number) {
    if (!drag) return;
    drag.x = x;
    drag.y = y;
    if (!drag.active) {
      const distance = Math.hypot(x - drag.startX, y - drag.startY);
      if (drag.touchId !== null && distance > 8) cancelDrag();
      else if (drag.touchId === null && distance > 4) activateDrag();
    }
    // Layout and writes are batched by the single animation frame loop.
  }
  function paintDrag(current: Drag) {
    if (current.paintedX === current.x && current.paintedY === current.y && !current.scrolling) return;
    current.paintedX = current.x; current.paintedY = current.y;
    // Read all geometry before any DOM/style writes in this frame.
    const bounds = scroll.getBoundingClientRect();
    const boxes = [...attachedList.querySelectorAll<HTMLElement>('.mm-card')]
      .filter(node => node !== current.source).map(node => ({ node, box: node.getBoundingClientRect() }));
    const before = boxes.find(({ box }) => current.y < box.top + box.height / 2)?.node;
    const speed = current.y < bounds.top + 56 ? -Math.min(15, (bounds.top + 56 - current.y) / 3)
      : current.y > bounds.bottom - 56 ? Math.min(15, (current.y - bounds.bottom + 56) / 3) : 0;
    if (current.ghost) current.ghost.style.transform = `translate(${current.x - current.startX}px,${current.y - current.startY}px) rotate(-1deg)`;
    if (current.source.nextElementSibling !== (before ?? null)) attachedList.insertBefore(current.source, before ?? null);
    const previous = attachedList.querySelector('.mm-drop-before');
    if (previous !== before) { previous?.classList.remove('mm-drop-before'); before?.classList.add('mm-drop-before'); }
    attachedList.classList.toggle('mm-drop-end', !before);
    current.before = before?.dataset.id ?? null;
    current.scrolling = Boolean(speed);
    if (speed) scroll.scrollTop += speed;
  }
  function finishDrag() {
    const current = drag;
    if (!current?.active || current.revision !== controller.revision() ||
      current.category !== controller.state.category || controller.state.busy) {
      cancelDrag();
      return;
    }
    paintDrag(current);
    cancelDrag(false);
    const rows = controller.rows().filter(row => row.attached);
    const index = rows.findIndex(row => row.prompt.identifier === current.id);
    if (index >= 0 && (rows[index + 1]?.prompt.identifier ?? null) === current.before) return;
    reorder(current.id, current.before, current.revision);
  }
  listen(panel, 'selectstart', ((event: Event) => {
    if (drag?.active) { event.preventDefault(); clearDragSelection(); }
  }) as EventListener);
  listen(attachedList, 'pointerdown', ((event: PointerEvent) => {
    if (event.pointerType !== 'touch' && event.button === 0)
      beginDrag(event.target, event.clientX, event.clientY, null, event.pointerId);
  }) as EventListener);
  listen(
    doc,
    'pointermove',
    ((event: PointerEvent) => {
      if (drag?.pointerId !== event.pointerId) return;
      updateDrag(event.clientX, event.clientY);
      if (drag?.active) event.preventDefault();
    }) as EventListener,
    { passive: false },
  );
  listen(doc, 'pointerup', ((event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) finishDrag();
  }) as EventListener);
  listen(doc, 'pointercancel', ((event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) cancelDrag();
  }) as EventListener);
  listen(
    attachedList,
    'touchstart',
    ((event: TouchEvent) => {
      if (event.touches.length !== 1) {
        cancelDrag();
        return;
      }
      const touch = event.touches[0];
      beginDrag(event.target, touch.clientX, touch.clientY, touch.identifier, null);
    }) as EventListener,
    { passive: true },
  );
  listen(
    doc,
    'touchmove',
    ((event: TouchEvent) => {
      if (drag?.touchId === null || !drag) return;
      const touch = [...event.touches].find(item => item.identifier === drag?.touchId);
      if (!touch || event.touches.length !== 1) {
        cancelDrag();
        return;
      }
      updateDrag(touch.clientX, touch.clientY);
      if (drag?.active) event.preventDefault();
    }) as EventListener,
    { passive: false },
  );
  listen(doc, 'touchend', ((event: TouchEvent) => {
    if (drag?.touchId !== null && [...event.changedTouches].some(item => item.identifier === drag?.touchId))
      finishDrag();
  }) as EventListener);
  listen(doc, 'touchcancel', (() => cancelDrag()) as EventListener);
  listen(attachedList, 'contextmenu', ((event: Event) => {
    if (drag?.touchId !== null && drag) event.preventDefault();
  }) as EventListener);
  listen(host, 'blur', (() => cancelDrag()) as EventListener);
  listen(panel, 'keydown', ((event: KeyboardEvent) => {
    if (editorLayer.dataset.parameterMotion && (event.key === 'Tab' ||
        (event.key === 'Escape' && editorLayer.dataset.parameterMotion === 'closing'))) {
      event.preventDefault(); event.stopPropagation(); return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (drag) cancelDrag();
      else if (confirmClose) confirmClose();
      else if (controller.state.parametersDraft && !controller.state.busy) controller.cancelParameters();
      else if (controller.state.draft && !controller.state.busy) controller.cancelEdit();
      else if (!menu.hidden) {
        menu.hidden = true;
        moreButton.setAttribute('aria-expanded', 'false');
        moreButton.focus();
      } else requestClose();
      return;
    }
    const target = event.target as HTMLElement;
    if (
      event.altKey &&
      ['ArrowUp', 'ArrowDown'].includes(event.key) &&
      target.matches('.mm-card[data-attached=true]')
    ) {
      event.preventDefault();
      const rows = controller.rows().filter(row => row.attached);
      const index = rows.findIndex(row => row.prompt.identifier === target.dataset.id);
      const nextIndex = event.key === 'ArrowUp' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= rows.length) return;
      const before =
        event.key === 'ArrowUp' ? rows[nextIndex].prompt.identifier : (rows[nextIndex + 1]?.prompt.identifier ?? null);
      const revision = controller.state.snapshot ? controller.revision() : null;
      if (revision) reorder(target.dataset.id!, before, revision);
      return;
    }
    if (event.key === 'Tab') {
      const surface = !confirmLayer.hidden ? confirmLayer : !editorLayer.hidden ? editorLayer : frame;
      const focusable = [
        ...surface.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]',
        ),
      ].filter(node => !node.closest('[hidden]') && node.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (doc.activeElement === first || !surface.contains(doc.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (doc.activeElement === last || !surface.contains(doc.activeElement))) {
        event.preventDefault();
        first?.focus();
      }
    }
  }) as EventListener);
  listen(doc, 'pointerdown', ((event: PointerEvent) => {
    if (!moreWrap.contains(event.target as Node)) {
      menu.hidden = true;
      moreButton.setAttribute('aria-expanded', 'false');
    }
  }) as EventListener);
  function positionMenu() {
    // Keep every operation scrollable when landscape or the keyboard reduces space.
    const available = frame.getBoundingClientRect().bottom - moreButton.getBoundingClientRect().bottom - 12;
    menu.style.maxHeight = `${Math.max(44, available)}px`;
  }
  let viewportSize = '';
  function viewport() {
    const visible = host.visualViewport;
    const width = visible?.width ?? host.innerWidth, height = visible?.height ?? host.innerHeight;
    const size = `${width}:${height}`;
    const resized = viewportSize !== size; viewportSize = size;
    if (resized) { cancelDrag(); parameterPresentation.cancel(); }
    if (panel.dataset.presentation !== 'native') {
      const css = host.getComputedStyle(panel);
      const safe = (side: string) => Math.max(10, Number.parseFloat(css.getPropertyValue(`--mm-safe-${side}`)) || 0);
      const w = Math.max(1, Math.min(600, width - safe('left') - safe('right')));
      const h = Math.max(1, Math.min(780, height - safe('top') - safe('bottom')));
      panel.style.left = `${(visible?.offsetLeft ?? 0) + safe('left') + Math.max(0, width - safe('left') - safe('right') - w) / 2}px`;
      panel.style.top = `${(visible?.offsetTop ?? 0) + safe('top') + Math.max(0, height - safe('top') - safe('bottom') - h) / 2}px`;
      panel.style.width = `${w}px`; panel.style.height = `${h}px`;
    }
    panel.dataset.compact = String(width <= 600);
    panel.dataset.short = String(height <= 500);
    if (!panel.hidden && !menu.hidden) positionMenu();
    const active = doc.activeElement as HTMLElement | null;
    if (resized && active && editorLayer.contains(active) && active.matches('input,select,textarea'))
      active.scrollIntoView({ block: 'nearest' });
  }
  function setPresentation(mode: 'local' | 'native' | 'hub') {
    parameterPresentation.cancel();
    panel.dataset.presentation = mode;
    for (const key of ['left','top','right','bottom','width','height','max-height','transform','transform-origin','will-change']) panel.style.removeProperty(key);
    // The initial native window is clamped before the orb fits its exact origin.
    if (mode === 'native') { panel.dataset.presentation = 'local'; viewport(); panel.dataset.presentation = mode; }
    else viewport();
  }
  listen(host, 'resize', viewport);
  listen(host, 'orientationchange', viewport);
  listen(panel, 'miemie:presentation-geometry', viewport);
  if (host.visualViewport) {
    listen(host.visualViewport, 'resize', viewport);
    listen(host.visualViewport, 'scroll', viewport);
  }
  function open() {
    if (disposed) return;
    characterHeader.refresh();
    if (panel.hidden) returnFocus = doc.activeElement as HTMLElement | null;
    panel.hidden = false;
    panel.inert = false;
    viewport();
    render();
    const first = !editorLayer.hidden ? editorLayer.querySelector<HTMLElement>('input') : presetSelect;
    (first ?? frame).focus();
  }
  async function reloadActual() {
    await controller.reload();
    if (controller.state.error) return;
    if (controller.binding) { await controller.binding.reconcile(); await controller.refresh(); }
  }
  function requestReload() {
    if (disposed || controller.state.busy || fileBusy) return;
    cancelDrag();
    if (controller.state.dirty) {
      dialog('重新读取实际状态', el('p', 'mm-confirm-copy', '有未保存的内容。重新读取将放弃这些修改并同步酒馆，是否继续？'), '重新读取', reloadActual, true);
    } else void run(reloadActual);
  }
  function requestClose() {
    if (disposed || controller.state.busy || fileBusy) return;
    cancelDrag();
    menu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    if (controller.state.dirty) {
      dialog('关闭预设管理', el('p', 'mm-confirm-copy', '有未保存的内容，是否关闭？选择“是”将丢弃未保存的修改。'), '是', async () => {
        controller.cancelChanges();
        if (closeHandler) await closeHandler(); else close();
      }, true, '否');
      return;
    }
    controller.cancelChanges();
    if (closeHandler) closeHandler(); else close();
  }
  function close() {
    parameterPresentation.cancel();
    cancelDrag();
    panel.hidden = true;
    panel.inert = true;
    menu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    if (panel.dataset.presentation === 'local' && returnFocus?.isConnected) returnFocus.focus();
  }
  cleanup.push(protectNativeControls(host, panel));
  const unsubscribe = controller.subscribe(render);
  viewport();
  render();
  return {
    panel,
    open,
    close,
    setCloseHandler(handler) { closeHandler = handler; },
    setPresentation,
    dispose() {
      if (disposed) return;
      disposed = true;
      closeHandler = null;
      cancelDrag();
      unsubscribe();
      for (const remove of cleanup.splice(0)) remove();
      for (const timer of timers) host.clearTimeout(timer);
      for (const url of urls) URL.revokeObjectURL(url);
      cardCache.clear();
      panel.remove();
    },
  };
}
