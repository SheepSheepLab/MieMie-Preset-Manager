# MieMie Preset Manager · 咩咩预设管理

SillyTavern Chat Completion Preset / Prompt Manager

咩咩预设管理是 SillyTavern 原生 Chat Completion Preset 与 Prompt Manager 的管理前端，提供预设切换、导入导出、完整复制，以及 Prompt 编辑、排序和开关。同一份脚本共用 Core、UI 和 Hub Adapter，适配 PC / 手机及 Standalone / MieMie Hub。

MieMie Preset Manager is a frontend for SillyTavern's native Chat Completion presets and Prompt Manager. It preserves native data and does not introduce a proprietary preset format.

## 项目状态 / Status

- 当前实现与测试包版本：`0.1.2`。这是已完成一次 Foundation 基础实机验收的开发版本，不代表官方发布或完整 Phase 1 验收通过。
- 官方上游：`SheepSheepLab/MieMie-Preset-Manager`。
- Extension / Product ID：`miemie.preset-manager`；MieMie Hub API：`1`。
- 适配范围：ST `1.18.x` / `1.19.x`，有启动时能力检查。固定源码研究与模拟测试以 `1.18.0`、`1.19.0` 为基线；本次基础实机通过的组合为 **ST 1.18.0 (`8172dcd0e`) + Tavern Helper 4.11.2 + Hub 0.8.1 + Safari 26.6 / macOS 26.6**。ST 1.19、其他补丁版本和物理手机仍待验证，不能宣称整个版本系列已通过实测。

正式需求见 [PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md)，协作规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。实现边界见 [Compatibility Notes](docs/COMPATIBILITY.md)，自动测试结果及 18 项真实宿主验收清单见 [Testing](docs/TESTING.md)。未覆盖需求仍是待解决项。

