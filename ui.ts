// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { ManagerController, ManagerView, Row } from './contracts';
import { createIcon, type IconName } from './icons';
import { NUMERIC_PARAMETERS, REASONING_EFFORTS, missingParameterDefaults } from './preset-parameters';
import { createFloatingPicker, createPickerEscapeGuard, floatingPickerStyles } from './floating-picker';
import { managerStyles } from './styles';
import { ICON } from './product-icon';
import { PRESET_MANAGER_PRODUCT } from './product-identity';
import { mountCharacterHeader, protectNativeControls } from './official-presentation';
import { observeWindowLayer } from './window-layer';
import { createParameterPresentation } from './parameter-presentation';
import { createMigrationView } from './migration-ui';
import { createLauncherAppearance, LAUNCHER_HOLD_MS, LAUNCHER_MAX_SIZE, LAUNCHER_MIN_SIZE } from './launcher-appearance';

import { EDITOR_ROLES, EDITOR_TRIGGERS as TRIGGERS } from './prompt-editor-fields';
import type { PresetTools } from './preset-tools';
import { DEFAULT_ISOLATION_TAGS, parseCustomTags } from './tag-isolation';
import { DEFAULT_STATUS_PROMPT } from './status';
import { WORLD_REPORT_PROMPT } from './world-report';
import { createPresetDownload } from './preset-download';
import { createDialogMotion } from './dialog-motion';
const INTERACTIVE = 'button,input,select,textarea,a,summary,[role="switch"],[contenteditable="true"]';
let pickerSequence = 0;

