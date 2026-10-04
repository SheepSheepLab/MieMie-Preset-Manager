# MieMie Preset Manager 0.2.0

本阶段完成预设管理交互与 MieMie 官方应用 Presentation 的收口，以 **Pre-release** 发布。版本号为 `0.2.0`；Phase 1 深度验收仍在继续。

## Highlights

- Local Dirty Session 与统一保存：Prompt 修改先暂存，点击“保存修改”后才同步 SillyTavern。
- Prompt 实时本地拖动排序、Drag Ghost、requestAnimationFrame 更新与拖动防文字选中；Drop 不访问宿主。
- 分类支持连字符和冒号前缀，改进窄屏、横屏与低高度布局。
- 64px 正式 PNG Native Launcher，支持拖动、左右 Dock、位置比例保存、触控和键盘。
- Native Floating Presentation：Orb → Panel → Orb，加入 Header Hero Landing，并支持减少动态效果。
- 正式应用窗口、当前角色 Header、底部状态提示和保存图标绿点，对齐 MieMie 应用设计语言。
- Hub / Standalone / Shortcut 共用同一业务实例；重复点击已打开的 Shortcut 保持布局，正式关闭后可重新打开。
- 保留原始对象与局部 Patch、未知字段、所有 prompt_order 分组、保存回读及外部冲突保护。

## Editing workflow

Prompt 编辑器中的“保存”、排序、Toggle、复制、新增、解锁／挂接与删除先进入本地未保存状态。只有分类右侧的软盘保存图标才将修改统一写入酒馆并回读确认；有未保存内容时，图标底部显示绿色光点。

编辑器“取消”只丢弃该次输入。“重新读取实际状态”会先确认放弃修改，读取成功后恢复实际数据，失败保留本地修改。关闭管理器时可选择丢弃或继续编辑；切换、导入、复制或导出预设前需先处理未保存内容。

## Presentation

| 入口 | 展示与动画 |
| --- | --- |
| Standalone | Native Launcher，Orb → 应用窗口 → Orb |
| Hub Honeycomb | Hub Surface Motion |
| Hub Shortcut | Native Launcher presentation，由 Hub 管理 Surface 生命周期 |

三种入口共用一个 Controller、View 和面板，生命周期切换保留当前状态与草稿。正式 PNG 通过 `attachPanel` 的 `presentation.icon` 提供给 Hub；Manifest 中“预设”只是合法短文本 fallback。只有悬浮球确实位于内容前方并可能遮挡操作时才避让，面板在上层时保持卡片按钮对齐。

Native Launcher / Floating Presentation adapted from MieMie Polisher 1.2.1，固定 commit `5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1`，保留 GPL-3.0-or-later 来源说明及 louisSSR 的原始贡献历史。官方图标的美术授权与软件授权分别见仓库声明。

## Compatibility

目标兼容 **ST 1.18.x / 1.19.x**。固定源码自动验证基线为 **1.18.0 / 1.19.0**，宿主依赖使用模拟实现。

已有 Foundation 基础实机验收组合：**SillyTavern 1.18.0（commit `8172dcd0e`）+ Tavern Helper 4.11.2 + MieMie Hub 0.8.1 + Safari 26.6 / macOS 26.6**。该记录对应此前 Foundation 交付包，覆盖基础读写、刷新持久化、Standalone / Hub、草稿交接与单实例；不代表整个版本系列或 0.2.0 全部深度路径已实机通过。

## Known / remaining validation

[Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 继续 **Open**。ST 1.19 真实宿主、更完整 Round Trip / Unknown Fields、Built-in / Marker 边界、失败／并发深度实机、物理 iOS / Android 与软键盘及其余 Golden Path 仍待验收。

Built-in / Marker 的删除、解锁与复制保护目前比原生规则更严格。ST 后端不提供跨请求原子事务；完整导出包含原始连接及其他可能敏感的字段，应作为私人文件保管。此前 RH-01 曾出现一次 Hub 打开超时，根因未确认，后续同环境多次复核未再现，继续观察。

## Install

[MieMie-Preset-Manager-Extension-0.2.0.json](https://github.com/SheepSheepLab/MieMie-Preset-Manager/releases/download/v0.2.0/MieMie-Preset-Manager-Extension-0.2.0.json) 是可直接导入 Tavern Helper 的脚本，不是 SillyTavern third-party 目录扩展。升级前保存未提交编辑并备份脚本与重要预设，只启用一个安装实例。

Product / Extension ID 保持 `miemie.preset-manager`，发布 Script ID 保持 `98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1`。组件交付清单记录本版本与正式附件地址，不新增自动更新功能。

自动检查结果与最终 SHA-256 见 [validation-results.json](https://github.com/SheepSheepLab/MieMie-Preset-Manager/blob/v0.2.0/docs/validation-results.json)；真实宿主范围见 [REAL_HOST_VALIDATION.md](https://github.com/SheepSheepLab/MieMie-Preset-Manager/blob/v0.2.0/docs/REAL_HOST_VALIDATION.md)。

## Automated validation

类型检查和构建通过；Node 157/157、浏览器功能19/19、响应式9/9、UI/性能23/23、Presentation49/49、保存比较正确性8/8通过。B1/B2保护保持通过；Presentation无页面错误或外部网络请求。独立干净目录从锁文件安装并重建，JSON、component manifest、production/preview脚本四项逐字一致。以上自动证据不代替真实宿主深度验收。

## SHA-256

`MieMie-Preset-Manager-Extension-0.2.0.json`

```text
b735bb507e7315389afe0197c7c6b56f614e0cdfd87e13a2b5b8b32a0d97c0ca
```

`component-update-manifest.json`

```text
8898db4a27de6c06bd043c854d612c5d1722b5589afc6b58156dfbecfcdff030
```
