// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later

const signature = /^[\t ]*(?:(?:作者[：:]|——)[\t ]*)?SheepSheep[\t ]*$/mu;

export function isMieMiePreset(preset: unknown): boolean {
  if (!preset || typeof preset !== 'object' || !('prompts' in preset) || !Array.isArray(preset.prompts)) return false;
  return preset.prompts.some(prompt => typeof prompt?.name === 'string' && prompt.name.trim() === '📜说明' &&
    typeof prompt.content === 'string' && signature.test(prompt.content));
}
