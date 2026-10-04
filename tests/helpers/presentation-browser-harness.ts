// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Reuse the production controller/view with the existing synthetic adapter.
import './reorder-browser-harness';
import { startDualMode, PRESET_MANAGER_MANIFEST } from '../../dual-mode';
import { createPresetManagerNativeLauncher } from '../../native-launcher';
import { ICON } from '../../product-icon';
const host = window as Window & Record<string, any>;
const { controller, view } = host.reorderTest;
let source = startDualMode(host, window, view);
host.presentationTest = {
  controller, view, manifest:PRESET_MANAGER_MANIFEST, icon:ICON,
  get source() { return source; },
  async reset() { await source.dispose(); source = startDualMode(host,window,view); await source.settled(); },
  isolatedLauncher(open: () => unknown) { return createPresetManagerNativeLauncher({host,icon:ICON,mode:'shortcut',open}); },
};
