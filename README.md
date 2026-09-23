# MieMie Preset Manager · 咩咩预设管理

SillyTavern Chat Completion Preset / Prompt Manager

咩咩预设管理是 SillyTavern 原生 Chat Completion Preset 与 Prompt Manager 的管理前端，提供更直观的预设与提示词操作，支持 PC / Mobile 和 Standalone / MieMie Hub。

MieMie Preset Manager is a frontend for SillyTavern's native Chat Completion presets and Prompt Manager. It preserves native data and does not introduce a proprietary preset format.

## 项目状态 / Status

- **Early Development / Prototype Integration**：社区 Contributor 已实现 0.1.0 原型，维护者持有 0.1.2 兼容修订包。当前仓库基础文件不包含该实现，等待 Contributor 通过本人账号提交源码与 PR。
- 初始计划版本：`0.1.0`；原型包版本：`0.1.2`；二者不代表已经发布或验收的官方版本。
- 官方上游：`SheepSheepLab/MieMie-Preset-Manager`。
- Extension / Product ID：`miemie.preset-manager`。
- 版本仅使用 `x.x.x`，不加 alpha、beta、build 或 hub.N 后缀。

正式产品需求见 [PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md)，协作规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。已有原型用于理解现状，不能用原型的限制替代正式需求。当前仓库尚无可复现构建或已验证安装包，安装与构建说明在源码 PR 中补齐。

## 兼容与数据原则 / Compatibility

1. 原始 Preset 对象 + 局部 Patch；保留未知字段、生成参数、模型配置、`prompts` 与所有 `prompt_order` 分组，不从缩水模型重建 JSON。
2. 导出仍为 SillyTavern 原生 Preset；无修改 Round Trip 和修改后的未知字段保留均须验证。
3. 预设切换、导入、复制必须改变并回读 ST 实际当前预设；排序写入实际 `prompt_order`。
4. Built-in / Marker 的编辑、关闭、解除挂接和删除遵循 ST 原生规则。
5. 保存成功且确认实际状态后才报告成功；失败、并发变化或不确定结果应明确提示并保留恢复依据。

兼容研究覆盖 ST 1.18.x / 1.19.x，以每个测试版本的源码、commit、Tavern Helper 版本和实机结果为依据。**当前未宣称上述版本已通过验收**。版本差异集中在 ST Adapter / Compatibility Layer，共用 Core、UI 与 Hub Adapter。

## 双模式与隐私 / Modes and privacy

无兼容 Hub 时使用独立 Launcher；兼容 Hub API v1 出现后注册并收起独立入口；Hub 退出后恢复，期间仅保留一个业务实例。手机触控、长按拖动及软键盘布局属于正式支持范围。

Prompt 正文默认在本地处理，不上传至 Registry、Hub Server、第三方分析或 AI 服务，不进行 Prompt 内容遥测。本地 ST 宿主的原生预设持久化属于必要的数据操作；Hub 只负责扩展入口，不读取完整预设。

## 授权 / Licensing

软件代码采用 **GNU General Public License v3.0 or later**（SPDX：`GPL-3.0-or-later`）。[LICENSE](LICENSE) 保留完整、未修改的 GNU GPL v3 正文；本说明明确“或任何后续版本”选项。软件不提供担保。

Software code is licensed under GNU GPL version 3 or, at your option, any later version, without warranty. Contributor authorship and copyright notices remain intact.

MieMie / 咩咩的品牌、Logo、角色形象和指定美术资产不自动纳入软件 GPL 授权。当前基础仓库不含这些素材，也不含 Contributor 的实现。品牌和素材声明不向 GPL 软件代码附加限制。

- [BRAND.md](BRAND.md)
- [ASSETS-LICENSE.md](ASSETS-LICENSE.md)
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