export function createManagerView(host: Window, controller: ManagerController, tools?: PresetTools): ManagerView {
  const doc = host.document;
  const launcherAppearance = createLauncherAppearance(host);
  let disposed = false;
  let localError = '';
  let fileBusy = false;
  let editorKey = '';
  let editorPickers:Array<ReturnType<typeof createFloatingPicker>>=[];
  function disposeEditorPickers(){editorPickers.forEach(p=>p.dispose());editorPickers=[];}
  let parameterPicker: { position: () => void; close: () => void; dispose: () => void; contains: (node: Node | null) => boolean } | null = null;
  let cardPreset: string | undefined;
  const cardCache = new Map<string, { key: string; node: HTMLElement }>();
  let returnFocus: HTMLElement | null = null;
  let editorReturnFocus: HTMLElement | null = null;
  let confirmClose: (() => void) | null = null;
  const cleanup: Array<() => void> = [disposeEditorPickers];
  const urls = new Set<string>();
  const timers = new Set<number>();

  function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
    const node = doc.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function pickerId(prefix: string): string {
    let id: string;
    do { id = `mm-${prefix}-${++pickerSequence}`; } while (doc.getElementById(id));
    return id;
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
  function pickerScrollShadows(choices: HTMLElement) {
    // A separate, pointer-transparent overlay leaves menu flow/anchoring untouched.
    const layer = el('div', 'mm-picker-scroll-shadows');
    layer.setAttribute('aria-hidden', 'true'); layer.hidden = true;
    let removed = false;
    const hide = () => { layer.hidden = true; delete layer.dataset.top; delete layer.dataset.bottom; };
    const update = () => {
      if (removed) return;
      if (choices.hidden || !choices.isConnected || !choices.getClientRects().length) { hide(); return; }
      layer.style.left = `${choices.offsetLeft}px`; layer.style.top = `${choices.offsetTop}px`;
      layer.style.width = `${choices.offsetWidth}px`; layer.style.height = `${choices.offsetHeight}px`;
      layer.dataset.top = String(choices.scrollTop > 1);
      layer.dataset.bottom = String(choices.scrollHeight - choices.clientHeight - choices.scrollTop > 1);
      layer.hidden = false;
    };
    choices.addEventListener('scroll', update, { passive: true });
    const observerCtor = (host as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    const observer = observerCtor ? new observerCtor(update) : null;
    observer?.observe(choices);
    return { layer, update, hide, dispose() { removed = true; observer?.disconnect(); choices.removeEventListener('scroll', update); hide(); layer.remove(); } };
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
  style.textContent = managerStyles+floatingPickerStyles;
  const frame = el('section', 'mm-frame');
  frame.tabIndex = -1;
  panel.append(style, frame);
  const migrationView = createMigrationView(host, panel, controller);
  cleanup.push(() => migrationView.dispose());
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
  const launcherSettingsButton = button('悬浮球设置', 'settings', openLauncherSettings, 'mm-icon mm-launcher-settings-button');
  launcherSettingsButton.setAttribute('aria-haspopup', 'dialog');
  brandline.append(logo, brand, launcherSettingsButton);
  const toolbar = el('div', 'mm-toolbar');
  const presetField = el('div', 'mm-preset-field');
  const presetControl = el('div', 'mm-preset-control');
  const presetSelect = writeControl(button('当前使用预设', undefined, undefined, 'mm-parameter-picker mm-preset-picker'));
  presetSelect.setAttribute('role', 'combobox'); presetSelect.setAttribute('aria-haspopup', 'listbox');
  presetSelect.setAttribute('aria-expanded', 'false');
  const presetValue = el('span', 'mm-parameter-picker-value');
  presetSelect.replaceChildren(presetValue, createIcon(doc, 'chevron'));
  const presetChoices = el('div', 'mm-parameter-picker-menu mm-preset-options'); presetChoices.hidden = true;
  presetChoices.id = pickerId('presets'); presetChoices.setAttribute('role', 'listbox');
  presetChoices.setAttribute('aria-label', '预设选项'); presetSelect.setAttribute('aria-controls', presetChoices.id);
  const presetShadows = pickerScrollShadows(presetChoices);
  cleanup.push(() => presetShadows.dispose());
  function closePresetChoices(focus = false) {
    if (presetChoices.hidden && !focus) return;
    presetEscape.deactivate();
    presetChoices.hidden = true; presetShadows.hide(); presetSelect.setAttribute('aria-expanded', 'false');
    if (focus && !presetSelect.disabled) presetSelect.focus({ preventScroll: true });
  }
  const presetEscape = createPickerEscapeGuard(doc, presetSelect, () => !presetChoices.hidden, () => closePresetChoices(true));
  cleanup.push(() => presetEscape.deactivate());
  function showPresetValue(name: string, fallback?: string) {
    const label = name || fallback || (controller.state.snapshot ? '正在确认实际预设…' : '尚未读取预设');
    if (presetSelect.dataset.value === name && presetValue.textContent === label) return;
    presetSelect.dataset.value = name;
    presetValue.textContent = label;
    presetSelect.title = label;
    for (const node of presetChoices.querySelectorAll<HTMLButtonElement>('[role=option]'))
      node.setAttribute('aria-selected', String(node.dataset.value === name));
  }
  function positionChoices(choices: HTMLElement, picker: HTMLButtonElement, origin: HTMLElement, bounds: DOMRect, minimumHeight = 44) {
    // Native-style placement: the selected row meets the collapsed field.
    // Keep source order; scroll only as needed to fit within the visible panel.
    const control = origin.getBoundingClientRect();
    const anchor = picker.getBoundingClientRect();
    const topEdge = bounds.top + 8, bottomEdge = bounds.bottom - 8;
    choices.style.maxHeight = `${Math.max(44, bottomEdge - topEdge)}px`;
    const options = [...choices.querySelectorAll<HTMLButtonElement>('[role=option]')];
    const current = options.find(node => node.dataset.value === picker.dataset.value) ?? options[0];
    const center = anchor.top + anchor.height / 2;
    if (current) {
      const before = current.offsetTop + current.offsetHeight / 2 + choices.clientTop;
      const after = choices.scrollHeight + 2 * choices.clientTop - before;
      // Near either end, shorten the menu instead of forcing the selected row
      // away from the field when the scroll range runs out.
      choices.style.maxHeight = `${Math.min(bottomEdge - topEdge, Math.max(minimumHeight, Math.min(center - topEdge + after, bottomEdge - center + before)))}px`;
    }
    const height = choices.getBoundingClientRect().height;
    const rowCenter = current ? current.offsetTop + current.offsetHeight / 2 + choices.clientTop : height / 2;
    const top = Math.max(topEdge, Math.min(center - rowCenter, Math.max(topEdge, bottomEdge - height)));
    choices.style.top = `${top - control.top - origin.clientTop}px`;
    choices.scrollTop = Math.max(0, Math.min(choices.scrollHeight - choices.clientHeight, top + rowCenter - center));
  }
  function positionPresetChoices() {
    positionChoices(presetChoices, presetSelect, presetControl, frame.getBoundingClientRect());
    presetShadows.update();
  }
  function openPresetChoices(keyboard = false) {
    if (presetSelect.disabled) return;
    closePresetMenu(); presetChoices.hidden = false; presetSelect.setAttribute('aria-expanded', 'true');
    positionPresetChoices();
    presetEscape.activate();
    const options = [...presetChoices.querySelectorAll<HTMLButtonElement>('[role=option]:not(:disabled)')];
    const current = options.find(node => node.dataset.value === presetSelect.dataset.value) ?? options[0];
    if (keyboard) current?.focus({ preventScroll: true });
  }
  presetSelect.addEventListener('click', () => presetChoices.hidden ? openPresetChoices() : closePresetChoices());
  presetControl.addEventListener('keydown', event => {
    if (!presetSelect.contains(event.target as Node) && !presetChoices.contains(event.target as Node)) return;
    if (event.key === 'Escape' && !presetChoices.hidden) {
      event.preventDefault(); event.stopPropagation(); closePresetChoices(true); return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (presetChoices.hidden) { openPresetChoices(true); return; }
    const options = [...presetChoices.querySelectorAll<HTMLButtonElement>('[role=option]:not(:disabled)')];
    const index = options.indexOf(doc.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 :
      (Math.max(0, index) + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length;
    options[next]?.focus(); options[next]?.scrollIntoView({ block: 'nearest' });
  });
  presetControl.addEventListener('focusout', event => {
    const next = event.relatedTarget as Node | null;
    if (!presetSelect.contains(next) && !presetChoices.contains(next)) closePresetChoices();
  });
  listen(doc, 'pointerdown', ((event: PointerEvent) => {
    if (!presetSelect.contains(event.target as Node) && !presetChoices.contains(event.target as Node)) closePresetChoices();
  }) as EventListener, { capture: true });
  // Only keyboard navigation draws the shared focus ring, not a settled mouse pick.
  listen(doc, 'keydown', ((event: KeyboardEvent) => {
    if (event.key === 'Tab' || presetControl.contains(event.target as Node))
      presetControl.dataset.keyboardFocus = 'true';
  }) as EventListener);
  listen(doc, 'pointerdown', (() => { delete presetControl.dataset.keyboardFocus; }) as EventListener, { capture: true });
  const presetLabel = el('span', 'mm-preset-label', '当前使用预设');
  presetControl.append(presetSelect, presetChoices, presetShadows.layer);
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
  const downloadButton = button('预设下载', 'download', openPresetDownload, '');
  downloadButton.setAttribute('aria-haspopup', 'dialog');
  const downloadId = pickerId('preset-download');
  downloadButton.setAttribute('aria-controls', downloadId);
  menu.append(
    button('预设条目迁移', 'migration', () => {
      cancelDrag(); closePresetMenu(); void migrationView.open();
    }, ''),
    downloadButton,
  );
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
  const cleanControls = [presetSelect, importButton, exportButton, copyButton, ...menu.querySelectorAll<HTMLButtonElement>('[data-write]')];
  for (const node of cleanControls) node.dataset.clean = 'true';
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
  function settingsEntry(label: string, icon: IconName, open: () => void) {
    const entry = writeControl(button(label, undefined, open, 'mm-parameter-entry'));
    entry.removeAttribute('title');
    entry.setAttribute('aria-haspopup', 'dialog');
    const badge = el('span', 'mm-settings-entry-icon');
    badge.append(createIcon(doc, icon));
    const arrow = createIcon(doc, 'chevron');
    arrow.classList.add('mm-settings-entry-arrow');
    entry.replaceChildren(badge, el('span', 'mm-settings-entry-label', label), arrow);
    return entry;
  }
  const parametersButton = settingsEntry('预设参数设置', 'settings', () => {
    cancelDrag(); editorReturnFocus = parametersButton; controller.editParameters();
  });
  const toolsButton = settingsEntry('预设工具', 'tools', openPresetTools);
  const presetSettingsEntries = el('div', 'mm-preset-settings-entries');
  presetSettingsEntries.append(parametersButton, toolsButton);
  scroll.append(presetSettingsEntries, attachedList, unlockedHead, detachedList);
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
  const launcherLayer = el('div', 'mm-modal-layer mm-launcher-settings-layer');
  launcherLayer.hidden = true;
  const launcherDialog = el('section', 'mm-dialog mm-launcher-settings');
  launcherDialog.id = pickerId('launcher-settings');
  launcherDialog.setAttribute('role', 'dialog');
  launcherDialog.setAttribute('aria-modal', 'true');
  launcherDialog.setAttribute('aria-label', '悬浮球设置');
  launcherSettingsButton.setAttribute('aria-controls', launcherDialog.id);
  const launcherHeading = el('div', 'mm-dialog-head');
  const launcherTitle = el('h3', '', '悬浮球设置'); launcherTitle.tabIndex = -1;
  launcherHeading.append(launcherTitle);
  const launcherBody = el('div', 'mm-dialog-body');
  const launcherCard = el('section', 'mm-launcher-card');
  const launcherCardHeading = el('div', 'mm-launcher-card-heading');
  launcherCardHeading.append(el('h4', '', '悬浮球'), el('small', '', '外观与手势'));
  const sizeRow = el('div', 'mm-launcher-size-row');
  const sizeLabel = el('label', 'mm-launcher-size-label', '悬浮球大小');
  const sizeInput = el('input', 'mm-launcher-size-input');
  sizeInput.type = 'range'; sizeInput.min = String(LAUNCHER_MIN_SIZE); sizeInput.max = String(LAUNCHER_MAX_SIZE);
  sizeInput.id = pickerId('launcher-size'); sizeLabel.htmlFor = sizeInput.id;
  const sizeValue = el('span', 'mm-launcher-size-value'); sizeValue.setAttribute('aria-hidden', 'true');
  const sizeHeading = el('div', 'mm-launcher-size-heading'); sizeHeading.append(sizeLabel, sizeValue);
  const sizeStops = el('div', 'mm-launcher-size-stops'); sizeStops.setAttribute('aria-hidden', 'true');
  sizeStops.append(...['50%', '100%', '150%'].map(stop => el('span', '', stop)));
  const sizeFields = el('div', 'mm-launcher-size-fields'); sizeFields.append(sizeHeading, sizeInput, sizeStops);
  const sizePreview = el('div', 'mm-launcher-size-preview'); sizePreview.setAttribute('aria-hidden', 'true');
  const previewImage = el('img'); previewImage.alt = ''; previewImage.src = ICON; previewImage.draggable = false;
  sizePreview.append(previewImage); sizeRow.append(sizeFields, sizePreview);
  const modeRow = el('div', 'mm-launcher-mode-row');
  const modeCopy = el('div', 'mm-launcher-mode-copy');
  const modeHint = el('p', 'mm-hint', `贴边半藏，鼠标悬停时探出。鼠标和触屏都可向内拉，亮起后松手打开。原地长按 ${LAUNCHER_HOLD_MS / 1000} 秒后可拖动换位。`);
  modeHint.id = pickerId('launcher-mode-hint'); modeCopy.append(el('strong', '', '潜航模式'), modeHint);
  const modeSwitch = button('潜航模式', undefined, () => applyLauncherAppearance({tucked: !launcherAppearance.get().tucked}), 'mm-icon mm-launcher-mode-switch');
  modeSwitch.setAttribute('role', 'switch'); modeSwitch.setAttribute('aria-describedby', modeHint.id);
  modeSwitch.append(el('span', 'mm-launcher-mode-track'));
  modeRow.append(modeCopy, modeSwitch);
  const launcherNotice = el('p', 'mm-hint'); launcherNotice.setAttribute('role', 'status'); launcherNotice.hidden = true;
  launcherCard.append(launcherCardHeading, sizeRow, modeRow, launcherNotice);
  launcherBody.append(launcherCard);
  const launcherActions = el('div', 'mm-dialog-actions');
  const launcherBack = button('返回', undefined, () => dismissLauncherSettings(), 'mm-secondary');
  launcherBack.removeAttribute('title');
  launcherActions.append(launcherBack);
  launcherDialog.append(launcherHeading, launcherBody, launcherActions);
  launcherLayer.append(launcherDialog);
  sizeInput.addEventListener('input', () => applyLauncherAppearance({size: sizeInput.valueAsNumber}));
  function paintLauncherAppearance() {
    const {size, tucked} = launcherAppearance.get();
    sizeInput.value = String(size);
    sizeInput.setAttribute('aria-valuetext', `${size}%`);
    sizeValue.textContent = `${size}%`;
    sizeInput.style.setProperty('--mm-size-fill', `${size - LAUNCHER_MIN_SIZE}%`);
    sizePreview.style.setProperty('--mm-preview-diameter', `${size * .34}px`);
    sizePreview.toggleAttribute('data-tucked', tucked);
    modeSwitch.setAttribute('aria-checked', String(tucked));
  }
  function applyLauncherAppearance(next: Parameters<typeof launcherAppearance.set>[0]) {
    const saved = launcherAppearance.set(next);
    launcherNotice.hidden = saved;
    launcherNotice.textContent = saved ? '' : '当前页面已应用。浏览器无法保存此设置。';
    paintLauncherAppearance();
  }
  function openLauncherSettings() {
    if (disposed || panel.hidden || panel.inert || !editorLayer.hidden || !confirmLayer.hidden || !launcherLayer.hidden) return;
    closePresetChoices();
    menu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    paintLauncherAppearance();
    launcherLayer.hidden = false;
    frame.inert = true;
    launcherTitle.focus({preventScroll:true});
  }
  function dismissLauncherSettings(restoreFocus = true) {
    if (launcherLayer.hidden) return;
    launcherLayer.hidden = true;
    frame.inert = false;
    if (restoreFocus) launcherSettingsButton.focus({preventScroll:true});
  }
  function presetDialogHeading(label: string, icon: IconName, preset = '') {
    const head = el('div', 'mm-dialog-head mm-preset-dialog-head');
    const badge = el('span', 'mm-tools-icon');
    badge.append(createIcon(doc, icon));
    const title = el('h3', '', label);
    title.id = pickerId('preset-dialog-title');
    title.tabIndex = -1;
    const name = el('p', 'mm-hint mm-preset-dialog-name', preset);
    name.title = preset;
    const copy = el('div', 'mm-preset-dialog-copy');
    copy.append(title, name);
    head.append(badge, copy);
    return { head, title, name };
  }
  const toolsLayer = el('div', 'mm-modal-layer mm-preset-tools-layer');
  toolsLayer.hidden = true;
  const toolsDialog = el('section', 'mm-dialog mm-launcher-settings mm-tools-dialog');
  toolsDialog.id = pickerId('preset-tools');
  toolsDialog.setAttribute('role', 'dialog');
  toolsDialog.setAttribute('aria-modal', 'true');
  const { head: toolsHeading, title: toolsTitle, name: toolsPresetLabel } = presetDialogHeading('预设工具', 'tools');
  toolsDialog.setAttribute('aria-labelledby', toolsTitle.id);
  toolsButton.setAttribute('aria-controls', toolsDialog.id);
  let toolsPreset: string | undefined;
  const readToolSettings = () => tools?.settings(toolsPreset);
  function saveToolSettings(changes: Parameters<PresetTools['setSettings']>[0]) {
    if (!tools || !toolsPreset || tools.presetName() !== toolsPreset) {
      dismissPresetTools(false);
      return;
    }
    updateMessageTools(tools.setSettings(changes, toolsPreset));
  }
  const toolsBody = el('div', 'mm-dialog-body');

  function toolFeature(name: string, description: string, available: boolean, toggle: () => void) {
    const feature = el('div', 'mm-tool-feature');
    const row = el('div', 'mm-launcher-mode-row');
    const copy = el('div', 'mm-launcher-mode-copy');
    const hint = el('p', 'mm-hint', description);
    hint.id = pickerId('tool-hint');
    copy.append(el('h5', '', name), hint);
    const control = button(name, undefined, toggle, 'mm-icon mm-launcher-mode-switch');
    control.removeAttribute('title');
    control.setAttribute('role', 'switch');
    control.setAttribute('aria-describedby', hint.id);
    control.disabled = !available;
    control.append(el('span', 'mm-launcher-mode-track'));
    row.append(copy, control);
    feature.append(row);
    return { feature, control };
  }
  function toolGroup(title: string, ...items: HTMLElement[]) {
    const group = el('section', 'mm-launcher-card mm-tools-group');
    const label = el('h4', '', title);
    label.id = pickerId('tools-group');
    group.setAttribute('aria-labelledby', label.id);
    group.append(label, ...items);
    return group;
  }
  function toolExample(label: string, original: string, resultLabel: string, result: string) {
    const example = el('div', 'mm-tool-example');
    example.append(el('span', 'mm-tool-example-label', label), el('span', '', original),
      el('span', 'mm-tool-example-label', resultLabel), el('code', 'mm-tool-example-result', result));
    return example;
  }

  const pinyin = toolFeature('发送消息转拼音', '聊天保留原文，AI 收到无声调拼音。',
    Boolean(tools?.available), () => {
      if (tools?.available) saveToolSettings({ input: readToolSettings()?.input === 'pinyin' ? 'off' : 'pinyin' });
    });
  pinyin.feature.append(toolExample('聊天显示', '你好，今天见。', 'AI 收到', 'ni hao，jin tian jian。'));

  const unicode = toolFeature('上下文 Unicode 转义', '将请求正文转义，可与拼音二选一。',
    Boolean(tools?.unicodeAvailable), () => {
      if (!tools?.unicodeAvailable) return;
      saveToolSettings({ input: readToolSettings()?.input === 'unicode' ? 'off' : 'unicode' });
    });
  unicode.feature.append(toolExample('原文片段', '你好', 'AI 收到', '\\u4f60\\u597d'));
  const replyOptions = el('fieldset', 'mm-unicode-reply');
  replyOptions.append(el('legend', '', 'AI 回复格式'));
  const replyChoices = el('div', 'mm-unicode-reply-choices');
  const radioName = pickerId('unicode-reply');
  const replyButtons = (['plain', 'encoded'] as const).map(reply => {
    const label = el('label', 'mm-unicode-reply-option');
    const input = el('input');
    input.type = 'radio';
    input.name = radioName;
    input.value = reply;
    input.addEventListener('change', () => {
      if (input.checked && tools?.unicodeAvailable) saveToolSettings({ reply });
    });
    label.append(input, el('span', '', reply === 'plain' ? '原文回复' : '编码回复'));
    replyChoices.append(label);
    return input;
  });
  const replyHint = el('p', 'mm-hint', '编码可能占用更多上下文。选择编码回复后，脚本会收完并解码，再显示正文。');
  replyOptions.append(replyChoices, replyHint);
  unicode.feature.append(replyOptions);

  const toolReply = toolFeature('工具调用回复', '用一个工具接收完整回复，收齐后显示原文。适用于支持工具调用的 OpenAI、OpenRouter、Custom 和 Gemini 连接。',
    Boolean(tools?.unicodeAvailable), () => {
      if (tools?.unicodeAvailable) saveToolSettings({ toolReply: !readToolSettings()?.toolReply });
    });

  const lowThinking = toolFeature('低思考模式', '使用当前连接和模型已确认的最低推理档位，关闭原生思维链回传。',
    Boolean(tools?.unicodeAvailable), () => {
      if (tools?.unicodeAvailable) saveToolSettings({ lowThinking: !readToolSettings()?.lowThinking });
    });

  const affinity = toolFeature('好感度引擎', '沿用预设规则结算，保留通用、EVA 和 NPC 好感度名单。',
    Boolean(tools?.unicodeAvailable), () => {
      if (tools?.unicodeAvailable) saveToolSettings({ affinity: !readToolSettings()?.affinity });
    });
  const status = toolFeature('状态栏引擎', '首次生成全表，后续按标题更新。',
    Boolean(tools?.unicodeAvailable), () => {
      if (tools?.unicodeAvailable) saveToolSettings({ status: !readToolSettings()?.status });
    });
  const worldReport = toolFeature('世界运行报告引擎', '首次生成完整报告，后续按模块更新。',
    Boolean(tools?.unicodeAvailable), () => {
      if (tools?.unicodeAvailable) saveToolSettings({ worldReport: !readToolSettings()?.worldReport });
    });

  const toolEditorLayer = el('div', 'mm-modal-layer mm-tool-editor-layer');
  toolEditorLayer.hidden = true;
  const toolEditorDialog = el('section', 'mm-dialog mm-tool-editor-dialog');
  toolEditorDialog.id = pickerId('preset-tool-editor');
  toolEditorDialog.setAttribute('role', 'dialog');
  toolEditorDialog.setAttribute('aria-modal', 'true');
  const toolEditorHeading = el('div', 'mm-dialog-head');
  const toolEditorIcon = el('span', 'mm-tools-icon');
  toolEditorIcon.append(createIcon(doc, 'edit'));
  const toolEditorTitle = el('h3');
  toolEditorTitle.id = pickerId('tool-editor-title');
  toolEditorTitle.tabIndex = -1;
  toolEditorDialog.setAttribute('aria-labelledby', toolEditorTitle.id);
  toolEditorHeading.append(toolEditorIcon, toolEditorTitle);
  const toolEditorBody = el('div', 'mm-dialog-body');
  const toolEditorActions = el('div', 'mm-dialog-actions');
  const toolEditorBack = button('返回', 'back', () => dismissToolEditor(), 'mm-secondary');
  toolEditorBack.removeAttribute('title');
  toolEditorDialog.append(toolEditorHeading, toolEditorBody, toolEditorActions);
  toolEditorLayer.append(toolEditorDialog);
  const toolEditorMotion = createDialogMotion(host, toolEditorLayer, toolEditorDialog,
    [toolEditorHeading, toolEditorBody, toolEditorActions]);
  let toolEditorTrigger: HTMLButtonElement | undefined;

  function openToolEditor(trigger: HTMLButtonElement, title: string, content: HTMLElement, save: HTMLButtonElement) {
    if (!toolEditorLayer.hidden || toolsClosing) return;
    toolsPresentation.cancel();
    toolEditorTrigger = trigger;
    toolEditorTitle.textContent = title;
    toolEditorBody.replaceChildren(content);
    toolEditorActions.replaceChildren(toolEditorBack, save);
    toolEditorLayer.hidden = false;
    toolEditorBody.scrollTop = 0;
    toolEditorTitle.focus({ preventScroll: true });
    toolsDialog.inert = true;
    toolEditorMotion.play(true, trigger);
  }
  function dismissToolEditor(restoreFocus = true) {
    const trigger = toolEditorTrigger;
    if (!trigger) return;
    if (toolEditorMotion.closing) { if (!restoreFocus) toolEditorMotion.finish(false); return; }
    const finish = (focus = restoreFocus) => {
      toolEditorLayer.hidden = true;
      toolEditorDialog.inert = false;
      toolsDialog.inert = false;
      toolEditorTrigger = undefined;
      if (focus && !disposed && !panel.hidden && !panel.inert) trigger.focus({ preventScroll: true });
    };
    if (!restoreFocus) { toolEditorMotion.finish(false); finish(); return; }
    toolEditorMotion.play(false, trigger, finish);
  }

  function createToolEditRow(title: string, accessibleName: string, action: () => void) {
    const row = el('div', 'mm-tool-edit-row');
    const copy = el('div', 'mm-tool-edit-copy');
    copy.append(el('strong', 'mm-tool-edit-title', title));
    const edit = button('编辑', 'edit', action, 'mm-tool-edit-button');
    edit.removeAttribute('title');
    edit.setAttribute('aria-label', accessibleName);
    edit.setAttribute('aria-haspopup', 'dialog');
    edit.setAttribute('aria-controls', toolEditorDialog.id);
    row.append(copy, edit);
    return { row, copy, edit };
  }

  const updateToolPreview = (line: HTMLElement) => {
    line.parentElement?.toggleAttribute('data-clipped', line.scrollWidth > line.clientWidth);
  };
  const ToolResizeObserver = (host as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const toolPreviewObserver = ToolResizeObserver
    ? new ToolResizeObserver(entries => entries.forEach(entry => updateToolPreview(entry.target as HTMLElement)))
    : null;
  cleanup.push(() => toolPreviewObserver?.disconnect());

  function createToolPrompt(feature: HTMLElement, key: 'statusPrompt' | 'worldReportPrompt', label: string,
    tag: string, defaultPrompt: string) {
    const title = label + '增量提示词';
    const preview = el('div', 'mm-tool-edit-preview');
    const line = el('span', 'mm-tool-preview-line');
    preview.append(line);
    toolPreviewObserver?.observe(line);
    const content = el('div', 'mm-tool-prompt-content');
    const fields = el('div', 'mm-tool-editor-fields');
    const input = el('textarea', 'mm-tool-edit-input');
    input.rows = 6;
    input.id = pickerId('tool-prompt-input');
    input.setAttribute('aria-label', title);
    const inputLabel = el('label', 'mm-tool-field-label', '提示词正文');
    inputLabel.htmlFor = input.id;
    const help = el('p', 'mm-hint', `有上一份完整记录时，这段文字会放在 <${tag}> 标签内。清空后保存会恢复默认。`);
    help.id = pickerId('tool-prompt-help');
    input.setAttribute('aria-describedby', help.id);
    const value = () => readToolSettings()?.[key] ?? defaultPrompt;
    const { row, copy, edit } = createToolEditRow(title, `编辑${label}提示词`, () => {
      if (!tools) return;
      input.value = value();
      input.scrollTop = 0;
      updateDraft();
      openToolEditor(edit, title, content, save);
    });
    edit.disabled = !tools;
    const reset = button('恢复默认', 'refresh', () => {
      input.value = defaultPrompt;
      updateDraft();
      input.focus();
    }, 'mm-tool-reset');
    reset.removeAttribute('title');
    const save = button('保存', undefined, () => {
      if (!tools) return;
      saveToolSettings({ [key]: input.value });
      dismissToolEditor();
    }, 'mm-primary');
    function updateDraft() {
      const text = input.value.trim();
      reset.disabled = text === defaultPrompt;
      save.disabled = (text || defaultPrompt) === value();
    }
    input.addEventListener('input', updateDraft);
    fields.append(inputLabel, reset);
    content.append(fields, input, help);
    copy.append(preview);
    feature.append(row);
    return () => {
      const text = value().trim();
      const firstLine = text.split(/\r\n?|\n/, 1)[0];
      if (line.textContent !== firstLine) line.textContent = firstLine;
      preview.toggleAttribute('data-more', text.length > firstLine.length);
      updateToolPreview(line);
    };
  }
  const refreshStatusPrompt = createToolPrompt(status.feature, 'statusPrompt', '状态栏', 'status', DEFAULT_STATUS_PROMPT);
  const refreshWorldReportPrompt = createToolPrompt(worldReport.feature, 'worldReportPrompt', '世界运行报告', 'wlog', WORLD_REPORT_PROMPT);

  const tagIsolation = toolFeature('标签隔离', '自动识别咩咩预设的回复格式，防止思维链里的标签把正文卷进美化卡片。', Boolean(tools?.tagIsolationAvailable), () => {
    if (tools?.tagIsolationAvailable) saveToolSettings({ tagIsolation: !readToolSettings()?.tagIsolation });
  });
  tagIsolation.feature.append(toolExample('思维链里提到', '这回合要输出 <status>', '正式状态栏', '只美化正文后的完整 <status>…</status>'));
  const customEditor = el('div', 'mm-tool-tags-content');
  const customTags = createToolEditRow('隔离标签', '编辑隔离标签', () => {
    if (!tools?.tagIsolationAvailable) return;
    customInput.value = (readToolSettings()?.customTags ?? []).join('\n');
    customInput.scrollTop = 0;
    updateCustomDraft();
    openToolEditor(customTags.edit, '隔离标签', customEditor, customSave);
  });
  const builtinTitle = el('strong', 'mm-tag-label', '咩咩预设内置标签');
  builtinTitle.id = pickerId('builtin-isolation-tags');
  const builtinList = el('ul', 'mm-tag-list');
  builtinList.tabIndex = 0;
  builtinList.setAttribute('aria-labelledby', builtinTitle.id);
  for (const tag of DEFAULT_ISOLATION_TAGS) {
    const item = el('li', '');
    item.append(el('code', '', `<${tag}>`));
    builtinList.append(item);
  }
  const customLabel = el('label', 'mm-tag-label', '额外标签');
  const customInput = el('textarea', 'mm-tool-edit-input');
  customInput.id = pickerId('custom-isolation-tags');
  customLabel.htmlFor = customInput.id;
  customInput.rows = 3;
  customInput.placeholder = '<quest_log>';
  const customHelp = el('p', 'mm-hint', '可写 quest_log 或 <quest_log>。每行一个，也可用逗号隔开。开启标签隔离后，额外标签在其他预设中也生效。');
  customHelp.id = pickerId('custom-tags-help');
  customInput.setAttribute('aria-describedby', customHelp.id);
  const customFeedback = el('p', 'mm-hint');
  customFeedback.setAttribute('role', 'status');
  const customSave = button('保存', undefined, () => {
    if (!tools?.tagIsolationAvailable) return;
    const { names, invalid } = parseCustomTags(customInput.value);
    if (invalid.length) return;
    saveToolSettings({ customTags: names });
    dismissToolEditor();
  }, 'mm-primary');
  const builtinSection = el('div', 'mm-tool-tags-section');
  builtinSection.append(builtinTitle, builtinList);
  const customSection = el('div', 'mm-tool-tags-section');
  customSection.append(customLabel, customInput, customHelp, customFeedback);
  customEditor.append(builtinSection, customSection);
  customTags.row.hidden = !tools?.tagIsolationAvailable;
  tagIsolation.feature.append(customTags.row);
  function updateCustomDraft() {
    const { names, invalid } = parseCustomTags(customInput.value);
    customFeedback.textContent = invalid.length ? `请检查标签名「${invalid[0]}」。` : '';
    customFeedback.hidden = !invalid.length;
    customInput.setAttribute('aria-invalid', String(Boolean(invalid.length)));
    customSave.disabled = Boolean(invalid.length) || names.join('\n') === (readToolSettings()?.customTags ?? []).join('\n');
  }
  customInput.addEventListener('input', updateCustomDraft);
  const messageToolsCard = toolGroup('消息处理', pinyin.feature, unicode.feature, toolReply.feature, tagIsolation.feature);
  const modelCard = toolGroup('模型设置', lowThinking.feature);
  const conversationCard = toolGroup('对话状态', affinity.feature, status.feature, worldReport.feature);
  const transferHint = el('p', 'mm-hint mm-tools-transfer', '用酒馆的复制按钮复制最后一条完整回复，粘贴到新对话的开场白即可接续。');
  const toolsNotice = el('p', 'mm-hint mm-tools-notice');
  toolsNotice.setAttribute('role', 'status');
  toolsBody.append(messageToolsCard, modelCard, conversationCard, transferHint, toolsNotice);
  function updateMessageTools(saved = true) {
    const settings = readToolSettings();
    const unicodeEnabled = Boolean(tools?.unicodeAvailable && settings?.input === 'unicode');
    pinyin.control.setAttribute('aria-checked', String(Boolean(tools?.available && settings?.input === 'pinyin')));
    unicode.control.setAttribute('aria-checked', String(unicodeEnabled));
    toolReply.control.setAttribute('aria-checked', String(Boolean(tools?.unicodeAvailable && settings?.toolReply)));
    lowThinking.control.setAttribute('aria-checked', String(Boolean(tools?.unicodeAvailable && settings?.lowThinking)));
    affinity.control.setAttribute('aria-checked', String(Boolean(tools?.unicodeAvailable && settings?.affinity)));
    status.control.setAttribute('aria-checked', String(Boolean(tools?.unicodeAvailable && settings?.status)));
    worldReport.control.setAttribute('aria-checked', String(Boolean(tools?.unicodeAvailable && settings?.worldReport)));
    tagIsolation.control.setAttribute('aria-checked', String(Boolean(tools?.tagIsolationAvailable && settings?.tagIsolation)));
    replyOptions.hidden = !unicodeEnabled;
    replyOptions.disabled = !unicodeEnabled;
    for (const input of replyButtons) input.checked = input.value === (settings?.reply ?? 'plain');
    refreshStatusPrompt();
    refreshWorldReportPrompt();
    toolsNotice.textContent = !saved ? '本次已生效，浏览器无法保存此设置。' :
      !tools?.available && !tools?.unicodeAvailable && !tools?.tagIsolationAvailable ? '当前宿主暂未提供预设工具所需的能力。' : '';
    toolsNotice.hidden = !toolsNotice.textContent;
  }
  function backFromPresetTools() {
    if (!toolEditorLayer.hidden) dismissToolEditor();
    else dismissPresetTools();
  }
  const toolsActions = el('div', 'mm-dialog-actions');
  const toolsBack = button('返回', 'back', backFromPresetTools, 'mm-secondary');
  toolsBack.removeAttribute('title');
  toolsActions.append(toolsBack);
  toolsDialog.append(toolsHeading, toolsBody, toolsActions);
  toolsLayer.append(toolsDialog, toolEditorLayer);
  const toolsPresentation = createParameterPresentation(host, toolsLayer, toolsButton);
  let toolsClosing = false, toolsMotionEpoch = 0;
  cleanup.push(() => { dismissPresetTools(false); toolsPresentation.dispose(); });
  function openPresetTools() {
    if (disposed || panel.hidden || panel.inert || !editorLayer.hidden || !confirmLayer.hidden || !launcherLayer.hidden || !toolsLayer.hidden) return;
    const preset = controller.state.snapshot?.name;
    if (!preset || (tools && tools.presetName() !== preset)) return;
    toolsPreset = preset;
    toolsPresetLabel.textContent = preset;
    toolsPresetLabel.title = preset;
    cancelDrag();
    closePresetChoices();
    closePresetMenu();
    toolsLayer.hidden = false;
    updateMessageTools();
    toolsBody.scrollTop = 0;
    frame.inert = true;
    toolsTitle.focus({ preventScroll: true });
    const epoch = ++toolsMotionEpoch;
    void toolsPresentation.run(toolsDialog, true).then(() => {
      if (!disposed && epoch === toolsMotionEpoch && !toolsLayer.hidden && doc.activeElement === toolsLayer)
        toolsTitle.focus({ preventScroll: true });
    });
  }
  function dismissPresetTools(restoreFocus = true) {
    if (toolsLayer.hidden) return;
    if (toolsClosing && restoreFocus) return;
    dismissToolEditor(false);
    const epoch = ++toolsMotionEpoch;
    const finish = () => {
      if (epoch !== toolsMotionEpoch) return;
      toolsLayer.hidden = true;
      toolsClosing = false;
      toolsPreset = undefined;
      frame.inert = false;
      if (restoreFocus && !disposed && !panel.hidden && !panel.inert) toolsButton.focus({ preventScroll: true });
    };
    if (!restoreFocus) { toolsPresentation.cancel(); finish(); return; }
    toolsClosing = true;
    void toolsPresentation.run(toolsDialog, false).then(finish);
  }
  const presetDownload = createPresetDownload(doc, downloadId, moreButton, controller, restoreFocus => {
    frame.inert = false;
    if (restoreFocus && !disposed && !panel.hidden && !panel.inert) moreButton.focus({ preventScroll: true });
  });
  function finishDialogMotions() {
    toolEditorMotion.finish();
    toolsPresentation.cancel();
    presetDownload.finishMotion();
  }
  const dialogMotionPreference = host.matchMedia('(prefers-reduced-motion: reduce)');
  listen(dialogMotionPreference, 'change', () => { if (dialogMotionPreference.matches) finishDialogMotions(); });
  cleanup.push(() => presetDownload.close(false));
  function openPresetDownload() {
    if (disposed || panel.hidden || panel.inert || frame.inert) return;
    cancelDrag();
    closePresetChoices();
    closePresetMenu();
    frame.inert = true;
    presetDownload.open();
  }
  frame.append(header, errorBox, categoryRow, scroll, footer);
  panel.append(editorLayer, confirmLayer, launcherLayer, toolsLayer, presetDownload.layer);
  const parameterPresentation = createParameterPresentation(host, editorLayer, parametersButton);
  let parameterMotionEpoch = 0;
  listen(doc, 'pointerdown', ((event: PointerEvent) => {
    if (parameterPicker && !parameterPicker.contains(event.target as Node)) parameterPicker.close();
  }) as EventListener, { capture: true });
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
      label.append(el('p', 'mm-hint', '使用酒馆原始 Default 模板。API 连接按酒馆的绑定开关处理。'));
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

  function renderParametersEditor() {
    const state = controller.state, draft = state.parametersDraft;
    if (!draft || !state.snapshot) return;
    const managedThinking = tools?.settings(state.snapshot.name).lowThinking === true;
    const key = `${state.snapshot.name}\0preset-parameters\0${managedThinking}`;
    if (editorKey === key && editorLayer.dataset.parameterMotion !== 'closing') return;
    const motionEpoch = ++parameterMotionEpoch;
    parameterPresentation.cancel();
    parameterPicker?.dispose(); parameterPicker = null;
    editorKey = key;
    const base = state.pendingRaw ?? state.snapshot.raw;
    const raw = { ...base, ...missingParameterDefaults(base), ...draft.patch };
    const box = el('section', 'mm-dialog mm-editor-dialog mm-parameters-dialog');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    const { head, title } = presetDialogHeading('预设参数设置', 'settings', state.snapshot.name);
    box.setAttribute('aria-labelledby', title.id);
    const form = el('form', 'mm-dialog-body');
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
      const managed = managedThinking && name === 'show_thoughts';
      wrap.toggleAttribute('data-tool-managed', managed);
      copy.append(el('span', 'mm-parameter-label', label), el('span', 'mm-hint', managed ? '由低思考模式接管 · 关闭回传' : hint));
      const input = writeControl(el('input'), !managed); input.type = 'checkbox'; input.setAttribute('role', 'switch'); input.setAttribute('aria-label', label);
      input.checked = !managed && raw[name] === true; input.indeterminate = !managed && typeof raw[name] !== 'boolean';
      input.addEventListener('change', () => { input.indeterminate = false; controller.draftParameters({ [name]: input.checked }); });
      const track = el('span', 'mm-parameter-switch-track'); track.setAttribute('aria-hidden', 'true');
      wrap.append(copy, input, track); outputGroup.append(wrap);
    }
    // A local select-only combobox: no platform picker, no native-select overlay.
    const pickerField = el('div', 'mm-parameter-picker-field');
    const picker = writeControl(button('推理强度', undefined, undefined, 'mm-parameter-picker'), !managedThinking);
    pickerField.toggleAttribute('data-tool-managed', managedThinking);
    picker.setAttribute('role', 'combobox'); picker.setAttribute('aria-haspopup', 'listbox'); picker.setAttribute('aria-expanded', 'false');
    const pickerValue = el('span', 'mm-parameter-picker-value'), arrow = createIcon(doc, 'chevron');
    picker.replaceChildren(pickerValue, arrow);
    const choices = el('div', 'mm-parameter-picker-menu mm-reasoning-options'); choices.hidden = true;
    const shadows = pickerScrollShadows(choices);
    choices.id = pickerId('reasoning'); choices.setAttribute('role', 'listbox'); choices.setAttribute('aria-label', '推理强度选项');
    picker.setAttribute('aria-controls', choices.id);
    const values: Array<readonly [string, string]> = [...REASONING_EFFORTS];
    let selected = String(raw.reasoning_effort ?? '');
    if (!values.some(([id]) => id === selected)) values.push([selected, `保留原值：${selected}`]);
    const options: HTMLButtonElement[] = [];
    const closePicker = (focus = false) => { pickerEscape.deactivate(); choices.hidden = true; shadows.hide(); picker.setAttribute('aria-expanded', 'false'); if (focus) picker.focus({ preventScroll: true }); };
    const pickerEscape = createPickerEscapeGuard(doc, picker, () => !choices.hidden, () => closePicker(true));
    const showValue = () => {
      pickerValue.textContent = managedThinking ? '由低思考模式接管' : (values.find(([id]) => id === selected)?.[1] ?? selected);
      picker.dataset.value = selected;
      options.forEach((node, index) => node.setAttribute('aria-selected', String(values[index][0] === selected)));
    };
    const containsPicker = (node: Node | null) => pickerField.contains(node) || choices.contains(node);
    const positionPicker = () => {
      if (choices.hidden) return;
      const bounds = form.getBoundingClientRect(), anchor = picker.getBoundingClientRect(), origin = box.getBoundingClientRect();
      if (!box.isConnected || panel.hidden || editorLayer.hidden || anchor.bottom <= bounds.top + 8 || anchor.top >= bounds.bottom - 8) {
        closePicker(); return;
      }
      choices.style.left = `${anchor.left - origin.left - box.clientLeft}px`;
      choices.style.width = `${anchor.width}px`;
      // Restore the Owner reference's adaptive height and selected-row placement.
      positionChoices(choices, picker, box, bounds, 144);
      shadows.update();
    };
    parameterPicker = { position: positionPicker, close: closePicker, contains: containsPicker,
      dispose() { closePicker(); form.removeEventListener('scroll', positionPicker); shadows.dispose(); } };
    form.addEventListener('scroll', positionPicker);
    const openPicker = (keyboard = false) => {
      if (picker.disabled) return;
      picker.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      choices.hidden = false; picker.setAttribute('aria-expanded', 'true');
      positionPicker();
      if (!choices.hidden) pickerEscape.activate();
      const current = Math.max(0, values.findIndex(([id]) => id === selected && REASONING_EFFORTS.some(([known]) => known === id)));
      if (keyboard) options[current]?.focus({ preventScroll: true });
    };
    values.forEach(([id, label]) => {
      const known = REASONING_EFFORTS.some(([value]) => value === id);
      const item = writeControl(button(label, undefined, () => {
        selected = id; showValue(); controller.draftParameters({ reasoning_effort: id }); closePicker(true);
      }, 'mm-parameter-option'), known);
      item.setAttribute('role', 'option'); item.tabIndex = -1; item.dataset.value = id;
      item.append(createIcon(doc, 'check')); choices.append(item); options.push(item);
    });
    picker.addEventListener('click', () => choices.hidden ? openPicker() : closePicker());
    const pickerKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !choices.hidden) { event.preventDefault(); event.stopPropagation(); closePicker(true); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (choices.hidden) { openPicker(true); return; }
      const enabled = options.filter(item => !item.disabled), index = enabled.indexOf(doc.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 :
        (Math.max(0, index) + (event.key === 'ArrowDown' ? 1 : enabled.length - 1)) % enabled.length;
      enabled[next]?.focus({ preventScroll: true }); enabled[next]?.scrollIntoView({ block: 'nearest' });
    };
    for (const target of [pickerField, choices]) {
      target.addEventListener('keydown', pickerKeydown);
      target.addEventListener('focusout', event => { if (!containsPicker(event.relatedTarget as Node | null)) closePicker(); });
    }
    showValue(); pickerField.append(el('span', 'mm-parameter-label', '推理强度'), picker); outputGroup.append(pickerField);
    form.append(el('p', 'mm-hint', '实际支持情况沿用酒馆和模型规则，未显示的参数保持不变。'));
    const error = el('div', 'mm-inline-error'); error.dataset.editorError = 'true'; error.setAttribute('role', 'alert'); form.append(error);
    const actions = el('div', 'mm-dialog-actions');
    actions.append(button('取消', undefined, () => controller.cancelParameters(), 'mm-secondary'),
      writeControl(button('保存', undefined, () => { if (form.reportValidity()) void run(() => controller.saveParameters()); }, 'mm-primary')));
    form.addEventListener('submit', event => event.preventDefault());
    box.append(head, form, actions, choices, shadows.layer); editorLayer.replaceChildren(box); editorLayer.hidden = false;
    form.scrollTop = 0;
    void parameterPresentation.run(box, true).then(() => {
      if (!disposed && motionEpoch === parameterMotionEpoch && !panel.hidden && controller.state.parametersDraft && box.isConnected)
        form.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    });
  }
  function renderEditor() {
    const state = controller.state;
    if (state.parametersDraft) { disposeEditorPickers();renderParametersEditor(); return; }
    parameterPicker?.dispose(); parameterPicker = null;
    const draft = state.draft;
    const key = draft ? `${state.snapshot?.name}\0${draft.id}` : '';
    if (!draft) {
      disposeEditorPickers();
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
    disposeEditorPickers();
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
    const role = writeControl(button('身份', undefined, undefined, 'mm-parameter-picker'));
    const roles:Array<readonly[string,string]> = [...EDITOR_ROLES];
    if (value.role === undefined || !roles.some(([id]) => id === value.role))
      roles.push([value.role ?? '',value.role === undefined ? '未设置（保留原值）' : `保留原值：${value.role}`]);
    editorPickers.push(createFloatingPicker(doc,box,role,'身份',roles,value.role??'',id=>{if(id!=='')controller.draft({role:id});},()=>form.getBoundingClientRect()));
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
    const details = el('details', 'mm-advanced-settings');
    const summary = el('summary', 'mm-advanced-summary');
    const summaryIcon = el('span', 'mm-advanced-icon');
    summaryIcon.append(createIcon(doc, 'sliders'));
    const summaryText = el('span', 'mm-advanced-summary-title', '高级设置');
    const summaryChevron = createIcon(doc, 'chevron');
    summaryChevron.classList.add('mm-advanced-chevron');
    summary.append(summaryIcon, summaryText, summaryChevron);
    details.append(summary);
    details.addEventListener('toggle', () => {
      if (details.open && details.isConnected && details.childElementCount === 1) {
        details.append(buildAdvancedSettings(value, box, form));
      }
    });
    form.append(details);
    const error = el('div', 'mm-inline-error');
    error.dataset.editorError = 'true';
    error.setAttribute('role', 'alert');
    form.append(error);
    const row = el('div', 'mm-dialog-actions');
    row.append(
      button('取消', undefined, () => {
        if (!controller.state.busy) controller.cancelEdit();
      }, 'mm-secondary'),
      writeControl(button('保存', undefined, () => {
        if (details.querySelector('input:invalid')) details.open = true;
        if (form.reportValidity()) void run(() => controller.saveEdit());
      }, 'mm-primary')),
    );
    form.addEventListener('submit', event => event.preventDefault());
    box.append(head, form, row);
    editorLayer.replaceChildren(box);
    editorLayer.hidden = false;
    title.focus({ preventScroll: true });
  }
  function buildAdvancedSettings(value: Row['prompt'], box: HTMLElement, form: HTMLFormElement) {
    const advanced = el('div', 'mm-advanced');
    const placement = el('section', 'mm-advanced-group');
    const positionLabel = '插入位置（Position）';
    const position = writeControl(button(positionLabel, undefined, undefined, 'mm-parameter-picker'));
    const positions: Array<readonly [string, string]> = [['0', '相对位置（Relative）'], ['1', '聊天中（In-Chat）']];
    const positionId = String(value.injection_position ?? '');
    if (!positions.some(([id]) => id === positionId)) positions.push([positionId, '保留原值']);
    editorPickers.push(createFloatingPicker(doc, box, position, positionLabel, positions, positionId, id => {
      if (id !== '') controller.draft({ injection_position: Number(id) });
    }, () => form.getBoundingClientRect()));
    placement.append(field(positionLabel, position));
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
    placement.append(numericRow);
    const triggerGroup = el('section', 'mm-advanced-group mm-advanced-triggers');
    const triggerTitle = el('h4', '', '触发条件');
    const triggerState = el('span', 'mm-advanced-selection');
    triggerState.setAttribute('role', 'status');
    triggerTitle.id = pickerId('triggers');
    const triggerHeading = el('div', 'mm-advanced-heading');
    triggerHeading.append(triggerTitle, triggerState);
    triggerGroup.setAttribute('aria-labelledby', triggerTitle.id);
    const triggers = el('div', 'mm-checks');
    const known = new Set<string>(TRIGGERS.map(([id]) => id));
    const selected = new Set(value.injection_trigger ?? []);
    const updateSelection = () => {
      triggerState.textContent = selected.size ? `已选 ${selected.size} 项` : '所有生成方式';
    };
    const triggerValues: Array<readonly [string, string]> = [
      ...TRIGGERS,
      ...[...selected].filter(id => !known.has(id)).map(id => [id, `保留触发值：${id}`] as const),
    ];
    for (const [id, label] of triggerValues) {
      triggers.append(advancedCheck(label, selected.has(id), checked => {
        if (checked) selected.add(id);
        else selected.delete(id);
        updateSelection();
        controller.draft({ injection_trigger: [...selected] });
      }, known.has(id)));
    }
    updateSelection();
    triggerGroup.append(triggerHeading, triggers);
    advanced.append(placement, triggerGroup);
    if (['main', 'jailbreak'].includes(value.identifier)) {
      const override = advancedCheck('禁止角色卡覆盖', !!value.forbid_overrides,
        checked => controller.draft({ forbid_overrides: checked }));
      override.classList.add('mm-advanced-override');
      advanced.append(override);
    }
    return advanced;
  }
  function advancedCheck(label: string, checked: boolean, onChange: (checked: boolean) => void, permitted = true) {
    const wrap = el('label', 'mm-check');
    const input = writeControl(el('input'), permitted);
    input.type = 'checkbox';
    input.checked = checked;
    wrap.toggleAttribute('data-legacy', !permitted);
    input.addEventListener('change', () => onChange(input.checked));
    const mark = el('span', 'mm-check-mark');
    mark.setAttribute('aria-hidden', 'true');
    mark.append(createIcon(doc, 'check'));
    wrap.append(input, mark, el('span', 'mm-check-copy', label));
    return wrap;
  }
  function setCardEnabled(node: HTMLElement, toggle: HTMLButtonElement, row: Row) {
    if (!row.enabled && node.dataset.enabled === 'true') node.querySelector('.mm-card-activation')?.remove();
    node.dataset.enabled = String(row.enabled);
    toggle.setAttribute('aria-checked', String(row.enabled));
    toggle.setAttribute('aria-label', `${row.prompt.name || row.prompt.identifier}：${row.enabled ? '关闭' : '开启'}`);
  }
  function playCardActivation(node: HTMLElement) {
    if (panel.hidden || !node.isConnected || !node.animate || host.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const effect = el('span', 'mm-card-activation');
    const light = el('span', 'mm-card-activation-light');
    effect.setAttribute('aria-hidden', 'true');
    effect.append(light);
    node.append(effect);
    const motion = light.animate([
      { transform: 'translateX(-84%)', opacity: 0 },
      { opacity: 1, offset: .12 },
      { opacity: 1, offset: .88 },
      { transform: 'translateX(84%)', opacity: 0 },
    ], { duration: 640, easing: 'cubic-bezier(.33,.15,.67,.85)' });
    const remove = () => effect.remove();
    void motion.finished.then(remove, remove);
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
      row.copyable,
    );
    if (copy.dataset.permitted === 'false') copy.title = '内建与 Marker 条目不支持直接复制';
    controls.append(copy);
    if (row.attached) {
      const unlock = writeControl(
        button('解锁并移出当前发送顺序', 'unlock', () => void run(() => controller.detach(prompt.identifier))),
        row.detachable,
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
          row.deletable,
        ),
      );
    }
    const toggle = writeControl(el('button', 'mm-toggle'), row.attached && row.toggleable);
    toggle.type = 'button';
    toggle.setAttribute('role', 'switch');
    setCardEnabled(node, toggle, row);
    toggle.title = !row.toggleable ? '该 Marker 的开关由酒馆管理' : row.attached ? '切换激活状态' : '重新挂接后可激活';
    toggle.addEventListener('click', () => void run(async () => {
      const activating = node.dataset.enabled === 'false';
      await controller.toggle(prompt.identifier);
      if (activating && node.dataset.enabled === 'true' && !controller.state.error) playCardActivation(node);
    }));
    controls.append(toggle);
    node.append(text, controls);
    return node;
  }
  function renderStatus() {
    const error = localError || controller.state.error;
    if (errorBox.textContent !== error) errorBox.textContent = error;
    errorBox.hidden = !error;
    const editorError = editorLayer.querySelector<HTMLElement>('[data-editor-error]');
    if (editorError && editorError.textContent !== error) editorError.textContent = error;
  }
  function cleanBlocked() {
    const state = controller.state;
    return state.busy || fileBusy || !state.snapshot || state.dirty || state.conflict ||
      Boolean(controller.binding && controller.binding.state.status !== 'ready');
  }
  let lastCleanBlocked: boolean | undefined;
  function updateSessionControls() {
    const state = controller.state;
    saveChangesButton.disabled = state.busy || fileBusy || !state.dirty || state.conflict;
    closeButton.disabled = state.busy || fileBusy;
    refreshButton.disabled = state.busy || fileBusy;
    const blocked = cleanBlocked();
    if (lastCleanBlocked !== blocked) {
      lastCleanBlocked = blocked;
      for (const node of cleanControls) node.disabled = blocked;
      for (const choice of presetChoices.children) (choice as HTMLButtonElement).disabled = blocked;
    }
    if (presetSelect.disabled || state.draft || state.parametersDraft) closePresetChoices();
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
    const labels = { 'no-chat': '无对话', initializing: '正在建立绑定', bound: '此对话', missing: '此对话 · 绑定缺失' };
    const label = `当前使用预设 · ${labels[binding.mode]}`;
    if (presetLabel.textContent !== label) presetLabel.textContent = label;
    const applied = binding.appliedName;
    if (binding.status === 'error') showPresetValue('', '预设确认失败，请重新读取');
    else showPresetValue(applied ?? '');
    const isDefault = Boolean(applied && applied === binding.defaultName);
    defaultButton.setAttribute('aria-pressed', String(isDefault));
    defaultButton.title = isDefault ? '当前为默认预设' : '将当前预设设为默认';
    defaultButton.setAttribute('aria-label', defaultButton.title);
    defaultButton.disabled = !applied || binding.status !== 'ready' || controller.state.busy || controller.state.dirty || fileBusy;
  }
  let lastRender: { snapshot: unknown; pending: unknown; draft: unknown; parameters: unknown; revision: number; category: string; busy: boolean; file: boolean } | null = null;
  let renderedRows: { name?: string; revision?: string; pending: unknown; category: string } | undefined;
  let lastWriteBlocked: boolean | undefined;
  function render() {
    if (disposed || panel.hidden) return;
    const state = controller.state;
    if (toolsPreset && (state.snapshot?.name !== toolsPreset || (tools && tools.presetName() !== toolsPreset)))
      dismissPresetTools(false);
    const key = { snapshot: state.snapshot, pending: state.pendingRaw, draft: state.draft, parameters: state.parametersDraft, revision: state.localRevision, category: state.category, busy: state.busy, file: fileBusy };
    if (lastRender && Object.keys(key).every(k => key[k as keyof typeof key] === lastRender![k as keyof typeof key])) {
      updateSessionControls(); renderStatus(); return;
    }
    lastRender = key;
    if (drag && (drag.revision !== controller.revision() || drag.category !== state.category || state.busy))
      cancelDrag();
    const namesKey = JSON.stringify(state.snapshot?.names ?? []);
    if (presetSelect.dataset.names !== namesKey) {
      closePresetChoices(); presetChoices.replaceChildren();
      for (const name of state.snapshot?.names ?? []) {
        const choice = writeControl(button(name, undefined, () => {
          if (presetSelect.disabled) return;
          const changed = name !== presetSelect.dataset.value;
          closePresetChoices(true); delete presetControl.dataset.keyboardFocus; cancelDrag();
          if (changed) void run(() => controller.select(name));
        }, 'mm-parameter-option'));
        choice.dataset.clean = 'true'; choice.dataset.value = name; choice.disabled = cleanBlocked();
        choice.setAttribute('role', 'option'); choice.tabIndex = -1;
        choice.append(createIcon(doc, 'check')); presetChoices.append(choice);
      }
      presetSelect.dataset.names = namesKey;
      delete presetSelect.dataset.value;
    }
    // Show only the confirmed state; selection still goes through Controller/Binding.
    if (!controller.binding) showPresetValue(state.snapshot?.name ?? '');
    const rowKey = { name: state.snapshot?.name, revision: state.snapshot?.revision, pending: state.pendingRaw, category: state.category };
    if (!renderedRows || renderedRows.name !== rowKey.name || renderedRows.revision !== rowKey.revision ||
        renderedRows.pending !== rowKey.pending || renderedRows.category !== rowKey.category) {
      renderRows();
      renderedRows = rowKey;
    }
    renderEditor();
    renderStatus();
    const blocked = state.busy || fileBusy || !state.snapshot;
    if (lastWriteBlocked !== blocked) {
      lastWriteBlocked = blocked;
      // Newly created controls already inherit this state in writeControl.
      for (const node of panel.querySelectorAll<HTMLInputElement | HTMLButtonElement>('[data-write]:not([data-clean])'))
        node.disabled = blocked || node.dataset.permitted === 'false';
    }
    updateSessionControls();
    const busy = String(state.busy || fileBusy);
    if (frame.getAttribute('aria-busy') !== busy) frame.setAttribute('aria-busy', busy);
  }

  function renderRows() {
    const state = controller.state;
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
        item.attached, item.editable, item.copyable, item.detachable, item.deletable, item.toggleable]);
      let cached = cardCache.get(item.prompt.identifier);
      if (!cached || cached.key !== key) {
        cached = { key, node: card(item) }; cardCache.set(item.prompt.identifier, cached);
      } else {
        if (cached.node.dataset.enabled !== String(item.enabled))
          setCardEnabled(cached.node, cached.node.querySelector<HTMLButtonElement>('.mm-toggle')!, item);
        if (!cached.node.isConnected) {
          const blocked = state.busy || fileBusy || !state.snapshot;
          for (const control of cached.node.querySelectorAll<HTMLButtonElement>('[data-write]'))
            control.disabled = blocked || control.dataset.permitted === 'false';
        }
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
  }

  function mountCards(list: HTMLElement, nodes: HTMLElement[], preserveOrder = false) {
    if (!list.firstElementChild && nodes.length) {
      const fragment = doc.createDocumentFragment();
      for (const node of nodes) fragment.append(node);
      list.append(fragment);
      return;
    }
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
    // Safari can end composition before emitting its IME keydown (229).
    if (event.isComposing || event.keyCode === 229) return;
    if ((toolEditorMotion.closing || toolsClosing || presetDownload.closing) && (event.key === 'Tab' || event.key === 'Escape')) {
      event.preventDefault(); event.stopPropagation(); return;
    }
    if (editorLayer.dataset.parameterMotion && (event.key === 'Tab' ||
        (event.key === 'Escape' && editorLayer.dataset.parameterMotion === 'closing'))) {
      event.preventDefault(); event.stopPropagation(); return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      requestBack();
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
      const surface = !presetDownload.layer.hidden ? presetDownload.layer : !toolEditorLayer.hidden ? toolEditorLayer :
        !toolsLayer.hidden ? toolsLayer :
        !launcherLayer.hidden ? launcherLayer : !confirmLayer.hidden ? confirmLayer : !editorLayer.hidden ? editorLayer : frame;
      const focusable = [
        ...surface.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]',
        ),
      ].filter(node => !node.closest('[hidden],[inert]') && node.getClientRects().length);
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
    if (resized) { cancelDrag(); parameterPresentation.cancel(); finishDialogMotions(); }
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
    if (!panel.hidden && !presetChoices.hidden) positionPresetChoices();
    parameterPicker?.position();
    const active = doc.activeElement as HTMLElement | null;
    if (resized && active && (editorLayer.contains(active) || toolEditorLayer.contains(active)) && active.matches('input,select,textarea'))
      active.scrollIntoView({ block: 'nearest' });
  }
  function setPresentation(mode: 'local' | 'native' | 'hub') {
    presetDownload.close(false);
    dismissLauncherSettings(false);
    dismissPresetTools(false);
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
    let geometryFrame: number | undefined;
    const scheduleViewport = () => {
      if (geometryFrame !== undefined) return;
      geometryFrame = host.requestAnimationFrame(() => { geometryFrame = undefined; viewport(); });
    };
    listen(host.visualViewport, 'resize', scheduleViewport);
    listen(host.visualViewport, 'scroll', scheduleViewport);
    cleanup.push(() => { if (geometryFrame !== undefined) host.cancelAnimationFrame(geometryFrame); });
  }
  function open() {
    if (disposed) return;
    characterHeader.refresh();
    if (panel.hidden) returnFocus = doc.activeElement as HTMLElement | null;
    panel.hidden = false;
    panel.inert = false;
    viewport();
    void controller.prepareOpen();
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
  function requestBack():boolean {
    if (!presetDownload.layer.hidden) { presetDownload.requestBack(); return true; }
    if (!launcherLayer.hidden) { dismissLauncherSettings(); return true; }
    if (!toolsLayer.hidden) { backFromPresetTools(); return true; }
    if(migrationView.requestBack())return true;
    if (drag) cancelDrag();
    else if (confirmClose) confirmClose();
    else if (controller.state.parametersDraft && !controller.state.busy) controller.cancelParameters();
    else if (controller.state.draft && !controller.state.busy) controller.cancelEdit();
    else if (!menu.hidden) {
      menu.hidden = true;
      moreButton.setAttribute('aria-expanded', 'false');
      moreButton.focus();
    } else requestClose();
    return true;
  }
  function requestClose() {
    const closing=closeHandler;
    closePresetChoices();
    if (disposed || controller.state.busy || fileBusy) return;
    cancelDrag();
    menu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    if (controller.state.dirty) {
      dialog('关闭预设管理', el('p', 'mm-confirm-copy', '有未保存的内容，是否关闭？选择“是”将丢弃未保存的修改。'), '是', async () => {
        if(disposed || closing!==closeHandler)return;
        controller.cancelChanges();
        if (closing) await closing(); else close();
      }, true, '否');
      return;
    }
    controller.cancelChanges();
    if (closeHandler) closeHandler(); else close();
  }
  function close() {
    presetDownload.close(false);
    dismissLauncherSettings(false);
    dismissPresetTools(false);
    migrationView.close();
    closePresetChoices();
    parameterPicker?.close();
    parameterPresentation.cancel();
    cancelDrag();
    panel.hidden = true;
    panel.inert = true;
    menu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    if (panel.dataset.presentation === 'local' && returnFocus?.isConnected) returnFocus.focus();
  }
  cleanup.push(protectNativeControls(host, panel));
  cleanup.push(observeWindowLayer(host, panel));
  const unsubscribe = controller.subscribe(render);
  viewport();
  render();
  return {
    panel,
    launcherAppearance,
    open,
    close,
    setCloseHandler(handler) { closeHandler = handler; },
    requestBack,
    ownsEvent:event => migrationView.ownsEvent(event),
    setPresentation,
    dispose() {
      if (disposed) return;
      disposed = true;
      parameterPicker?.dispose(); parameterPicker = null;
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
