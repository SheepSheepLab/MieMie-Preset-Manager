// Copyright (C) 2026 SheepSheepLab
// Adapted from MieMie Polisher 1.2.1 native-launcher.css
// (commit 5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1), GPL-3.0-or-later.
export const nativeLauncherStyles = `
[data-miemie-preset-manager-native]{--mm-native-motion-hero:760ms;--mm-native-blur-hero:14px;--mm-native-hero-backdrop:#211b2eb8;--mm-native-ease-hero:cubic-bezier(.4,0,.2,1);--mm-native-motion-open:520ms;--mm-native-motion-close:460ms;--mm-native-ease-surface:cubic-bezier(.32,.72,0,1);--mm-native-safe-top:env(safe-area-inset-top,0px);--mm-native-safe-bottom:env(safe-area-inset-bottom,0px);--mm-native-safe-left:env(safe-area-inset-left,0px);--mm-native-safe-right:env(safe-area-inset-right,0px);display:grid;place-items:center;min-width:0;min-height:0;box-sizing:border-box;overflow:hidden;border-radius:50%;border:1px solid #b59add;background:#211b2e;box-shadow:0 4px 16px #0009,0 0 12px #c6a2ff44;padding:0!important;margin:0!important;cursor:grab;z-index:2147483300;color:#f5efff;font:14px system-ui;touch-action:none;user-select:none;-webkit-user-select:none;transition:scale .16s,box-shadow .16s;text-shadow:none}
[data-miemie-preset-manager-native][hidden]{display:none!important}
[data-miemie-preset-manager-native] img{width:100%;height:100%;object-fit:contain;border-radius:50%;pointer-events:none}
@media(hover:hover){[data-miemie-preset-manager-native]:hover{scale:1.06;box-shadow:0 6px 20px #000a,0 0 18px #c6a2ff66}}
[data-miemie-preset-manager-native]:active{scale:.95;cursor:grabbing}
[data-miemie-preset-manager-native]:focus-visible{outline:2px solid #e3d1ff;outline-offset:3px}
@media(prefers-reduced-motion:reduce){[data-miemie-preset-manager-native]{transition:none}}
`;
