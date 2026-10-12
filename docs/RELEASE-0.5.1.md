# MieMie Preset Manager 0.5.1

2026-10-12 · Public Stable Patch Release · `v0.5.1`

## Changes since v0.5.0

- 查看条目内容时，“返回迁移”不再默认高亮；初始焦点进入窗口容器，Tab 等键盘导航仍保留可见的焦点反馈。
- 窄屏预览按迁移主页面宽、高各 95% 居中显示，留出父页面边缘；尺寸跟随实际视口、安全边距及旋转更新，正文独立滚动。
- 宽屏来源条目预览位于左侧，目标条目预览位于右侧，并显示来源／当前预设提示。定位依据条目身份，不依赖用户回忆。
- 预览复用“对比与合并”的中心展开／收起动画：260ms 打开、180ms 关闭；支持 Reduced Motion。父页面保持可见但不可交互，关闭后恢复正确层级与焦点。
- 补充快速反复开关、嵌套同名目标查看、视口变化、关闭及 Dispose 的回归检查。

这是 0.5.0 的预览展示补丁。单项／批量迁移、正文与属性覆盖、分类插入、Dirty / Pending、Unified Save、未知字段保护、原生冲突、Per-Chat Binding 与 Generation Gate 均沿用原实现，没有改变原生预设数据结构，也没有新增 Hub 按键抢占补丁。

## Verification and acceptance

Owner 已完成当前 0.5.1 Candidate 的人工功能与 UI 验收。Candidate 文件 SHA-256：`da305c6e574a857ea7f6cd4acc1456561ab3c66f0e16b9252df54994adac1ad8`；Script Content SHA-256：`aab6435b773c28b76e77cf65ca3c13e602090b0b450ea56012ace130df3b50cf`。本轮从当前源码重建，文件与实际业务 JavaScript 均逐字节一致；不是将 Candidate 改名后发布。

本轮重新执行 `npm ci`、类型检查、Core **403 PASS**、Package **75 PASS**，以及 package.json 的全部适用 Browser / Migration / Presentation / Binding / Parameters / Performance 测试。浏览器检查合计 **547 PASS**，包含新增预览窗口的 29 组回归；性能命令另外记录诊断样本，不将其累计为端到端性能提升百分比。Package 新增正式 0.5.0 → 0.5.1 的启用／停用升级契约。

本轮没有新的 Safari Computer Use 验收，也没有新的 iOS Simulator 全面验收。Owner 人工验收是此次 UI 发布的接受依据，隔离 Chromium 检查不冒充 Safari 实机结果。

### Hub Runtime — separate gate

隔离真实 ST 1.19.0 + Tavern Helper 4.11.3 + 官方 Hub 0.8.2 的 Chromium 宿主验证 Standalone、Hub、Hub Shortcut 的来源／目标预览、正常返回、单实例、Surface 生命周期、Dirty / Pending，以及 Hub 停用、重新接入和统一保存的预期原生数据变化。非豁免路径通过；Hub Esc 按下文记录，不能称 Full Hub Runtime PASS。

### Managed Package — separate gate

独立检查 Discovery、Install、Manifest、Digest、Script / Product ID、Runtime Version，以及正式 0.5.0 → 0.5.1 升级。启用与停用实例均核对 Instance ID、Enabled、Script Data、Folder / Order、Info / Buttons / Export 与其他脚本保留。发布前使用隔离 GitHub 响应和真实 Helper 持久读回；公开 Latest、资产 hash 与在线升级在发布后另行核验，发行执行报告分别记录两类证据，不将 Runtime 接入等同于在线包升级。

正式资产由最终源码构建。Push 前使用最终发行 Commit 的独立干净 Checkout、锁定依赖重建，对比四份正式资产及 Production JS / Preview JS 的字节一致性。

## Known issues and limits

**Hub Escape Layer Conflict — Owner Accepted Known Issue。** 官方 Hub 可能先处理 Esc、关闭整个面板并丢弃尚未确认的编辑草稿。暂请使用界面上的返回、取消和关闭按钮。该项不是 PASS，继续等待 Hub 的统一 Back Navigation Protocol；本版不修改 Hub，也不添加 MPM Window Capture 抢占逻辑。

**iOS Simulator — Tool Blocked / NOT TESTED。** 0.5.0 已披露的剩余专项工具验收缺口继续保留；没有把未执行的项目标为通过，也不宣称实体 iPhone 或完整第三方环境覆盖。Owner 接受这两项明确限制用于本次补丁发布；新的功能、数据安全、身份或包验证失败不在豁免范围。详见 [Known Issues](KNOWN-ISSUES.md)。

## Install and identity

下载 [MieMie-Preset-Manager-Extension-0.5.1.json](https://github.com/SheepSheepLab/MieMie-Preset-Manager/releases/download/v0.5.1/MieMie-Preset-Manager-Extension-0.5.1.json)，通过 Tavern Helper 导入；或通过兼容 Hub 从正式 0.5.0 托管升级。保留可恢复备份，只启用一个实例。

- Product ID: `miemie.preset-manager`
- Script ID: `98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1`
- Product Author: SheepSheep
- Official repository / maintenance / release namespace: SheepSheepLab
- Hub API: `1`; code license: `GPL-3.0-or-later`
- Assets: Extension JSON、`MieMie-Extension-update.json`、`manifest.json`、`SHA256SUMS`

保留 louisSSR 的真实社区贡献者身份、提交作者、PR、Git 历史、版权与许可来源，不重新署名其代码，不改变正式产品图标。软件和保留视觉素材分别遵循 [LICENSE](../LICENSE)、[BRAND](../BRAND.md) 和 [ASSETS-LICENSE](../ASSETS-LICENSE.md)。所有历史 Tag、Release 与已发布资产保持原样。
