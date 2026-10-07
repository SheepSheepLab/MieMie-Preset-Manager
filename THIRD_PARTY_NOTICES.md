# 第三方声明

MieMie Preset Manager 的项目代码按 [GPL-3.0-or-later](LICENSE) 提供，贡献者身份由 Git 提交和 PR 记录保留。下列第三方内容保留各自的来源与许可，不将它们重新标注为本项目原创或 GPL。

## SillyTavern 测试资料

以下文件包含 [SillyTavern](https://github.com/SillyTavern/SillyTavern) 的公开资料，归 SillyTavern 的相应作者与贡献者所有，保留上游 **AGPL-3.0** 许可；完整许可见 [tests/fixtures/SillyTavern-LICENSE.txt](tests/fixtures/SillyTavern-LICENSE.txt)。

| 文件 | 内容与来源 |
| --- | --- |
| `tests/fixtures/st-1.18.0-default.json` | 未修改的官方 Default 预设，取自 1.18.0，commit `51ad27fb86d39a3daca3adaa970375c9670c12df`。 |
| `tests/fixtures/st-1.19.0-default.json` | 未修改的官方 Default 预设，取自 commit `06bde939fb1e9c4c8d8641d810f0a916b5bce127`，已与 1.19.0 的 commit `7e8663cd9c184a550b37238218bdd32c6efc68e9` 核对为一致。 |
| `tests/fixtures/st-binding-contracts.json` | 固定官方 1.18.0 / 1.19.0 的 22 个未修改原生函数/方法：生成、事件、metadata 保存、auto-select 和目录；保留完整来源文件 hash 与原行号。仅测试使用，AGPL-3.0 不变。 |
| `tests/fixtures/st-native-contracts.json` | 上述固定版本的 46 段未修改 JavaScript 源码摘录，逐段记录 commit、文件位置、行号及完整来源文件的 SHA-256。 |

逐项来源见 [测试资料说明](tests/fixtures/README.md) 和 [源码溯源记录](docs/source-provenance.json)。这些资料仅供本地测试，未导入生产入口，也不进入生产 bundle 或 Extension JSON。测试夹具保留其 AGPL 许可，不因与项目代码放在同一仓库而改标为 GPL。

两个 Default 文件是公开的官方测试基线，不包含用户的私人预设；其中名为 `nsfw` 和 `jailbreak` 的 Prompt 正文为空。其他测试数据由本项目构造。源码摘录测试使用模拟的 DOM、事件和存储依赖，不代表已经通过真实 SillyTavern 宿主验证。

## MieMie Hub 测试源码

`tests/fixtures/hub-v1-contracts.json` 包含 SheepSheepLab/MieMie-Hub commit `928362c1eb224afe780801060c6d867e01cf5013` 的 9 段未修改源码摘录（Runtime、provide、面板、Launcher 渲染和 Surface）。相应作者与贡献者的版权和上游 GNU GPL v3 许可保留，完整上游许可见 [tests/fixtures/MieMie-Hub-LICENSE.txt](tests/fixtures/MieMie-Hub-LICENSE.txt)。逐段记录文件、行号和完整来源文件 SHA-256；仅在本地测试中执行，不进入生产 bundle 或 Extension JSON，也不代表真实 Hub 实机验收。

## 构建与测试工具

开发依赖由 `package.json` 和 `package-lock.json` 记录。下表列出直接依赖；完整依赖树及各包附带的许可随包管理器安装，可在锁文件和安装包中核查。

| 工具 | 版本 | 许可 | 用途 |
| --- | --- | --- | --- |
| [TypeScript](https://github.com/microsoft/TypeScript) | 6.0.3 | Apache-2.0 | 类型检查、测试转译。 |
| [webpack](https://github.com/webpack/webpack) | 5.108.4 | MIT | 生成浏览器 bundle。 |
| [ts-loader](https://github.com/TypeStrong/ts-loader) | 9.6.2 | MIT | 构建时编译 TypeScript。 |
| [Playwright](https://github.com/microsoft/playwright) | 1.62.1 | Apache-2.0 | 本地浏览器自动测试。 |

不随仓库提交 `node_modules` 或浏览器二进制。生产代码无需从 CDN 加载这些开发工具。生成的 bundle 包含 webpack 的运行时辅助代码，其版权属于 JS Foundation 和其他贡献者，按 MIT 许可提供；[licenses/webpack-MIT.txt](licenses/webpack-MIT.txt) 是从 webpack 5.108.4 安装包精确复制的完整许可，构建产物同时保留此许可文本。

## 接口参考与界面图形

SillyTavern 和 [Tavern Helper / JS-Slash-Runner](https://github.com/N0VI028/JS-Slash-Runner) 是宿主及接口参考来源，具体核对版本见 [兼容说明](docs/COMPATIBILITY.md)，SillyTavern 文件哈希见 [源码溯源记录](docs/source-provenance.json)。除上文列明的 SillyTavern 测试资料外，本项目没有随生产包分发这两个宿主的实现。

Hub 集成只使用公开生命周期、面板挂载和可选 Shortcut capability。本项目不包含 Polisher 的业务实现、Extension JSON 或美术素材。

`icons.ts` 中的内联 SVG 控件是本项目编写的几何界面图形，随软件代码使用 GPL-3.0-or-later；没有引入第三方图标库或字体，也不将这些 SVG 控件声称为官方角色资产。正式产品 PNG 由维护者提供，其单独素材记录见 ASSETS-LICENSE.md。品牌身份与指定素材的边界仍见 [BRAND.md](BRAND.md) 和 [ASSETS-LICENSE.md](ASSETS-LICENSE.md)。对宿主或其他项目的提及不表示获得其官方背书。

## Native Application Presentation 来源

`native-launcher.ts`、`native-floating-presentation.ts` 与 `presentation-styles.ts` 的原生入口、Dock、窗口动画和 Header Hero 结构 Adapted from [MieMie Polisher 1.2.1](https://github.com/SheepSheepLab/MieMie-Polisher/tree/5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1)，commit `5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1`，按 GPL-3.0-or-later 保留上游贡献归属，并改为 Preset Manager 的 TypeScript、产品身份、Dock key 和紫色 Accent。

`official-presentation.ts` 的悬浮入口避让思路参考 [MieMie Story Director](https://github.com/SheepSheepLab/MieMie-Story-Director/tree/32f34865af156d35b628adc6e66018329026df96)，commit `32f34865af156d35b628adc6e66018329026df96`，GPL-3.0-or-later。该项目的 Native Presentation 同样据实注明 Adapted from Polisher；本次只沿用展示分层与官方应用结构，不复制其业务 Core 或品牌资产。许可文本见本项目 [LICENSE](LICENSE)；固定源文件哈希见 [source-provenance.json](docs/source-provenance.json)。

`tests/fixtures/hub-v1-shortcut-launchers.js` 为上述固定 Hub commit 的原始 `src/shortcut-launchers.js`，Git blob `93436eefe54d4d89be94f40109f3f9dba072d43e`，相应作者与贡献者及 GNU GPL v3 许可保持上游归属。此夹具仅用于离线浏览器测试，未进入生产 bundle。


## Hub Package v1 test fixture

`tests/fixtures/hub-package-v1/` retains byte-exact Package source modules and `tests/package-manager.test.mjs` from [MieMie Hub](https://github.com/SheepSheepLab/MieMie-Hub/tree/928362c1eb224afe780801060c6d867e01cf5013), commit `928362c1eb224afe780801060c6d867e01cf5013`. Upstream contributors retain attribution, GPL-3.0-or-later; the unmodified GPL text is included in the fixture LICENSE. Paths and SHA-256 are recorded in provenance.json. Test-only imports; no Hub Package implementation or upstream test data enters the production Extension. Synthetic script trees and development HTTP responses are not real-host evidence.

`tests/fixtures/st-regex-contracts.json` preserves unchanged public ST 1.18.0 / 1.19.0 notification and message-display snippets under AGPL-3.0. Source URLs, immutable commits, full-source SHA-256, and line numbers accompany each snippet; see `tests/fixtures/SillyTavern-LICENSE.txt`. These fixtures remain test-only and are excluded from the production bundle.
