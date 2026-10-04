# Presentation Alignment · 0.2.0

**阶段状态：内容已通过 Maintainer Review，收口为 0.2.0 Pre-release。**

2026-10-05，Maintainer确认升版本前Candidate内容并授权阶段发布。其SHA-256为 `2c84664207849af59460b81c50cf4b46fedcbd16c255422e38f3720dad2b792a`；0.2.0只调整版本与交付文档，不改动Hub仓库或既有功能，不据此扩大全面真实宿主验收结论。

## 1. Baseline

本阶段起始 GitHub main 与本地 HEAD 均为 `ac81136caf623ce8f197296294b19c5f2a4f9cf6`。本地既有工作区比 main 新；本轮保留原有业务修改，没有 reset 到 main。

开始前构建当前源码，完整重现 Owner 已确认功能候选：

```text
c9c98c00a48c5bed1440a4cbae2e1425293b65ec138e834d08ffcad5c233382c
```

该构建的 Node153项通过。原候选记录为19项功能、9项响应式、23项交互/性能检查。本轮保留57份原始文件、逐文件哈希与原工作区diff，位于本地 `evidence/presentation-functional-baseline/`；冻结记录见 `evidence/presentation-freeze.json`。这些本地证据不上传，也不替代真实宿主验收。

## 2. Functional Freeze

相对于上述功能候选，`controller.ts`、`model.ts`、`st-adapter.ts`、`index.ts`、`icons.ts` 与正式PNG逐字未改。核心业务测试也逐字未改：Controller races、Model、ST native contracts、local reorder queue、native batch contracts、save performance。

`contracts.ts` 只添加可选的 `setPresentation(local/native/hub)` View接口。`ui.ts` 调整实际窗口、Header/Footer、响应式几何、关闭后焦点和原生球避让；原业务字段、事件操作和 requestClose 语义保留。`dual-mode.ts` 换用Native组件，注册可选Shortcut，并为activate重入复用同一Promise，避免重复面板/入口注册。仍保留正式Hub closePanel、旧session隔离及原bounded cleanup。

相对main已存在的业务修改是本轮之前的功能候选，不是Presentation修改。

## 3. Native Launcher

64px圆形、原始正式PNG、Pointer Events、7px拖动阈值、真实鼠标/CDP触控拖动、左/右自动Dock、键盘Enter/Space、focus-visible、减少动态效果。只存储自己的 `miemie_preset_manager_dock_v1` 的side/ratio，默认right/0.6。safe-area、visualViewport偏移/大小、resize/rotation均被处理；dispose清理capture、rAF、样式、动画和监听器。

