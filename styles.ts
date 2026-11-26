// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

export const managerStyles = `
.miemie-pm{--mm-safe-top:env(safe-area-inset-top,0px);--mm-safe-right:env(safe-area-inset-right,0px);--mm-safe-bottom:env(safe-area-inset-bottom,0px);--mm-safe-left:env(safe-area-inset-left,0px);--mm-bg:#15122a;--mm-chrome:#1a1531;--mm-panel:#201a39;--mm-card:#211b39;--mm-line:#5b487f;--mm-text:#f7f1ff;--mm-muted:#b9a5d9;--mm-accent:#c49af5;--mm-tonal:#402b69;--mm-primary:#8d5bd3;--mm-primary-end:#8050c2;--mm-primary-ink:#ffffff;--mm-bridge:#6b47a4;--mm-off:#4c4267;--mm-knob:#fbf7ff;position:fixed;left:10px;top:10px;z-index:2147483000;box-sizing:border-box;display:block;width:min(600px,calc(100vw - 20px));height:min(780px,calc(100dvh - 20px));border:1px solid var(--mm-line);border-radius:16px;overflow:hidden;background:linear-gradient(140deg,var(--mm-chrome),var(--mm-bg));box-shadow:0 12px 45px #0009;color:var(--mm-text);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:left;text-shadow:none;isolation:isolate;color-scheme:dark}
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
.miemie-pm .mm-logo img{display:block;width:52px;height:52px;object-fit:contain;filter:drop-shadow(0 2px 8px #c49af525)}
.miemie-pm .mm-brand{flex:1;min-width:0}
.miemie-pm .mm-brand h2{font:700 18px/1.55 system-ui;letter-spacing:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miemie-pm .mm-subtitle{color:var(--mm-muted);font:12px/1.55 system-ui;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miemie-pm .mm-button{border:1px solid transparent;border-radius:10px;background:transparent;min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;flex-shrink:0;line-height:1.2}
.miemie-pm .mm-button:hover:not(:disabled){background:#c49af51f}
.miemie-pm .mm-button.mm-icon{width:44px;padding:10px}
.miemie-pm .mm-button.mm-launcher-settings-button{border:0;padding:8px;color:#e3cef9}
.miemie-pm .mm-launcher-settings-button svg{width:24px;height:24px}
.miemie-pm .mm-button.mm-save{background:transparent;position:relative}
.miemie-pm .mm-button.mm-save:after{content:"";display:none;position:absolute;left:50%;bottom:3px;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#77f5a4;box-shadow:0 0 4px #77f5a499,0 0 8px #77f5a433;pointer-events:none}
.miemie-pm .mm-session-actions[data-dirty=true] .mm-save:after{display:block}
.miemie-pm .mm-button.mm-primary{background:linear-gradient(135deg,var(--mm-primary),var(--mm-primary-end));color:var(--mm-primary-ink);font-weight:650}
.miemie-pm .mm-button.mm-primary:hover:not(:disabled){background:linear-gradient(135deg,var(--mm-primary),var(--mm-primary-end));}
.miemie-pm .mm-button.mm-secondary{border-color:var(--mm-line);background:var(--mm-panel)}
.miemie-pm .mm-button.mm-danger{color:#ffb4c0;border-color:#a3475a;background:#562633}
.miemie-pm .mm-preset-field{flex:1;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:4px}
.miemie-pm .mm-preset-label{font-size:11px;color:var(--mm-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:max-content;max-width:calc(100vw - 56px)}
.miemie-pm .mm-default-dot{display:none;fill:currentColor;stroke:none}
.miemie-pm .mm-default[aria-pressed=true] .mm-default-dot{display:block}
.miemie-pm select,.miemie-pm input[type=text],.miemie-pm input[type=number],.miemie-pm textarea{width:100%;border:1px solid var(--mm-line);border-radius:10px;background:var(--mm-panel);padding:10px 12px;min-height:44px;outline-offset:2px}
.miemie-pm select{text-overflow:ellipsis}
.miemie-pm .mm-preset-control{position:relative;min-width:0;border:1px solid var(--mm-line);border-radius:10px;background:var(--mm-panel)}
.miemie-pm .mm-preset-control .mm-preset-picker{display:block;min-width:0;width:100%;border:0;background:var(--mm-panel)}
.miemie-pm .mm-preset-control[data-keyboard-focus=true]:focus-within{outline:2px solid var(--mm-accent);outline-offset:2px}
.miemie-pm .mm-preset-control .mm-preset-picker:focus-visible{outline:none}
.miemie-pm .mm-preset-control .mm-default{position:absolute;right:0;top:0;bottom:0;z-index:1;border:0;border-left:1px solid var(--mm-line);border-radius:0 9px 9px 0;background:var(--mm-tonal);transition:background .16s,border-color .16s}
.miemie-pm .mm-preset-control .mm-default:hover:not(:disabled){background:#51347e;border-left-color:#8462b5}
.miemie-pm .mm-preset-control .mm-default:active:not(:disabled){background:#352254}
.miemie-pm .mm-preset-control .mm-default:focus-visible{outline-offset:-3px}
.miemie-pm[data-binding=true] .mm-preset-control .mm-preset-picker{appearance:none;-webkit-appearance:none;padding-right:60px}
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
.miemie-pm .mm-card:hover{border-color:#8462b5}
.miemie-pm .mm-card[data-attached=true][data-enabled=false]{
  --mm-off:#433750;--mm-knob:#ab9cbd;
  background:#1b172b;border-color:#433750;color:#b8a8ca;
}
.miemie-pm .mm-card[data-attached=true][data-enabled=false]:hover{border-color:#625374}
.miemie-pm .mm-card[data-attached=true][data-enabled=false] .mm-card-meta,
.miemie-pm .mm-card[data-attached=true][data-enabled=false] .mm-card-actions .mm-icon{color:#a393b7}
.miemie-pm .mm-card[data-attached=true][data-enabled=false] .mm-card-actions .mm-icon:not(:disabled):is(:hover,:focus-visible){color:var(--mm-text)}
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
.miemie-pm .mm-card-activation{position:absolute;z-index:2;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none}
.miemie-pm .mm-card-activation-light{
  position:absolute;inset:0;opacity:0;
  background:radial-gradient(ellipse 51% 235% at 50% 48%,#f3e7ff 0%,#e1c8ff 22%,#cfacf8b3 34%,#b995ed63 51%,#a982dc28 71%,#a982dc0c 86%,transparent 100%);
}
@media(prefers-reduced-motion:reduce){.miemie-pm .mm-card-activation{display:none}}
.miemie-pm .mm-unlocked-head{display:grid;gap:4px;margin:28px 0 12px}
.miemie-pm .mm-unlocked-head h3{font-size:14px}
.miemie-pm .mm-hint{color:var(--mm-muted);font-size:12px;overflow-wrap:anywhere}
.miemie-pm .mm-empty{padding:40px 12px;text-align:center;color:var(--mm-muted)}
.miemie-pm .mm-footer{border-top:1px solid var(--mm-line);padding:10px 16px 12px;display:flex;flex-direction:column;align-items:stretch;gap:8px;flex:none;background:var(--mm-chrome)}
.miemie-pm .mm-footer .mm-return{width:100%;min-height:44px;background:var(--mm-panel);border-color:var(--mm-line);border-radius:10px}
.miemie-pm .mm-footer .mm-hint{font-size:11px;min-width:0;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miemie-pm .mm-modal-layer{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:#090717c9;padding:16px}
.miemie-pm .mm-confirm-layer{z-index:6}
.miemie-pm .mm-dialog{position:relative;background:var(--mm-bg);border:1px solid var(--mm-line);border-radius:16px;box-shadow:0 16px 70px #0009;width:min(620px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;min-height:0}
.miemie-pm .mm-dialog-head{padding:16px 20px;border-bottom:1px solid var(--mm-line);flex:none}
.miemie-pm .mm-dialog-head h3{font-size:17px;flex:1;min-width:0;overflow-wrap:anywhere}
.miemie-pm .mm-dialog-body{display:grid;gap:16px;overflow:auto;overscroll-behavior:contain;padding:20px;min-height:0;scroll-padding-block:16px}
.miemie-pm .mm-editor-dialog .mm-dialog-body{flex:1;align-content:start}
.miemie-pm .mm-field{display:grid;gap:7px;min-width:0}
.miemie-pm .mm-field>span{font-size:13px;font-weight:550}
.miemie-pm textarea{resize:vertical;min-height:220px;line-height:1.7;tab-size:2}
.miemie-pm .mm-dialog-actions{justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--mm-line);flex:none}
.miemie-pm .mm-launcher-settings-layer{background:#0b0818a8;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.miemie-pm .mm-launcher-settings{width:min(440px,100%);animation:mm-launcher-settings-in .18s cubic-bezier(.2,.8,.3,1)}
@keyframes mm-launcher-settings-in{from{opacity:0;transform:translateY(7px) scale(.985)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.miemie-pm .mm-launcher-settings{animation:none}}
.miemie-pm .mm-launcher-card{display:grid;gap:12px;min-width:0;padding:14px;border:1px solid var(--mm-line);border-radius:16px;background:linear-gradient(145deg,var(--mm-panel),var(--mm-bg))}
.miemie-pm .mm-launcher-card-heading{display:flex;justify-content:space-between;align-items:center;gap:8px}
.miemie-pm .mm-launcher-card-heading h4{margin:0;font-size:16px;line-height:1.3}
.miemie-pm .mm-launcher-card-heading small{font-size:11px;color:var(--mm-muted)}
.miemie-pm .mm-launcher-size-row{display:grid;grid-template-columns:minmax(0,1fr) 64px;align-items:center;gap:10px;padding:10px;border-radius:12px;background:#100c1b65}
.miemie-pm .mm-launcher-size-fields{min-width:0;display:grid;gap:4px}
.miemie-pm .mm-launcher-size-heading,.miemie-pm .mm-launcher-size-stops{display:flex;justify-content:space-between;align-items:center;gap:4px}
.miemie-pm .mm-launcher-size-label,.miemie-pm .mm-launcher-mode-copy strong{font-weight:650}
.miemie-pm .mm-launcher-size-value{color:#e3cef9;font-size:12px;font-variant-numeric:tabular-nums;border:1px solid var(--mm-line);border-radius:99px;padding:1px 7px}
.miemie-pm .mm-launcher-size-stops{color:var(--mm-muted);font-size:10px;line-height:1}
.miemie-pm .mm-launcher-size-input{appearance:none;-webkit-appearance:none;width:100%;height:36px;min-width:0;padding:0 8px;border:0;border-radius:10px;background:#100c1c;cursor:pointer}
.miemie-pm .mm-launcher-size-input::-webkit-slider-runnable-track{height:5px;border-radius:10px;background:linear-gradient(to right,var(--mm-accent) var(--mm-size-fill),var(--mm-off) var(--mm-size-fill))}
.miemie-pm .mm-launcher-size-input::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:19px;height:19px;margin-top:-7px;border:1px solid #e3cef9;border-radius:50%;background:#ddbefb;box-shadow:0 0 8px #bd8bff70}
.miemie-pm .mm-launcher-size-input::-moz-range-track{height:5px;border-radius:10px;background:var(--mm-off)}
.miemie-pm .mm-launcher-size-input::-moz-range-progress{height:5px;border-radius:10px;background:var(--mm-accent)}
.miemie-pm .mm-launcher-size-input::-moz-range-thumb{width:17px;height:17px;border:1px solid #e3cef9;border-radius:50%;background:#ddbefb}
.miemie-pm .mm-launcher-size-preview{position:relative;overflow:hidden;height:64px;border:1px solid var(--mm-line);border-radius:12px;background:radial-gradient(ellipse at 70% 40%,#392750,var(--mm-bg));pointer-events:none}
.miemie-pm .mm-launcher-size-preview img{position:absolute;top:50%;right:50%;transform:translate(50%,-50%);width:var(--mm-preview-diameter);height:var(--mm-preview-diameter);object-fit:cover;border:2px solid #c49af5a0;border-radius:50%;box-shadow:0 0 0 4px #c49af526,0 2px 12px #0008;transition:right .19s ease-out}
.miemie-pm .mm-launcher-size-preview[data-tucked] img{right:0}
.miemie-pm .mm-launcher-mode-row{display:grid;grid-template-columns:minmax(0,1fr) 52px;gap:10px;align-items:center}
.miemie-pm .mm-launcher-mode-copy{display:grid;gap:4px;min-width:0}
.miemie-pm .mm-preset-tools-layer{padding:12px}
.miemie-pm .mm-tools-dialog{width:min(510px,100%);background-color:var(--mm-bg);background-image:linear-gradient(155deg,var(--mm-chrome),var(--mm-bg) 62%);animation:none}
.miemie-pm .mm-dialog.mm-dialog-in-motion{isolation:isolate;overflow:visible;background:transparent;border-color:transparent;box-shadow:none}
.miemie-pm .mm-dialog-motion-shell{position:absolute;inset:-1px;z-index:-1;pointer-events:none;transform-origin:0 0;border:1px solid var(--mm-line);border-radius:16px;background:linear-gradient(155deg,var(--mm-chrome),var(--mm-bg) 62%);box-shadow:0 16px 70px #0009;will-change:transform,opacity}
.miemie-pm .mm-dialog-head.mm-preset-dialog-head{padding:13px 17px;gap:11px;border-bottom-color:#5b487f82;background:var(--mm-chrome)}
.miemie-pm .mm-preset-dialog-copy{flex:1;min-width:0;display:grid;gap:3px}
.miemie-pm .mm-preset-dialog-copy h3{color:var(--mm-text);font-size:17px;line-height:1.3}
.miemie-pm .mm-preset-dialog-copy .mm-preset-dialog-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;line-height:1.45}
.miemie-pm[data-compact=true] .mm-dialog-head.mm-preset-dialog-head{padding-inline:12px}
.miemie-pm[data-short=true] .mm-dialog-head.mm-preset-dialog-head{padding-block:8px}
.miemie-pm .mm-tools-icon{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:10px;border:1px solid #795aa86e;color:#e3cef9;background:linear-gradient(145deg,#382751,#231a39)}
.miemie-pm .mm-tools-icon svg{width:18px;height:18px}
.miemie-pm .mm-tools-dialog .mm-dialog-body{padding:14px 16px;gap:11px;scroll-padding-block:12px;scrollbar-width:thin}
.miemie-pm .mm-tools-group{gap:0;padding:0;border-color:#5b487fbd;background:linear-gradient(150deg,var(--mm-panel),#1a152d 78%)}
.miemie-pm .mm-tools-group h4{margin:0;padding:11px 14px 1px;color:#d9c5f3;font-size:12px;font-weight:650;line-height:1.4}
.miemie-pm .mm-tool-feature{display:grid;gap:9px;min-width:0;margin-inline:14px;padding-block:10px 12px}
.miemie-pm .mm-tool-feature+.mm-tool-feature{border-top:1px solid #5b487f87}
.miemie-pm .mm-tool-feature h5{margin:0;color:var(--mm-text);font-size:14px;font-weight:650;line-height:1.45}
.miemie-pm .mm-tool-feature .mm-launcher-mode-copy{gap:2px}
.miemie-pm .mm-tool-feature .mm-hint{line-height:1.45}
.miemie-pm .mm-tool-example{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:baseline;gap:5px 11px;min-width:0;padding:8px 10px;border-radius:9px;border:1px solid #5b487f4f;background:#100c1b75;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.miemie-pm .mm-tool-example-label{color:var(--mm-muted);font-size:11px}
.miemie-pm .mm-tool-example-result{margin:0;padding:0;border:0;box-shadow:none;color:#e0c4fb;background:none;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
.miemie-pm .mm-unicode-reply{min-width:0;margin:0;padding:0;border:0;animation:mm-tools-reveal .17s ease-out}
.miemie-pm .mm-unicode-reply legend{margin-bottom:5px;padding:0;font-size:12px;color:var(--mm-muted)}
.miemie-pm .mm-unicode-reply-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));min-width:0;gap:3px;padding:3px;border:1px solid #5b487f9c;border-radius:10px;background:#110d21}
.miemie-pm .mm-unicode-reply-option{position:relative;display:block;min-width:0}
.miemie-pm .mm-unicode-reply-option input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.miemie-pm .mm-unicode-reply-option span{display:grid;place-items:center;min-height:44px;padding:4px;border:1px solid transparent;border-radius:7px;font-size:12px;color:var(--mm-muted);transition:background .15s,color .15s}
.miemie-pm .mm-unicode-reply-option input:checked+span{border-color:#795aa892;background:var(--mm-tonal);color:var(--mm-text)}
.miemie-pm .mm-unicode-reply-option input:focus-visible+span{outline:2px solid var(--mm-accent);outline-offset:2px}
.miemie-pm .mm-unicode-reply .mm-hint{margin-top:6px}
.miemie-pm .mm-tool-edit-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;min-width:0;min-height:62px;padding:7px 8px 7px 12px;border:1px solid #5b487f7f;border-radius:11px;background:#100c1b75}
.miemie-pm .mm-tool-edit-copy{display:grid;grid-template-columns:minmax(0,1fr);gap:3px;min-width:0}
.miemie-pm .mm-tool-edit-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eadcfb;font-size:13px;font-weight:650;line-height:18px}
.miemie-pm .mm-tool-edit-preview{position:relative;min-width:0;width:max-content;max-width:100%;color:var(--mm-muted);font-size:12px;line-height:17px}
.miemie-pm .mm-tool-preview-line{display:block;overflow:hidden;white-space:nowrap}
.miemie-pm .mm-tool-edit-preview[data-more]{padding-inline-end:15px}
.miemie-pm .mm-tool-edit-preview:is([data-clipped],[data-more])::after{content:"…";position:absolute;inset-block-start:0;inset-inline-end:0;width:14px;text-align:center;color:#9b86b9}
.miemie-pm .mm-tool-edit-preview[data-clipped]:not([data-more]) .mm-tool-preview-line{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 34px),transparent calc(100% - 12px));mask-image:linear-gradient(to right,#000 calc(100% - 34px),transparent calc(100% - 12px))}
.miemie-pm .mm-tool-edit-preview[data-more]:not([data-clipped]) .mm-tool-preview-line{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 17px),#0008);mask-image:linear-gradient(to right,#000 calc(100% - 17px),#0008)}
.miemie-pm .mm-tool-edit-preview[data-clipped][data-more] .mm-tool-preview-line{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 22px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 22px),transparent)}
.miemie-pm .mm-button.mm-tool-edit-button,.miemie-pm .mm-button.mm-tool-reset{padding:7px 8px;color:#dfbcff;font-size:12px;gap:5px;white-space:nowrap}
.miemie-pm .mm-tool-edit-button svg,.miemie-pm .mm-tool-reset svg{width:14px;height:14px}
.miemie-pm .mm-tool-editor-layer{padding:12px;background:#0b0817b5}
.miemie-pm .mm-tool-editor-dialog{width:min(490px,100%);height:min(500px,100%);background:linear-gradient(155deg,var(--mm-chrome),var(--mm-bg) 62%)}
.miemie-pm .mm-tool-editor-dialog .mm-dialog-head{padding:12px 16px;gap:10px;border-bottom-color:#5b487f82}
.miemie-pm .mm-tool-editor-dialog .mm-dialog-head h3{font-size:16px;line-height:1.35}
.miemie-pm .mm-tool-editor-dialog .mm-dialog-body{display:flex;flex-direction:column;flex:1;padding:12px 16px;scrollbar-width:thin}
.miemie-pm .mm-tool-editor-dialog .mm-dialog-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:10px 16px;border-top-color:#5b487f82;background:var(--mm-chrome)}
.miemie-pm .mm-tool-editor-dialog .mm-dialog-actions .mm-button{min-width:0}
.miemie-pm .mm-tool-editor-dialog .mm-dialog-actions svg{width:15px;height:15px}
.miemie-pm .mm-tool-prompt-content{display:flex;flex-direction:column;flex:1;gap:8px;min-width:0}
.miemie-pm .mm-tool-editor-fields{display:flex;align-items:center;justify-content:space-between;gap:8px}
.miemie-pm .mm-tool-field-label,.miemie-pm .mm-tag-label{color:#e3d1f8;font-size:13px;font-weight:650}
.miemie-pm .mm-tool-editor-dialog .mm-tool-edit-input{min-height:110px;padding:10px 12px;resize:none;overscroll-behavior:contain;background:#110d21;border-color:#6a538c;font-size:16px;line-height:1.55}
.miemie-pm .mm-tool-prompt-content .mm-tool-edit-input{flex:1}
.miemie-pm .mm-tool-editor-dialog .mm-tool-edit-input[aria-invalid="true"]{border-color:#d6829f}
.miemie-pm .mm-tool-edit-input:focus-visible{outline-offset:1px}
.miemie-pm .mm-tool-tags-content,.miemie-pm .mm-tool-tags-section{display:grid;align-content:start;min-width:0;gap:8px}
.miemie-pm .mm-tool-tags-content{gap:14px}
.miemie-pm .mm-tool-tags-section+.mm-tool-tags-section{padding-top:12px;border-top:1px solid #5b487f82}
.miemie-pm .mm-tag-list{display:flex;flex-wrap:wrap;gap:5px 6px;margin:0;padding:0 3px 3px 0;max-height:130px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#7c669a transparent;list-style:none}
.miemie-pm .mm-tag-list:focus-visible{outline-offset:0}
.miemie-pm .mm-tag-list li{min-width:0;max-width:100%;margin:0;padding:3px 6px;border:1px solid #5b487f70;border-radius:6px;background:#211937}
.miemie-pm .mm-tag-list code{padding:0;border:0;background:none;color:#d8c3ed;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}
.miemie-pm .mm-tools-transfer,.miemie-pm .mm-tools-notice{padding-inline:2px;font-size:11px;line-height:1.5}
.miemie-pm .mm-tools-dialog .mm-dialog-actions{padding:10px 16px;border-top-color:#5b487f82;background:var(--mm-chrome)}
.miemie-pm .mm-tools-dialog .mm-dialog-actions svg{width:15px;height:15px}
.miemie-pm .mm-download-layer{padding:12px}
.miemie-pm .mm-download-dialog{width:min(510px,100%);background:linear-gradient(155deg,var(--mm-chrome),var(--mm-bg) 64%)}
.miemie-pm .mm-download-layer>.mm-download-dialog{height:min(586px,100%)}
.miemie-pm .mm-download-dialog .mm-dialog-head{padding:12px 15px;gap:10px}
.miemie-pm .mm-download-dialog .mm-dialog-actions{position:relative;padding:10px 14px;border-top:1px solid var(--mm-line);background:var(--mm-chrome)}
.miemie-pm .mm-download-dialog .mm-dialog-actions>.mm-button{flex:1;justify-content:center}
.miemie-pm .mm-download-layer>.mm-download-dialog .mm-dialog-body{grid-template-rows:repeat(2,minmax(100px,1fr));flex:1;gap:10px;padding:10px 14px}
.miemie-pm .mm-download-announcement{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.miemie-pm .mm-download-group{display:grid;grid-template-rows:34px minmax(0,1fr);min-width:0;min-height:0;overflow:hidden;border:1px solid var(--mm-line);border-radius:12px;background:#171227}
.miemie-pm .mm-download-group h4{display:flex;align-items:center;padding:0 12px;margin:0;border-bottom:1px solid #5b487f9c;background:#231a36;color:var(--mm-text);font-size:13px;font-weight:650}
.miemie-pm .mm-download-rows{min-width:0;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#7c669a transparent;padding:0 8px;margin:0;list-style:none}
.miemie-pm .mm-download-rows:focus-visible{outline:2px solid var(--mm-accent);outline-offset:-2px}
.miemie-pm .mm-download-empty{display:grid;justify-items:start;gap:10px;padding:13px 7px;color:var(--mm-muted);font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.miemie-pm .mm-download-row{display:grid;grid-template-columns:minmax(0,1fr) 70px;gap:9px;align-items:center;padding:4px 3px;height:64px}
.miemie-pm .mm-download-row+.mm-download-row{border-top:1px solid #5b487f60}
.miemie-pm .mm-download-row-notes{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:9px;min-width:0;min-height:44px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--mm-text);font:inherit;text-align:start;cursor:pointer}
.miemie-pm .mm-download-row-notes:hover strong,.miemie-pm .mm-download-row-notes:focus-visible strong{color:#e1c5ff}
.miemie-pm .mm-download-row-notes:focus-visible{outline-offset:1px}
.miemie-pm .mm-download-row-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#302348;color:#ceb8ec}
.miemie-pm .mm-download-group+.mm-download-group .mm-download-row-icon{background:#282542;color:#c1c7f7}
.miemie-pm .mm-download-row-icon svg{width:17px;height:17px}
.miemie-pm .mm-download-row-copy{display:grid;gap:3px;min-width:0;line-height:1.25}
.miemie-pm .mm-download-row-copy strong{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;font-size:13px;font-weight:650}
.miemie-pm .mm-download-row-copy span{color:var(--mm-muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miemie-pm .mm-download-row-controls{position:relative}
.miemie-pm .mm-download-row-controls .mm-download-row-action{display:flex;width:100%;height:44px;min-height:44px;align-items:center;justify-content:center;gap:4px;padding:0 4px;border-radius:10px;border-color:#6c5289;background:#302245;color:#f0ddff;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
.miemie-pm .mm-download-row-controls .mm-download-row-action svg{width:13px;height:13px;flex:none}
.miemie-pm .mm-download-row[data-download-state=running] .mm-download-row-action{padding-bottom:7px}
.miemie-pm .mm-download-row[data-download-state=complete] .mm-download-row-action{border-color:#4a786a;background:#203733;color:#aff0cf}
.miemie-pm .mm-download-progress{position:absolute;inset:auto 9px 8px;height:3px;overflow:hidden;border-radius:3px;background:#69537f;pointer-events:none}
.miemie-pm .mm-download-progress>span{display:block;width:100%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#9e79e6,#e5c3ff);transform-origin:left}
.miemie-pm .mm-download-confirm-layer{padding:14px;background:#0b0817bb}
.miemie-pm .mm-download-confirm-layer .mm-download-dialog{--mm-download-inset:18px;width:min(412px,100%)}
.miemie-pm .mm-download-confirm-layer .mm-download-dialog .mm-dialog-head{padding:12px var(--mm-download-inset);gap:9px;border-bottom-color:#5b487f9c}
.miemie-pm .mm-download-confirm-layer .mm-dialog-head h3{margin:0;font-size:16px;line-height:1.35}
.miemie-pm .mm-download-confirm-layer .mm-dialog-head .mm-tools-icon{width:30px;height:30px;border-radius:9px}
.miemie-pm .mm-download-confirm-layer .mm-dialog-head .mm-tools-icon svg{width:16px;height:16px}
.miemie-pm .mm-download-confirm-layer .mm-download-dialog .mm-dialog-body{padding:13px var(--mm-download-inset) 16px;gap:12px;align-content:start}
.miemie-pm .mm-download-confirm-layer .mm-download-dialog .mm-dialog-actions{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);padding:10px var(--mm-download-inset);border-top-color:#5b487f9c}
.miemie-pm .mm-download-confirm-layer .mm-dialog-actions>.mm-button{min-width:0;padding-inline:6px;font-size:13px}
.miemie-pm .mm-download-confirm-layer .mm-dialog-actions>.mm-button:only-child{grid-column:1/-1}
.miemie-pm .mm-download-confirm-layer .mm-dialog-actions>a.mm-button{text-decoration:none}
.miemie-pm .mm-download-confirm-layer .mm-dialog-actions>.mm-button svg{width:15px;height:15px;flex:none}
.miemie-pm .mm-release-notes-info{display:grid;gap:5px;min-width:0;padding-bottom:12px;border-bottom:1px solid var(--mm-line);overflow-wrap:anywhere}
.miemie-pm .mm-release-notes-info strong{font-size:14px;color:var(--mm-text)}
.miemie-pm .mm-release-notes-date{font-size:11px;color:var(--mm-muted)}
.miemie-pm .mm-release-notes-date:empty,.miemie-pm .mm-release-notes:empty{display:none}
.miemie-pm .mm-release-notes{display:grid;gap:8px;min-width:0;color:var(--mm-text);overflow-wrap:anywhere}
.miemie-pm .mm-release-notes h4,.miemie-pm .mm-release-notes p{margin:0}
.miemie-pm .mm-release-notes h4{font-size:14px;line-height:1.4;color:#e1c5ff}
.miemie-pm .mm-release-notes p{white-space:pre-wrap;font-size:13px;line-height:1.65}
.miemie-pm .mm-download-selection{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:9px;padding:8px 9px;border:1px solid #5b487f8c;border-radius:11px;background:linear-gradient(105deg,#2a2041,#201933)}
.miemie-pm .mm-download-selection-copy{min-width:0;display:grid;gap:2px;overflow-wrap:anywhere}
.miemie-pm .mm-download-selection-copy strong{color:var(--mm-text);font-size:14px;font-weight:650;line-height:1.3}
.miemie-pm .mm-download-selection-copy span{color:var(--mm-muted);font-size:11px;line-height:1.3}
.miemie-pm .mm-download-options{min-width:0;padding:0;margin:0;border:0}
.miemie-pm .mm-download-options legend,.miemie-pm .mm-download-field>span{font-size:12px;font-weight:600;line-height:16px;color:#dfcbed}
.miemie-pm .mm-download-options legend{padding:0;margin-bottom:5px}
.miemie-pm .mm-download-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px;padding:2px;border:1px solid var(--mm-line);border-radius:10px;background:#151024}
.miemie-pm .mm-download-option{position:relative;min-width:0}
.miemie-pm .mm-download-option input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.miemie-pm .mm-download-option span{display:grid;place-items:center;min-height:44px;padding:3px 4px;border:1px solid transparent;border-radius:7px;color:var(--mm-muted);font-size:12px;line-height:1.25;text-align:center}
.miemie-pm .mm-download-option input:checked+span{border-color:#795aa8;background:var(--mm-tonal);color:var(--mm-text)}
.miemie-pm .mm-download-option input:disabled{cursor:default}
.miemie-pm .mm-download-option input:disabled+span{opacity:.55}
.miemie-pm .mm-download-option input:focus-visible+span{outline:2px solid var(--mm-accent);outline-offset:-2px}
.miemie-pm .mm-download-field{display:grid;gap:5px;min-width:0}
.miemie-pm .mm-download-field .mm-download-picker{width:100%;height:44px;justify-content:space-between;padding:0 10px;border:1px solid #6e568f;border-radius:9px;background:#211a35;font-size:13px}
.miemie-pm .mm-download-field .mm-download-picker:hover:not(:disabled),.miemie-pm .mm-download-field .mm-download-picker[aria-expanded=true]{border-color:var(--mm-accent);background:#2b2043}
.miemie-pm .mm-download-field .mm-download-picker:disabled{border-color:#5b487f96;background:#191429;color:var(--mm-muted);opacity:.7}
.miemie-pm .mm-download-picker svg{width:16px;height:16px;flex:none}
.miemie-pm .mm-download-destination{color:var(--mm-muted);font-size:11px;line-height:16px;margin:0;overflow-wrap:anywhere}
.miemie-pm .mm-download-dialog[data-download-kind] .mm-dialog-body{padding-block:14px}
.miemie-pm .mm-download-dialog[data-download-kind] .mm-download-field{gap:8px}
.miemie-pm .mm-download-confirm-layer .mm-primary[data-reading]{background:#372951;color:#c7b2de;opacity:1;cursor:progress}
.miemie-pm .mm-download-spinner{width:14px;height:14px;flex:none;border:2px solid #c7b2de45;border-top-color:currentColor;border-radius:50%;animation:mm-download-spin .7s linear infinite}
@keyframes mm-download-spin{to{transform:rotate(360deg)}}
.miemie-pm[data-compact=true] .mm-download-layer,
.miemie-pm[data-compact=true] .mm-download-confirm-layer{padding:8px}
.miemie-pm[data-compact=true] .mm-download-confirm-layer .mm-download-dialog{--mm-download-inset:12px}
@media(min-width:500px){
  .miemie-pm[data-short=true] .mm-download-confirm-layer .mm-download-dialog:has(.mm-download-options){width:min(468px,100%)}
  .miemie-pm[data-short=true] .mm-download-confirm-layer .mm-dialog-body:has(.mm-download-options){grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;column-gap:14px}
  .miemie-pm[data-short=true] .mm-download-confirm-layer .mm-download-selection{grid-column:1/-1}
}
.miemie-pm[data-compact=true] .mm-tools-dialog .mm-tools-group{padding:0}
.miemie-pm[data-compact=true] .mm-tools-group h4{padding-inline:11px}
.miemie-pm[data-compact=true] .mm-tool-feature{margin-inline:11px}
.miemie-pm[data-compact=true] .mm-tool-edit-row{gap:5px;padding-inline:9px 4px}
.miemie-pm[data-compact=true] .mm-button.mm-tool-edit-button{padding-inline:3px;gap:4px}
.miemie-pm[data-compact=true] .mm-tool-editor-layer{padding:8px}
.miemie-pm[data-compact=true] .mm-tool-editor-dialog :is(.mm-dialog-head,.mm-dialog-body,.mm-dialog-actions){padding-inline:12px}
.miemie-pm[data-short=true] .mm-tag-list{max-height:96px}
@keyframes mm-tools-reveal{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.miemie-pm .mm-unicode-reply{animation:none}.miemie-pm .mm-unicode-reply-option span{transition:none}}
.miemie-pm .mm-button.mm-launcher-mode-switch{width:52px;padding:0;border-radius:14px}
.miemie-pm .mm-launcher-mode-track{display:block;width:43px;height:25px;padding:3px;border:1px solid #796395;border-radius:20px;background:#35274d;transition:background .16s,border-color .16s}
.miemie-pm .mm-launcher-mode-track:after{content:"";display:block;width:17px;height:17px;border-radius:50%;background:#ccbedc;transition:translate .16s,background .16s}
.miemie-pm .mm-launcher-mode-switch[aria-checked=true] .mm-launcher-mode-track{background:#613f9b;border-color:#c49af5}
.miemie-pm .mm-launcher-mode-switch[aria-checked=true] .mm-launcher-mode-track:after{translate:18px 0;background:#fbf7ff}
.miemie-pm .mm-launcher-settings .mm-dialog-actions .mm-button{width:100%}
.miemie-pm[data-compact=true] .mm-launcher-settings :is(.mm-dialog-head,.mm-dialog-body,.mm-dialog-actions){padding-inline:12px}
.miemie-pm[data-compact=true] .mm-launcher-card{padding:10px}
.miemie-pm[data-compact=true] .mm-launcher-size-row{grid-template-columns:minmax(0,1fr) 56px;padding:8px;gap:8px}
.miemie-pm[data-compact=true] .mm-launcher-size-preview{height:56px}
@media(pointer:coarse){.miemie-pm .mm-launcher-size-input{height:40px}}
@media(prefers-reduced-motion:reduce){.miemie-pm .mm-launcher-mode-track,.miemie-pm .mm-launcher-mode-track:after{transition:none}}
.miemie-pm details{border-top:1px solid var(--mm-line);padding-top:12px}
.miemie-pm summary{cursor:pointer;min-height:44px;display:list-item;padding:8px 0}
.miemie-pm .mm-advanced-settings{padding:0;border:1px solid var(--mm-line);border-radius:14px;background:var(--mm-chrome)}
.miemie-pm .mm-advanced-summary{display:flex;align-items:center;gap:11px;min-height:54px;padding:8px 12px;border-radius:inherit;list-style:none}
.miemie-pm .mm-advanced-summary::-webkit-details-marker{display:none}
.miemie-pm .mm-advanced-summary::marker{content:""}
.miemie-pm .mm-advanced-summary:hover{background:#c49af50e}
.miemie-pm .mm-advanced-summary-title{flex:1;font-size:14px;font-weight:650}
.miemie-pm .mm-advanced-icon{display:grid;place-items:center;width:32px;height:32px;flex:none;border:1px solid #9a72ca59;border-radius:9px;background:var(--mm-tonal);color:var(--mm-accent)}
.miemie-pm .mm-advanced-icon svg,.miemie-pm .mm-advanced-chevron{width:17px;height:17px}
.miemie-pm .mm-advanced-chevron{color:var(--mm-muted);transition:transform .16s ease}
.miemie-pm .mm-advanced-settings[open]>.mm-advanced-summary{border-radius:13px 13px 0 0}
.miemie-pm .mm-advanced-settings[open] .mm-advanced-chevron{transform:rotate(180deg)}
.miemie-pm .mm-advanced{display:grid;gap:10px;padding:10px;border-top:1px solid #5b487f82}
.miemie-pm .mm-advanced-group{display:grid;gap:11px;min-width:0;padding:12px;border:1px solid #5b487f82;border-radius:11px;background:var(--mm-bg)}
.miemie-pm .mm-advanced .mm-field-row,.miemie-pm .mm-advanced .mm-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.miemie-pm .mm-advanced .mm-field{gap:5px}
.miemie-pm .mm-advanced .mm-field input,.miemie-pm .mm-advanced .mm-field .mm-parameter-picker{background:var(--mm-panel);min-width:0}
.miemie-pm .mm-advanced input[type=number]{font-variant-numeric:tabular-nums}
.miemie-pm .mm-advanced-heading{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.miemie-pm .mm-advanced-heading h4{margin:0;font-size:13px;font-weight:650}
.miemie-pm .mm-advanced-selection{color:var(--mm-muted);font-size:11px;font-variant-numeric:tabular-nums;text-align:right}
.miemie-pm .mm-advanced .mm-check{position:relative;display:flex;align-items:center;gap:8px;min-height:44px;min-width:0;border:1px solid #5b487f82;border-radius:9px;padding:6px 9px;background:var(--mm-chrome);cursor:pointer}
.miemie-pm .mm-advanced .mm-check:hover:not(:has(input:disabled)){border-color:#8462b5}
.miemie-pm .mm-advanced .mm-check:has(input:checked){background:var(--mm-tonal);border-color:#9a73cb}
.miemie-pm .mm-advanced .mm-check:has(input:disabled){cursor:default;opacity:.66}
.miemie-pm .mm-advanced .mm-checks .mm-check[data-legacy]{grid-column:1/-1}
.miemie-pm .mm-advanced .mm-check:has(input:focus-visible){outline:2px solid var(--mm-accent);outline-offset:1px}
.miemie-pm .mm-advanced .mm-check input{position:absolute;top:50%;left:9px;transform:translateY(-50%);margin:0;opacity:0}
.miemie-pm .mm-check-mark{display:grid;place-items:center;width:18px;height:18px;flex:none;border:1px solid #967bb5;border-radius:5px;background:var(--mm-bg);pointer-events:none}
.miemie-pm .mm-check-mark svg{width:13px;height:13px;visibility:hidden;stroke-width:2.25}
.miemie-pm .mm-check input:checked+.mm-check-mark{background:var(--mm-accent);color:var(--mm-primary-ink);border-color:transparent}
.miemie-pm .mm-check input:checked+.mm-check-mark svg{visibility:visible}
.miemie-pm .mm-check-copy{min-width:0;font-size:13px;line-height:1.3;overflow-wrap:anywhere}
.miemie-pm .mm-advanced .mm-advanced-override{background:var(--mm-bg);padding-inline:12px}
.miemie-pm[data-compact=true] .mm-advanced-group{padding:8px}
.miemie-pm[data-compact=true] .mm-advanced{padding:8px;gap:8px}
@media(prefers-reduced-motion:reduce){.miemie-pm .mm-advanced-chevron{transition:none}}
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
.miemie-pm[data-compact=true] .mm-preset-field .mm-preset-picker{padding-inline:8px}
.miemie-pm[data-binding=true][data-compact=true] .mm-preset-control .mm-preset-picker{padding-right:60px}
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

.miemie-pm .mm-preset-settings-entries{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px}
.miemie-pm .mm-button.mm-parameter-entry{display:grid;width:100%;min-width:0;min-height:52px;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;justify-content:initial;padding:7px 10px;border:1px solid #584574;border-radius:12px;background-color:var(--mm-panel);background-image:linear-gradient(125deg,#32244a80,transparent 72%);box-shadow:inset 0 1px #e0befb0d;text-align:start;font-size:14px;font-weight:600;transition:background-color .16s,border-color .16s}
.miemie-pm .mm-button.mm-parameter-entry+.mm-parameter-entry{background-image:linear-gradient(125deg,#31295185,transparent 72%)}
.miemie-pm .mm-button.mm-parameter-entry:hover:not(:disabled){background-color:#302446;border-color:#8b6bad}
.miemie-pm .mm-parameter-entry:focus-visible{outline-offset:-3px}
.miemie-pm .mm-settings-entry-icon{display:grid;place-items:center;width:32px;height:32px;border:1px solid #9873c269;border-radius:9px;background:linear-gradient(140deg,#4b3267,#2a1d42);color:#edd9ff}
.miemie-pm .mm-parameter-entry+.mm-parameter-entry .mm-settings-entry-icon{border-color:#8c7fc46b;background:linear-gradient(140deg,#42375f,#29213f);color:#e4ddff}
.miemie-pm .mm-settings-entry-icon svg{width:17px;height:17px}
.miemie-pm .mm-settings-entry-label{min-width:0;white-space:nowrap}
.miemie-pm .mm-parameter-entry .mm-settings-entry-arrow{width:14px;height:14px;transform:rotate(-90deg);color:var(--mm-muted)}
.miemie-pm[data-compact=true] .mm-preset-settings-entries{gap:7px}
.miemie-pm[data-compact=true] .mm-button.mm-parameter-entry{grid-template-columns:auto minmax(0,1fr);min-height:46px;gap:6px;padding:6px;font-size:13px}
.miemie-pm[data-compact=true] .mm-settings-entry-icon{width:26px;height:26px;border-radius:7px}
.miemie-pm[data-compact=true] .mm-settings-entry-icon svg{width:15px;height:15px}
.miemie-pm[data-compact=true] .mm-settings-entry-arrow{display:none}
.miemie-pm .mm-parameters-dialog [data-tool-managed]{opacity:.6;cursor:default}
.miemie-pm .mm-parameters-dialog [data-tool-managed] .mm-button:disabled{opacity:1}

/* Isolated parameter controls: explicit tracks/thumbs avoid native host CSS. */
.miemie-pm .mm-parameters-dialog .mm-dialog-body {gap:14px;padding:16px;scrollbar-width:thin;scrollbar-color:var(--mm-line) transparent;}
.miemie-pm .mm-parameters-section {background:var(--mm-panel);border:1px solid var(--mm-line);border-radius:14px;padding:4px 14px 12px;min-width:0;}
.miemie-pm .mm-parameters-section-title {margin:12px 0 2px;font-size:11px;font-weight:600;letter-spacing:.06em;color:var(--mm-muted);}
.miemie-pm .mm-parameter-label {font-size:13px;font-weight:550;line-height:1.5;min-width:0;overflow-wrap:anywhere;}
.miemie-pm .mm-parameter-field {display:grid;grid-template-columns:minmax(0,1fr) 110px;align-items:center;gap:10px 14px;padding:12px 0;border-bottom:1px solid #b9a5d918;min-width:0;}
.miemie-pm .mm-parameter-field:last-child {border-bottom:0;}
.miemie-pm .mm-parameters-section>.mm-hint {margin-top:10px;line-height:1.6;}
.miemie-pm .mm-parameter-field input[type=number] {width:110px;min-width:0;background:var(--mm-bg);padding:9px 10px;font-size:14px;text-align:right;border-color:#5b487f99;appearance:textfield;-moz-appearance:textfield;}
.miemie-pm .mm-parameter-field input[type=number]::-webkit-inner-spin-button,.miemie-pm .mm-parameter-field input[type=number]::-webkit-outer-spin-button {-webkit-appearance:none;margin:0;}
.miemie-pm .mm-parameter-field input[type=number]:focus-visible {border-color:var(--mm-accent);}
.miemie-pm .mm-parameter-sampling {padding-bottom:6px;}
.miemie-pm .mm-parameter-sampling input[type=range] {--mm-range-progress:0%;grid-column:1/-1;display:block;width:100%;min-width:0;max-width:none;height:44px;min-height:44px;margin:0;padding:0;border:0;border-radius:0;outline-offset:2px;background:transparent;box-shadow:none;appearance:none;-webkit-appearance:none;cursor:pointer;touch-action:pan-y;}
.miemie-pm .mm-parameter-sampling input[type=range]::-webkit-slider-runnable-track {height:5px;border:0;border-radius:999px;background:linear-gradient(to right,var(--mm-accent) 0%,var(--mm-accent) var(--mm-range-progress),var(--mm-line) var(--mm-range-progress),var(--mm-line) 100%);box-shadow:none;}
.miemie-pm .mm-parameter-sampling input[type=range]::-webkit-slider-thumb {appearance:none;-webkit-appearance:none;width:18px;height:18px;margin-top:-6.5px;border:3px solid var(--mm-knob);border-radius:50%;background:var(--mm-accent);box-shadow:0 1px 7px #15122a66;transition:box-shadow .18s ease,scale .18s ease;}
.miemie-pm .mm-parameter-sampling input[type=range]::-moz-range-track {height:5px;border:0;border-radius:999px;background:var(--mm-line);}
.miemie-pm .mm-parameter-sampling input[type=range]::-moz-range-progress {height:5px;border-radius:999px;background:var(--mm-accent);}
.miemie-pm .mm-parameter-sampling input[type=range]::-moz-range-thumb {width:12px;height:12px;border:3px solid var(--mm-knob);border-radius:50%;background:var(--mm-accent);box-shadow:0 1px 7px #15122a66;transition:box-shadow .18s ease,scale .18s ease;}
.miemie-pm .mm-parameter-sampling input[type=range]:active::-webkit-slider-thumb {scale:1.12;box-shadow:0 0 0 5px #c49af525;}
.miemie-pm .mm-parameter-sampling input[type=range]:active::-moz-range-thumb {scale:1.12;box-shadow:0 0 0 5px #c49af525;}
.miemie-pm .mm-parameter-switch {position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px;padding:14px 0;border-bottom:1px solid #b9a5d918;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.miemie-pm .mm-parameter-switch-copy {display:grid;gap:4px;min-width:0;}
.miemie-pm .mm-parameter-switch .mm-hint {font-size:11px;line-height:1.6;}
.miemie-pm .mm-parameter-switch input[type=checkbox] {position:absolute;inset:0;z-index:1;opacity:0;appearance:none;-webkit-appearance:none;width:100%;height:100%;min-height:44px;margin:0;padding:0;border:0;cursor:pointer;}
.miemie-pm .mm-parameter-switch-track {position:relative;width:52px;height:30px;flex:0 0 52px;border-radius:999px;background:var(--mm-off);box-shadow:inset 0 0 0 1px #ffffff0a;transition:background .22s ease,box-shadow .22s ease;}
.miemie-pm .mm-parameter-switch-track:after {content:"";position:absolute;left:4px;top:4px;width:22px;height:22px;border-radius:50%;background:var(--mm-knob);box-shadow:0 1px 4px #15122a55;transform:translateX(0);transition:transform .24s cubic-bezier(.2,.8,.2,1),scale .16s ease;}
.miemie-pm .mm-parameter-switch input:checked+.mm-parameter-switch-track {background:var(--mm-accent);box-shadow:0 0 12px #c49af520;}
.miemie-pm .mm-parameter-switch input:checked+.mm-parameter-switch-track:after {transform:translateX(22px);}
.miemie-pm .mm-parameter-switch input:active+.mm-parameter-switch-track:after {scale:1.05;}
.miemie-pm .mm-parameter-switch input:focus-visible+.mm-parameter-switch-track {outline:2px solid var(--mm-accent);outline-offset:4px;}
.miemie-pm .mm-parameter-switch:has(input:disabled) {opacity:.45;cursor:default;}
.miemie-pm .mm-parameters-dialog {position:relative;}
.miemie-pm .mm-reasoning-options {position:absolute;z-index:3;box-shadow:0 12px 30px #0007;}
.miemie-pm .mm-parameter-picker-field {display:grid;gap:10px;padding-top:14px;min-width:0;}
.miemie-pm .mm-parameter-picker {width:100%;justify-content:space-between;padding:10px 12px;border:1px solid var(--mm-line);border-radius:10px;background:var(--mm-bg);text-align:left;}
.miemie-pm .mm-parameter-picker:focus:not(:focus-visible) {outline:none;}
.miemie-pm .mm-parameter-picker svg {width:18px;height:18px;color:var(--mm-muted);transition:transform .2s ease;}
.miemie-pm .mm-parameter-picker[aria-expanded=true] {border-color:var(--mm-accent);}
.miemie-pm .mm-parameter-picker[aria-expanded=true] svg {transform:rotate(180deg);}
.miemie-pm .mm-preset-control .mm-preset-picker {display:flex;width:100%;min-width:0;border:0;background:var(--mm-panel);}
.miemie-pm .mm-preset-picker .mm-parameter-picker-value {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;}
.miemie-pm .mm-preset-control:has(.mm-preset-picker[aria-expanded=true]) {border-color:var(--mm-accent);}
.miemie-pm .mm-preset-control .mm-preset-options {position:absolute;left:-1px;right:-1px;top:calc(100% + 6px);z-index:3;box-shadow:0 12px 30px #0007;}
.miemie-pm .mm-preset-options .mm-parameter-option {white-space:normal;text-align:left;overflow-wrap:anywhere;flex-shrink:0;}
.miemie-pm .mm-parameter-picker-menu {display:grid;gap:2px;padding:5px;border:1px solid var(--mm-line);border-radius:12px;background:var(--mm-bg);max-height:min(264px,32dvh);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--mm-line) transparent;animation:mm-parameter-options-in .16s ease-out;}
.miemie-pm .mm-picker-scroll-shadows {position:absolute;z-index:4;overflow:hidden;border-radius:12px;pointer-events:none;animation:mm-parameter-options-in .16s ease-out;}
.miemie-pm .mm-picker-scroll-shadows:before,.miemie-pm .mm-picker-scroll-shadows:after {content:"";position:absolute;left:1px;right:1px;height:44px;pointer-events:none;opacity:0;transition:opacity .18s ease;}
.miemie-pm .mm-picker-scroll-shadows:before {top:1px;background:linear-gradient(to bottom,#080617d9,transparent);}
.miemie-pm .mm-picker-scroll-shadows:after {bottom:1px;background:linear-gradient(to top,#080617d9,transparent);}
.miemie-pm .mm-picker-scroll-shadows[data-top=true]:before,.miemie-pm .mm-picker-scroll-shadows[data-bottom=true]:after {opacity:1;}
@media(prefers-reduced-motion:reduce){.miemie-pm .mm-picker-scroll-shadows,.miemie-pm .mm-picker-scroll-shadows:before,.miemie-pm .mm-picker-scroll-shadows:after {animation:none!important;transition:none!important;}}
.miemie-pm .mm-parameter-option {justify-content:space-between;min-height:44px;width:100%;border-radius:8px;padding:10px 12px;font-size:13px;}
.miemie-pm .mm-parameter-option svg {visibility:hidden;width:17px;height:17px;}
.miemie-pm .mm-parameter-option[aria-selected=true] {color:var(--mm-accent);background:var(--mm-tonal);}
.miemie-pm .mm-parameter-option[aria-selected=true] svg {visibility:visible;}
.miemie-pm .mm-parameters-dialog .mm-dialog-actions {display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;padding:12px 16px;background:var(--mm-chrome);}
.miemie-pm .mm-parameters-dialog .mm-dialog-actions .mm-button {width:100%;min-height:46px;transition:background .18s ease,transform .15s ease;}
.miemie-pm .mm-parameters-dialog .mm-dialog-actions .mm-button:active:not(:disabled) {transform:translateY(1px);}
.miemie-pm .mm-modal-layer[data-parameter-motion] {background:transparent;}
.miemie-pm .mm-modal-layer:focus {outline:none;}
.miemie-pm .mm-modal-layer[data-parameter-motion]>:is(.mm-parameters-dialog,.mm-tools-dialog) {position:relative;z-index:2;}
.miemie-pm .mm-parameter-morph-veil {position:absolute;inset:0;background:#090717c9;pointer-events:none;}
.miemie-pm .mm-parameter-morph-shell {position:absolute;left:0;top:0;z-index:1;border:1px solid var(--mm-line);overflow:hidden;pointer-events:none;will-change:left,top,width,height;}
@keyframes mm-parameter-options-in {from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.miemie-pm .mm-parameters-dialog *,.miemie-pm .mm-parameters-dialog *:after {transition:none!important;animation:none!important;}.miemie-pm .mm-parameter-sampling input[type=range]::-webkit-slider-thumb,.miemie-pm .mm-parameter-sampling input[type=range]::-moz-range-thumb {transition:none!important;}}
`;
