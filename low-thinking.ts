// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

export interface ThinkingRequest {
  model?: unknown;
  chat_completion_source?: unknown;
  include_reasoning?: boolean;
  reasoning_effort?: unknown;
  custom_url?: unknown;
  custom_include_body?: string;
  custom_exclude_body?: string;
}
type Fields = Record<string, unknown>;
const fields = (value: unknown): Fields =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Fields : {};
const unconfirmed = { applied: false, reason: '此连接的最低推理档位未确认，已保留酒馆的推理强度。' } as const;
const applied = { applied: true } as const;

function googleLevel(model: string) {
  if (/-image(?:$|-)/.test(model)) return undefined;
  if (/^gemini-(?:4-(?:argon|carbon|hydrogen|neon)|3\.8-flash|3(?:\.\d+)?-pro)(?:$|-)/.test(model)) return 'low';
  if (/^gemini-(?:3-flash|3\.1-flash-lite|3\.5-flash-lite|3\.6-flash)(?:$|-)/.test(model)) return 'minimal';
  return undefined;
}

async function mergeCustom(request: ThinkingRequest, host: Window, build: (existing: Fields) => Fields,
  valid: () => boolean) {
  let configured: Fields = {};
  let exclusions: unknown;
  try {
    if (request.custom_include_body?.trim() || request.custom_exclude_body?.trim()) {
      // Match SillyTavern's YAML parser for Additional Parameters, including lists of mappings.
      const url = new URL('lib.js', host.location.href);
      const { yaml } = await import(/* webpackIgnore: true */ url.href) as { yaml: { parse(text: string): unknown } };
      const source = yaml.parse(request.custom_include_body || '');
      configured = Array.isArray(source)
        ? Object.fromEntries(source.flatMap(item => Object.entries(fields(item)))) : { ...fields(source) };
      exclusions = yaml.parse(request.custom_exclude_body || '');
    }
  } catch {
    return { applied: false, reason: '无法读取自定义 API 的附加参数，已保留原有推理强度。' } as const;
  }
  if (!valid()) return undefined;
  const next = build(configured);
  request.custom_include_body = JSON.stringify({ ...configured, ...next });
  if (Array.isArray(exclusions)) {
    request.custom_exclude_body = JSON.stringify(exclusions.filter(key => !Object.hasOwn(next, String(key))));
  } else if (exclusions && typeof exclusions === 'object') {
    request.custom_exclude_body = JSON.stringify(Object.keys(exclusions).filter(key => !Object.hasOwn(next, key)));
  }
  return applied;
}

/** Override request fields only for API/model combinations whose lowest level is known. */
export async function applyLowThinking(request: ThinkingRequest, host: Window, valid: () => boolean,
  hostVersion = '') {
  request.include_reasoning = false;
  const model = String(request.model ?? '').toLowerCase().replace(/^(?:google\/|models\/)/, '');
  const source = request.chat_completion_source;
  const level = googleLevel(model);
  if (source === 'makersuite' || source === 'vertexai') {
    // 1.14's Gemini converter only configures thinking for 2.5 and the original 3 Pro.
    const supportsGemini3 = !/^1\.14\./.test(hostVersion) || /^gemini-3-pro(?:$|-)/.test(model);
    if (/^gemini-2\.5-(?:pro|flash)(?:$|-)/.test(model) && !/-image(?:$|-)/.test(model)) {
      request.reasoning_effort = 'min';
      return applied;
    }
    if (supportsGemini3 && level && /^gemini-3/.test(model)) {
      request.reasoning_effort = level === 'minimal' ? 'min' : level;
      return applied;
    }
  } else if (source === 'openrouter' && level) {
    request.reasoning_effort = level;
    return applied;
  } else if (source === 'openai' && /^gpt-5\.[45](?:$|-)/.test(model) && !/-(?:pro|chat-latest)(?:$|-)/.test(model)) {
    request.reasoning_effort = 'none';
    return applied;
  } else if (source === 'custom' && level && typeof request.custom_url === 'string') {
    let url: URL;
    try { url = new URL(request.custom_url); } catch { return unconfirmed; }
    if (url.origin === 'https://generativelanguage.googleapis.com' && /^\/v1(?:beta|alpha)?\/openai(?:\/|$)/.test(url.pathname)) {
      return mergeCustom(request, host, existing => {
        const extra = fields(existing.extra_body);
        const google = fields(extra.google);
        // Google accepts one of reasoning_effort or its native thinking config.
        delete existing.reasoning_effort;
        return { extra_body: { ...extra, google: { ...google, thinking_config: {
          ...Object.fromEntries(Object.entries(fields(google.thinking_config))
            .filter(([key]) => !['thinking_budget', 'thinkingBudget', 'thinkingLevel', 'includeThoughts'].includes(key))),
          thinking_level: level, include_thoughts: false,
        } } } };
      }, valid);
    }
    if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      const result = await mergeCustom(request, host, () => ({ reasoning_effort: level, include_reasoning: false }), valid);
      if (result?.applied) request.reasoning_effort = level;
      return result;
    }
  }
  return unconfirmed;
}
