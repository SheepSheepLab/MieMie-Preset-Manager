// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import type { ManagerController, ManagerView, Row } from './contracts';
import { createIcon, type IconName } from './icons';
import { managerStyles } from './styles';

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
    if (className !== 'mm-icon') node.append(doc.createTextNode(label));
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
  const style = el('style');
  style.textContent = managerStyles;
  const frame = el('section', 'mm-frame');
  frame.setAttribute('role', 'dialog');
  frame.setAttribute('aria-modal', 'true');
  frame.setAttribute('aria-label', '咩咩预设管理');
  frame.tabIndex = -1;
  panel.append(style, frame);
  const header = el('header', 'mm-header');
  const brandline = el('div', 'mm-brandline');
  const logo = el('div', 'mm-logo');
  logo.append(createIcon(doc, 'sheep'));
  const brand = el('div', 'mm-brand');
  brand.append(el('h2', '', '咩咩预设管理'), el('div', 'mm-subtitle', 'MIEMIE PRESET MANAGER'));
  const closeButton = button('关闭预设管理', 'close', close);
  closeButton.classList.add('mm-return');
  brandline.append(logo, brand, closeButton);
  const toolbar = el('div', 'mm-toolbar');
  const presetField = el('label', 'mm-preset-field');
  const presetSelect = writeControl(el('select'));
  presetSelect.setAttribute('aria-label', '当前使用预设');
  presetSelect.addEventListener('change', () => {
    cancelDrag();
    void run(() => controller.select(presetSelect.value));
  });
  presetField.append(el('span', 'mm-preset-label', '当前使用预设'), presetSelect);
  const actions = el('div', 'mm-actions');
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
        }),
    ),
  );
  const copyButton = writeControl(button('复制当前预设', 'copy', () => void run(() => controller.copyPreset())));
  const moreWrap = el('div', 'mm-more-wrap');
  const menu = el('div', 'mm-menu');
  menu.hidden = true;
  const moreButton = button('更多预设操作', 'more', () => {
    menu.hidden = !menu.hidden;
    moreButton.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) positionMenu();
  });
  moreButton.setAttribute('aria-expanded', 'false');
  const recoveryButton = button(
    '导出操作前备份',
    'export',
    () => {
      if (disposed || controller.state.busy || fileBusy || !controller.state.recovery) return;
      try {
        const result = controller.exportRecovery();
        download(`${result.name} 操作前备份`, result.text);
        menu.hidden = true;
        moreButton.setAttribute('aria-expanded', 'false');
      } catch (error) {
        showLocalError(error);
      }
    },
    '',
  );
  recoveryButton.title = '导出当前会话中上一次操作前的原生预设；关闭整个脚本后此备份会清除';
  menu.append(
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
    recoveryButton,
  );
  moreWrap.append(moreButton, menu);
  actions.append(importButton, exportButton, copyButton, moreWrap, fileInput);
  toolbar.append(presetField, actions);
  header.append(brandline, toolbar);
  const errorBox = el('div', 'mm-status mm-error');
  errorBox.setAttribute('role', 'alert');
  errorBox.hidden = true;
  const noticeBox = el('div', 'mm-status mm-notice');
  noticeBox.setAttribute('role', 'status');
  noticeBox.hidden = true;
  const tabs = el('nav', 'mm-categorybar');
  tabs.setAttribute('aria-label', '按条目名称分类');
  const scroll = el('div', 'mm-scroll');
  const attachedList = el('div', 'mm-list');
  attachedList.setAttribute('aria-label', '发送顺序');
  const unlockedHead = el('div', 'mm-unlocked-head');
  unlockedHead.append(
    el('h3', '', '已解锁条目'),
    el('p', 'mm-hint', '已退出当前发送顺序，可重新挂接；删除仍遵循原生规则。'),
  );
  const detachedList = el('div', 'mm-list');
  scroll.append(attachedList, unlockedHead, detachedList);
  const footer = el('footer', 'mm-footer');
  const footerHint = el('span', 'mm-hint', '本地管理 · 内容不会上传');
  const footerActions = el('div', 'mm-actions');
  footerActions.append(
    button('重新读取实际状态', 'refresh', () => void run(() => controller.refresh())),
    writeControl(button('新增条目', 'plus', () => void run(() => controller.addPrompt()), 'mm-secondary')),
  );
  footer.append(footerHint, footerActions);
  const editorLayer = el('div', 'mm-modal-layer');
  editorLayer.hidden = true;
  const confirmLayer = el('div', 'mm-modal-layer mm-confirm-layer');
  confirmLayer.hidden = true;
  frame.append(header, errorBox, noticeBox, tabs, scroll, footer);
  panel.append(editorLayer, confirmLayer);
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
  ) {
    menu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    confirmClose?.();
    const previous = doc.activeElement as HTMLElement | null;
    const expected = controller.state.snapshot;
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
    const cancel = button('取消', undefined, dismiss, 'mm-secondary');
    const accept = writeControl(
      button(
        submitLabel,
        undefined,
        () => {
          try {
            assertDialogContext(expected?.name, expected?.revision);
          } catch (error) {
            dismiss();
            showLocalError(error);
            return;
          }
          accept.disabled = true;
          cancel.disabled = true;
          void run(async () => {
            await submit();
          }).then(() => {
            if (disposed) return;
            if (!controller.state.error && !localError) dismiss();
            else {
              dialogError.textContent = controller.state.error || localError;
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
  function renderEditor() {
    const state = controller.state;
    const draft = state.draft;
    const key = draft ? `${state.snapshot?.name}\0${draft.id}` : '';
    if (!draft) {
      if (editorKey) {
        editorLayer.replaceChildren();
        editorLayer.hidden = true;
        editorReturnFocus?.isConnected && editorReturnFocus.focus();
      }
      editorKey = '';
      return;
    }
    if (key === editorKey) return;
    const prompt = state.snapshot?.raw.prompts.find(item => item.identifier === draft.id);
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
        writeControl(button('重新挂接到发送顺序', 'plus', () => void run(() => controller.attach(prompt.identifier)))),
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
    noticeBox.textContent = fileBusy
      ? '正在读取导入文件…'
      : controller.state.busy
        ? '正在保存并核对 SillyTavern 实际状态…'
        : errorBox.hidden
          ? controller.state.notice
          : '';
    noticeBox.hidden = !noticeBox.textContent;
    const editorError = editorLayer.querySelector<HTMLElement>('[data-editor-error]');
    if (editorError) editorError.textContent = localError || controller.state.error;
  }
  function render() {
    if (disposed) return;
    const state = controller.state;
    if (drag && (drag.revision !== state.snapshot?.revision || drag.category !== state.category || state.busy))
      cancelDrag();
    const namesKey = JSON.stringify([state.snapshot?.name, state.snapshot?.names]);
    if (presetSelect.dataset.names !== namesKey) {
      presetSelect.replaceChildren();
      for (const name of state.snapshot?.names ?? []) option(presetSelect, name, name);
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
    const rowsKey = JSON.stringify([
      state.snapshot?.revision,
      state.category,
      rows.map(item => [item.prompt, item.enabled, item.attached, item.editable, item.removable, item.canDetach]),
    ]);
    if (scroll.dataset.key !== rowsKey) {
      const previousFocus = doc.activeElement as HTMLElement | null;
      const focusedCard = previousFocus?.closest<HTMLElement>('.mm-card');
      const focusedId = focusedCard?.dataset.id;
      attachedList.replaceChildren(...rows.filter(row => row.attached).map(card));
      detachedList.replaceChildren(...rows.filter(row => !row.attached).map(card));
      unlockedHead.hidden = !detachedList.childElementCount;
      if (!attachedList.childElementCount)
        attachedList.append(
          el('p', 'mm-empty', state.snapshot ? '这个分类中没有已挂接条目' : '读取预设后，提示词条目会显示在这里'),
        );
      scroll.dataset.key = rowsKey;
      if (focusedId && previousFocus === focusedCard)
        [...scroll.querySelectorAll<HTMLElement>('.mm-card')].find(item => item.dataset.id === focusedId)?.focus();
    }
    renderEditor();
    renderStatus();
    for (const node of panel.querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('[data-write]'))
      node.disabled = state.busy || fileBusy || !state.snapshot || node.dataset.permitted === 'false';
    frame.setAttribute('aria-busy', String(state.busy || fileBusy));
    recoveryButton.disabled = state.busy || fileBusy || !state.recovery;
    footerHint.textContent =
      state.category === '全部' ? '本地管理 · 内容不会上传' : '分类排序只调整可见条目，其他条目位置保留';
  }

  type Drag = {
    id: string;
    revision: string;
    category: string;
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
  };
  let drag: Drag | null = null;
  function cancelDrag() {
    if (!drag) return;
    if (drag.timer !== null) host.clearTimeout(drag.timer);
    if (drag.raf !== null) host.cancelAnimationFrame(drag.raf);
    drag.source.classList.remove('mm-drag-source');
    drag.ghost?.remove();
    drag = null;
    panel.classList.remove('mm-drag-active');
    attachedList.classList.remove('mm-drop-end');
    for (const node of attachedList.querySelectorAll('.mm-drop-before')) node.classList.remove('mm-drop-before');
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
      revision: controller.state.snapshot.revision,
      category: controller.state.category,
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
      current.revision !== controller.state.snapshot?.revision ||
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
    const autoScroll = () => {
      if (drag !== current || !current.active) return;
      const bounds = scroll.getBoundingClientRect();
      const speed =
        current.y < bounds.top + 56
          ? -Math.min(15, (bounds.top + 56 - current.y) / 3)
          : current.y > bounds.bottom - 56
            ? Math.min(15, (current.y - bounds.bottom + 56) / 3)
            : 0;
      if (speed) {
        scroll.scrollTop += speed;
        updateDrag(current.x, current.y);
      }
      current.raf = host.requestAnimationFrame(autoScroll);
    };
    current.raf = host.requestAnimationFrame(autoScroll);
  }
  function updateDrag(x: number, y: number) {
    if (!drag) return;
    drag.x = x;
    drag.y = y;
    if (!drag.active) {
      const distance = Math.hypot(x - drag.startX, y - drag.startY);
      if (drag.touchId !== null && distance > 8) cancelDrag();
      else if (drag.touchId === null && distance > 4) activateDrag();
      return;
    }
    if (drag.ghost) drag.ghost.style.transform = `translate(${x - drag.startX}px,${y - drag.startY}px) rotate(-1deg)`;
    const candidates = [...attachedList.querySelectorAll<HTMLElement>('.mm-card')].filter(
      node => node.dataset.id !== drag?.id,
    );
    let before: HTMLElement | undefined;
    for (const node of candidates) {
      node.classList.remove('mm-drop-before');
      const box = node.getBoundingClientRect();
      if (!before && y < box.top + box.height / 2) before = node;
    }
    before?.classList.add('mm-drop-before');
    attachedList.classList.toggle('mm-drop-end', !before);
    drag.before = before?.dataset.id ?? null;
  }
  function finishDrag() {
    const current = drag;
    cancelDrag();
    const rows = controller.rows().filter(row => row.attached);
    const index = rows.findIndex(row => row.prompt.identifier === current?.id);
    if (index >= 0 && (rows[index + 1]?.prompt.identifier ?? null) === current?.before) return;
    if (
      current?.active &&
      current.revision === controller.state.snapshot?.revision &&
      current.category === controller.state.category
    )
      void run(() => controller.move(current.id, current.before, current.revision));
  }
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
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (drag) cancelDrag();
      else if (confirmClose) confirmClose();
      else if (controller.state.draft && !controller.state.busy) controller.cancelEdit();
      else if (!menu.hidden) {
        menu.hidden = true;
        moreButton.setAttribute('aria-expanded', 'false');
        moreButton.focus();
      } else close();
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
      const revision = controller.state.snapshot?.revision;
      if (revision) void run(() => controller.move(target.dataset.id!, before, revision));
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
  function viewport() {
    const viewport = host.visualViewport;
    const width = viewport?.width ?? host.innerWidth;
    const height = viewport?.height ?? host.innerHeight;
    const resized = panel.style.width !== `${width}px` || panel.style.height !== `${height}px`;
    // A pending drop was measured in the old geometry. Rotation must not commit it.
    if (resized) cancelDrag();
    panel.style.top = `${viewport?.offsetTop ?? 0}px`;
    panel.style.left = `${viewport?.offsetLeft ?? 0}px`;
    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;
    panel.dataset.compact = String(width <= 600);
    panel.dataset.short = String(height <= 500);
    panel.dataset.fullbleed = String(width <= 600 || height <= 500);
    if (!panel.hidden && !menu.hidden) positionMenu();
    const active = doc.activeElement as HTMLElement | null;
    if (resized && active && editorLayer.contains(active) && active.matches('input,select,textarea'))
      active.scrollIntoView({ block: 'nearest' });
  }
  listen(host, 'resize', viewport);
  if (host.visualViewport) {
    listen(host.visualViewport, 'resize', viewport);
    listen(host.visualViewport, 'scroll', viewport);
  }
  function open() {
    if (disposed) return;
    if (panel.hidden) returnFocus = doc.activeElement as HTMLElement | null;
    panel.hidden = false;
    panel.inert = false;
    viewport();
    render();
    const first = !editorLayer.hidden ? editorLayer.querySelector<HTMLElement>('input') : presetSelect;
    (first ?? frame).focus();
  }
  function close() {
    cancelDrag();
    panel.hidden = true;
    panel.inert = true;
    menu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    if (returnFocus?.isConnected) returnFocus.focus();
  }
  const unsubscribe = controller.subscribe(render);
  viewport();
  render();
  return {
    panel,
    open,
    close,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelDrag();
      unsubscribe();
      for (const remove of cleanup.splice(0)) remove();
      for (const timer of timers) host.clearTimeout(timer);
      for (const url of urls) URL.revokeObjectURL(url);
      panel.remove();
    },
  };
}
