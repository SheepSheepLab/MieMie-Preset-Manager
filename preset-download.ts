// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

import { createFloatingPicker } from './floating-picker';
import { createIcon, type IconName } from './icons';
import { createDialogMotion } from './dialog-motion';
import { fetchCatalog, fetchCatalogFile, fetchRelease, fetchReleases, releaseLink, type CatalogItem, type CatalogRelease } from './preset-catalog';
import { parsePresetRegex } from './preset-regex';
import type { ManagerController } from './contracts';

const releaseDateFormat = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric',
});
type Destination = { companion?: CatalogItem; target?: string };
type Job = { request: AbortController; writing: boolean };

export function createPresetDownload(doc: Document, id: string, trigger: HTMLElement,
  controller: ManagerController, onClose: (restoreFocus: boolean) => void) {
  const host = doc.defaultView!;
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
    const element = doc.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }
  function button(text: string, className: string, action?: () => void, icon?: IconName) {
    const element = el('button', 'mm-button ' + className);
    element.type = 'button';
    if (icon) element.append(createIcon(doc, icon));
    element.append(doc.createTextNode(text));
    if (action) element.addEventListener('click', action);
    return element;
  }
  function releaseDate(date?: string) {
    if (!date) return doc.createTextNode('发布日期暂不可用');
    const time = el('time', '', releaseDateFormat.format(new Date(date)));
    time.dateTime = date;
    return time;
  }
  function makeDialog(title: string, dialogId: string, icon: IconName) {
    const dialog = el('section', 'mm-dialog mm-download-dialog');
    dialog.id = dialogId;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const heading = el('div', 'mm-dialog-head');
    const mark = el('span', 'mm-tools-icon');
    mark.append(createIcon(doc, icon));
    const label = el('h3', '', title);
    label.id = dialogId + '-title';
    label.tabIndex = -1;
    dialog.setAttribute('aria-labelledby', label.id);
    heading.append(mark, label);
    const body = el('div', 'mm-dialog-body');
    const actions = el('div', 'mm-dialog-actions');
    dialog.append(heading, body, actions);
    return { dialog, heading, body, actions, label, mark };
  }
  const layer = el('div', 'mm-modal-layer mm-download-layer');
  layer.hidden = true;
  const catalog = makeDialog('预设下载', id, 'download');
  const detailLayer = el('div', 'mm-modal-layer mm-download-confirm-layer');
  detailLayer.hidden = true;
  const detail = makeDialog('', id + '-detail', 'link');
  detailLayer.append(detail.dialog);
  layer.append(catalog.dialog, detailLayer);
  const catalogMotion = createDialogMotion(host, layer, catalog.dialog, [catalog.heading, catalog.body, catalog.actions]);
  const detailMotion = createDialogMotion(host, detailLayer, detail.dialog, [detail.heading, detail.body, detail.actions]);
  const announcement = el('span', 'mm-download-announcement');
  announcement.setAttribute('role', 'status');
  catalog.actions.append(announcement, button('返回', 'mm-secondary', () => close(), 'back'));

  function list(title: string, suffix: string) {
    const section = el('section', 'mm-download-group');
    const heading = el('h4', '', title);
    heading.id = id + '-' + suffix;
    section.setAttribute('aria-labelledby', heading.id);
    const rows = el('ul', 'mm-download-rows');
    rows.tabIndex = 0;
    rows.setAttribute('aria-labelledby', heading.id);
    section.append(heading, rows);
    catalog.body.append(section);
    return rows;
  }
  const presetsList = list('预设', 'preset');
  const regexList = list('正则', 'regex');
  let items: CatalogItem[] = [];
  const releases = new Map<number, CatalogRelease>();
  const dates = new Map<HTMLSpanElement, CatalogItem>();
  let catalogRequest: AbortController | undefined;
  let detailRequest: AbortController | undefined;
  let activeJob: Job | undefined;
  let backToRow: HTMLButtonElement | undefined;
  let picker: ReturnType<typeof createFloatingPicker> | undefined;
  const textDecoder = new TextDecoder('utf-8', { fatal: true });
  let mirrored = false;
  const dateFor = (item: CatalogItem) => releases.get(item.releaseId)?.publishedAt;
  const message = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重试。';

  function publishRelease(release: CatalogRelease) {
    releases.set(release.id, release);
    for (const [element, item] of dates) if (item.releaseId === release.id) {
      element.replaceChildren(releaseDate(release.publishedAt));
    }
  }
  function loadCatalog() {
    catalogRequest?.abort();
    const request = catalogRequest = new AbortController();
    items = [];
    dates.clear();
    releases.clear();
    mirrored = false;
    for (const rows of [presetsList, regexList]) rows.replaceChildren(el('li', 'mm-download-empty', '正在读取资源目录…'));
    void fetchCatalog(host, request.signal).then(result => {
      if (request.signal.aborted) return;
      items = result.items;
      mirrored = result.mirrored;
      for (const release of result.releases) publishRelease(release);
      for (const [kind, rows] of [['preset', presetsList], ['regex', regexList]] as const) {
        const entries = items.filter(item => item.kind === kind);
        rows.replaceChildren(...(entries.length ? entries.map(makeRow) : [el('li', 'mm-download-empty', '暂无已发行的文件。')]));
      }
      if (!mirrored) void fetchReleases(host, request.signal).then(result => {
        if (!request.signal.aborted) for (const release of result) publishRelease(release);
      }).catch(() => { /* Logs can still be read individually. */ });
    }).catch(error => {
      if (request.signal.aborted) return;
      for (const rows of [presetsList, regexList]) {
        const state = el('li', 'mm-download-empty', message(error));
        state.append(button('重试', 'mm-secondary', loadCatalog));
        rows.replaceChildren(state);
      }
    });
  }

  function makeRow(item: CatalogItem) {
    const row = el('li', 'mm-download-row');
    const icon = el('span', 'mm-download-row-icon');
    icon.append(createIcon(doc, item.kind === 'preset' ? 'view' : 'regex'));
    const title = el('strong', '', item.name);
    title.title = item.name;
    const date = el('span');
    date.append(releaseDate(dateFor(item)));
    dates.set(date, item);
    const subtitle = el('span');
    subtitle.append(date);
    const copy = el('div', 'mm-download-row-copy');
    copy.append(title, subtitle);
    const notes = el('button', 'mm-download-row-notes');
    notes.type = 'button';
    notes.setAttribute('aria-haspopup', 'dialog');
    notes.setAttribute('aria-label', '查看 ' + item.name + ' 的更新日志');
    notes.append(icon, copy);
    notes.addEventListener('click', () => showNotes(item, notes));
    const controls = el('div', 'mm-download-row-controls');
    const track = el('span', 'mm-download-progress');
    const fill = el('span');
    const percent = el('span');
    track.append(fill);
    track.hidden = true;
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', item.name + ' 的下载进度');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    let running: Job | undefined;
    const action = button('下载', 'mm-download-row-action', () => {
      if (running) {
        if (!running.writing) running.request.abort();
      } else if (!activeJob) {
        showDownload(item, action, start);
      }
    });
    action.setAttribute('aria-label', '下载 ' + item.name);
    controls.append(action, track);
    row.append(notes, controls);
    return row;

    function paint(value: number) {
      track.setAttribute('aria-valuenow', String(value));
      fill.style.transform = 'scaleX(' + value / 100 + ')';
      percent.textContent = value + '%';
    }
    function finish(text: string, success = false) {
      running = undefined;
      track.hidden = true;
      row.dataset.downloadState = success ? 'complete' : 'idle';
      subtitle.textContent = text;
      subtitle.title = text;
      action.disabled = false;
      action.textContent = success ? '已完成' : '重试';
      if (success) action.prepend(createIcon(doc, 'check'));
      action.setAttribute('aria-label', (success ? '重新下载 ' : '重试下载 ') + item.name);
      announcement.textContent = text;
    }
    async function start(destination: Destination) {
      if (activeJob) return;
      const job: Job = { request: new AbortController(), writing: false };
      running = activeJob = job;
      const signal = job.request.signal;
      row.dataset.downloadState = 'running';
      track.hidden = false;
      subtitle.textContent = '正在下载…';
      subtitle.removeAttribute('title');
      action.setAttribute('aria-label', '取消下载 ' + item.name);
      action.replaceChildren(createIcon(doc, 'stop'), percent);
      paint(0);
      const files = destination.companion ? [item, destination.companion] : [item];
      const total = files.reduce((sum, file) => sum + file.size, 0);
      const loaded = files.map(() => 0);
      try {
        const [bytes, companion] = await Promise.all(files.map((file, index) =>
          fetchCatalogFile(host, file, signal, count => {
            if (signal.aborted) return;
            loaded[index] = count;
            paint(Math.min(99, Math.floor(100 * loaded.reduce((sum, size) => sum + size, 0) / total)));
          }, mirrored)));
        signal.throwIfAborted();
        job.writing = true;
        action.disabled = true;
        action.setAttribute('aria-label', '正在处理 ' + item.name);
        subtitle.textContent = item.kind === 'preset' ? '正在导入…' : destination.target ? '正在绑定…' : '正在保存文件…';
        if (item.kind === 'preset') {
          ensurePresetWrite();
          const scripts = companion ? parsePresetRegex(textDecoder.decode(companion)) : undefined;
          await controller.importText(item.name, textDecoder.decode(bytes), scripts);
          if (controller.state.error) throw Error(controller.state.error);
          const installed = controller.state.snapshot?.name ?? item.name;
          finish(scripts ? '已导入并绑定正则 · ' + installed : '已导入 · ' + installed, true);
        } else if (destination.target) {
          ensurePresetWrite();
          await controller.bindRegex(destination.target, parsePresetRegex(textDecoder.decode(bytes)));
          if (controller.state.error) throw Error(controller.state.error);
          finish('已添加到「' + destination.target + '」', true);
        } else {
          saveFile(bytes, item.filename);
          finish('已下载文件', true);
        }
      } catch (error) {
        finish(signal.aborted ? '已取消下载' : message(error));
        job.request.abort();
      } finally {
        if (activeJob === job) activeJob = undefined;
      }
    }
  }

  function ensurePresetWrite() {
    const { busy, dirty, conflict, snapshot } = controller.state;
    if (busy || dirty || conflict || !snapshot) throw Error('请先完成或保存当前预设操作，再重新下载。');
  }

  function saveFile(bytes: Uint8Array<ArrayBuffer>, filename: string) {
    const url = host.URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
    const a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.append(a);
    try { a.click(); }
    finally {
      a.remove();
      host.setTimeout(() => host.URL.revokeObjectURL(url), 30000);
    }
  }

  function openDetail(row: HTMLButtonElement, title: string, icon: IconName) {
    catalogMotion.finish();
    backToRow = row;
    announcement.textContent = '';
    catalog.dialog.inert = true;
    detailLayer.hidden = false;
    delete detail.dialog.dataset.downloadKind;
    detail.label.textContent = title;
    detail.mark.replaceChildren(createIcon(doc, icon));
  }
  function animateDetail(row: HTMLButtonElement) {
    detail.body.scrollTop = 0;
    detail.label.focus({ preventScroll: true });
    detailMotion.play(true, row);
  }

  function showNotes(item: CatalogItem, row: HTMLButtonElement) {
    openDetail(row, '更新日志', 'view');
    const info = el('div', 'mm-release-notes-info');
    info.append(el('strong', '', item.name));
    const date = el('span', 'mm-release-notes-date');
    if (dateFor(item)) date.append(releaseDate(dateFor(item)));
    info.append(date);
    const status = el('p', 'mm-download-destination');
    status.setAttribute('role', 'status');
    const article = el('article', 'mm-release-notes');
    detail.body.replaceChildren(info, status, article);
    const link = el('a', 'mm-button mm-secondary', 'GitHub 发行页');
    link.href = releaseLink(item.tag);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    detail.actions.replaceChildren(button('返回', 'mm-secondary', () => closeDetail(), 'back'), link);
    const cached = releases.get(item.releaseId);
    if (cached?.tag === item.tag) render(cached);
    else {
      status.textContent = '正在读取更新日志…';
      const request = detailRequest = new AbortController();
      void fetchRelease(host, item, request.signal).then(release => {
        if (request.signal.aborted) return;
        if (release) publishRelease(release);
        render(release);
      }).catch(() => {
        if (!request.signal.aborted) status.textContent = '更新日志暂时无法读取，可以打开 GitHub 发行页。';
      });
    }
    animateDetail(row);

    function render(notes?: CatalogRelease) {
      if (!notes?.body) { status.textContent = '该版本暂无公开更新日志。'; return; }
      status.hidden = true;
      if (notes.publishedAt) date.replaceChildren(releaseDate(notes.publishedAt));
      // Preserve adjacent headings and line breaks without inserting remote HTML.
      for (const block of notes.body.split(/\r?\n(?:\s*\r?\n|(?=[\t ]*#{1,6}[\t ]))/u)) {
        const [first, ...lines] = block.trim().split(/\r?\n/u);
        const heading = /^#{1,6}\s+(.+)$/u.exec(first);
        if (heading) article.append(el('h4', '', heading[1]));
        const text = heading ? lines.join('\n') : block.trim();
        if (text) article.append(el('p', '', text));
      }
    }
  }

  function showDownload(item: CatalogItem, row: HTMLButtonElement, start: (destination: Destination) => void) {
    openDetail(row, item.kind === 'preset' ? '下载预设' : '下载正则', item.kind === 'preset' ? 'download' : 'link');
    detail.dialog.dataset.downloadKind = item.kind;
    const selection = el('div', 'mm-download-selection');
    const icon = el('span', 'mm-download-row-icon');
    icon.append(createIcon(doc, item.kind === 'preset' ? 'view' : 'regex'));
    const file = el('div', 'mm-download-selection-copy');
    file.append(el('strong', '', item.name));
    if (dateFor(item)) file.append(releaseDate(dateFor(item)));
    selection.append(icon, file);
    detail.body.replaceChildren(selection);
    let destination: Destination = {};
    const complete = button('下载', 'mm-primary', () => {
      if (complete.disabled) return;
      const selected = destination;
      closeDetail(() => start(selected));
    });
    detail.actions.replaceChildren(button('返回', 'mm-secondary', () => closeDetail(), 'back'), complete);
    const field = el('div', 'mm-download-field');
    const pick = button('', 'mm-download-picker');
    detail.body.append(field);
    function addDownloadOptions(title: string, labels: readonly [string, string], available: boolean, change: (include: boolean) => void) {
      const group = el('fieldset', 'mm-download-options');
      group.append(el('legend', '', title));
      const choices = el('div', 'mm-download-choices');
      group.append(choices);
      for (const [index, label] of labels.entries()) {
        const option = el('label', 'mm-download-option');
        const radio = el('input');
        const secondary = index === 1;
        radio.type = 'radio';
        radio.name = id + '-download-mode';
        radio.checked = !secondary;
        radio.disabled = secondary && !available;
        radio.addEventListener('change', () => { if (radio.checked) change(secondary); });
        option.append(radio, el('span', '', label));
        choices.append(option);
      }
      detail.body.insertBefore(group, field);
    }
    if (item.kind === 'preset') {
      const available = items.filter(candidate => candidate.kind === 'regex');
      const matched = available.filter(candidate => candidate.compatiblePresets.includes(item.version));
      const candidates = matched.length ? matched : available.filter(candidate => !candidate.compatiblePresets.length);
      let selected = candidates.find(candidate => candidate.variant === 'standard')?.key ?? candidates[0]?.key ?? '';
      let include = false;
      function describe() {
        picker?.update(selected, !include || !candidates.length);
        destination = { companion: include ? candidates.find(candidate => candidate.key === selected) : undefined };
      }
      addDownloadOptions('下载内容', ['仅下载预设', '同时下载配套正则'], candidates.length > 0, value => {
        include = value;
        describe();
      });
      field.append(el('span', '', '配套正则'), pick);
      picker = createFloatingPicker(doc, detail.dialog, pick, '配套正则',
        candidates.map(candidate => [candidate.key, candidate.name]), selected, value => { selected = value; describe(); });
      describe();
    } else {
      const snapshot = controller.state.snapshot;
      const presets = [...new Set(snapshot?.names ?? [])];
      let selected = snapshot && presets.includes(snapshot.name) ? snapshot.name : presets[0] ?? '';
      let bind = false;
      const choices: Array<[string, string]> = presets.length ? presets.map(name => [name, name]) : [['', '暂无可选预设']];
      const spinner = el('span', 'mm-download-spinner');
      spinner.setAttribute('aria-hidden', 'true');
      function setDownloadAction(label: string, reading = false) {
        complete.disabled = reading;
        complete.toggleAttribute('data-reading', reading);
        if (reading) complete.setAttribute('aria-busy', 'true');
        else complete.removeAttribute('aria-busy');
        complete.textContent = label;
        if (reading) complete.prepend(spinner);
      }
      function describe() {
        detailRequest?.abort();
        detailRequest = undefined;
        picker?.update(selected, !bind);
        const target = bind ? selected : '';
        destination = { target: target || undefined };
        if (!target) {
          setDownloadAction('下载文件');
          return;
        }
        setDownloadAction('读取中', true);
        const request = detailRequest = new AbortController();
        const showCount = (count?: number) => {
          if (request.signal.aborted) return;
          setDownloadAction(count === 0 ? '下载并绑定' : '下载并追加');
        };
        void controller.readBoundRegexCount(target, request.signal).then(showCount, () => showCount());
      }
      addDownloadOptions('下载方式', ['仅下载文件', '绑定到预设'], presets.length > 0, value => {
        bind = value;
        describe();
      });
      field.append(el('span', '', '目标预设'), pick);
      picker = createFloatingPicker(doc, detail.dialog, pick, '目标预设', choices, selected, name => {
        selected = name;
        describe();
      });
      describe();
    }
    animateDetail(row);
  }
  function hideDetail(restoreFocus = true) {
    if (detailLayer.hidden) return;
    detailRequest?.abort();
    detailRequest = undefined;
    picker?.dispose();
    picker = undefined;
    detail.body.replaceChildren();
    detail.actions.replaceChildren();
    detailLayer.hidden = true;
    detail.dialog.inert = false;
    catalog.dialog.inert = false;
    if (restoreFocus) backToRow?.focus({ preventScroll: true });
    backToRow = undefined;
  }
  function closeDetail(onClosed?: () => void) {
    if (!backToRow || detailMotion.closing) return;
    picker?.close();
    detailRequest?.abort();
    detailMotion.play(false, backToRow, (restoreFocus = true) => {
      hideDetail(restoreFocus);
      if (restoreFocus) onClosed?.();
    });
  }
  function hideCatalog(restoreFocus = true) {
    if (layer.hidden) return;
    hideDetail(false);
    catalogRequest?.abort();
    if (!activeJob?.writing) activeJob?.request.abort();
    layer.hidden = true;
    catalog.dialog.inert = false;
    onClose(restoreFocus);
  }
  function close(restoreFocus = true) {
    if (layer.hidden) return;
    if (!restoreFocus) {
      detailMotion.finish(false);
      catalogMotion.finish(false);
      hideCatalog(false);
    } else if (!catalogMotion.closing) catalogMotion.play(false, trigger, hideCatalog);
  }
  return {
    layer,
    open() {
      layer.hidden = false;
      announcement.textContent = '';
      catalog.body.scrollTop = presetsList.scrollTop = regexList.scrollTop = 0;
      catalog.label.focus({ preventScroll: true });
      catalogMotion.play(true, trigger);
      loadCatalog();
    },
    get closing() { return catalogMotion.closing || detailMotion.closing; },
    finishMotion() { catalogMotion.finish(); detailMotion.finish(); },
    requestBack() { if (detailLayer.hidden) close(); else closeDetail(); },
    close,
  };
}
