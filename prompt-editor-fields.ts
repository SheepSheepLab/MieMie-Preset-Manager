// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
/** Shared labels/options from the official Prompt editor; no native fields are inferred. */
export const EDITOR_KEYS = ['name','role','content','injection_position','injection_depth','injection_order','injection_trigger','forbid_overrides'] as const;
export const EDITOR_ROLES = [['system','系统'],['user','用户'],['assistant','AI 助手']] as const;
export const EDITOR_TRIGGERS = [['normal','普通生成'],['continue','继续'],['impersonate','代写用户'],['swipe','滑动重试'],['regenerate','重新生成'],['quiet','静默生成']] as const;