基于 [Polisher 1.2.1](https://github.com/SheepSheepLab/MieMie-Polisher/tree/5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1) 的真实固定源码adapt；窗口结构和避让参考 [Story Director](https://github.com/SheepSheepLab/MieMie-Story-Director/tree/32f34865af156d35b628adc6e66018329026df96)。GPL来源保留于源码、THIRD_PARTY_NOTICES与source-provenance。

## 4. Native Floating Presentation

Standalone：Orb → 实际应用Window → 当前Orb。使用WAAPI transform/scale/opacity/clip-path，520ms窗口展开、760ms正式PNG Hero Landing、460ms返回；Header Hero从约148px落入52px位置。序列化并去重打开/关闭，动画期间inert，完成后转移焦点。

旋转/resize/visualViewport变化取消旧flight，使用最新几何收口；临时splash/veil/hero、will-change、动画句柄清理。prefers-reduced-motion跳过动画但保留完整功能。

## 5. Hub

| 入口 | 动画 | 业务/面板 |
| --- | --- | --- |
| Standalone | 共用Native Floating Presentation | 同一Controller/View/Panel |
| 蜂窝 | Hub Surface Motion | 同一Controller/View/Panel |
| 可选Shortcut | 共用Native组件提供Presentation，Hub管理Surface状态 | 同一ExtensionInstance/Controller/Panel |

Manifest fallback仍为短文本 `预设`，正式PNG仍通过attachPanel/presentation.icon提供。不更改Hub validator/API。

固定Hub原始Runtime/provide/Surface/Shortcut registry在浏览器中执行，验证生产Manifest、偏好开关、挂载/打开/关闭、menu与closed origin返回、中途停用Shortcut、disposed→Standalone→ready、重复ready与单实例。pendingRaw、localRevision、Preset、分类、未保存排序逐字保留；Editor未保存草稿保留。没有第二份业务实例或面板。

## 6. UI Alignment

实际600×780 Clamp应用窗口、16px边框圆角、细Border/深色Surface/Shadow、52px正式Header PNG、18px产品名及版本/12px当前角色、常规81px Header、10px控件/12px卡片、底部长条“返回”和保留隐私提示。主窗口不再使用全屏Overlay；内部Editor/Confirm保持16px Dialog、局部Backdrop、独立滚动、操作栏可达、原focus/Escape/Tab语义。

保留Lilac Accent与信息架构：Preset/必要状态 → 新增条目｜分类｜保存/重读 → Cards/Unlocked → Editor → Footer。保存SVG继续同色/1.7px线条/透明底，Dirty只显示底部4px绿色光点。

1512×859、390×844、320px、390×420、横屏/低高度通过几何与控件断言；panned visualViewport和safe-area下球与窗口均Clamp。卡片仅在原生球真实可见且浏览器命中顺序确认球位于卡片前方时避让；面板位于上层或球隐藏/不可见/移除时清空留白。固定操作栏或内部Dialog实际遮挡时保留既有临时下层保护，不挡关键操作；没有修改Native Launcher的层级或缩放整页。

## 7. B方案确认

所有Prompt编辑/Toggle/Copy/Reorder/Add等先进入本地Dirty，不立即写ST。编辑器Save只保存进本地Session；只有统一Save Changes才同步酒馆并回读。Reload确认后读成功才放弃；失败保留。Footer Return与Escape继续走requestClose，选否保留，选是丢弃再关闭。拖动pointermove/drop零Host I/O，rAF/Drag Ghost保留。

## 8. Business Regression

157/157 Node：原153项继续通过，新增4项Native/Hub Presentation检查。B1、B2、Unknown Fields、所有prompt_order分组、Round Trip、原生默认对象fingerprint、ST1.18/1.19固定API、外部变更/失败/并发、pendingRaw/saveChanges/cancelChanges、dirty关闭、分类、编辑、局部排序/批量保存、单实例全部保持。

19/19原功能浏览器、9/9响应式、23/23交互/性能检查通过，0pageerror；保存比较基准8项正确性检查继续通过。现有展示测试仅调整64px持续球、动画终点等待、实际Clamp窗口/安全边距和Footer Return等预期；未改写业务Golden或削弱数据/错误/写入次数断言。

## 9. Presentation Tests

4项新增Node + 49/49专项浏览器检查通过，0pageerror、0外部网络请求。包括Native size/PNG/threshold/Dock/persistence/drag/cleanup，Orb↔Panel/Hero/focus/cancel/resize/reduced-motion，同一业务/面板及跨模式Dirty/草稿/排序/分类，正式Hub Surface/Shortcut preference/origin与entry-based motion，Mobile/键盘视口/触控尺寸和控件可达。

Owner避让修复新增11项专项回执：桌面与390px面板位于球上方/嵌套低层球时所有卡片按钮对齐；真实前景球允许有限留白且所有操作中心可点击；hidden、display:none、visibility:hidden、opacity:0逐项清空并恢复；detached/disposed及无球清空；Dock、resize、close/reopen及祖先淡出动画结束不残留。旧实现运行新增回归时在“面板位于上层但仍有clearance”断言失败，日志见本地 `evidence/orb-clearance-before.log`。修复后无需调整Native Launcher z-index或业务状态。

独立无父目录依赖的临时目录，从锁文件离线 `npm ci` 成功安装82包；`check/test/build`通过。重建Extension JSON、manifest、production JS、preview JS四项与工作区逐字一致。测试源码不进入生产bundle；未新增telemetry、CDN、远端资源或Prompt上传。

这些是Chromium151的真实DOM/Pointer/CDP touch/WAAPI与固定Hub契约检查，宿主/Launcher依赖及数据synthetic；不代表真实ST、Safari、iOS/Android或完整Phase1验收。

## 10. Review Files

- 可交互生产UI演示：`evidence/presentation-review/app.html`。
- 16张截图入口：`evidence/presentation-review/gallery.html`，同目录 `01`–`16` PNG；新增桌面与390px面板覆盖球时按钮对齐截图。
- 专项测试夹具：`evidence/presentation-review/preview.html`（可控延迟Adapter，供自动断言，不作为Owner保存体验预览）。
- 正式构建预览：`delivery/preview.html`。
- 浏览器回执：`evidence/presentation-review/results.json`。
- 功能冻结与文件列表：`evidence/presentation-freeze.json`。
- 当前阶段交付：`delivery/MieMie-Preset-Manager-Extension-0.2.0.json`。

0.2.0交付SHA-256：

```text
b735bb507e7315389afe0197c7c6b56f614e0cdfd87e13a2b5b8b32a0d97c0ca
```

全部产物哈希见 [validation-results.json](validation-results.json)。阶段版本0.2.0，Product/Extension ID仍miemie.preset-manager，Script ID仍98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1，正式PNG哈希仍2735ea7e6485e2c719680bad34a38573c14171ff38494803273a05dce7e12b53。

内容已通过Maintainer Review；后续在可恢复测试副本上继续ST1.19、深度数据边界及物理手机软键盘/旋转/安全区。阶段发布并不完成Issue #1。

### File inventory relative to the functional baseline

Modified (19):

- `tests/reorder-browser.cjs`
- `README.md`
- `THIRD_PARTY_NOTICES.md`
- `contracts.ts`
- `delivery/MieMie-Preset-Manager-Extension-0.2.0.json`
- `delivery/component-update-manifest.json`
- `docs/COMPATIBILITY.md`
- `docs/TESTING.md`
- `docs/source-provenance.json`
- `docs/validation-results.json`
- `dual-mode.test.ts`
- `dual-mode.ts`
- `package.json`
- `styles.ts`
- `tests/browser-check.cjs`
- `tests/fixtures/README.md`
- `tests/hub-v1-contracts.test.cjs`
- `tests/mobile-responsive.cjs`
- `ui.ts`

Added (10):

- `docs/APPLICATION-PRESENTATION.md`
- `docs/PRESENTATION-REVIEW.md`
- `native-floating-presentation.ts`
- `native-launcher.ts`
- `official-presentation.ts`
- `presentation-styles.ts`
- `product-identity.ts`
- `tests/fixtures/hub-v1-shortcut-launchers.js`
- `tests/helpers/presentation-browser-harness.ts`
- `tests/presentation-browser.cjs`

## Historical pre-release candidate checks

以下为升版本前0.1.2内容的逐步自动检查记录；候选阶段的待Review／未提交描述仅指当时，不是0.2.0的当前发布状态。

### Header / Dirty banner Owner follow-up

当时0.1.2候选Header第一行「咩咩预设管理 0.1.2」，第二行「当前角色：角色名（无单人角色时：请打开单人角色聊天）」；桌面与窄屏字体对齐官方参考。取消本地Dirty重复提示横栏，保留Footer小字与保存绿点。既有23项UI/性能检查增加实际列表y/height不变断言，继续通过；19项功能、9项响应式、41项Presentation及157项Node通过，0页面错误。Core冻结未变，四产物独立重建逐字一致。此轮仍为本地Candidate，等待Owner真实Safari Review。

### Complete top notice removal

Owner要求删除顶部普通通知整个模块，已移除View中的通知DOM、notice渲染和对应CSS。恢复原状态等提示不会再出现；控制器notice状态、保存/重读/关闭/失败规则保持原样。Footer提示和绿点保留；错误与确认保留。UI/性能新恢复原状态回归使总计23项，全部通过，列表几何不变。

### Footer ordinary status

普通消息现由原Footer小字统一展示：dirty/busy以及恢复、重读、保存成功。没有消息时回到隐私/分类说明；长内容单行省略并可悬停查看全文。顶部通知模块保持删除，错误与确认保留。所有自动检查通过，四项干净重建产物一致；只更新本地Candidate，等待Owner Review。

### Shortcut repeated launch Owner fix

重复点击Shortcut时，旧代码每次先执行setPresentation('hub')/View.open；Hub对已经打开的同一Surface只聚焦，不重新place/run，因而留下Hub居中布局。修复限定初始化仅用于hidden入口，保持已显示Surface的Native/Hub布局及opening/closing操作锁。继续调用正式showPanel，不自行接管Hub可见性或关闭；关闭后新入口仍按原流程选择布局。

新8项专项检查在旧代码上先失败；修复后49/49专项通过。包含桌面/390px连续真实点击、草稿、蜂窝聚焦、正式关闭/重开、Hub新入口、打开动画和关闭中连续重开。157项Node、19项功能、9项响应式、23项UI/性能、8项保存正确性及check/build全部通过；12份冻结文件逐字不变，四交付产物独立干净重建一致。没有修改Hub、提交或推送，没有新增真实宿主通过结论。Owner下一步应导入当前包，复核录屏中的重复点击路径。
