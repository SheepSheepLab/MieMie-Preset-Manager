# MieMie Preset Manager · 咩咩预设管理

SillyTavern Chat Completion Preset / Prompt Manager

咩咩预设管理是 SillyTavern 原生 Chat Completion Preset 与 Prompt Manager 的管理前端，提供预设切换、导入导出、完整复制，以及 Prompt 编辑、排序和开关。同一份脚本共用 Core、UI 和 Hub Adapter，适配 PC / 手机及 Standalone / MieMie Hub。

MieMie Preset Manager is a frontend for SillyTavern's native Chat Completion presets and Prompt Manager. It preserves native data and does not introduce a proprietary preset format.

## 项目状态 / Status

- 当前阶段版本：`0.2.3`，以 GitHub **Pre-release** 发布。包含 Foundation、本地暂存与统一保存、对话级预设绑定、生成安全检查、预设参数设置及官方应用 Presentation；Phase 1 原始18项 Golden Path 验收已完成并通过 Owner 最终审核。
- 官方上游：`SheepSheepLab/MieMie-Preset-Manager`。
- Extension / Product ID：`miemie.preset-manager`；MieMie Hub API：`1`。
- 适配范围：ST `1.18.x` / `1.19.x`，有启动时能力检查。历史 Foundation 实机为 **ST 1.18.0 + Helper 4.11.2 + Hub 0.8.1 + Safari 26.6 / macOS 26.6**，只对应当时的 0.1.2 包。2026-10-08 新证据确认正式 **0.2.3 + ST 1.19.0 (`7e8663c`) + Helper 4.11.3** 的代表性桌面路径与 **iOS Simulator Mobile Safari** 操作；Owner 另确认移动长按排序、统一保存、刷新持久化、切换及普通列表滑动到底且不改变顺序。物理手机、完整补丁/第三方生态矩阵未验。

正式需求见 [PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md)，协作规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。实现边界见 [Compatibility Notes](docs/COMPATIBILITY.md)，自动测试结果及 18 项真实宿主验收清单见 [Testing](docs/TESTING.md)。未覆盖需求仍是待解决项。

此前 Foundation 交付包的实机已验证 Standalone / Hub 正式 PNG 入口、单实例、打开／关闭／重开、预设读取与切换、完整测试副本、Prompt 标题取消／保存、Toggle／复制／排序、导出及刷新持久化，草稿跨关闭和 Hub 停用／重新接入保留。11 份原始预设逐字未改变，未发现数据损坏。RH-01 曾出现一次 Hub 打开超时，根因未确认；后续同环境复核未再次复现，当前不作为 Foundation Merge blocker，继续观察。本阶段的统一保存与 Presentation 已通过 Maintainer Review；升版本前内容基线 SHA-256 为 `2c84664207849af59460b81c50cf4b46fedcbd16c255422e38f3720dad2b792a`。以上带环境记录的实机结果仍只适用于原 Foundation 包，不扩大为完整 Phase 1 或新版的全面实机验收。完整范围和证据见 [Real Host Validation](docs/REAL_HOST_VALIDATION.md)。

## 0.2.3 兼容语义与界面调整

