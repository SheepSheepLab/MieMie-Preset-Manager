// SPDX-License-Identifier: GPL-3.0-or-later
const STORAGE_KEY = 'miemie_preset_manager_launcher_appearance_v1';
export const LAUNCHER_HOLD_MS = 900;
export const LAUNCHER_MIN_SIZE = 50;
export const LAUNCHER_MAX_SIZE = 150;

type Appearance = { size: number; tucked: boolean };
export type LauncherAppearance = ReturnType<typeof createLauncherAppearance>;
const sizePercent = (size: unknown) => typeof size === 'number' && Number.isFinite(size)
  ? Math.max(LAUNCHER_MIN_SIZE, Math.min(LAUNCHER_MAX_SIZE, Math.round(size)))
  : 100;

export function createLauncherAppearance(host: Window) {
  let value: Appearance = { size: 100, tucked: false };
  const listeners = new Set<() => void>();
  try {
    const saved = JSON.parse(host.localStorage.getItem(STORAGE_KEY) || 'null');
    value = { size: sizePercent(saved?.size), tucked: saved?.tucked === true };
  } catch { /* Keep defaults if storage is unavailable or malformed. */ }
  return {
    get: () => value as Readonly<Appearance>,
    set(next: Partial<Appearance>) {
      value = { size: sizePercent(next.size ?? value.size), tucked: next.tucked ?? value.tucked };
      for (const listener of listeners) listener();
      try { host.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
      catch { return false; }
      return true;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