本次实机已验证 Standalone / Hub 正式 PNG 入口、单实例、打开／关闭／重开、预设读取与切换、完整测试副本、Prompt 标题取消／保存、Toggle／复制／排序、导出及刷新持久化，草稿跨关闭和 Hub 停用／重新接入保留。11 份原始预设逐字未改变，未发现数据损坏。RH-01 曾出现一次 Hub 打开超时，根因未确认；后续同环境复核未再次复现，当前不作为 Foundation Merge blocker，继续观察。完整范围和证据见 [Real Host Validation](docs/REAL_HOST_VALIDATION.md)；[Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 继续 Open。

## 安装测试包

交付物为 **Tavern Helper（酒馆助手）脚本 JSON**，不是放入 SillyTavern `third-party` 目录的原生扩展：

[MieMie-Preset-Manager-Extension-0.1.2.json](delivery/MieMie-Preset-Manager-Extension-0.1.2.json)

1. 准备可恢复的预设备份，在目标酒馆的 Tavern Helper 脚本库中导入 JSON，只启用一个实例。
2. 未运行兼容 Hub 时，点击右下方正式 PNG 悬浮入口打开管理器；打开面板后入口隐藏，关闭后恢复。
3. 运行 MieMie Hub API v1 时，独立入口收起，从 Hub 打开“咩咩预设管理”。Hub 退出后恢复独立入口，再次出现时重新接入。
4. 按 [Testing](docs/TESTING.md) 在目标 ST 版本上验证，记录 ST commit、Tavern Helper 和 Hub 的实际版本。

运行时需要宿主的原生预设管理器、事件总线、请求头、Chat Completion 设置，以及 Tavern Helper 的 `getTavernVersion()`、`builtin.promptManager`。缺少能力时在写入前停止。Hub 可选；不要求用户安装 Node.js，不从 CDN 加载业务代码。

## 日常操作

顶部显示实际当前预设。导入和完整复制会先保存、回读，再切换到新预设；同名导入生成唯一名称。更多菜单提供新建、重命名、删除和操作前备份导出。新建沿用当前生成／连接设置与内建条目，清除自定义条目，来源预设不变。

Prompt 编辑在点击“保存”后提交，取消丢弃编辑。高级设置默认折叠，支持原生 Role、Trigger、Position、Depth、Order 和 `forbid_overrides` 等字段。未知字段保留；Marker 内容由酒馆生成，不作为普通文本编辑。“解锁”将可操作条目从当前发送顺序移出，保留定义；可重新挂接，或确认后永久删除。当前对 Marker 和保留 identifier 的保护比原生规则更严格，见兼容文档的已知限制。

整张卡片的非交互区域都可拖动；手机长按约 350ms 后拖动，正常滑动不提交排序。键盘聚焦卡片后可用 Alt+↑/↓ 排序。分类仅根据本地标题前缀生成，不更改名称或数据；在分类内排序只置换该分类原有位置。

界面包含窄屏、低高度横屏、安全区和 `visualViewport` 布局处理，主要按钮触控区域至少约 44px。尺寸变化保留编辑草稿、焦点和选区；编辑区滚动，保存按钮位于编辑窗口底部。旋转时取消正在进行的拖动。真实移动浏览器及软键盘仍待验证。

## 数据与隐私

读取完整原生 Preset，修改目标字段后保存，不从简化模型重建 JSON。未知字段、生成／模型配置及所有 `prompt_order` 分组保留。写入通过原生保存接口，随后从磁盘读取接口核对；外部切换、同名文件变化或未保存的原生设置可能阻止操作，并明确报告保存与应用的实际结果。

导出包含**完整原始设置**，可能含 `proxy_password`、`custom_include_headers`、连接地址或其他敏感字段；不会自动脱敏。导出文件和操作前备份应作为私人数据保管，分享前另行检查。内存备份在停用脚本、关闭或刷新酒馆页面后清除。原生服务端没有跨请求事务，不能保证跨浏览器并发写入的绝对原子性。

分类和编辑在浏览器本地处理。运行时仅请求当前 ST 宿主的原生读取／保存接口，不向 Registry、Hub Server、第三方分析、遥测或 AI 服务发送 Prompt 正文。Hub 只接收清单与面板生命周期，不接收完整预设、控制器或草稿。这不构成对其他同源脚本的安全隔离。

## 源码与构建

要求 Node.js `>=22`、npm。依赖版本由 `package-lock.json` 固定，在仓库根目录执行：

```sh
npm ci
npm run build
npm run test:browser
```

`npm run build` 执行严格 TypeScript 检查、Node 测试、脚本打包和语法检查。`npm test` 只转译并运行 Node 测试；`npm run check` 只检查生产源码类型。浏览器测试使用 Playwright `1.62.1`，默认启动本机 Chrome；使用 Playwright Chromium 的方法见 [Testing](docs/TESTING.md)。

构建输出位于 `delivery/`。仓库提交当前版本的 Extension JSON 和 `component-update-manifest.json`；`preset-manager.js`、`preview.js`、`preview.html` 由构建生成。预览使用人工演示数据和内存适配器，不能作为真实酒馆运行证据。

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

软件代码采用 **GNU General Public License v3.0 or later**（SPDX：`GPL-3.0-or-later`）。[LICENSE](LICENSE) 保留完整、未修改的 GNU GPL v3 正文；本说明明确“或任何后续版本”选项。软件不提供担保。

Software code is licensed under GNU GPL version 3 or, at your option, any later version, without warranty. Contributor authorship and copyright notices remain intact.

MieMie / 咩咩的品牌、Logo、角色形象和指定美术资产不自动纳入软件 GPL 授权。品牌和素材声明不向 GPL 软件代码附加限制。第三方测试源码与夹具保留上游许可，具体范围与来源见以下文件。

- [BRAND.md](BRAND.md)
- [ASSETS-LICENSE.md](ASSETS-LICENSE.md)
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- [测试夹具来源](tests/fixtures/README.md)
