# MieMie Preset Manager 0.5.0

2026-10-12 · Public Stable Release · `v0.5.0` · Draft=false · Pre-release=false

## Preset migration and merge

- 从其他已保存预设迁移条目到当前预设；来源预设始终只读。
- 单选直接核对，多选进入批量迁移确认；仅手动确认的项目进入待保存，跳过与不可迁移项目不会自动处理。
- 同名条目双栏对比，可手动编辑；“覆盖提示词”只修改目标正文，“覆盖全部属性”应用受支持属性并保留目标身份、原有列表位置及未覆盖的未知字段。
- 不同名条目新增，支持顶部、底部和现有分类最后一个已挂接条目之后插入；保留原始标题，生成新的条目标识。
- 多次确认累积到 Dirty / Pending。主界面 Unified Save 统一校验、写入和回读；取消当前草稿保留此前已确认修改。

## Interface and interaction

统一自定义选择框与滚动阴影、条目内容预览、整行状态反馈、桌面双栏和移动上下布局。分层对比、插入及批量窗口有展开／收起动画。优化迁移打开、长列表渲染及保存比较。支持 reduced motion。

修复 Standalone 模式中下拉框与父窗口同时响应 Escape：第一次只关闭下拉框、保留编辑并恢复焦点，之后按原有层级返回。此修复不解决 Hub 捕获阶段抢先处理 Esc 的已知冲突。

不发布无证据的“提升百分比”。本轮性能数据为合成环境 CPU／渲染诊断，不代表 Safari、酒馆 HTTP／磁盘或端到端真实延迟。

## Validation and evidence scope

升版前源码与 2026-10-11 Independent Release Gates 的 131 文件快照一致；重建 Candidate SHA-256 为 `f01bee47d422b3e47d0a6187d62eabd346fa07bb237356f734e50ec7d9fce3db`，与已验收包逐字节一致。MPM Hub Window Capture 补丁未包含。

2026-10-12 重新执行锁定依赖安装、类型检查、Core 403、Package 71 和全部正式浏览器专项共 518 项检查，均通过。额外完成 8 类保存比较正确性检查及 61／301／1001 行、各 6 轮、4x CPU 限速的迁移打开性能诊断。缺失浏览器运行时曾阻止启动，安装对应运行时后完整重跑通过，未降低断言。

Standalone Safari 的 15/15 真实 Computer Use 证据来自上述逐字节一致的 Candidate：迁移、批量、两类覆盖、手动编辑、插入、取消、累积、Unified Save、刷新、Native 回读和外部未保存修改保护。该历史证据被保留，未冒充本轮重新运行 Safari，也不是实体 iPhone 或完整 iOS 验收。

独立 Chromium 真实宿主：ST 1.19.0 (`7e8663cd9c184a550b37238218bdd32c6efc68e9`) + Helper 4.11.3 + 官方 Hub 0.8.2。正常入口、单实例、迁移、明确关闭、Pending、Shortcut、停用和重新接入检查通过；只有明确统一保存产生预期 Native 正文变化。Hub Runtime 保留已知例外，不称 Full Runtime PASS。

Managed Package 独立 Gate：未修改的官方 Hub 包管理模块完成 Discovery、Install、0.2.3→0.5.0 Update、Manifest/Digest/身份/版本校验及拒绝无效包。真实 Helper 的启用与停用实例均保留 Instance ID、Enabled、Script Data、Info、Buttons、Export、Folder/Order 和其他脚本，回读持久数据；启用路径确认实际运行 0.5.0。发布前使用隔离 GitHub 响应，公开 Discovery／资产及在线升级须在发布后另行核对。

正式升版后再次通过类型检查、Core 403 和 Package 73（含 17 项产物契约）。增加 stable 包与官方 0.2.3 升级的启用／停用契约检查。Production JS 与 Preview JS 相比已验收 Candidate 仅内嵌版本从 0.2.3 变为 0.5.0，业务实现完全一致。最终本地发行 Commit 必须在 Push 前通过锁定依赖的独立干净 Checkout 构建，并逐字节比对四份包资产、Production JS、Preview JS；构建及发布后回执保留在发行执行报告。

## Known issues and release exceptions

**Hub Escape Layer Conflict — Owner Accepted Known Issue。** Hub 可能抢先处理 Esc 并关闭整个面板，导致尚未确认的编辑草稿丢失。暂请使用明确的返回、取消、关闭按钮。未发现已保存 Native 数据损坏。Owner 接受本次发布，后续由 Hub 统一实现 Escape / Back Navigation Protocol；本版不修改 Hub。

**iOS Simulator — Tool Blocked / NOT TESTED。** 剩余多选／批量、两种覆盖、身份与位置 Esc、软件键盘、Unified Save／刷新及完整生命周期验收因 Computer Use 连接问题尚未完成。Owner 接受该测试缺口；不宣称完整 iOS 或实体 iPhone 验证通过。详见 [Known Issues](KNOWN-ISSUES.md)。

## Package, identity and upgrade

下载 [MieMie-Preset-Manager-Extension-0.5.0.json](https://github.com/SheepSheepLab/MieMie-Preset-Manager/releases/download/v0.5.0/MieMie-Preset-Manager-Extension-0.5.0.json)，由 Tavern Helper 导入；保持只有一个启用实例。Hub 标准 Package v1 支持从正式 0.2.3 托管升级。保留备份，并核对升级后的实例设置。

- Product Author: SheepSheep
- Repository: https://github.com/SheepSheepLab/MieMie-Preset-Manager
- Product ID: `miemie.preset-manager`
- Script ID: `98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1`
- Hub API: `1`
- Assets: Script JSON、`MieMie-Extension-update.json`、`manifest.json`、`SHA256SUMS`

louisSSR 的真实 Contributor、原 Commit Author、PR #2、Git History、Copyright 与 License 保留；不将 Contributor 自动加入产品 author。代码 GPL-3.0-or-later；官方品牌与保留图像资产仍分别遵循 [BRAND](../BRAND.md) 和 [ASSETS-LICENSE](../ASSETS-LICENSE.md)。旧 Release、Tag 和资产不替换。
