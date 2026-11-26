// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

import { scanPresetTags, type TagBlock } from './tag-isolation';
import type { ChatExchange, ChatMessage } from './unicode-chat';

type Data = Record<string, unknown>;
type ReportModule = { title: string; content: string };

const format = /<wlog_format\s*>([\s\S]*?)<\/wlog_format\s*>/dgi;
const report = /<wlog(?=[\s>])(?:[^<>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/wlog\s*>/dgi;
const comment = /<!--[\s\S]*?-->/g;
const separator = String.raw`(?:\\\*\\\*\\\*|(?<!\*)\*{3}(?!\*))`;
const heading = new RegExp(String.raw`(?:^|${separator})[ \t]*(?:\*\*)?【([^】\r\n]+)】(?:\*\*)?(?:[ \t]*[:：])?(?=[ \t]*\r?$)`, 'gmu');
const trailingSeparator = new RegExp(String.raw`${separator}\s*$`, 'u');
const noChanges = /^(?:无(?:变化)?|暂无变化|没有变化)?[。！!]?$/u;

export const WORLD_REPORT_PROMPT = [
  '仅输出本回合有变化的模块即可。',
  '每个输出的模块都必须包含对应的模块标题和更新后的完整内容，格式如下：',
  '【对应模块标题】',
  '对应模块内容',
].join('\n');

function maskComments(text: string) {
  return text.replace(comment, value => value.replace(/[^\r\n]/g, ' '));
}

function parseModules(body: string, titles?: ReadonlySet<string>) {
  const headers = [...maskComments(body).matchAll(heading)].filter(match => !titles || titles.has(match[1].trim()));
  const modules = headers.map((match, index): ReportModule => ({
    title: match[1].trim(),
    content: body.slice(match.index + match[0].length, headers[index + 1]?.index)
      .trim().replace(trailingSeparator, '').trimEnd(),
  }));
  const prefix = body.slice(0, headers[0]?.index ?? body.length).trim().replace(trailingSeparator, '').trimEnd();
  return { prefix, modules };
}

function timeOf(text: string, block: TagBlock) {
  const tag = text.slice(block.start, block.bodyStart);
  const match = /\s+time\s*=\s*(?:"([^"]+)"|'([^']+)')/i.exec(tag);
  return (match?.[1] ?? match?.[2] ?? '').trim();
}

function renderModules(modules: readonly ReportModule[], newline: string) {
  return modules.map(({ title, content }) => '【' + title + '】' + newline + content)
    .join(newline + '***' + newline);
}

function findReport(text: string) {
  const scan = scanPresetTags(text, ['wlog']);
  const blocks = scan.blocks.filter(block => block.name === 'wlog');
  const invalid = scan.incompleteStructure || blocks.length > 1 ||
    (!blocks.length && scan.isolated.some(tag => tag.name === 'wlog'));
  return { block: blocks[0], invalid };
}

function previousReport(chat: readonly ChatMessage[], historyEnd: number,
  titles: ReadonlySet<string>): { text: string; modules: ReportModule[] } | undefined {
  for (let index = Math.min(historyEnd, chat.length) - 1; index >= 0; index--) {
    const message = chat[index];
    if (message.is_user || message.is_system || !message.mes) continue;
    const { block, invalid } = findReport(message.mes);
    if (invalid) return;
    if (!block) continue;
    const text = message.mes.slice(block.start, block.end);
    const { prefix, modules } = parseModules(message.mes.slice(block.bodyStart, block.bodyEnd));
    if (prefix || modules.length !== titles.size || new Set(modules.map(m => m.title)).size !== titles.size ||
        modules.some(m => !m.content || !titles.has(m.title))) return;
    return { text, modules };
  }
  return undefined;
}

/** The expanded preset defines which report modules exist. History holds the full report. */
export function prepareWorldReport(messages: Data[], chat: readonly ChatMessage[], historyEnd: number | undefined,
  warn: () => void, continuing = false, prompt = WORLD_REPORT_PROMPT): ChatExchange | undefined {
  const templates = messages.flatMap((message, index) => message.role === 'system' && typeof message.content === 'string'
    ? [...maskComments(message.content).matchAll(format)].map(match => ({ index, match })) : []);
  if (templates.length !== 1) return;
  const { index, match } = templates[0];
  const [sourceStart, sourceEnd] = match.indices![1]!;
  const source = messages[index].content as string;
  const formatBody = source.slice(sourceStart, sourceEnd);
  const blocks = [...maskComments(formatBody).matchAll(report)];
  if (blocks.length !== 1) return;
  const [reportStart] = blocks[0].indices![0]!;
  const [bodyStart, bodyEnd] = blocks[0].indices![1]!;
  const { prefix, modules } = parseModules(formatBody.slice(bodyStart, bodyEnd));
  const titles = new Set(modules.map(module => module.title));
  if (!titles.size || titles.size !== modules.length) return;
  const end = historyEnd ?? chat.length;
  const baseline = previousReport(chat, end, titles);
  if (!baseline) return;

  const newline = formatBody.includes('\r\n') ? '\r\n' : '\n';
  const updated = messages.slice();
  if (!continuing) {
    const opening = formatBody.slice(reportStart, bodyStart);
    const instructions = formatBody.slice(0, reportStart).trim();
    const reference = [prefix, renderModules(modules, newline), instructions].filter(Boolean).join(newline + newline);
    const revised = newline + reference + newline + opening + newline +
      prompt.replace(/\r?\n/g, newline) + newline + formatBody.slice(bodyEnd);
    updated[index] = { ...messages[index], content: source.slice(0, sourceStart) + revised + source.slice(sourceEnd) };
  }
  return {
    messages: updated,
    finish(text, intermediate = false) {
      const { block, invalid } = findReport(text);
      if (invalid || !block) {
        if (!intermediate && !continuing) warn();
        return text;
      }
      if (intermediate || continuing) return text.slice(0, block.start) + text.slice(block.end);
      if (!timeOf(text, block)) { warn(); return text; }
      const current = previousReport(chat, end, titles);
      if (!current) { warn(); return text; }
      const body = text.slice(block.bodyStart, block.bodyEnd);
      const delta = parseModules(body, titles);
      const changes = new Map(delta.modules.filter(module => module.content).map(module => [module.title, module]));
      const applicable = current.text === baseline.text && (noChanges.test(body.trim()) ||
        (!delta.prefix && delta.modules.length > 0 && changes.size === delta.modules.length));
      if (!applicable) warn();
      const merged = current.modules.map(module => (applicable && changes.get(module.title)) || module);
      const lineBreak = body.includes('\r\n') ? '\r\n' : newline;
      return text.slice(0, block.bodyStart) + lineBreak + renderModules(merged, lineBreak) + lineBreak + text.slice(block.bodyEnd);
    },
  };
}
