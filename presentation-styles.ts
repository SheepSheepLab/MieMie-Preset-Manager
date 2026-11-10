// Copyright (C) 2026 SheepSheepLab
// Adapted from MieMie Polisher 1.2.1 native-launcher.css
// (commit 5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1), GPL-3.0-or-later.
export const nativeLauncherStyles = `
[data-miemie-preset-manager-native]{--mm-native-motion-hero:760ms;--mm-native-blur-hero:14px;--mm-native-hero-backdrop:#201a39b8;--mm-native-ease-hero:cubic-bezier(.4,0,.2,1);--mm-native-motion-open:520ms;--mm-native-motion-close:460ms;--mm-native-ease-surface:cubic-bezier(.32,.72,0,1);--mm-native-safe-top:env(safe-area-inset-top,0px);--mm-native-safe-bottom:env(safe-area-inset-bottom,0px);--mm-native-safe-left:env(safe-area-inset-left,0px);--mm-native-safe-right:env(safe-area-inset-right,0px);display:grid;place-items:center;min-width:0;min-height:0;box-sizing:border-box;overflow:hidden;border-radius:50%;border:1px solid #c49af5;background:#201a39;box-shadow:0 4px 16px #0009,0 0 12px #c49af544;padding:0!important;margin:0!important;cursor:grab;z-index:2147483300;color:#f7f1ff;font:14px system-ui;touch-action:none;user-select:none;-webkit-user-select:none;transition:scale .16s,box-shadow .16s;text-shadow:none}
[data-miemie-preset-manager-native][hidden]{display:none!important}
[data-miemie-preset-manager-native] img{width:100%;height:100%;object-fit:contain;border-radius:50%;pointer-events:none}
[data-miemie-preset-manager-native] svg{width:100%;height:100%;box-sizing:border-box;padding:10px;border-radius:50%;pointer-events:none}
@media(hover:hover){[data-miemie-preset-manager-native]:not([data-pm-tucked]):hover{scale:1.06;box-shadow:0 6px 20px #000a,0 0 18px #c49af566}}
[data-miemie-preset-manager-native]:active{cursor:grabbing}
[data-miemie-preset-manager-native]:not([data-pm-tucked]):active{scale:.95}
[data-miemie-preset-manager-native]:focus-visible{outline:2px solid #e0c8ff;outline-offset:3px}
[data-miemie-preset-manager-native][data-pm-tucked]{transition:translate 190ms ease-out,border-color .16s,box-shadow .16s}
[data-miemie-preset-manager-native][data-pm-tucked]:not([data-pm-gesture],[data-pm-expanded]):is([data-pm-hover],[data-pm-peek],:focus-visible){translate:var(--mm-pm-peek) 0}
[data-miemie-preset-manager-native][data-pm-gesture]{transition:none}
[data-miemie-preset-manager-native][data-pm-ready]{border-color:#dfc6ff}
[data-miemie-preset-manager-native][data-pm-gesture=grabbed]{cursor:grabbing;border-color:#dfc6ff;box-shadow:0 0 0 4px #bea0ff45,0 4px 16px #0009;animation:mm-pm-grab 200ms ease-out}
@keyframes mm-pm-grab{from{scale:.92}to{scale:1}}
[data-preset-manager-pull]{position:fixed;display:block;z-index:2147483299;overflow:hidden;pointer-events:none}
[data-preset-manager-pull][hidden]{display:none!important}
[data-preset-manager-pull] path{fill-opacity:.64;stroke:#b495ff57;stroke-width:1;transition:fill-opacity .11s,stroke .11s}
[data-preset-manager-pull][data-ready] path{fill-opacity:1;stroke:#dfc6ff94}
@media(prefers-reduced-motion:reduce){[data-miemie-preset-manager-native],[data-preset-manager-pull] path{transition:none!important;animation:none!important}}
`;
