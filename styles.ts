// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

export const managerStyles = `
.miemie-pm{--mm-safe-top:env(safe-area-inset-top,0px);--mm-safe-right:env(safe-area-inset-right,0px);--mm-safe-bottom:env(safe-area-inset-bottom,0px);--mm-safe-left:env(safe-area-inset-left,0px);--mm-bg:#171025;--mm-chrome:#211533;--mm-panel:#271939;--mm-card:#35234b;--mm-line:#60447c;--mm-text:#f6efff;--mm-muted:#bea9d4;--mm-accent:#c194ff;--mm-tonal:#4b3068;--mm-off:#66517d;--mm-knob:#faf5ff;position:fixed;left:10px;top:10px;z-index:2147483000;box-sizing:border-box;display:block;width:min(600px,calc(100vw - 20px));height:min(780px,calc(100dvh - 20px));border:1px solid var(--mm-line);border-radius:16px;overflow:hidden;background:linear-gradient(140deg,var(--mm-chrome),var(--mm-bg));box-shadow:0 12px 45px #0009;color:var(--mm-text);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:left;text-shadow:none;isolation:isolate;color-scheme:dark}
.miemie-pm *{box-sizing:border-box}
.miemie-pm[hidden],.miemie-pm [hidden]{display:none!important}
.miemie-pm svg{width:21px;height:21px;flex:none;pointer-events:none}
.miemie-pm h2,.miemie-pm h3,.miemie-pm p{margin:0}
.miemie-pm button,.miemie-pm input,.miemie-pm select,.miemie-pm textarea{font:inherit;color:inherit;text-transform:none;letter-spacing:normal;max-width:100%;margin:0;box-shadow:none;text-shadow:none}
.miemie-pm button{cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.miemie-pm button:disabled{cursor:default;opacity:.4}
.miemie-pm :focus-visible{outline:2px solid var(--mm-accent);outline-offset:3px}
.miemie-pm .mm-frame{width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;position:relative;min-height:0;min-width:0}
.miemie-pm .mm-header{padding:0;border-bottom:1px solid var(--mm-line);background:var(--mm-chrome);flex:none}
.miemie-pm .mm-brandline,.miemie-pm .mm-toolbar,.miemie-pm .mm-actions,.miemie-pm .mm-card,.miemie-pm .mm-card-actions,.miemie-pm .mm-dialog-head,.miemie-pm .mm-dialog-actions{display:flex;align-items:center;gap:8px}
.miemie-pm .mm-brandline{height:81px;min-height:81px;padding:14px 16px;gap:13px;border-bottom:1px solid var(--mm-line)}
.miemie-pm .mm-logo{display:grid;place-items:center;width:52px;height:52px;flex:0 0 52px}
.miemie-pm .mm-logo img{display:block;width:52px;height:52px;object-fit:contain;filter:drop-shadow(0 2px 8px #c194ff25)}
.miemie-pm .mm-brand{flex:1;min-width:0}
.miemie-pm .mm-brand h2{font:700 18px/1.55 system-ui;letter-spacing:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miemie-pm .mm-subtitle{color:var(--mm-muted);font:12px/1.55 system-ui;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miemie-pm .mm-button{border:1px solid transparent;border-radius:10px;background:transparent;min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;flex-shrink:0;line-height:1.2}
.miemie-pm .mm-button:hover:not(:disabled){background:#c194ff1f}
.miemie-pm .mm-button.mm-icon{width:44px;padding:10px}
.miemie-pm .mm-button.mm-save{background:transparent;position:relative}
.miemie-pm .mm-button.mm-save:after{content:"";display:none;position:absolute;left:50%;bottom:3px;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#77f5a4;box-shadow:0 0 4px #77f5a499,0 0 8px #77f5a433;pointer-events:none}
.miemie-pm .mm-session-actions[data-dirty=true] .mm-save:after{display:block}
.miemie-pm .mm-button.mm-primary{background:var(--mm-accent);color:#241334;font-weight:650}
.miemie-pm .mm-button.mm-secondary{border-color:var(--mm-line);background:var(--mm-panel)}
.miemie-pm .mm-button.mm-danger{color:#ffb4c0;border-color:#a3475a;background:#562633}
.miemie-pm .mm-preset-field{flex:1;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:4px}
.miemie-pm .mm-preset-label{font-size:11px;color:var(--mm-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:max-content;max-width:calc(100vw - 56px)}
.miemie-pm .mm-default-dot{display:none;fill:currentColor;stroke:none}
.miemie-pm .mm-default[aria-pressed=true] .mm-default-dot{display:block}
.miemie-pm select,.miemie-pm input[type=text],.miemie-pm input[type=number],.miemie-pm textarea{width:100%;border:1px solid var(--mm-line);border-radius:10px;background:var(--mm-panel);padding:10px 12px;min-height:44px;outline-offset:2px}
.miemie-pm select{text-overflow:ellipsis}
.miemie-pm .mm-preset-control{position:relative;min-width:0;border:1px solid var(--mm-line);border-radius:10px;background:var(--mm-panel)}
.miemie-pm .mm-preset-control select{display:block;min-width:0;width:100%;border:0;background:var(--mm-panel)}
.miemie-pm .mm-preset-control option{background:var(--mm-panel);color:var(--mm-text)}
.miemie-pm .mm-preset-control[data-keyboard-focus=true]:focus-within{outline:2px solid var(--mm-accent);outline-offset:2px}
.miemie-pm .mm-preset-control select:focus-visible{outline:none}
.miemie-pm .mm-preset-control .mm-default{position:absolute;right:0;top:0;bottom:0;z-index:1;border:0;border-left:1px solid var(--mm-line);border-radius:0 9px 9px 0;background:var(--mm-tonal);transition:background .16s,border-color .16s}
.miemie-pm .mm-preset-control .mm-default:hover:not(:disabled){background:#5b3a7a;border-left-color:#9569b9}
.miemie-pm .mm-preset-control .mm-default:active:not(:disabled){background:#402557}
.miemie-pm .mm-preset-control .mm-default:focus-visible{outline-offset:-3px}
.miemie-pm[data-binding=true] .mm-preset-control select{appearance:none;-webkit-appearance:none;padding-right:80px}
.miemie-pm[data-binding=true] .mm-preset-control:after{content:"";position:absolute;right:58px;top:50%;width:7px;height:7px;border-right:1.7px solid currentColor;border-bottom:1.7px solid currentColor;transform:translateY(-70%) rotate(45deg);pointer-events:none}
.miemie-pm .mm-toolbar{align-items:flex-end;gap:10px;flex-wrap:wrap;padding:12px 16px}
.miemie-pm .mm-more-wrap{position:relative}
.miemie-pm .mm-menu{position:absolute;right:0;top:48px;z-index:3;min-width:180px;max-height:260px;overflow-y:auto;overscroll-behavior:contain;padding:6px;background:var(--mm-panel);border:1px solid var(--mm-line);border-radius:14px;box-shadow:0 12px 30px #0007;display:grid}
.miemie-pm .mm-menu .mm-button{justify-content:flex-start;width:100%}
.miemie-pm .mm-status{padding:10px 24px;font-size:13px;overflow-wrap:anywhere;flex:none;max-height:20%;overflow:auto}
.miemie-pm .mm-error{color:#ffd2d9;background:#592638}
.miemie-pm .mm-category-row{display:flex;align-items:center;gap:12px;padding:14px 24px;flex:none;min-width:0}
.miemie-pm .mm-separator{display:block;width:1px;height:24px;background:var(--mm-line);flex:none}
.miemie-pm .mm-session-actions{display:flex;align-items:center;gap:6px;flex:none;min-width:0}
.miemie-pm .mm-categorybar{display:flex;gap:7px;min-width:0;overflow-x:auto;overflow-y:hidden;padding:0;flex:1;scrollbar-width:thin}
.miemie-pm .mm-tab{width:auto;max-width:none;flex:0 0 auto;border:1px solid var(--mm-line);border-radius:999px;white-space:nowrap;min-height:44px;min-width:48px;background:transparent;padding:7px 14px}
.miemie-pm .mm-tab[aria-pressed=true]{background:var(--mm-tonal);border-color:var(--mm-accent);color:var(--mm-accent)}
.miemie-pm .mm-scroll{overflow:auto;overscroll-behavior:contain;padding:2px 24px 24px;flex:1;min-height:0;scrollbar-width:thin}
.miemie-pm .mm-list{display:grid;gap:9px;position:relative}
.miemie-pm .mm-card{background:var(--mm-card);border:1px solid var(--mm-line);border-radius:12px;padding:7px 8px 7px 16px;min-width:0;position:relative;transition:box-shadow .15s,background .15s;touch-action:pan-y}
.miemie-pm .mm-card[data-orb-clearance=right]{padding-right:calc(8px + var(--mm-orb-right,0px));flex-wrap:wrap}
.miemie-pm .mm-card[data-orb-clearance=left]{padding-left:calc(16px + var(--mm-orb-left,0px));flex-wrap:wrap}
.miemie-pm .mm-card[data-orb-clearance]:not([data-orb-clearance=""]) .mm-card-text{min-width:70px}
.miemie-pm .mm-card[data-attached=true]{cursor:grab}
.miemie-pm .mm-card:hover{border-color:#9569b9}
.miemie-pm .mm-card-text{flex:1;min-width:0;pointer-events:none}
.miemie-pm .mm-card-title{font-size:14px;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.miemie-pm .mm-card-meta{font-size:11px;color:var(--mm-muted);margin-top:2px}
.miemie-pm .mm-card-actions{gap:1px;flex-shrink:0}
.miemie-pm .mm-card-actions .mm-button{border-radius:9px}
.miemie-pm .mm-toggle{width:44px;height:44px;border:0;background:transparent;position:relative;flex:none;padding:0}
.miemie-pm .mm-toggle:before{content:"";position:absolute;inset:12px 1px;border-radius:999px;background:var(--mm-off);transition:background .18s}
.miemie-pm .mm-toggle:after{content:"";position:absolute;width:14px;height:14px;left:5px;top:15px;border-radius:50%;background:var(--mm-knob);transition:transform .18s}
.miemie-pm .mm-toggle[aria-checked=true]:before{background:var(--mm-accent)}
.miemie-pm .mm-toggle[aria-checked=true]:after{transform:translateX(20px);background:var(--mm-knob)}
.miemie-pm .mm-unlocked-head{display:grid;gap:4px;margin:28px 0 12px}
.miemie-pm .mm-unlocked-head h3{font-size:14px}
.miemie-pm .mm-hint{color:var(--mm-muted);font-size:12px;overflow-wrap:anywhere}
.miemie-pm .mm-empty{padding:40px 12px;text-align:center;color:var(--mm-muted)}
.miemie-pm .mm-footer{border-top:1px solid var(--mm-line);padding:10px 16px 12px;display:flex;flex-direction:column;align-items:stretch;gap:8px;flex:none;background:var(--mm-chrome)}
.miemie-pm .mm-footer .mm-return{width:100%;min-height:44px;background:var(--mm-panel);border-color:var(--mm-line);border-radius:10px}
.miemie-pm .mm-footer .mm-hint{font-size:11px;min-width:0;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miemie-pm .mm-modal-layer{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:#0b0514c9;padding:16px}
.miemie-pm .mm-confirm-layer{z-index:6}
.miemie-pm .mm-dialog{background:var(--mm-bg);border:1px solid var(--mm-line);border-radius:16px;box-shadow:0 16px 70px #0009;width:min(620px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;min-height:0}
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
.miemie-pm input[type=checkbox]{accent-color:var(--mm-accent);width:18px;height:18px;flex:none}
.miemie-pm .mm-drag-source{opacity:.3}
.miemie-pm .mm-drag-ghost{position:fixed!important;z-index:9;pointer-events:none!important;opacity:.95;box-shadow:0 12px 35px #000b;border-color:var(--mm-accent);transform:rotate(-1deg)}
.miemie-pm .mm-drop-before:before{content:"";position:absolute;left:0;right:0;top:-6px;height:3px;background:var(--mm-accent);border-radius:3px}
.miemie-pm .mm-drop-end:after{content:"";position:absolute;left:0;right:0;bottom:-6px;height:3px;background:var(--mm-accent);border-radius:3px}
.miemie-pm.mm-drag-active,.miemie-pm.mm-drag-active *{user-select:none;-webkit-user-select:none}
.miemie-pm .mm-confirm-copy{white-space:pre-wrap;overflow-wrap:anywhere}
.miemie-pm .mm-inline-error{color:#ffc2ce;font-size:13px}
/* Geometry flags use the visible viewport, including a keyboard-reduced height.
   The same frame and editor nodes serve desktop, portrait and landscape. */
.miemie-pm[data-compact=true] .mm-header{padding:0}
.miemie-pm[data-compact=true] .mm-brandline{padding:12px;gap:10px}
.miemie-pm[data-compact=true] .mm-brand h2{font-size:16px}
.miemie-pm[data-compact=true] .mm-subtitle{font-size:10px}
.miemie-pm[data-compact=true] .mm-toolbar{gap:6px;display:grid;grid-template-columns:minmax(0,1fr) auto;padding:10px 12px}
.miemie-pm[data-compact=true] .mm-actions{gap:0}
.miemie-pm[data-compact=true] .mm-preset-field select{padding-inline:8px}
.miemie-pm[data-binding=true][data-compact=true] .mm-preset-control select{padding-right:80px}
.miemie-pm[data-compact=true] .mm-status{padding:8px 12px}
.miemie-pm[data-compact=true] .mm-category-row{padding:8px 12px;gap:6px}
.miemie-pm[data-compact=true] .mm-session-actions .mm-button{padding:9px 8px}
.miemie-pm[data-compact=true] .mm-categorybar{gap:6px}
.miemie-pm[data-compact=true] .mm-scroll{padding:2px 10px 12px}
.miemie-pm[data-compact=true] .mm-list{gap:8px}
.miemie-pm[data-compact=true] .mm-card{padding:8px 5px 8px 10px;gap:4px}
.miemie-pm[data-compact=true] .mm-card[data-orb-clearance=right]{padding-right:calc(5px + var(--mm-orb-right,0px))}
.miemie-pm[data-compact=true] .mm-card[data-orb-clearance=left]{padding-left:calc(10px + var(--mm-orb-left,0px))}
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
.miemie-pm[data-short=true] .mm-header{padding:0}
.miemie-pm[data-short=true] .mm-brandline{height:54px;min-height:54px;padding:5px 12px;gap:10px}
.miemie-pm[data-short=true] .mm-logo,.miemie-pm[data-short=true] .mm-logo img{width:44px;height:44px;flex-basis:44px}
.miemie-pm[data-short=true] .mm-brand h2{font-size:16px;line-height:1.4}
.miemie-pm[data-short=true] .mm-subtitle{font-size:10px;line-height:1.4}
.miemie-pm[data-short=true] .mm-toolbar{min-width:0;gap:6px;padding:2px 12px}
.miemie-pm[data-short=true] .mm-actions{gap:0}
.miemie-pm[data-short=true] .mm-category-row{padding:2px 12px}
.miemie-pm[data-short=true] .mm-footer{padding:4px 12px;gap:4px}
.miemie-pm[data-short=true] .mm-footer .mm-hint{font-size:10px;line-height:14px}
.miemie-pm[data-short=true] .mm-status{padding:3px 12px;font-size:12px;line-height:1.4}
.miemie-pm[data-short=true] .mm-dialog-head{padding:4px 12px}
.miemie-pm[data-short=true] .mm-dialog-body{gap:12px;padding:12px 16px}
.miemie-pm[data-short=true] .mm-dialog-actions{padding:6px 16px}
.miemie-pm[data-short=true] textarea{min-height:120px}
.miemie-pm[data-short=true] .mm-preset-label{display:none}
@media(any-pointer:coarse){.miemie-pm input,.miemie-pm select,.miemie-pm textarea{font-size:16px}}
@media(prefers-reduced-motion:reduce){.miemie-pm *,.miemie-pm *:before,.miemie-pm *:after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}

.miemie-pm .mm-parameter-entry {width:100%;min-height:44px;padding:8px 14px;margin:0 0 10px;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--mm-panel);border:1px solid var(--mm-line);border-radius:12px;text-align:center;font-size:14px;font-weight:500;}
.miemie-pm .mm-parameter-entry:hover {background:var(--mm-card);border-color:var(--mm-accent);}
.miemie-pm .mm-parameter-entry svg {width:20px;height:20px;flex:none;}

/* Isolated parameter controls: explicit tracks/thumbs avoid native host CSS. */
.miemie-pm .mm-parameters-dialog .mm-dialog-head {background:var(--mm-chrome);gap:10px;padding:15px 18px;}
.miemie-pm .mm-parameters-dialog .mm-dialog-head svg {width:21px;height:21px;color:var(--mm-accent);}
.miemie-pm .mm-parameters-dialog .mm-dialog-head h3 {font-size:16px;}
.miemie-pm .mm-parameters-dialog .mm-dialog-body {gap:14px;padding:16px;scrollbar-width:thin;scrollbar-color:var(--mm-line) transparent;}
.miemie-pm .mm-parameters-intro {display:grid;gap:5px;padding:0 2px;}
.miemie-pm .mm-parameters-preset {font-size:13px;font-weight:600;overflow-wrap:anywhere;}
.miemie-pm .mm-parameters-section {background:var(--mm-panel);border:1px solid var(--mm-line);border-radius:14px;padding:4px 14px 12px;min-width:0;}
.miemie-pm .mm-parameters-section-title {margin:12px 0 2px;font-size:11px;font-weight:600;letter-spacing:.06em;color:var(--mm-muted);}
.miemie-pm .mm-parameter-label {font-size:13px;font-weight:550;line-height:1.5;min-width:0;overflow-wrap:anywhere;}
.miemie-pm .mm-parameter-field {display:grid;grid-template-columns:minmax(0,1fr) 110px;align-items:center;gap:10px 14px;padding:12px 0;border-bottom:1px solid #bea9d418;min-width:0;}
.miemie-pm .mm-parameter-field:last-child {border-bottom:0;}
.miemie-pm .mm-parameters-section>.mm-hint {margin-top:10px;line-height:1.6;}
.miemie-pm .mm-parameter-field input[type=number] {width:110px;min-width:0;background:var(--mm-bg);padding:9px 10px;font-size:14px;text-align:right;border-color:#60447c99;appearance:textfield;-moz-appearance:textfield;}
.miemie-pm .mm-parameter-field input[type=number]::-webkit-inner-spin-button,.miemie-pm .mm-parameter-field input[type=number]::-webkit-outer-spin-button {-webkit-appearance:none;margin:0;}
.miemie-pm .mm-parameter-field input[type=number]:focus-visible {border-color:var(--mm-accent);}
.miemie-pm .mm-parameter-sampling {padding-bottom:6px;}
.miemie-pm .mm-parameter-sampling input[type=range] {--mm-range-progress:0%;grid-column:1/-1;display:block;width:100%;min-width:0;max-width:none;height:44px;min-height:44px;margin:0;padding:0;border:0;border-radius:0;outline-offset:2px;background:transparent;box-shadow:none;appearance:none;-webkit-appearance:none;cursor:pointer;touch-action:pan-y;}
.miemie-pm .mm-parameter-sampling input[type=range]::-webkit-slider-runnable-track {height:5px;border:0;border-radius:999px;background:linear-gradient(to right,var(--mm-accent) 0%,var(--mm-accent) var(--mm-range-progress),var(--mm-line) var(--mm-range-progress),var(--mm-line) 100%);box-shadow:none;}
.miemie-pm .mm-parameter-sampling input[type=range]::-webkit-slider-thumb {appearance:none;-webkit-appearance:none;width:18px;height:18px;margin-top:-6.5px;border:3px solid var(--mm-knob);border-radius:50%;background:var(--mm-accent);box-shadow:0 1px 7px #17102566;transition:box-shadow .18s ease,scale .18s ease;}
.miemie-pm .mm-parameter-sampling input[type=range]::-moz-range-track {height:5px;border:0;border-radius:999px;background:var(--mm-line);}
.miemie-pm .mm-parameter-sampling input[type=range]::-moz-range-progress {height:5px;border-radius:999px;background:var(--mm-accent);}
.miemie-pm .mm-parameter-sampling input[type=range]::-moz-range-thumb {width:12px;height:12px;border:3px solid var(--mm-knob);border-radius:50%;background:var(--mm-accent);box-shadow:0 1px 7px #17102566;transition:box-shadow .18s ease,scale .18s ease;}
.miemie-pm .mm-parameter-sampling input[type=range]:active::-webkit-slider-thumb {scale:1.12;box-shadow:0 0 0 5px #c194ff25;}
.miemie-pm .mm-parameter-sampling input[type=range]:active::-moz-range-thumb {scale:1.12;box-shadow:0 0 0 5px #c194ff25;}
.miemie-pm .mm-parameter-switch {position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px;padding:14px 0;border-bottom:1px solid #bea9d418;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.miemie-pm .mm-parameter-switch-copy {display:grid;gap:4px;min-width:0;}
.miemie-pm .mm-parameter-switch .mm-hint {font-size:11px;line-height:1.6;}
.miemie-pm .mm-parameter-switch input[type=checkbox] {position:absolute;inset:0;z-index:1;opacity:0;appearance:none;-webkit-appearance:none;width:100%;height:100%;min-height:44px;margin:0;padding:0;border:0;cursor:pointer;}
.miemie-pm .mm-parameter-switch-track {position:relative;width:52px;height:30px;flex:0 0 52px;border-radius:999px;background:var(--mm-off);box-shadow:inset 0 0 0 1px #ffffff0a;transition:background .22s ease,box-shadow .22s ease;}
.miemie-pm .mm-parameter-switch-track:after {content:"";position:absolute;left:4px;top:4px;width:22px;height:22px;border-radius:50%;background:var(--mm-knob);box-shadow:0 1px 4px #17102555;transform:translateX(0);transition:transform .24s cubic-bezier(.2,.8,.2,1),scale .16s ease;}
.miemie-pm .mm-parameter-switch input:checked+.mm-parameter-switch-track {background:var(--mm-accent);box-shadow:0 0 12px #c194ff20;}
.miemie-pm .mm-parameter-switch input:checked+.mm-parameter-switch-track:after {transform:translateX(22px);}
.miemie-pm .mm-parameter-switch input:active+.mm-parameter-switch-track:after {scale:1.05;}
.miemie-pm .mm-parameter-switch input:focus-visible+.mm-parameter-switch-track {outline:2px solid var(--mm-accent);outline-offset:4px;}
.miemie-pm .mm-parameter-switch:has(input:disabled) {opacity:.45;cursor:default;}
.miemie-pm .mm-parameter-picker-field {display:grid;gap:10px;padding-top:14px;min-width:0;}
.miemie-pm .mm-parameter-picker {width:100%;justify-content:space-between;padding:10px 12px;border:1px solid var(--mm-line);border-radius:10px;background:var(--mm-bg);text-align:left;}
.miemie-pm .mm-parameter-picker:focus:not(:focus-visible) {outline:none;}
.miemie-pm .mm-parameter-picker svg {width:18px;height:18px;color:var(--mm-muted);transition:transform .2s ease;}
.miemie-pm .mm-parameter-picker[aria-expanded=true] {border-color:var(--mm-accent);}
.miemie-pm .mm-parameter-picker[aria-expanded=true] svg {transform:rotate(180deg);}
.miemie-pm .mm-parameter-picker-menu {display:grid;gap:2px;padding:5px;border:1px solid var(--mm-line);border-radius:12px;background:var(--mm-bg);max-height:min(264px,32dvh);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--mm-line) transparent;animation:mm-parameter-options-in .16s ease-out;}
.miemie-pm .mm-parameter-option {justify-content:space-between;min-height:44px;width:100%;border-radius:8px;padding:10px 12px;font-size:13px;}
.miemie-pm .mm-parameter-option svg {visibility:hidden;width:17px;height:17px;}
.miemie-pm .mm-parameter-option[aria-selected=true] {color:var(--mm-accent);background:var(--mm-tonal);}
.miemie-pm .mm-parameter-option[aria-selected=true] svg {visibility:visible;}
.miemie-pm .mm-parameters-dialog .mm-dialog-actions {display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;padding:12px 16px;background:var(--mm-chrome);}
.miemie-pm .mm-parameters-dialog .mm-dialog-actions .mm-button {width:100%;min-height:46px;transition:background .18s ease,transform .15s ease;}
.miemie-pm .mm-parameters-dialog .mm-dialog-actions .mm-button:active:not(:disabled) {transform:translateY(1px);}
.miemie-pm .mm-modal-layer[data-parameter-motion] {background:transparent;}
.miemie-pm .mm-modal-layer:focus {outline:none;}
.miemie-pm .mm-modal-layer[data-parameter-motion]>.mm-parameters-dialog {position:relative;z-index:2;}
.miemie-pm .mm-parameter-morph-veil {position:absolute;inset:0;background:#0b0514c9;pointer-events:none;}
.miemie-pm .mm-parameter-morph-shell {position:absolute;left:0;top:0;z-index:1;border:1px solid var(--mm-line);overflow:hidden;pointer-events:none;will-change:left,top,width,height;}
@keyframes mm-parameter-options-in {from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.miemie-pm .mm-parameters-dialog *,.miemie-pm .mm-parameters-dialog *:after {transition:none!important;animation:none!important;}.miemie-pm .mm-parameter-sampling input[type=range]::-webkit-slider-thumb,.miemie-pm .mm-parameter-sampling input[type=range]::-moz-range-thumb {transition:none!important;}}
`;
