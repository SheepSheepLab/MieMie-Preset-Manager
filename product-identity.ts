// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Display identity is independent of stable Extension / script / business keys.
import manifest from './manifest.json';
export const PRESET_MANAGER_PRODUCT = Object.freeze({
  name: manifest.name, englishName: 'MieMie Preset Manager',
  launcherName: manifest.contributes.launcher.title, version: manifest.version,
});
export const PRESET_MANAGER_DOCK_KEY = 'miemie_preset_manager_dock_v1';
