// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
import type { RawPreset } from './contracts';

/** Native preset names, not the live UI aliases (temp_openai, etc.). */
export const NUMERIC_PARAMETERS = [
  { key: 'openai_max_context', label: '上下文长度 (Token)', min: 512, max: Number.MAX_SAFE_INTEGER, step: 1 },
  { key: 'openai_max_tokens', label: '最大回复长度 (Token)', min: 1, max: 128000, step: 1 },
  { key: 'n', label: '每次生成多个备选回复', min: 1, max: Number.MAX_SAFE_INTEGER, step: 1 },
  { key: 'temperature', label: '温度', min: 0, max: 2, step: 0.01 },
  { key: 'frequency_penalty', label: '频率惩罚', min: -2, max: 2, step: 0.01 },
  { key: 'presence_penalty', label: '存在惩罚', min: -2, max: 2, step: 0.01 },
  { key: 'top_p', label: 'Top P', min: 0, max: 1, step: 0.01 },
] as const;
export const REASONING_EFFORTS = [['auto', '自动'], ['min', '极低'], ['low', '低'], ['medium', '中'], ['high', '高'], ['max', '极高']] as const;
export type ParameterKey = typeof NUMERIC_PARAMETERS[number]['key'] | 'stream_openai' | 'show_thoughts' | 'reasoning_effort';
export type ParameterPatch = Partial<Record<ParameterKey, unknown>>;

export const PARAMETER_DEFAULTS = {
  openai_max_context: 2000000, openai_max_tokens: 30000, temperature: 1,
  frequency_penalty: 0, presence_penalty: 0, top_p: 0.9,
  stream_openai: false, show_thoughts: false, reasoning_effort: 'auto',
} as const;
/** Only absent fields receive Owner defaults; false/0/unknown existing values survive. */
export function missingParameterDefaults(raw: RawPreset): ParameterPatch {
  return Object.fromEntries(Object.entries(PARAMETER_DEFAULTS).filter(([key]) => raw[key] === undefined));
}

/** Patch only touched fields. Opening a dialog never materializes missing defaults. */
export function patchParameters(raw: RawPreset, patch: ParameterPatch): RawPreset {
  for (const [key, value] of Object.entries(patch)) {
    const spec = NUMERIC_PARAMETERS.find(item => item.key === key);
    if (spec) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < spec.min || value > spec.max ||
          (spec.step === 1 && !Number.isSafeInteger(value))) throw Error(`${spec.label}的数值无效。`);
    } else if (key === 'stream_openai' || key === 'show_thoughts') {
      if (typeof value !== 'boolean') throw Error('开关参数无效。');
    } else if (key === 'reasoning_effort') {
      if (!REASONING_EFFORTS.some(([id]) => id === value)) throw Error('请选择酒馆支持的推理强度。');
    } else throw Error('不支持修改该预设参数。');
  }
  return { ...raw, ...patch };
}