0.2.3 收口 Owner 已完成真实使用验收的 Candidate：Copy／Detach／Delete 独立资格、原生一致的 Detach、保守的物理 Delete、Standalone／Shortcut 的固定本地 SVG 回退，以及统一的选中项定位菜单和滚动边缘阴影。升级前已从源码逐字重现 Owner 测试包。历史公开发行保留；本轮范围与验证见 [Release 0.2.3](docs/RELEASE-0.2.3.md)。2026-10-08 最终补验结论为 A：**18 PASS / 0 PARTIAL / 0 FAIL**。真实 MPM Export 文件、ST Native Re-import 及编辑后导出未知字段保留均通过；三阶段结构与语义一致，本样本无 Native 字段规范化变化。其余15项按原版本/证据范围复用。完整18项矩阵及结项依据见 [Final Closeout Review](docs/PHASE1-CLOSEOUT-0.2.3.md)。本次验收文档发布于 v0.2.3 Release 之后，不属于原 v0.2.3 Tag 的文档内容；历史 Tag 与 Release Assets 保持不变。Issue 的实时状态以 [Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 为准。

## 安装阶段版本

交付物为 **Tavern Helper（酒馆助手）脚本 JSON**，不是放入 SillyTavern `third-party` 目录的原生扩展：

[MieMie-Preset-Manager-Extension-0.2.3.json](https://github.com/SheepSheepLab/MieMie-Preset-Manager/releases/download/v0.2.3/MieMie-Preset-Manager-Extension-0.2.3.json)

[Release Notes](https://github.com/SheepSheepLab/MieMie-Preset-Manager/releases/tag/v0.2.3) · [仓库交付文件](delivery/MieMie-Preset-Manager-Extension-0.2.3.json)

1. 准备可恢复的预设备份，在目标酒馆的 Tavern Helper 脚本库中导入 JSON，只启用一个实例。
2. 未运行兼容 Hub 时，点击 64px 正式 PNG 原生悬浮入口；它可拖动并贴靠左/右边，位置按比例保存。窗口从入口展开，底部“返回”收回窗口；入口持续保留，确实位于页面上方并遮挡关键操作时才避让；页面覆盖入口时保持条目对齐，内部 Dialog 沿用已验收交互。
3. 运行 MieMie Hub API v1 时，独立入口收起，从 Hub 打开“咩咩预设管理”。Hub 退出后恢复独立入口，再次出现时重新接入，保留同一业务 Session。若 Hub 提供 Shortcut capability，用户可在 Hub 中选择“显示悬浮球”，使用同一个 Native 入口；蜂窝动画仍由 Hub 控制。
4. 按 [Testing](docs/TESTING.md) 在目标 ST 版本上验证，记录 ST commit、Tavern Helper 和 Hub 的实际版本。

运行时需要宿主的原生预设管理器、事件总线、请求头、Chat Completion 设置，以及 Tavern Helper 的 `getTavernVersion()`、`builtin.promptManager`。缺少能力时在写入前停止。Hub 可选；不要求用户安装 Node.js，不从 CDN 加载业务代码。

当前版本使用实际 600×780 Clamp 应用窗口、正式 PNG Header 和底部“返回”，没有主窗口全屏遮罩。Native / Floating Presentation 来源、入口分工和验证范围见 [Application Presentation](docs/APPLICATION-PRESENTATION.md) 与 [Presentation Review](docs/PRESENTATION-REVIEW.md)。

## 日常操作

顶部显示实际当前预设。选择框使用与参数设置一致的页面内下拉菜单，不调用系统选择窗口；展开按当前选中行定位，保持原顺序，边界不足时自动调整高度与滚动。导入和完整复制会先保存、回读，再切换到新预设；同名导入生成唯一名称。更多菜单提供完整导出、复制当前预设、新建、重命名和删除。新建沿用当前生成／连接设置与内建条目，清除自定义条目，来源预设不变。

当前版本采用统一保存：Prompt 编辑窗口的“保存”只暂存本次编辑，取消丢弃本次编辑；条目排序、开关、复制、新增、解锁／挂接与删除先留在本地。分类右侧的软盘 SVG 保存图标（“保存修改”）在无改动时变暗，有改动时可用；点击后才统一同步酒馆并回读确认。“重新读取实际状态”在有未保存内容时确认放弃，读取成功后恢复实际数据；读取失败保留修改。关闭预设管理时也会提示未保存内容，选“是”丢弃，选“否”继续编辑。有未保存内容时须先保存或重新读取，再切换、导入、复制或导出预设。新增条目位于分类左侧。高级设置默认折叠，支持原生 Role、Trigger、Position、Depth、Order 和 `forbid_overrides` 等字段。未知字段保留；Marker 内容由酒馆生成，不作为普通文本编辑。“解锁”将可操作条目从当前发送顺序移出，保留定义；可重新挂接，或确认后永久删除。Copy 是 MPM 的便利功能，只允许普通自定义条目；物理 Delete 同样保守保护 Marker、内建／保留 identifier。Detach 则按固定原生资格 `system_prompt === false`，允许合法特殊条目仅移出当前顺序；定义、其他组和未知字段保留。三者独立，见 [Compatibility](docs/COMPATIBILITY.md)。

整张卡片的非交互区域都可拖动；手机长按约 350ms 后拖动，正常滑动不提交排序。键盘聚焦卡片后可用 Alt+↑/↓ 排序。分类仅根据本地标题前缀生成，支持 `🕋难度-地狱`、`📕文风:FateZero` 等连字符／单冒号格式，也保留双冒号、括号等已有格式。中文全角冒号 `：` 同样可用；相同前缀至少两条时生成分类，不更改名称或数据；在分类内排序只置换该分类原有位置。

界面包含窄屏、低高度横屏、安全区和 `visualViewport` 布局处理，主要按钮触控区域至少约 44px。尺寸变化保留编辑草稿、焦点和选区；编辑区滚动，保存按钮位于编辑窗口底部。旋转时取消正在进行的拖动。实际 iOS Simulator Mobile Safari 已验证软件键盘、编辑保存/取消、可见区域适配及基础旋转，Owner 另确认长按排序与刷新持久化；普通触摸列表滑动由 Owner 补充确认；拖动期间旋转等未测细项保留原范围，不声称物理手机通过。

## 对话绑定与预设参数

当前对话未独立选择预设时跟随全局默认；在管理器选择其他预设时，仅为当前单人或群聊保存独立绑定。选择默认预设可恢复跟随；选择框右侧圆点按钮将当前预设设为全局默认，并保留其他对话的独立选择。绑定使用稳定 ID，重命名保留 ID；删除后不会把旧绑定自动接到同名新预设。找不到目标时明确显示缺失并回退可用默认；无可用预设或配置损坏时停止自动应用及受保护的原生生成。未保存修改仍属于原预设，切换聊天不会搬移草稿；保存或放弃后只协调最新对话。原生设置的外部偏离会重新协调，持续争夺则停止重试。

列表顶部的“预设参数设置”可编辑上下文/回复长度、备选回复数量、温度、频率/存在惩罚、Top P、流式、请求思维链和推理强度。它随列表滚动，不参加 Prompt 排序。推理强度与顶部预设选择共用选中项定位浮层，保持原顺序及高亮，展开不挤动设置内容。推理选项高度和展开位置随选中项及可用空间自适应，不固定显示数量；两个菜单的边缘阴影随可滚动内容出现／消失，预设菜单保留原有高度和展开位置。设置窗口“保存”先暂存，分类右侧软盘再统一写入；取消不写入。仅缺失字段在明确确认时补默认，已有 0、false 和未知枚举保持原值；具体默认和原生限制见 [Compatibility](docs/COMPATIBILITY.md)。

自动对话切换遇到已授权的预设内嵌正则时，尝试用原生消息显示接口更新可见内容，减少重复重载提示。首次授权、手动切换和其他通知不变；无法安全刷新时保留原生提示，不改写聊天内容。原生 Chat Completion 生成在预设应用中、未保存或尚未安全确认时被阻止；绕过原生 Generate 的扩展直接请求不在该保护范围。详见 [Binding](docs/PER-CHAT-PRESET-BINDING.md)。

## 数据与隐私

读取完整原生 Preset，修改目标字段后保存，不从简化模型重建 JSON。未知字段、生成／模型配置及所有 `prompt_order` 分组保留。写入通过原生保存接口，随后从磁盘读取接口核对；外部切换、同名文件变化或未保存的原生设置可能阻止操作，并明确报告保存与应用的实际结果。

导出包含**完整原始设置**，可能含 `proxy_password`、`custom_include_headers`、连接地址或其他敏感字段；不会自动脱敏。导出文件和个人备份应作为私人数据保管，分享前另行检查。内存备份在停用脚本、关闭或刷新酒馆页面后清除。原生服务端没有跨请求事务，不能保证跨浏览器并发写入的绝对原子性。

分类和编辑在浏览器本地处理。运行时仅请求当前 ST 宿主的原生读取／保存接口，不向 Registry、Hub Server、第三方分析、遥测或 AI 服务发送 Prompt 正文。Hub 只接收清单与面板生命周期，不接收完整预设、控制器或草稿。这不构成对其他同源脚本的安全隔离。

## 源码与构建

要求 Node.js `>=22`、npm。依赖版本由 `package-lock.json` 固定，在仓库根目录执行：

```sh
npm ci
npm run build
npm run test:package-v1
npm run test:browser
```

`npm run build` 执行严格 TypeScript 检查、Node 测试、脚本打包和语法检查。`npm test` 只转译并运行 Node 测试；`npm run check` 只检查生产源码类型。浏览器测试使用 Playwright `1.62.1`，默认启动本机 Chrome；使用 Playwright Chromium 的方法见 [Testing](docs/TESTING.md)。

构建输出位于 `delivery/`。从 **0.2.1** 开始提供 MieMie GitHub Extension Package v1：正式 `manifest.json`、ASCII 文件名 Extension JSON、`MieMie-Extension-update.json` 和 `SHA256SUMS` 均由构建生成或校验。兼容 Hub 可以从本仓库识别、安装、检查更新，并对后续符合 Package v1 的版本原地更新。自动契约已通过；**真实 Hub 在线安装、浏览器 CORS、宿主持久保存和更新仍待 Owner 实机验收**。这与已有 Hub Runtime 接入是两项独立能力。

`manifest.json` 是发布与 Runtime Display Identity 的共同来源；Runtime 顶层图标仍使用内嵌正式 PNG，Launcher 短文本 fallback 为“预设”。Manifest author `SheepSheep` 表示 Founder / Project Initiator / official product author；`SheepSheepLab` 是官方 GitHub 开发、维护与发布命名空间。louisSSR 保留真实 Contributor 身份、贡献版权与提交记录。标准元数据只记录 Asset 名称、原始字节大小与 hash，下载来源由 GitHub Release API 决定。SHA256SUMS 是辅助检查，不能替代 GitHub digest。

**旧手动 0.2.0 迁移：** 当前 Hub 不识别缺少 repository 的旧身份行，不能安全自动升级此实例。先导出/备份旧脚本和重要预设，停用旧实例，在 Helper 中确认备份可恢复后手动移除旧脚本，再从 Hub 安装 0.2.3；不要同时启用两个实例，也不要依赖按名称猜身份。Hub 不会将旧脚本的 data 自动迁移给新实例；需要保留的设置应由用户依据备份核对。Preset Manager 的业务数据模型和预设保存位置没有改变。v0.2.0 Tag、Assets 和 Notes 保持历史原样。旧自定义 component manifest 已从当前构建中退休；它不是标准 Package v1。

`preset-manager.js`、`preview.js`、`preview.html` 由构建生成；预览使用人工演示数据和内存适配器，不能作为真实酒馆运行证据。发布说明见 [0.2.3](docs/RELEASE-0.2.3.md)；[0.2.2](docs/RELEASE-0.2.2.md)、[0.2.1](docs/RELEASE-0.2.1.md) 保留历史范围。

| 文件 | 职责 |
| --- | --- |
| `contracts.ts` / `model.ts` | 原始对象类型、验证、分类与局部 Prompt 操作 |
| `st-adapter.ts` | ST 能力检查、版本差异、磁盘回读、并发及失败处理 |
| `controller.ts` | 草稿、互斥操作、状态与内存备份 |
| `ui.ts` / `styles.ts` / `icons.ts` | PC／手机共用交互、样式与 SVG |
| `dual-mode.ts` | 单个业务实例的 Hub／独立入口生命周期 |
| `index.ts` | Tavern Helper 脚本启动与停用 |
| `preview.ts` | 本地演示入口，不进入交付脚本 |
| `build.cjs` / `tests/` | 构建、数据与宿主契约测试、浏览器检查 |

## 授权 / Licensing

软件代码采用 **GNU General Public License v3.0 or later**（SPDX：`GPL-3.0-or-later`）。[LICENSE](LICENSE) 保留完整、未修改的 GNU GPL v3 正文；本说明明确“或任何后续版本”选项。遵守 GPL 即可使用、修改、Fork、再分发、商业使用代码，并对自己的 GPL Fork 收费。软件不提供担保。

Software code is licensed under GNU GPL version 3 or, at your option, any later version, without warranty. Contributor authorship and copyright notices remain intact. Contributions remain copyright of their respective contributors unless otherwise stated.

SheepSheep 是 Founder / Project Initiator；SheepSheepLab 是官方 GitHub 开发、维护与发布命名空间。社区 Contributor 保留自己的贡献者身份，包括 louisSSR 的真实历史贡献、版权与提交记录；品牌政策统一不改变贡献归属。

“咩咩”与“MieMie”是地位同级的中文、英文官方品牌，书写顺序不表示主次。品牌、Logo、角色形象及指定视觉资产不因代码采用 GPL 自动开放；当前 Reserved Asset 仅为 `assets/preset-manager-icon.png`，不排除整个 `assets/` 目录。该 PNG 内嵌为 Base64 也不意味着自动取得 GPL 素材授权。

第三方独立 Fork 应使用自己的产品名称、Logo、Icon 与主要视觉身份，明确第三方身份；未获单独素材授权时移除或替换保留 PNG。About / README / Credits 中真实的 “Based on MieMie Preset Manager” 和 “Compatible with MieMie Preset Manager” 等说明允许出现在免费或收费产品中，但不得暗示官方背书。免费原样转载含保留素材的官方包应保留声明并标明官方来源与转载者身份；默认素材许可不授权收费转售该含图包。以上品牌／素材边界不向 GPL 代码附加限制，历史发布版本按其发布时适用的许可处理。

品牌与素材政策已同步至 **MieMie Brand Policy v2.0（2026-09-24 生效）**。详细范围见以下文件；第三方测试源码与夹具继续保留上游许可。

- [品牌身份与正常引用规则](BRAND.md)
- [指定 PNG 的来源与素材使用范围](ASSETS-LICENSE.md)
- [第三方声明](THIRD_PARTY_NOTICES.md)
- [测试夹具来源](tests/fixtures/README.md)
