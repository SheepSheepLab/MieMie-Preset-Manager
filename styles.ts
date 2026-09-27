// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

export const managerStyles = `
.miemie-pm{--mm-safe-top:env(safe-area-inset-top,0px);--mm-safe-right:env(safe-area-inset-right,0px);--mm-safe-bottom:env(safe-area-inset-bottom,0px);--mm-safe-left:env(safe-area-inset-left,0px);--mm-bg:#15121e;--mm-panel:#211b2e;--mm-card:#2b233c;--mm-line:#453552;--mm-text:#f5efff;--mm-muted:#b4a7c5;--mm-accent:#c6a2ff;position:fixed;inset:0;z-index:2147483000;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:max(24px,var(--mm-safe-top)) max(24px,var(--mm-safe-right)) max(24px,var(--mm-safe-bottom)) max(24px,var(--mm-safe-left));background:#08060bc9;color:var(--mm-text);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:left;isolation:isolate;color-scheme:dark}
.miemie-pm *{box-sizing:border-box}
.miemie-pm[hidden],.miemie-pm [hidden]{display:none!important}
.miemie-pm svg{width:21px;height:21px;flex:none;pointer-events:none}
.miemie-pm h2,.miemie-pm h3,.miemie-pm p{margin:0}
.miemie-pm button,.miemie-pm input,.miemie-pm select,.miemie-pm textarea{font:inherit;color:inherit;text-transform:none;letter-spacing:normal;max-width:100%;margin:0;box-shadow:none}
.miemie-pm button{cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.miemie-pm button:disabled{cursor:default;opacity:.4}
.miemie-pm :focus-visible{outline:2px solid var(--mm-accent);outline-offset:3px}
.miemie-pm .mm-frame{width:min(900px,100%);height:min(820px,100%);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--mm-line);border-radius:24px;background:var(--mm-bg);box-shadow:0 24px 100px #0008;position:relative;min-height:0;min-width:0}
.miemie-pm .mm-header{padding:22px 24px 16px;border-bottom:1px solid var(--mm-line);flex:none}
.miemie-pm .mm-brandline,.miemie-pm .mm-toolbar,.miemie-pm .mm-actions,.miemie-pm .mm-card,.miemie-pm .mm-card-actions,.miemie-pm .mm-dialog-head,.miemie-pm .mm-dialog-actions{display:flex;align-items:center;gap:8px}
.miemie-pm .mm-brandline{margin-bottom:18px;gap:12px}
.miemie-pm .mm-logo{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:#bfa0ec;color:#241832}
.miemie-pm .mm-logo svg{width:32px;height:32px}
.miemie-pm .mm-brand{flex:1;min-width:0}
.miemie-pm .mm-brand h2{font-size:20px;font-weight:650;line-height:1.3}
.miemie-pm .mm-subtitle{color:var(--mm-muted);font-size:11px;letter-spacing:.1em;margin-top:3px}
.miemie-pm .mm-button{border:1px solid transparent;border-radius:12px;background:transparent;min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;flex-shrink:0;line-height:1.2}
.miemie-pm .mm-button:hover:not(:disabled){background:#b591e31f}
.miemie-pm .mm-button.mm-icon{width:44px;padding:10px}
.miemie-pm .mm-button.mm-primary{background:var(--mm-accent);color:#251532;font-weight:650}
.miemie-pm .mm-button.mm-secondary{border-color:var(--mm-line);background:var(--mm-panel)}
.miemie-pm .mm-button.mm-danger{color:#ffb4c0;border-color:#a3475a;background:#562633}
.miemie-pm .mm-preset-field{flex:1;min-width:0;display:grid;gap:4px}
.miemie-pm .mm-preset-label{font-size:11px;color:var(--mm-muted)}
.miemie-pm select,.miemie-pm input[type=text],.miemie-pm input[type=number],.miemie-pm textarea{width:100%;border:1px solid var(--mm-line);border-radius:11px;background:var(--mm-panel);padding:10px 12px;min-height:44px;outline-offset:2px}
.miemie-pm select{text-overflow:ellipsis}
.miemie-pm .mm-toolbar{align-items:flex-end;gap:12px}
.miemie-pm .mm-more-wrap{position:relative}
.miemie-pm .mm-menu{position:absolute;right:0;top:48px;z-index:3;min-width:180px;max-height:260px;overflow-y:auto;overscroll-behavior:contain;padding:6px;background:var(--mm-panel);border:1px solid var(--mm-line);border-radius:14px;box-shadow:0 12px 30px #0007;display:grid}
.miemie-pm .mm-menu .mm-button{justify-content:flex-start;width:100%}
.miemie-pm .mm-status{padding:10px 24px;font-size:13px;overflow-wrap:anywhere;flex:none;max-height:20%;overflow:auto}
.miemie-pm .mm-error{color:#ffd2d9;background:#592638}
.miemie-pm .mm-notice{color:#e0caff;background:#332343}
.miemie-pm .mm-categorybar{display:flex;gap:7px;overflow:auto;padding:14px 24px;flex:none;scrollbar-width:thin}
.miemie-pm .mm-tab{border:1px solid var(--mm-line);border-radius:999px;white-space:nowrap;min-height:44px;min-width:48px;background:transparent;padding:7px 14px}
.miemie-pm .mm-tab[aria-pressed=true]{background:#b795e729;border-color:#a581d1;color:#dfc8ff}
.miemie-pm .mm-scroll{overflow:auto;overscroll-behavior:contain;padding:2px 24px 24px;flex:1;min-height:0;scrollbar-width:thin}
.miemie-pm .mm-list{display:grid;gap:9px;position:relative}
.miemie-pm .mm-card{background:var(--mm-card);border:1px solid #453650;border-radius:15px;padding:7px 8px 7px 16px;min-width:0;position:relative;transition:box-shadow .15s,background .15s;touch-action:pan-y}
.miemie-pm .mm-card[data-attached=true]{cursor:grab}
.miemie-pm .mm-card:hover{border-color:#715980}
.miemie-pm .mm-card-text{flex:1;min-width:0;pointer-events:none}
.miemie-pm .mm-card-title{font-size:14px;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.miemie-pm .mm-card-meta{font-size:11px;color:var(--mm-muted);margin-top:2px}
.miemie-pm .mm-card-actions{gap:1px;flex-shrink:0}
.miemie-pm .mm-card-actions .mm-button{border-radius:9px}
.miemie-pm .mm-toggle{width:44px;height:44px;border:0;background:transparent;position:relative;flex:none;padding:0}
.miemie-pm .mm-toggle:before{content:"";position:absolute;inset:12px 1px;border-radius:999px;background:#62516e;transition:background .18s}
.miemie-pm .mm-toggle:after{content:"";position:absolute;width:14px;height:14px;left:5px;top:15px;border-radius:50%;background:#eae0f4;transition:transform .18s}
.miemie-pm .mm-toggle[aria-checked=true]:before{background:#9871c4}
.miemie-pm .mm-toggle[aria-checked=true]:after{transform:translateX(20px);background:white}
.miemie-pm .mm-unlocked-head{display:grid;gap:4px;margin:28px 0 12px}
.miemie-pm .mm-unlocked-head h3{font-size:14px}
.miemie-pm .mm-hint{color:var(--mm-muted);font-size:12px;overflow-wrap:anywhere}
.miemie-pm .mm-empty{padding:40px 12px;text-align:center;color:var(--mm-muted)}
.miemie-pm .mm-footer{border-top:1px solid var(--mm-line);padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none}
.miemie-pm .mm-footer .mm-hint{font-size:11px;min-width:0}
.miemie-pm .mm-modal-layer{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:#08050cc9;padding:max(24px,var(--mm-safe-top)) max(24px,var(--mm-safe-right)) max(24px,var(--mm-safe-bottom)) max(24px,var(--mm-safe-left))}
.miemie-pm .mm-confirm-layer{z-index:6}
.miemie-pm .mm-dialog{background:var(--mm-bg);border:1px solid var(--mm-line);border-radius:22px;box-shadow:0 16px 70px #0009;width:min(620px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;min-height:0}
.miemie-pm .mm-dialog-head{padding:16px 20px;border-bottom:1px solid var(--mm-line);flex:none}
.miemie-pm .mm-dialog-head h3{font-size:17px;flex:1;min-width:0;overflow-wrap:anywhere}
.miemie-pm .mm-dialog-body{display:grid;gap:16px;overflow:auto;overscroll-behavior:contain;padding:20px;min-height:0;scroll-padding-block:16px}
.miemie-pm .mm-editor-dialog .mm-dialog-body{flex:1;align-content:start}
.miemie-pm .mm-field{display:grid;gap:7px;min-width:0}
.miemie-pm .mm-field>span{font-size:13px;font-weight:550}
.miemie-pm textarea{resize:vertical;min-height:220px;line-height:1.7;tab-size:2}
.miemie-pm .mm-dialog-actions{justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--mm-line);flex:none}
.miemie-pm details{border-top:1px solid var(--mm-line);padding-top:12px}
.miemie-pm summary{cursor:pointer;min-height:44px;display:list-item;padding:8px 0}
.miemie-pm .mm-advanced{display:grid;gap:16px;padding-top:12px}
.miemie-pm .mm-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.miemie-pm .mm-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 12px}
.miemie-pm .mm-check{display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer;overflow-wrap:anywhere}
.miemie-pm input[type=checkbox]{accent-color:#bf9cf0;width:18px;height:18px;flex:none}
.miemie-pm .mm-drag-source{opacity:.3}
.miemie-pm .mm-drag-ghost{position:fixed!important;z-index:9;pointer-events:none!important;opacity:.95;box-shadow:0 12px 35px #000b;border-color:var(--mm-accent);transform:rotate(-1deg)}
.miemie-pm .mm-drop-before:before{content:"";position:absolute;left:0;right:0;top:-6px;height:3px;background:var(--mm-accent);border-radius:3px}
.miemie-pm .mm-drop-end:after{content:"";position:absolute;left:0;right:0;bottom:-6px;height:3px;background:var(--mm-accent);border-radius:3px}
.miemie-pm.mm-drag-active{user-select:none}
.miemie-pm .mm-confirm-copy{white-space:pre-wrap;overflow-wrap:anywhere}
.miemie-pm .mm-inline-error{color:#ffc2ce;font-size:13px}
/* Geometry flags use the visible viewport, including a keyboard-reduced height.
   The same frame and editor nodes serve desktop, portrait and landscape. */
.miemie-pm[data-fullbleed=true]{padding:var(--mm-safe-top) var(--mm-safe-right) var(--mm-safe-bottom) var(--mm-safe-left)}
.miemie-pm[data-fullbleed=true] .mm-frame{height:100%;max-height:none;width:100%;border-radius:0;border:0}
.miemie-pm[data-fullbleed=true] .mm-modal-layer{padding:var(--mm-safe-top) var(--mm-safe-right) var(--mm-safe-bottom) var(--mm-safe-left)}
.miemie-pm[data-fullbleed=true] .mm-editor-dialog{width:100%;height:100%;border:0;border-radius:0}
.miemie-pm[data-fullbleed=true] .mm-confirm-layer{padding:max(16px,var(--mm-safe-top)) max(16px,var(--mm-safe-right)) max(16px,var(--mm-safe-bottom)) max(16px,var(--mm-safe-left))}
.miemie-pm[data-compact=true] .mm-header{padding:10px 12px 8px}
.miemie-pm[data-compact=true] .mm-brandline{margin-bottom:8px;gap:10px}
.miemie-pm[data-compact=true] .mm-brand h2{font-size:18px}
.miemie-pm[data-compact=true] .mm-subtitle{font-size:10px}
.miemie-pm[data-compact=true] .mm-toolbar{gap:6px}
.miemie-pm[data-compact=true] .mm-actions{gap:0}
.miemie-pm[data-compact=true] .mm-preset-field select{padding-inline:8px}
.miemie-pm[data-compact=true] .mm-status{padding:8px 12px}
.miemie-pm[data-compact=true] .mm-categorybar{padding:8px 12px;gap:6px}
.miemie-pm[data-compact=true] .mm-scroll{padding:2px 10px 12px}
.miemie-pm[data-compact=true] .mm-list{gap:8px}
.miemie-pm[data-compact=true] .mm-card{padding:8px 5px 8px 10px;gap:4px}
.miemie-pm[data-compact=true] .mm-card-title{white-space:normal;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.4}
.miemie-pm[data-compact=true] .mm-card[data-attached=false]{flex-wrap:wrap}
.miemie-pm[data-compact=true] .mm-card[data-attached=false] .mm-card-text{flex-basis:100%}
.miemie-pm[data-compact=true] .mm-card-actions{margin-left:auto}
.miemie-pm[data-compact=true] .mm-footer{padding:8px 12px}
.miemie-pm[data-compact=true] .mm-dialog-head{padding:8px 12px}
.miemie-pm[data-compact=true] .mm-dialog-body{padding:16px}
.miemie-pm[data-compact=true] .mm-dialog-actions{padding:10px 16px}
.miemie-pm[data-compact=true] textarea{min-height:180px}
.miemie-pm[data-compact=true] .mm-field-row{gap:10px}
.miemie-pm[data-compact=true] input,.miemie-pm[data-compact=true] select,.miemie-pm[data-compact=true] textarea{font-size:16px}
/* Short windows also cover landscape phones and an opened software keyboard. */
.miemie-pm[data-short=true] .mm-header{display:flex;align-items:flex-end;gap:12px;padding:6px 12px}
.miemie-pm[data-short=true] .mm-brandline{margin:0;gap:8px;flex:none}
.miemie-pm[data-short=true] .mm-logo,.miemie-pm[data-short=true] .mm-subtitle{display:none}
.miemie-pm[data-short=true] .mm-brand h2{font-size:16px}
.miemie-pm[data-short=true] .mm-toolbar{flex:1;min-width:0;gap:6px}
.miemie-pm[data-short=true] .mm-actions{gap:0}
.miemie-pm[data-short=true] .mm-categorybar{padding:6px 12px}
.miemie-pm[data-short=true] .mm-footer{padding:6px 12px}
.miemie-pm[data-short=true] .mm-status{padding:5px 12px}
.miemie-pm[data-short=true] .mm-dialog-head{padding:4px 12px}
.miemie-pm[data-short=true] .mm-dialog-body{gap:12px;padding:12px 16px}
.miemie-pm[data-short=true] .mm-dialog-actions{padding:6px 16px}
.miemie-pm[data-short=true] textarea{min-height:120px}
.miemie-pm[data-short=true][data-compact=true] .mm-header{display:block}
.miemie-pm[data-short=true][data-compact=true] .mm-brandline{margin-bottom:4px}
.miemie-pm[data-short=true][data-compact=true] .mm-preset-label{display:none}
@media(any-pointer:coarse){.miemie-pm input,.miemie-pm select,.miemie-pm textarea{font-size:16px}}
@media(prefers-reduced-motion:reduce){.miemie-pm *,.miemie-pm *:before,.miemie-pm *:after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
`;
