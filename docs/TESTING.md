# Testing · 0.2.3

历史 Foundation 和各 Candidate 的结果保留原日期与范围；当前证据以以下 2026-10-08 汇总为准。

本次验收文档发布于 v0.2.3 Release 之后，不属于原 v0.2.3 Tag 的文档内容；历史 Tag 与 Release Assets 保持不变。Issue 的实时状态以 [Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 为准。

最新正式检查见文末 [0.2.3 release validation](#023-release-validation2026-10-07)；下方历次 Candidate 及发行结果保留对应日期、版本和范围。

## 当前验收摘要（2026-10-08）

此前已补做 R-A / R-B 实际 UI 验收及 R-C Owner Manual Acceptance；本轮只完成剩余实际 MPM Export 文件 / ST Native Re-import / 编辑后 Export 互操作，不重测其他已通过15项，不重跑发行自动测试、不生成交付包。**结论 A：Phase 1 Acceptance Complete，18 PASS / 0 PARTIAL / 0 FAIL；原始 Phase 1 验收已通过 Owner 最终审核。** 代表性 ST 1.19.0 真宿主与 iOS Simulator Mobile Safari 已有实际操作证据；物理设备和整个 ST 版本/插件矩阵未验。2026-10-04 Foundation 只对应当时的 0.1.2 包，下面所有历史 Candidate / Release 回执保留原范围。

### 证据类型与发布测试回执

A = Automated Contract（Node / Fixture / Synthetic Host）；B = Browser Simulation（Playwright / CDP / responsive）；C = Real Desktop Host（实际 ST + Helper + Browser）；D = Simulator Mobile Host（实际 ST + Helper + iOS Simulator Mobile Safari）；E = Owner Manual Acceptance（明确回执）。D 不等于 physical iPhone，E 不伪装成独立工具观察。

| 正式 0.2.3 发布检查 | 2026-10-07 已有 PASS 回执 |
| --- | ---: |
| Node（A） | 325 |
| Package v1（A，15 production + 56 upstream） | 71 |
| 当前正式 Hub Package 专项（A） | 15 |
| Browser（B：19 functional + 9 responsive + 35 binding + 44 parameters + 28 motion + 57 presentation） | 192 |
| UI / Drag（B） | 24 |
| Save comparison（A） | 8 |

来源：[Release 0.2.3](RELEASE-0.2.3.md) 和 [validation-results.json](validation-results.json) 的 release023；这是历史发行回执，**本轮未重新运行**。package.json 没有正式文档检查命令；本轮另做真实 Export / Native Re-import / Edited Export 及 diff、文档结构/链接/证据和隐私核对。当前为 **18 PASS / 0 PARTIAL / 0 FAIL**；先前10/8→Owner普通滑动11/7→R-A/R-B阶段15/3的报告均保留。本轮实际文件证据见 ST119-FINAL-EXPORT。

ST119-R1 的 A–I、首次安装编辑/保存/刷新和长期 Safari 刷新前往返通过，真实 Native 未保存修改保护通过。Helper 最大化上下文导致实际 live 从 4095/false 变为 2000000/true，是 Correct Conflict Protection；关闭优化并明确重新读取后正常切换。原始异常保留，不算未解决 MPM Bug。

IOS27-R1 原始 **29 PASS / 16 NOT TESTED** 保持不变；后续 OWNER-IOS-01（E）补充 TOUCH-02/03 长按、拖动、统一保存、刷新排序持久化及预设切换。软件键盘、编辑 Title/Content、数字输入、Save/Cancel、可见区域适配与基础旋转由原始 D 证据通过。#8 PASS；后续 OWNER-IOS-02（E）明确普通滑动到底、最后 Prompt 可见且不改顺序，#15 PASS。证据 ID、环境、原始报告 hash 与范围见 [Real Host Validation](REAL_HOST_VALIDATION.md)。

## 可复现命令

要求 Node.js `>=22`、npm。仓库根目录：

```sh
npm ci
npm run check
npm test
npm run build
npm run test:browser
npm run test:ui-performance
npm run test:save-performance
npm run test:presentation
```

`build` 已包含类型检查和 Node 测试；完整日常检查可直接运行 `npm ci`、`npm run build`、`npm run test:browser`。构建生成交付 JSON、manifest 和本地演示页面，浏览器检查必须在构建后运行。

浏览器测试固定 Playwright `1.62.1`，默认使用本机 Chrome。也可安装 Playwright 管理的 Chromium：

```sh
npx playwright install chromium
```

随后设置 `PLAYWRIGHT_CHANNEL=chromium` 再执行 `npm run test:browser`。例如 PowerShell：

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npm run test:browser
```

POSIX shell：

```sh
PLAYWRIGHT_CHANNEL=chromium npm run test:browser
```

浏览器检查打开生成的 `delivery/preview.html`，使用内存 Adapter 和人工演示数据。截图与检查回执写入本地 `evidence/`，不作为预设数据上传。演示入口不进入 Tavern Helper 交付脚本。

## 历史自动检查结果 · 0.2.0（2026-10-05）

2026-10-05，在独立依赖安装后执行以下检查，使用 Node `24.13.1`、Playwright `1.62.1` 与其 Chromium `151.0.7922.34`。这些结果是开发测试，不是真实 ST 运行记录；机器可读结果见 [validation-results.json](validation-results.json)。

| 检查 | 覆盖范围 | 结果 |
| --- | --- | --- |
| `npm ci` | 从锁文件安装开发依赖 | 通过，从锁文件安装82个包；结果不作为安全审计结论 |
| TypeScript 与脚本构建 | 严格类型检查、可读业务脚本、Extension JSON、打包后语法检查 | 通过 |
| Node：157 项 | 原始对象、Round Trip、未知字段／所有组、Prompt、Adapter／并发、暂存控制器与 Hub 契约 | 157 通过；功能基线153项保留，新增4项Native/Hub展示检查 |
| 其中 70 项原生契约测试 | 固定原生源码片段与模拟 DOM／HTTP／事件 | 70 通过，包含在 157 项内 |
| 功能浏览器：19 项 | 显式保存后的编辑／复制／开关／排序、导入导出、触控、关闭丢弃及 Hub 生命周期 | 19 通过 |
| 响应式浏览器：9 项 | PC／窄屏／横屏、编辑草稿与焦点、视口缩短、安全区、菜单与按钮可达性 | 9 通过 |
| UI／性能回归：23 项 | 分类四视口、拖动选择、零自动写入、保存失败／重试、确认重读／失败保留、关闭丢弃、锁链图标与布局、外部冲突 | 23 通过，无页面错误；模拟 Adapter，不是实机性能结论 |
| Presentation 浏览器：49 项 | Native pointer/Dock/动画/焦点、固定Hub契约/Shortcut、减少动态效果、安全区与视口、跨模式状态及16张截图 | 49通过，0pageerror/外部网络请求，synthetic依赖 |
| 干净目录重建 | 在没有父目录依赖的独立临时目录，从锁文件执行 `npm ci` 与 `npm run build` | 通过，4 项产物逐字一致 |

0.2.0 从main基线 `ac81136caf623ce8f197296294b19c5f2a4f9cf6` 与已确认内容构建，本次收口只调整版本、交付元数据和文档。Presentation开始前源码完整重现功能候选 `c9c98c00a48c5bed1440a4cbae2e1425293b65ec138e834d08ffcad5c233382c`，Node153项通过。重构后核心业务文件及业务测试逐字未改，153项基线检查继续通过；新增4项Native Dock/dispose/pending open/activate重入检查，总157项。70项固定原生源码检查、B1、B2和原5项Hub契约检查保持通过；不是重新录制数据Golden。

19项功能、9项响应式、23项UI/性能与49项Presentation浏览器检查重新执行，均无pageerror。现有保存基准8项正确性检查继续通过。干净目录使用锁文件独立安装82个包后重建，JSON、manifest、production JS、preview JS四项逐字一致。

仅更改既有展示断言：60px隐藏球改为64px持续原生球、同步显示改为等待animation终点、全屏尺寸改为600×780 Clamp、Footer无按钮改为一个返回按钮；测试夹具补足实际DOM/style及可选Shortcut capability。数据、失败、冲突、写入次数、草稿/选区/单实例断言保留。Header引入PNG后，隔离UI测试bundle新增asset/inline loader，与生产构建一致。

历史 **0.2.0 阶段交付包** Extension JSON SHA-256（见机器可读结果；下方由最终构建更新）：

```text
b735bb507e7315389afe0197c7c6b56f614e0cdfd87e13a2b5b8b32a0d97c0ca
```

此前 Foundation 实机包 SHA-256 仍为 `5bd899fe9ea776cb7fe50d4149e7dc7b938c6747f4e650354e6e95be900145a5`；历史实机结果不覆盖本轮候选。

## 保存图标与分类行布局

Maintainer 已确认前一候选 `9d230354b0a9111d44667e0866e2041a4bae1a8c4aeeed3d56bb3efa95641ffd` 的交互“成实时的了”。此反馈只记录实时交互体验，不代表完整深度验收。当前继续在相同逻辑上调整位置与图标：新增条目、分类、保存／重读三组之间加入两条隐藏于无障碍树的细竖线；软盘保存按钮为 44px 透明 SVG 按钮，去除主按钮色块；未修改时与其他图标同色并以 0.4 透明度变暗，未保存修改时图标保持与其他图标相同的颜色与 1.7px 线条，底部显示一个 4px 绿色光点；保存成功或确认重读后光点隐藏，不使用流光动画。保留 title 与 aria-label，未保存启用／无修改禁用规则不变。已有四视口检查使用相同前缀的连字符／单冒号混排名称，并同时核对分隔线与两侧控件位置，分类单独横向滚动，不把保存和重读挤出窄屏。

## 统一保存、重新读取和关闭确认（方案 B）

上一候选 `1e8211ae01ea886e44ebbf7762eaed965d6d4a5b357da943d3dcd9e040bf05e6` 已完成自动检查，但 Maintainer 实机仍反馈卡顿，本轮按其最新要求改为本地暂存。保留之前分类边框、Drag Active 临时禁选、每帧先读后写、卡片缓存、文字阴影重置与 Adapter 通知回读优化，不再运行后台排序保存队列。

- 按“新增条目｜分类｜保存与重新读取”排列，两处分隔线；保存采用软盘 SVG，悬停与无障碍名称仍为“保存修改”，没有取消修改按钮。无改动保存按钮暗，有改动可用；外部冲突时禁用保存。新增条目在分类左侧；底部不重复放操作按钮。
- 排序、开关、编辑窗口保存及 Prompt 新增／复制／解锁／挂接／删除只改变本地未保存对象。已确认 Snapshot、宿主、原 revision 保持不变；多次操作只在统一保存时进行一次原生写入。原生预检、落盘核对、应用完成与最终回读仍保留。
- 拖放只复制变化的 order 数组与分组，不克隆／序列化完整 Prompt 正文；编辑只复制当前 Prompt。长正文输入和暂存不序列化完整正文（以约 1.3MB 人工正文并阻断 JSON.stringify 验证）；输入事件仅更新按钮／提示，不重建列表或编辑器；保存编辑后未变卡片保持原节点。
- 保存 pending 期间锁定编辑、重读、重复保存和关闭。失败保留本地修改可核对，不自动补偿写入；检测到外部修改或切换时拒绝覆盖，自动通知读取不能接受新安全 revision 或丢弃暂存。
- 有未保存修改时点击重读先确认；取消保留，确认后取得新快照才丢弃，失败仍保留并报错。当前编辑窗口尚未点击保存的输入也计入 dirty。关闭选择否保留，选择是丢弃后走原 Standalone／Hub closePanel 正式路由；生命周期 Hub disposed／ready 内部隐藏保留草稿／暂存和单实例。
- 切换、导入、复制、新建、重命名、删除及导出 Preset 需先统一保存或确认重新读取，避免操作对象歧义。编辑窗口取消仅丢弃该窗口输入，不清除已暂存操作。
- 挂接图标使用原锁链；解绑图标保留锁链加斜线。生产 SVG 是固定几何图形，没有解析用户图形字符串。

`npm run test:ui-performance` 使用生产 View／Controller、合成延迟 Adapter 和固定 main 的旧样式对照。23 项覆盖四个分类视口、文字阴影、真实鼠标拖放／选择／pointercancel、连续拖动零 host 调用、一次延迟保存失败／重试、节点身份、按钮位置和锁链路径、重读取消／确认／失败、关闭是／否和未暂存编辑输入、外部通知冲突。功能浏览器另核对未保存关闭选否不调用 Hub closePanel，选是才执行正式 Surface 关闭；五次重开复用同一实例。

本地 Node 测试在固定 1.18.0／1.19.0／1.19 交叉原生片段和模拟依赖上核对：混合编辑、复制、开关和排序在点全局保存前没有任何 HTTP；保存后仅一笔 POST 与三次必要 settings GET，完整 raw、其他组与未知字段一致。较晚通知、读取过程通知、手动 refresh 及身份变化保留额外读取。没有修改的编辑不发出任何读取／写入／apply；下一次实际全局保存仍预检 revision 和 live。

### 性能证据边界

拖动帧布局、视觉顺序与 card 缓存沿用前轮优化。松手和编辑窗口保存不执行 ST HTTP、磁盘回读或 apply，消除这两处触发原生操作的等待。显式“保存修改”仍需要等待完整持久化和确认，不声称它实时完成。人工五阶段 290ms 延迟只在点击全局保存后开始，回执在 `evidence/reorder-browser.json`；此检查不是实际 Safari／ST 耗时测量。

`npm run test:save-performance` 从生产源码提取 JSON 树比较函数，以 500 个**人工** Prompt（约 4.5MB JSON）核对 8 项等价／未知字段／数组行为并计时。只测比较 CPU，不测 Model、HTTP、disk、apply 或完整保存，没有性能通过门槛、外部 telemetry 或私人数据。该计时不构成真实宿主性能或深度验收结论，后续深度实机继续使用可恢复副本。

## B1 / B2 回归证据

在同一旧 Head `8fb308941753acc5fa90975f4c37f8e54ab1508f` 上仅加入最终 Node 回归测试：原有 75 项通过，新增 17 项全部失败；修复后 92 项全部通过。

- B1：固定 1.18.0、1.19.0 和 1.19 交叉源码片段、模拟依赖。raw 缺少字段时，live 新增 `injection_depth`、默认样式 `injection_order:100` 或第三方对象；refresh 不接受新 revision，编辑标题后的 save 被阻止，live 新字段及磁盘 raw 保持不变。另覆盖已有未知字段修改、顺序条目／分组新增字段、精确原生缺失 Marker 补项及其外部修改。
- B2：Node 协议测试核对 Standalone 关闭／重开、Hub 正式 close 调用、Surface 关闭与 Launcher 恢复、五次循环复用同一面板／实例、Hub disposed / ready 恢复与清理。缺少 close 能力时回到 Standalone。
- 浏览器：使用真实构建后的共享 UI 和内存 Controller，配合独立 Hub Surface 契约模拟，覆盖关闭按钮／Standalone Escape、五次 Hub 关闭重开、编辑草稿、退出与重新收纳。编辑层遮挡顶部按钮时使用 DOM click 事件验证关闭路由，不宣称物理触控可达或真实 Hub 集成；真实 Hub 可从自己的 Surface 返回入口关闭。
- 原 Review 复现再次运行：B1 两版均拒绝 refresh / save，字段未丢失；当前固定 Hub Surface 源码配合模拟动画／Launcher，在关闭后返回 `menu`、面板隐藏且 Launcher 不再暂停，closePanel 恰好一次。这仍是本地源码补充复现，不属于真实宿主验收。

## Hub 注册与正式 PNG 回归

在同一固定 Hub commit `928362c1eb224afe780801060c6d867e01cf5013` 上执行原始 Runtime `validate()`、bootstrap `provide()`、Hub UI `renderMenu()`／面板方法和 Surface 函数体。新增 5 项 Node contract 检查：

1. 不替换生产 Manifest，注册后 factory／activate 执行，attachPanel 接收正式 PNG 原始字节。
2. 当前 Hub Launcher 优先选择 presentation.icon 的图片，图片加载失败回到 `预设`。
3. open → 正式 closePanel → reopen 三次循环复用面板并恢复 Launcher，最终清理。
4. 把超长 SVG data URL 放回 launcher.icon 时，provide 在 factory 前拒绝。
5. Standalone 使用与 Hub 相同且逐字节保留的正式 PNG。

仅改短文本、仍挂载原临时 SVG 的本地候选运行了 96 项：95 通过，实际 Hub 渲染选图断言失败；接入维护者提供的正式 PNG 后，原有 92 项与新增 5 项共 97 项全部通过。新增浏览器检查确认内嵌 PNG 实际解码为 1254×1254，数据与仓库原图一致；功能检查共 18 项，响应式保持 9 项。

测试不替换 Manifest、不放宽 Hub validator、不使用 Emoji 功能图标，不在生产包中包含 Hub 测试源码。DOM／存储偏好／Launcher 依赖仍为模拟，Surface 动画未执行；这不是运行真实 Hub。正式 PNG 原样保存，来源及独立素材许可边界见 ASSETS-LICENSE.md。真实 Hub 0.8.1 的基础验收另见 [Real Host Validation](REAL_HOST_VALIDATION.md)，不将离线契约测试计作实机结果。

## 版本证据边界（历史 Foundation）

| 对象 | 源码／自动检查基线 | 真实宿主状态 |
| --- | --- | --- |
| ST 1.18.0 | `51ad27fb86d39a3daca3adaa970375c9670c12df`，固定原生方法与模拟宿主 | 实际 `8172dcd0e` 的基础路径通过；与源码基线分开记录 |
| ST 1.19.0 | `7e8663cd9c184a550b37238218bdd32c6efc68e9`，固定原生方法与模拟宿主 | 未执行 |
| ST 1.19.0 交叉源码 | `06bde939fb1e9c4c8d8641d810f0a916b5bce127`，相关文件比对及 Default 夹具来源 | 未执行 |
| Tavern Helper 4.10.0 源码 | `e9aa5ba146d0f13b7a26742c26dd04d9132a30da` 的接口研究，版本号来自该提交的 package.json | 实际运行版本为 4.11.2，基础路径通过；不将 4.10.0 当作实测版本 |
| MieMie Hub | 固定 `928362c1eb224afe780801060c6d867e01cf5013` 的 API v1 源码契约与生命周期模拟 | 实际 0.8.1 的收纳、正式图片、关闭／重开、草稿及停用／重新接入通过 |
| 手机 | 桌面浏览器的触控、视口和布局模拟 | 物理设备、移动 Safari、实际软键盘未执行 |

模拟真实方法体仍不包含完整 ST 服务、真实宿主页面、Tavern Helper iframe 或其他扩展。浏览器触控模拟也不能验证手机输入法、设备 safe-area 值或实际浏览器工具栏。

## 真实宿主 Golden Path

2026-10-08 按 [PRODUCT_PLAN 第 25 节](PRODUCT_PLAN.md#25-测试要求)、原 Issue #1 和 Owner compatibility clarification 重新判断。Yes 表示当前生产实现与回归覆盖存在；Automated PASS 引用 REL023 已有回执，不表示本轮重跑，也不表示完整 Native re-import 实机。C/D/E 的每个范围按 F18、ST119-R1、ST119-FINAL-RA-RB、ST119-FINAL-EXPORT、IOS27-R1、OWNER-IOS-01、OWNER-IOS-02 分开，定义见 [Evidence Ledger](REAL_HOST_VALIDATION.md#evidence-ledger--当前收口状态)。

GP #10 以 Detach 的可观察原生数据语义及解锁条目区域为依据，不机械复制 ST 内部 UI；Copy / Detach / Delete 独立资格沿用 Owner 澄清。GP #18 要求单业务实例，未新增“审计所有第三方监听器”门槛。F18 PASS 保留历史版本范围，不声称当前 0.2.3 的完整 Hub/Prompt 实机重跑。

| # | Requirement | Implemented | Automated | Real Host | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Hub 关闭后独立入口恢复 | Yes | A/B PASS | C PASS（Foundation） | PASS | F18：Standalone / Hub 生命周期 |
| 2 | 打开后读取实际当前 Preset | Yes | A/B PASS | C/D PASS | PASS | F18、ST119-R1、IOS27-R1 HOST-02 / PICKER-02 |
| 3 | 切换后 ST 实际状态同步 | Yes | A/B PASS | C/D/E PASS | PASS | F18；ST119-R1 A–G / I；IOS27-R1 PICKER-02；OWNER-IOS-01 |
| 4 | 复杂 Native Preset 导入后自动选择 | Yes | A/B PASS | C PASS：实际 MPM Import / Native Applied / 回读 | PASS | ST119-FINAL-RA-RB R-A Import：16 definitions / 两组 / 非默认排序，落盘结构与 fixture 一致 |
| 5 | 完整复制，来源不变，自动选择副本 | Yes | A/B PASS | C PASS（Foundation） | PASS | F18：两份完整副本与来源 JSON 一致 |
| 6 | Title / Role / Content Cancel / Save 持久化 | Yes | A/B PASS | C PASS：取消 / Editor Dirty / Unified Save / 刷新读回 | PASS | ST119-FINAL-RA-RB R-B1；F18；IOS27-R1 DIALOG-02–04 |
| 7 | Prompt 副本在原项下一行，新 identifier | Yes | A/B PASS | C PASS（Foundation） | PASS | F18：复制、原项不变、刷新保留 |
| 8 | 整卡拖动，统一保存，刷新后顺序保留 | Yes | A/B PASS | C 桌面排序；E Simulator 完整保存链 PASS | PASS | F18；OWNER-IOS-01 补充 TOUCH-02 / TOUCH-03 |
| 9 | Toggle 开关与刷新后状态一致 | Yes | A/B PASS | C PASS（Foundation） | PASS | F18：原生发送状态与 UI / refresh 一致 |
| 10 | Detach 移出活动顺序、定义保留，可重新挂接 | Yes | A/B PASS | C PASS：Detach / Reattach 均统一保存并刷新 | PASS | ST119-FINAL-RA-RB R-B2：仅活动组引用变更，definition / 其他组保留，新增唯一引用 |
| 11 | Delete 确认可达、Cancel 不删、Confirm 合法删除 | Yes | A/B PASS | C PASS：两个 disposable custom Prompt 的真正确认链 | PASS | ST119-FINAL-RA-RB R-B3：Cancel 无 Dirty/Native 写入；Confirm Dirty→保存→刷新，定义/所有目标引用删除 |
| 12 | Export 能经 ST 原生导入器重新导入 | Yes | A/B PASS | C PASS：真实 MPM 下载文件→ST Native Import UI→Native / MPM 回读 | PASS | ST119-FINAL-EXPORT Test A/B：独立新文件名，JSON 内部字节不改 |
| 13 | 复杂无修改 Round Trip 保留未知字段与语义 | Yes | A PASS（固定原生 JSON / fixture） | C PASS：Original / Actual Export / Native Re-import 全结构相等 | PASS | ST119-FINAL-EXPORT Test A/B：16 definitions / 两组 / 参数 / extensions / unknown，数组顺序严格比较，Native 字段规范化差异为空 |
| 14 | 注入未知字段，编辑其他 Prompt 后导出仍保留 | Yes | A PASS（深层未知字段与所有组） | C PASS：Editor Dirty→Unified Save→刷新/读回→真实 Export 文件 | PASS | ST119-FINAL-EXPORT Test C：唯一差异 $.prompts[12].content，其他字段/数组/分组/扩展完整一致 |
| 15 | 移动列表滑动、长按拖动、按钮不误拖、编辑软键盘 | Yes | A/B PASS（合成移动） | D 点击/编辑/键盘；E 拖动及普通滑动 PASS | PASS | IOS27-R1；OWNER-IOS-01；OWNER-IOS-02 普通滑动到底、最后 Prompt 可见、不改顺序；非物理 iPhone |
| 16 | Hub 启动收纳独立入口 | Yes | A/B PASS | C PASS（Foundation） | PASS | F18：PNG Hub 入口、独立入口收起 |
| 17 | Hub 停用，状态保留、独立入口恢复 | Yes | A/B PASS | C PASS（Foundation） | PASS | F18：草稿与相同业务实例恢复 |
| 18 | Hub 再接入，无第二业务实例 | Yes | A/B PASS | C PASS（Foundation） | PASS | F18：退出/重新接入/打开/关闭/重开；RH-01 后续人工复核 |

**18 PASS / 0 PARTIAL / 0 FAIL；无新确认的源码实现问题。** 本轮只补齐 #12/13/14，其余15项复用已接受证据。Issue #1 的原始验收范围已满足并通过 Owner 最终审核；详见 [Minimum Remaining Acceptance](PHASE1-CLOSEOUT-0.2.3.md#minimum-remaining-acceptance-checklist)。已完成 ST 1.19 代表性真宿主不再列为待验。物理设备、全补丁/插件矩阵、全部 16 个历史未测细项及真实 Managed Package 在线安装不新增为关闭条件。

## 历史 Foundation Golden Path（2026-10-04）

历史阶段摘要（原文保留）：自动检查、源码核验和真实宿主验收分别记录。2026-10-04 已完成 ST 1.18.0 + Tavern Helper 4.11.2 + Hub 0.8.1 + Safari 26.6 / macOS 26.6 的 Foundation 基础实机验收，见 [Real Host Validation](REAL_HOST_VALIDATION.md)。ST 1.19、物理手机及其余深度验收仍待执行。该实机记录对应此前 Foundation 交付包。Maintainer 已确认统一保存与 Presentation 内容通过 Review，升版本前基线为 `2c84664207849af59460b81c50cf4b46fedcbd16c255422e38f3720dad2b792a`；0.2.0 为此内容的阶段 Pre-release，不据此新增完整宿主或移动端通过结论。

依据 [产品计划第 25 节](PRODUCT_PLAN.md#25-测试要求)，以下记录本次 ST 1.18.0 实际组合的已执行范围，**不代表全部 18 项完成**。环境、测试 Head、交付 JSON 哈希及 RH-01 见 [Real Host Validation](REAL_HOST_VALIDATION.md)。ST 1.19 的所有实机项仍待执行。测试使用已备份且获准使用的预设；公开记录不得包含私人正文、连接凭据或完整导出。

| # | 验收项 | 需要确认的真实结果 | 状态 |
| --- | --- | --- | --- |
| 1 | 关闭 Hub | 独立悬浮入口出现 | 本次基础路径通过 |
| 2 | 打开管理器 | 读取 ST 实际当前预设，名称与内容一致 | 本次基础路径通过 |
| 3 | 切换预设 | ST 当前预设实际切换，管理器回读一致 | 本次基础路径通过 |
| 4 | 导入复杂预设 | 保存成功后自动成为当前预设，同名不静默覆盖 | 待执行 |
| 5 | 复制预设 | 完整 copy、来源不变、自动切换至 copy | 本次基础路径通过，两份完整副本 |
| 6 | 编辑 Prompt | 标题／Role／Content 取消无变化，保存后刷新仍保留 | 部分通过：标题取消／保存／刷新；Role／Content 待验 |
| 7 | 复制 Prompt | 副本位于原条目下方，新 identifier 有效，其他字段保留 | 本次基础路径通过 |
| 8 | 整卡拖动 | 实际 `prompt_order` 更新，刷新后顺序保留 | 本次桌面鼠标路径通过；物理触屏待验 |
| 9 | Toggle | 原生发送状态与 UI 一致，刷新后保留 | 本次基础路径通过 |
| 10 | 解锁 | 从活动发送顺序移出，定义保留并位于解锁区 | 待执行 |
| 11 | 删除 | 确认框取消无变化，确认后合法删除；核对内建／Marker 限制 | 待执行 |
| 12 | 导出 | 完整原生 JSON 可以由 ST 原生导入器重新导入 | 部分通过：下载完整 JSON 与测试副本一致；原生重新导入待验 |
| 13 | 无修改 Round Trip | 复杂预设导入再导出，字段及功能语义保持 | 待执行 |
| 14 | 未知字段 | 加入未来字段，修改其他 Prompt 后仍完整保留 | 待执行 |
| 15 | 手机 | 列表滑动、长按排序、按钮不误拖、软键盘和旋转后保存可达 | 待执行 |
| 16 | 启动 Hub | 独立入口隐藏，Hub 出现入口，原草稿和面板可用 | 本次基础路径通过 |
| 17 | 关闭 Hub | 状态不丢失，独立入口与面板恢复 | 本次基础路径通过 |
| 18 | 再启动 Hub | 重新接入，只有一个业务实例，无重复监听或入口 | 本次重新接入、单面板／业务实例及重开通过；监听器深度审计待验 |

另需在可恢复副本上验证失败与并发场景：保存失败／响应丢失、同名预设被外部改动、保存中切换或停用、原生未保存设置、重命名部分成功。确认错误提示与磁盘实际状态一致，能导出操作前备份，不覆盖外部新状态。

已知需求差距包括保留 identifier／Marker 的额外删除保护、旧格式迁移、全局活动组限制及后端非原子事务，详见 [Compatibility Notes](COMPATIBILITY.md#已知限制与需求差距)。完成自动检查和本次基础实机验收不等于这些限制已消除，Phase 1 尚未完成，Issue #1 继续 Open。

## Presentation Browser Review

`npm run test:presentation` 使用当前生产Controller/View/DualMode/Native组件和synthetic adapter。生成专项测试夹具 `evidence/presentation-review/preview.html`，Owner交互页 `evidence/presentation-review/app.html`（正常内存Adapter，与delivery预览脚本逐字一致）、`gallery.html`、16张Owner Review截图与 `results.json`。Node新增检查4项，浏览器专项49项；结果见 [Presentation Review](PRESENTATION-REVIEW.md)。实际执行固定Hub Runtime、Surface Motion、Surface Controller、provide与byte-identical Shortcut registry；只模拟宿主/Launcher等依赖，没有新建业务实例。

验证64px未修改PNG、7px阈值、真实鼠标及CDP触控拖动、左右Dock/持久化、键盘/焦点、Orb↔Panel/Header Hero/临时DOM清理、旋转中断、safe-area及panned visualViewport、减少动态效果、Shortcut开关/关闭origin/中途dispose、蜂窝和Native动画不混用。跨模式比较pendingRaw/localRevision/分类/Preset/未保存排序逐字一致，并确认Editor草稿和单一Controller/Panel保留。全部演示内容为synthetic，未触及用户真实Preset。Safari和真实Hub新Presentation仍待Owner复核。

### Owner Review: Native Orb clearance 修复

本轮新增11项Presentation浏览器回执。只有可见且已挂载的球在实际浏览器命中顺序中位于卡片前方时允许留白；面板上层、嵌套低层球、hidden/display/visibility/opacity、detached/disposed及无球均清零。桌面与390px卡片按钮对齐，前景遮挡时全部44px操作可点击；Dock、resize、close/reopen无残留。旧Candidate在新增上层面板断言失败，修复后41/41专项通过。未改变Native Launcher层级或冻结业务；没有新增真实Safari/ST验收结论。

### Header / Dirty banner follow-up

Header使用中文产品名与版本同一行、当前角色 / 无角色提示第二行；保留正式PNG和Header尺寸。既有UI/性能浏览器检查确认本地编辑后上方Dirty提示隐藏、下方小字和保存绿点保留，列表位置与高度不变。完整Node157、功能19、响应式9、Presentation41与UI/性能23项通过；独立重建四产物一致，未新增真实宿主结论。

Current-character Header新增3项Presentation回执：无角色/单人角色/切换/改名、数字0与字符串id、纯文本名称；上下文异常与重开恢复、每事件仅一个监听；dirty与草稿不变、零Host写入、dispose解绑。专项总计41项，0页面错误；仅synthetic上下文，仍待Owner真实ST/Safari复核。

### Complete top notice removal

删除顶部普通通知模块DOM、渲染逻辑与CSS，Controller notice及所有业务规则保持不变。修改、恢复原状态、保存成功及busy通知不再插入横栏。保留底部dirty小字/保存绿点、错误/冲突、确认Dialog和busy锁定。新增实际恢复原状态回归后UI/性能23项通过，列表y/height不变；Node157、功能19、响应式9、Presentation41通过，无页面错误。

### Footer ordinary status

既有23项UI检查追加busy、确认保存成功、重读完成、恢复原状态在Footer小字中的断言，保留dirty与列表位置/高度不变断言。功能19、响应式9、Presentation41及Node157通过。Footer单行截断防止扩高，title保留全文；无顶部通知DOM，未改变核心业务。

### Shortcut repeat-open regression

Owner录屏显示：Hub Shortcut打开后继续点击同一球会跳成Hub居中展示。新增检查先在旧Candidate复现（Native→Hub），再修复Dual Mode中的无条件布局重置：只有hidden面板的新入口初始化Hub布局并调用View.open；已显示或opening/closing的面板只请求正式showPanel，由Hub保留Surface origin、动画与inert。没有修改Hub或业务逻辑。

新增8项专项回执：1512px/390px各6次真实指针点击、编辑草稿期间真实按钮handler调用、蜂窝聚焦既有Shortcut、新入口/正式关闭/重开、正常动画中连续点击、closePanel期间立刻连续重开。49/49专项通过，0pageerror/外部请求，单Panel/Controller、dirty/草稿保留且零Host写入。Node157、功能19、响应式9、UI/性能23及保存基准8项正确性均通过；check/build通过，独立目录锁文件安装82个包后重建四产物逐字一致。固定Hub真实Runtime/Shortcut/Surface代码配合synthetic宿主依赖；不是新的Safari/ST实机验收，仍待Owner导入本轮包复核。

## 0.2.0 release gate

升版本前先从未改动源码重建0.1.2内容，SHA-256与已确认基线一致；业务、Launcher、动画、图标、Hub integration保持不变。0.2.0版本只写入package、锁文件、Product Identity、Header测试预期和构建元数据；固定Product/Extension ID与Script ID不变。交付目录仅保留当前版本JSON，历史Foundation包仍由真实宿主记录与Git历史标识。组件交付清单给出v0.2.0正式Release Asset URL，不是Hub Managed Package。

本版本按完整命令重新执行自动Gate及独立目录clean rebuild；当前结果与最终产物hash见validation-results.json。该阶段Pre-release不关闭Issue #1；ST1.19真实宿主、深度Round Trip/Unknown Fields、Built-in/Marker边界、失败/并发实机和物理手机/软键盘继续待验。此前候选修复记录为历史自动证据；Maintainer Review通过不等于这些深度项目均已完成。


## 0.2.1 Runtime / Managed Package 两道发布 Gate

Runtime gate：严格类型、Node、浏览器功能/响应式、UI/保存性能与 Presentation 检查；Hub provide/activate、panel、launcher/shortcut、closePanel、单实例、Dirty、数据完整性保持既有回归。自动 Mock 和预览测试不能替代真实宿主验收。

Managed Package gate：`npm run test:package-v1` 读取完整生产交付包，使用 Hub commit `928362c1eb224afe780801060c6d867e01cf5013` 的原始 validator/discovery/install/update 源码及原始上游测试（仅测试夹具，带 GPL 和 SHA-256 provenance）。覆盖正式 Manifest、纯三段版本/Tag、稳定 ID/repository、首行身份、空 data、确切 Helper 字段、ASCII Asset 名、16 MiB/64 KiB 限制、双 hash、GitHub digest、禁止 URL/未知 metadata 字段、短 launcher 和安全相对 icon；在合成全局脚本树验证安装、当前版本检查、后续版本原地更新保留实例和设置。不会执行下载脚本，也不写真实 Helper。

构建首先校验 package/manifest 身份、产品 author 与官方 repository 一致性，Runtime 与 Product Identity 直接读取 manifest；构建后自动执行 11 项生产产物契约。Package 专项总 67 项（11 项生产产物 + 56 项原始 Hub 测试）；已发布 0.2.1 基线的 Node 总 162 项，包含原 157 项和 5 项发布身份/来源检查。当前本地功能候选结果见下文。

每次正式发布另需：独立目录 npm ci/build，四份机器资产逐字相同；Tag/Release/Repository 一致，非 Draft；上传后确认 Asset API digest 与原始 bytes 一致；使用同一 Hub discovery 读取实际已发布 Release。只有完成这些检查才能报告“发布包符合 Package v1”。实际浏览器在线安装/更新、CORS/安全下载服务及宿主持久保存仍由 Owner 单独验收，不算本轮自动通过。

旧 0.2.0 身份缺少 repository，实际 Hub listInstalled/check 不识别，已锁定反例；不能自动升级。迁移操作见 README，先备份、停用并手动移除旧实例，再安装 0.2.1，不对生产数据尝试猜测升级。

```sh
npm ci
npm run check
npm test
npm run build
npm run test:package-v1
npm run test:browser
npm run test:ui-performance
npm run test:save-performance
npm run test:presentation
```

Polisher 1.2.1 parity：两者均有正式 manifest、带 repository 的首行 identity、标准 update metadata 和 SHA256SUMS。已核对 Polisher v1.2.1 实际四份 Release Assets 及 GitHub digest；身份、Script ID 和 PNG 各自独立。Preset Manager 继续 TypeScript，不复制 Polisher 产品身份。

依赖审计：当前 tracked 源码和文档、固定 Hub package consumer、Polisher 正式构建中未发现 component-update-manifest 的外部正式消费者；旧清单仅用于本项目历史构建/发布记录。0.2.1 不再生成/发布它，历史记录及 v0.2.0 Release 保留。


## Per-Chat Preset Binding · Phase A 本地 Candidate

基线 `e9f9dfd9c8d8ce5029f79356db506d791a8b1fab`，版本保持 0.2.1；未 Commit / Push / 发布。完整状态及边界见 [Binding](PER-CHAT-PRESET-BINDING.md)，当前回执见 `validation-results.json` 的 `perChatBindingCandidate`。已发布基线的 162 项安全/功能 Node 回归保留，新测覆盖最小 namespace、native persistence+target readback、默认/override/UUID/tombstone、Native manual 与 auto-select 相同输入、队列 latest-wins、原生晚完成、持续争夺与有限等待、单份 dirty、两版普通生成 Gate。

`st-binding-contracts.json` 保存两版 22 个固定原生方法/函数；上下文与 HTTP 是模拟依赖。生成执行范围是原生前段、EventEmitter、stopGeneration 和请求边界，完整 Generate/group wrapper 用于信号控制流审阅；没有执行真实 ST 服务、完整提示词组装、群成员循环或 SSE。错误状态不得发送正常生成；ready 请求正常。该证据不覆盖 Helper/direct quiet 或扩展绕过原生 Generate 的请求。

`npm run test:binding-browser` 需先 build。它在 `preview.html?binding=1` 上执行真实 Core/Controller/UI，配合合成聊天存储、固定 Hub Runtime/Surface/Shortcut 与合成 Launcher。检查默认 SVG/键盘、inherit/override/missing、footer dirty、重读、关闭时继续绑定、Hub disposed/ready 单实例与草稿、320/390px/桌面/短窗口、44px 和页面错误。回执和截图位于忽略目录 `evidence/perchat-phase-a/`，不包含真实数据。现有 browser/responsive/drag/presentation/品牌回归另行全部运行。

独立目录用锁文件离线安装后重新构建，比较 Extension JSON、Package v1 metadata、manifest、SHA256SUMS、production JS、preview JS 的字节。Candidate manifest 只是本地生成文件，不代表线上 v0.2.1 下载内容已更新。

新功能 real-host 状态：**not run**。此前 Foundation 与发布记录保持历史范围，不能泛化为 Per-Chat Binding 实机通过。

### 当前 0.2.1 基础上的重验证（2026-10-06）

`npm ci`、`npm run check`、`npm test`、`npm run build` 全部通过。Node 261/261（已发布基线 162 + 绑定新增 99）；Package v1 专项 67/67；绑定浏览器 25/25；原有功能 19/19、响应式 9/9、UI/拖拽 23/23、Presentation 49/49、保存比较正确性 8/8 全部通过，页面错误为 0。独立目录 clean build 的四份 Package 机器资产及 production/preview JS 全部逐字相同。

本地 Extension JSON SHA-256：`337c878ec83370ffde15ea32906175e78d011890f8f698c9f6a5df6a1c73ad17`。正式发布的 0.2.1 资产未变；该候选只是供 Owner Review 的本地文件，同版本号不代表线上已发布该功能。新的对话绑定实机验收尚未执行。

Owner 布局跟进：预设选择和默认 SVG 按钮共用外框，保持独立键盘控制；导出完整预设和复制当前预设移入更多菜单，原有功能检查实际执行两项操作。增加共框/Tab/菜单入口断言，并在桌面、390px、320px、短窗口检查默认按钮始终位于外框内；低高度检查逐项确认全部六个普通菜单操作可滚动触达。业务逻辑未改变。

选择框展开跟进：原生 select 恢复完整外框宽度，默认按钮保留在右侧独立命中区，选择文字为按钮/箭头预留空间；焦点框高亮整个区域，原生 options 恢复深色背景。新增全宽锚点/统一焦点断言，在全部四个视口检查默认按钮中心和箭头区域分别命中按钮/选择框。此明确安排的共框覆盖之外，其他控件仍执行不重叠检查。

默认操作区外观跟进：保留完整宽度原生选择框，右端设默认按钮使用常驻淡紫色块，平直左边缘/分隔线与贴合外框的右圆角；hover 更亮、按压变暗，中心点/aria-pressed 的默认状态语义不变。仅 CSS 外观改变。重新执行 check/build（261 Node + 11 Package 产物）、绑定浏览器 24、功能 19、响应式 9；独立重建六产物一致。UI 性能、保存基准和 Presentation 专项保留本次候选前序通过记录，没有因这次色块样式重复运行。

预设确认后焦点跟进：共享外框高亮只在键盘导航时显示，鼠标/触屏操作和 change 确认清除高亮标记，保留实际 DOM focus 和 Tab 可达性。新增确认预设后 outline 消失断言与键盘聚焦提示断言。25 项绑定、19 功能、9 响应式、49 Presentation、261 Node 和 build/11 Package 产物检查通过；独立构建逐字一致。球在上层可见才避让、面板在上层则清空的既有层级代码与已发布基线逐字相同，未调整 z-index。


## 2026-10-07 local Candidate: preset parameters and automatic regex display

This is an unpublished 0.2.1 Candidate, not an update to the public release. The centered gear/title row is the first child of the Prompt scroll area and never participates in prompt_order or dragging. The duplicate recovery/follow/reconcile menu entries are removed; selecting the current default preset restores inheritance, and the existing reload button also explicitly reconciles the current chat binding.

The parameter dialog patches native root field names only. Existing values, unknown fields, extensions, every order group and Prompt remain intact. For absent fields, Owner defaults are context 2000000, response 30000, temperature 1, frequency/presence penalties 0, top_p 0.9, streaming false, show_thoughts false and reasoning_effort auto. Merely opening/cancelling does not write or stage defaults. Confirming the parameter dialog stages them; the global Save confirms native persistence. Existing zero/false values and unfamiliar reasoning values are retained. The model and native context-unlock settings still govern usable lengths; the Candidate does not secretly change that unlock flag.

Automatic binding selections temporarily defer only the exact translated native authorized-regex reload notice for the expected preset and native reload callback. After confirmed selection, visible messages are redrawn through updateMessageBlock using copies, without clearing/reloading/saving chat content. A changed chat/session, active message editor, unsupported host, display error, timeout or disposal restores the native notice. Manual selection, first regex permissions and unrelated notifications are unchanged. Pinned 1.18.0/1.19.0 native functions run with mocked dependencies; this is not real-host validation.

Initial parameter Candidate verification: check PASS; 294 Node tests; build PASS including 11 Package checks; 19 functional browser checks; 9 responsive checks; 25 binding browser checks; 22 parameter browser checks; 49 Presentation checks; zero page errors. Independent clean output build reused the locked dependencies and reproduced all six delivery assets byte-for-byte. No fresh npm ci is claimed for this follow-up. Further Owner testing of native settings and regex display is required.


## 2026-10-07 parameter dialog presentation follow-up

The settings dialog keeps the existing absent-only defaults, local draft and global Save semantics. Lengths, sampling and output/reasoning are grouped; explicit WebKit/Firefox tracks and thumbs prevent the invisible-track appearance under host range resets. Streaming/show-thoughts use animated switches with left labels and right tracks. Reasoning uses a local combobox/listbox with selected markers, keyboard navigation, Escape and focus handling; it contains no native select. The header close is removed and bottom Cancel/Save share the full width equally. Motion reduction and shortened viewports are covered.

Check PASS; 294 Node tests; build PASS including 11 Package checks; functional 19, responsive 9, binding 25, parameter 32 and Presentation 49 browser checks PASS, with no page errors. Parameter checks run at 1280px and 390px and exercise host range CSS reset, keyboard changes, switch states, dialog cancellation, staged/native persistence and default preservation. All six delivery assets were reproduced in an independent clean output build with locked dependencies reused. These are offline Chromium checks, not native Safari/SillyTavern acceptance. No version bump, commit, push or release.


## 2026-10-07 parameter entry/dialog morph Candidate

Presentation-only transition: an opaque shell expands from the visible settings entry into the dialog in 360ms. The gear/title moves into the header while the real form fades in without text scaling. Cancel and successful dialog Save retract in 280ms; validation failure keeps the dialog open. The controller's staging, missing defaults and global native Save logic are unchanged. Focus stays in the manager while the form is inert and returns to the entry after close. Interrupt reversal uses current geometry. Resize or Presentation handoff cancels owned animations and settles at the current endpoint. Reduced motion skips or cancels motion; off-screen/detached origins use a fade without scrolling the list; disposal removes ghosts and cancels animations.

Check, 294 Node tests and build (including 11 Package checks) PASS. Offline browser checks: functional 19, responsive 9, binding 25, parameter 32, parameter motion 26, Presentation 49; no page errors. The motion suite covers both 1280px and 390px, open/cancel/save, validation failure, focus/Escape, interrupted/repeated cycles, resize, Presentation handoff, changing reduced-motion preference, off-screen/detached origins, missing animation API and disposal. A GIF uses paused production-animation screenshots. All six assets match an independent clean output build with locked dependencies reused. This is not real Safari/SillyTavern acceptance. Version remains 0.2.1; no commit, push or release.


## 2026-10-07 Owner follow-up: shell-only settings morph

The transition now resizes only the opaque shell. The moving gear/title clone and its styles are removed. The real dialog heading stays at its normal position and font size and fades with the form; it never transforms into the entry title. The entry returns after the closing shell finishes. Controller, defaults, staging, native writes and all previous animation safeguards are unchanged. Desktop and 390px regressions additionally assert no cloned title and constant heading geometry/font throughout expansion.

Check, 294 Node tests, build including 11 Package checks PASS. Offline browser results: functional 19, responsive 9, binding 25, parameter 32, motion 28, Presentation 49, zero page errors. All six delivery assets reproduce byte-for-byte in a separate clean output build using the existing locked dependencies. This remains an unpublished 0.2.1 Candidate, not real Safari/SillyTavern acceptance. No commit, push, release or version change.

## 0.2.2 release validation（2026-10-07）

历史 Candidate 记录保留其测试范围和版本，本节与 `validation-results.json.release022` 为最终 0.2.2 回执。锁文件全新离线 `npm ci`、check、294/294 Node、build 全部通过。Package 专项 69/69（13 个生产产物检查 + 56 个未改动 Hub 上游测试）；额外通过发布时当前 Hub `9c81bbcbf9b87b5118b92415a34c57783592bccc` 的 13/13 生产包检查。

功能 19、响应式 9、绑定 25、参数 32、参数外框动画 28、Presentation 49，共 162 个离线浏览器检查通过，页面错误为 0。UI/拖拽 23、保存对象比较正确性 8 通过；耗时为本机诊断，不作为真实宿主总延迟保证。独立目录重新安装锁定依赖并 build，四份发布资产和 production/preview JS 共六个文件逐字一致。

新增两项完整官方 0.2.1→0.2.2 更新测试，固定旧资产公开摘要；检查启用与停用实例、实例 ID、data、文件夹及顺序、其他脚本、显示版本、内嵌 Runtime Manifest 和保存回读。宿主树/持久保存及运行版本接口为模拟依赖，不代表真实 Helper 安装已通过。发布后 `tools/verify-public-package.cjs` 以当前 Hub Package 原始源码和真实公开 GitHub API 验证最新版本 installable、四份 Asset digest、本地字节、隔离 fresh install 和官方 0.2.1 更新；不执行下载脚本、不写真实宿主、不修改 Hub/Registry。

绑定/生成安全、参数和正则的 native 契约固定两版 ST 源码；普通请求边界及相关群聊控制流配合模拟依赖验证。完整 ST Generate/群成员循环/SSE、真实 Safari/CORS/Helper 持久保存、ST 1.19 全宿主和物理键盘仍须独立验收，不能把自动测试改称实机结果。Owner 认可见 REAL_HOST_VALIDATION.md；Issue #1 不关闭。


## Phase 1 Closeout Candidate（2026-10-07）

最新本地回执为 `validation-results.json.post022CloseoutCandidate`。基线 main `428140cab137f54ade06f5777b5a621fdcc04a7c`，开始时工作区干净。版本仍为 0.2.2，未 Commit / Push / Tag / Release；此 Candidate 不替换公开 0.2.2。Issue #1 保持 Open。

| 检查 | 本轮真实结果 |
| --- | --- |
| npm ci（锁文件全新离线安装）、check、test、build | PASS |
| Node | 325 / 325（新增 31） |
| Package v1 | 69 / 69：13 生产包检查 + 56 未改动上游 Hub 测试 |
| 发布时固定 Hub `9c81bbcb…` Package 源码 | 额外 13 / 13 |
| Browser functional / responsive | 19 / 19、9 / 9 |
| Binding / parameters / parameter motion | 25 / 25、32 / 32、28 / 28 |
| Presentation | 57 / 57（新增 8 个 SVG 路径回执） |
| Drag/UI performance / save comparison correctness | 23 / 23、8 / 8 |
| 独立目录重新安装锁定依赖与 build | 六份产物逐字一致 |

170 个功能／展示浏览器检查页面错误为 0；性能回执是合成本机诊断，不代表真实酒馆端到端速度。使用已有 Playwright Chromium 151.0.7922.34 headless shell。Node suite 包含原生生成 Gate、正则显示和 Package Update 回归；Runtime Hub / B1 / B2 closePanel 及合成 Mobile 在现有 Node／浏览器套件内通过。

新增 eligibility matrix 对照两版重新摘取的 PromptManager 方法体；覆盖角色为 system 的自定义条目、system_prompt=true、缺失 flag、Marker、protected ID、malformed raw。Copy 保留完整字段并生成 UUID；Detach 只移除活动组引用；Delete 先 Detach 再清理所有组目标引用，未知字段及无关数据逐对象相等。Controller 测试覆盖零提前写入、取消／重新读取、保存失败和冲突。两版原生生命周期模拟分别对 Copy／Detach／Delete 检查绑定 registry、默认 ID、当前 chat binding ID、tombstone 与 target；Dirty 跨聊天保留 A，Generation fail closed，Save／Discard 后仅应用最新聊天。特殊条目 Detach 保存期间同样受 Gate 保护，并核对磁盘回读和原生应用。

Standalone／Shortcut 各验证正常 PNG、真实 PNG decode error 后本地 SVG、64px 入口及与 PNG 相同的内容尺寸、aria-hidden / focusable=false、拖动／Dock、重复打开关闭、同一业务实例、normal／reduced motion、dispose 与延迟 error。Hub Host image fallback 与 Manifest 未改。

独立干净目录没有复制 Candidate 输出或依赖；仅保留 Package Update 所需、已固定摘要的历史官方 0.2.1 tracked 测试资产。四份 Package 资产及 production / preview JS 均由新安装依赖重新生成，与工作区逐字一致。

本地 [Candidate JSON](../delivery/phase1-closeout-candidate-20261007/MieMie-Preset-Manager-Extension-0.2.2.json)：
- SHA-256：`db8d765c9f667b95eb78a8fb2bcc6dd772280f0716bab7af400e3e211312c6fa`
- contentSha256：`a23a149568880c11f16894cbdda2ea72b1789831386854b292a8235637d32aee`

这不是新的真实宿主验收：完整 ST Generate／群成员循环／SSE、Safari、Helper 持久化／CORS、ST 1.19、物理 Mobile 和软键盘仍待对应实机验证。既有 Foundation 与公开 0.2.2 记录保持原范围。Owner 下一步仅在可恢复测试副本验 Copy／Detach／Delete、特殊条目解除后定义／保存刷新、PNG／SVG 入口，以及 Chat A/B 的 Default／Override。


## Preset picker follow-up（2026-10-07）

Owner 实机发现顶部选择框仍弹出系统菜单。本地 UI 改为参数设置同款页面内 combobox/listbox，使用同一选项颜色、勾选、hover、展开动画与箭头。整个选择外框及右侧 Default 独立点击区域保留，列表覆盖完整框宽；长名称换行、多条目滚动且高度限制在窗口内。选择后收起；鼠标选择不留常亮外框；支持方向键、Home/End、Enter、Escape、Tab 与点击外部。UI ID 不依赖安全页面的 crypto.randomUUID。Controller、Binding、统一保存及 Closeout Prompt policy 不变。

本轮 check、325/325 Node、build、69/69 Package 和发布固定 Hub 额外 13/13 PASS。离线 Chromium：functional 19、responsive 9、binding 30、parameters 32、parameter motion 28、Presentation 57（175 项，页面错误 0）；UI/拖拽 24、保存比较正确性 8 PASS。新增检查覆盖自定义菜单、选中状态、键盘关闭/焦点、Tab、外部关闭、320px 长名称与多预设，以及非安全隔离页面初始化。独立干净目录重新安装锁定依赖并 build，六份产物逐字一致。

本轮 [更新 Candidate JSON](../delivery/phase1-closeout-selector-candidate-20261007/MieMie-Preset-Manager-Extension-0.2.2.json)：

- SHA-256：`b5c916cb78d0f9dcea98113dbaf5750431965a470ede1c4d640c1c678a6fa571`
- contentSha256：`8dfc1004d00f2861a78aea2356b88300ea069dab45bf26a0caf99a5e63f7ed49`

机器回执：`validation-results.json.presetPickerFollowup`。先前 Closeout Candidate 与历史验证记录保留。本轮未 Commit / Push / 升版本 / 发布；没有新增 Safari／ST 实机通过结论，待 Owner 复核。


## Selected-row popup follow-up（2026-10-07）

Owner 希望保留系统菜单的展开定位方式，但统一页面内紫色样式。预设列表保持原顺序，展开时选中行对齐原选择框，可同时向上／向下展开；不把选中项强行排到第一位。窗口边界和首尾条目采用高度／滚动调整，保留可见高亮；不改变默认按钮、选择逻辑或 Binding。两项新增 desktop／390px 回归断言完整顺序、选中行对齐、相邻项与首尾边界。

Check、325/325 Node、build、69/69 Package PASS。功能 19、responsive 9、binding 32、parameters 32、motion 28、Presentation 57（177 项，页面错误 0），UI/拖拽 24、保存比较正确性 8 PASS。重新安装锁定依赖的独立干净构建，六份文件逐字一致。机器回执为 `validation-results.json.presetPickerAnchorFollowup`；先前 Candidate 回执保留。

[最新 Candidate JSON](../delivery/phase1-closeout-selector-anchor-20261007/MieMie-Preset-Manager-Extension-0.2.2.json)：

- SHA-256：`66405cea73110a50c8a56fa4f807c7579f476eac70b89b669416d25104be9f14`
- contentSha256：`0948826df520d4d52a5c7090b97bec413bdc343de16741d0dfa1d8839ff29610`

仍是本地未发布 0.2.2，未 Commit / Push / 升版本；尚待 Owner 实机复核。


## Reasoning picker anchor follow-up · 2026-10-07

推理强度改为预设选择框同款选中行定位浮层。两者共用垂直定位逻辑，保持选项顺序、选中高亮和统一动画；推理菜单位于弹窗中、不占表单高度，以表单可视区域为边界，避免遮挡底部取消／保存。首尾选项在边缘时保留可用滚动高度。点击外部、Escape、滚动离开、窗口变化、取消／保存、关闭和 dispose 都不会留下旧浮层。只修改 View／CSS，参数草稿、统一保存、Binding 和业务规则未改变。

新增桌面／390px 共六项浏览器检查：中间选中行与控件对齐、选项顺序和可见高亮、展开前后表单高度／滚动位置不变、首尾边界、resize／scroll／外部点击／关闭清理，以及取消／保存按钮仍可直接命中。其余参数取消不写入、统一保存写入、默认和未知值保留检查继续通过。

重新执行 `check`、`test`、`build`、Package v1 69、功能 19、响应式 9、Binding 32、参数设置 38、参数动画 28、Presentation 57、UI 性能 24、保存比较正确性 8，全部通过。Node 325，功能／展示浏览器合计 183，无页面错误。独立干净目录使用 lockfile 离线安装后重建，六产物字节一致。性能结果为本地合成测试，未新增真实宿主／Safari 验收结论。

Candidate：`delivery/phase1-closeout-reasoning-anchor-20261007/MieMie-Preset-Manager-Extension-0.2.2.json`

SHA-256：`39c3387b77115f7a2afad995905a2315f137eb915adaf3cc3eedd622ccdbcf7f`

内容 SHA-256：`f225b2eddab92763cdc12ba8cefbbd0ccd37c91c21f865a8c9aeaf58ea23f7e5`

保留此前 Candidate 和回执。本轮未提交、未推送、未发布、未升版本；等待 Owner Review。


## Compact reasoning popup follow-up · 2026-10-07

Owner 保留原来的“流式传输 → 请求思维链 → 推理强度”顺序。推理菜单优先显示约五行，下方空间不足时向上让位；首尾选中项保留完整点击范围，余下选项可滚动。仅窗口确实更短时进一步缩小菜单，始终限制在表单可视范围中，不遮挡底部取消／保存。顶部预设选择框保持此前选中行定位策略，保存、Binding 和业务逻辑不变。

参数浏览器新增原排序与短窗口末项可滚动触达断言，并更新展开断言为：普通桌面／390px 显示四到五个完整选项，“自动”选中时菜单上移，第一项／最后一项均可见，表单高度和滚动位置不变。缩放回归等待浏览器 resize 布局完成，再测几何；不以瞬时旧位置作为结果。

本轮重新执行 `check`、`test`、`build`，Node 325；Package v1 69；功能 19、响应式 9、Binding 32、参数设置 42、参数动画 28、Presentation 57，共 187 项功能／展示浏览器检查，全部通过、无页面错误。独立目录使用此前锁定安装的依赖重建，六产物字节一致。UI 性能 24／保存比较正确性 8 沿用前一 Candidate 的回执，本次未重复执行；未新增真实宿主／Safari 验收结论。

Candidate：`delivery/phase1-closeout-reasoning-compact-20261007/MieMie-Preset-Manager-Extension-0.2.2.json`

SHA-256：`d81417ffc16cf420d7826aa3fbf94ba771b15a8496b4a0e4b268a25ad0f5806c`

内容 SHA-256：`44c7409b68f170aed79d1469e01a096ce1249c8eb1ce215bfcceefe5c795cf10`

未提交、未推送、未发布、未升版本；保留此前 Candidate，等待 Owner Review。


## Scroll shadow follow-up · 2026-10-07

Owner 确认效果预览后，只把推理强度改成三个完整选项及下一项的一部分。预设列表保留原高度、展开锚点、顺序；两个菜单新增顶部／底部渐深滚动阴影，上／下仍有内容时对应阴影显示，到达端点后淡出，无溢出时均隐藏。阴影采用不占布局、`aria-hidden`、pointer-transparent 的独立覆盖层，尺寸跟随菜单，关闭时隐藏、编辑器替换／销毁时解绑观察器及监听。减少动画设置下取消过渡。仅 View／CSS 改动，设置顺序、参数保存、Binding 业务和既有 Closeout 规则保持不变。

共新增五项 desktop／390px／短预设浏览器回执，覆盖顶部／中部／底部／无溢出的实际阴影透明度、gradient、与菜单矩形对齐、遮罩显示／隐藏时菜单尺寸位置不变、遮罩下的选项可命中、参数取消后无残留和 reduced motion。原有参数键盘、短窗口、保存／取消、默认值检查继续通过。

另与前一 Candidate `d81417ffc16cf420d7826aa3fbf94ba771b15a8496b4a0e4b268a25ad0f5806c` 的真实 preview 构建做六项同环境对照：桌面及 390px、首／中／末预设的菜单 top／left／width／height／maxHeight／scrollTop 及选中行位置逐项完全一致。此对照回执保存在新 Candidate 的 `preset-layout-comparison.json`，不依赖公开发布或改写历史 Candidate。

重新执行 `check`、`test`、`build`，Node 325；Package v1 69；功能 19、响应式 9、Binding 35、参数设置 44、参数动画 28、Presentation 57，共 192 项功能／展示浏览器检查，全部通过、无页面错误。UI 性能 24、保存比较正确性 8 也重新执行并通过。独立目录使用此前锁定安装的依赖重建，六产物字节一致。以上为本地合成检查，没有新增真实酒馆／Safari 验收结论。

Candidate：`delivery/phase1-closeout-picker-shadows-20261007/MieMie-Preset-Manager-Extension-0.2.2.json`

SHA-256：`4c8a3d29705cba5b817691a4d72d080f2aeb00265dbaea5b806ccb99a1ba497e`

内容 SHA-256：`3a941c8d593f6bb0437fb648f22f8661effa64c255d61c6203f25c54f548cf74`

本轮未提交、未推送、未发布、未升版本；保留此前 Candidate，等待 Owner Review。


## Owner reasoning reference follow-up · 2026-10-07

Owner 提供桌面 `MieMie-Preset-Manager-Extension-0.2.2.json`，要求完全恢复其推理菜单展开方式并保留阴影。附件 SHA-256 为 `39c3387b77115f7a2afad995905a2315f137eb915adaf3cc3eedd622ccdbcf7f`，与已保存的 reasoning-anchor Candidate 一致。恢复其选中项锚定、自适应边界和高度算法；不再指定显示几行。构建后定位函数与附件去除注释／空白后的生成函数一致。两个菜单的动态阴影、淡入淡出、pointer-transparent 及生命周期清理保留；预设高度／位置、设置顺序与业务不变。

新增直接对照：使用与附件摘要一致的已保存 preview 构建作为基线，在 1280×844、390×844、1280×420、390×420 中逐个选择六种推理强度，共 24 项；菜单位置、宽高、maxHeight、scrollTop、选中行矩形、原控制位置和表单滚动高度完全一致。结果见新 Candidate 的 `owner-reference-comparison.json`。参数回归进一步断言同窗口中“自动”与“中”的菜单高度不同，防止重新引入固定数量；原滚动阴影和点击命中测试继续通过。

重新执行 `check`、`test`、`build`，Node 325；Package v1 69；功能 19、响应式 9、Binding 35、参数设置 44、参数动画 28、Presentation 57，共 192 项功能／展示浏览器检查，全部通过、无页面错误。独立目录使用此前锁定安装的依赖重建，六产物字节一致。UI 性能 24、保存比较正确性 8 沿用前一阴影 Candidate 的通过回执，本次未重复执行。没有新增真实酒馆／Safari 验收结论。

Candidate：`delivery/phase1-closeout-owner-reasoning-20261007/MieMie-Preset-Manager-Extension-0.2.2.json`

SHA-256：`7f739c10bc994ccfd8cf3c3119138dc2aab6b1c8047bc2c0d993463fa5dd7129`

内容 SHA-256：`7d66a76c4cc75aee7fe43011e8dff5036318971b4a025b6fc4f329d3b45e79c2`

未提交、未推送、未发布、未升版本；保留此前 Candidate，等待 Owner Review。

## 0.2.3 release validation（2026-10-07）

当前回执为 `validation-results.json.release023`。升版前已从源码逐字重现 Owner 指定 0.2.2 Anchor；随后以正式 0.2.3 身份重新执行锁定安装、check／test／build 及全部当前专项。

Node 325／325；Package 71／71（15 production + 56 upstream）；当前正式 Hub `9c81bbcbf9b87b5118b92415a34c57783592bccc` 额外 15／15。功能 19、响应式 9、Binding 35、参数 44、外框动画 28、Presentation 57，共 192；页面错误 0。UI／拖拽 24、保存比较正确性 8 本轮重新执行 PASS，未沿用旧回执。

0.2.2→0.2.3 与 0.2.1→0.2.3 更新均使用完整官方历史资产，启用／停用实例分别检查 instance ID、data、folder/order、其他脚本、内容／显示／运行版本与磁盘回读。安装树和持久保存依赖仍为隔离合成环境。独立 clean checkout 的新安装 build／package 和六产物字节比较，以及发布后的真实 GitHub discovery／digest／fresh install／update 为最终发布门槛，结果由发布回执记录。

UI Scope Audit、资格 Matrix、完整摘要和当前宿主边界见 [Release 0.2.3](RELEASE-0.2.3.md)。Owner 已确认当前 Candidate 真实使用验收；没有新的 ST 1.19／物理移动端全宿主矩阵，Issue #1 继续 Open。历次 Candidate 的日期、摘要和当时状态保留，公开旧 Release 不替换。
