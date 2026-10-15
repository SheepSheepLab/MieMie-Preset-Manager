# Batch Migration UX · Local Development Candidate

> 本文记录已验收的开发过程；本次内容纳入正式 0.7.0，当前发行范围以 [Release 0.7.0](RELEASE-0.7.0.md) 为准。

基于正式 `v0.6.0` / `582d073fa3b039de36a634c277bc4a82ca813a1e`。本次未分配正式版本，不修改已有 Release。本说明描述未发布的开发改动。

## 产品流程

- 单选沿用原有路径：无同名选择位置；同名选择目标、对比与合并。
- 多选包含可安全新增的条目时，先统一选择顶部、底部或分类末尾，再进入批量确认。无同名项自动生成 Insert Plan，显示「已准备新增」，没有逐项核对或跳过按钮。
- 多选全部同名时直接进入批量确认。同名项仍可手动编辑、覆盖提示词、覆盖全部受支持属性、修改方案或跳过；不支持同名另存新增。
- 所有待处理同名项都必须确认或跳过；全部跳过／不可迁移时，不能确认空批次。不可迁移项明确显示原因及本次不迁移说明。
- 来源内部出现目标不存在的重复标题，在进入批次前要求重新选择、只保留一项；既有同名多目标流程和重叠目标原子拒绝保护保持。
- 批量确认页顶部可返回修改统一位置。只更新自动新增计划，保留已完成的同名方案和来源选择；取消位置编辑保留之前确认的位置。
- 确认迁移只原子暂存 Pending；仍通过主界面保存修改。来源只读，保留来源 Fingerprint、目标 Revision、外部 Conflict、未知字段和原生分组保护。

## 实现边界

复用 BatchItem / MigrationPlan，新增 `ready` 状态和 `batch-position` 步骤。`insertionSource()` 抽取原有新增资格检查，避免批次预检逐项克隆完整目标；实际暂存继续走 `checked()` / `applyMigrationPlans()`。

复用现有 centeredMotion / motion-shell。位置窗口关闭完成后再展开批量确认，使用 Animation.finished 而非固定延时。批次行按 sourceId 保留 DOM，仅更新变化项；隐藏批次不随编辑输入重建。没有第二个业务实例、持久化路径、全局键盘拦截或 Hub 源码改动。

## 重跑

```sh
npm run check
npm test
npm run build
PLAYWRIGHT_CHANNEL=chromium npm run test:migration-unified
PLAYWRIGHT_CHANNEL=chromium npm run test:migration-batch-layer
PLAYWRIGHT_CHANNEL=chromium npm run test:migration-dialog-focus
npm run test:package-v1
node tools/export-development-candidate.cjs /absolute/output/MieMie-Preset-Manager-Batch-Migration-DEV.json
```

`export-development-candidate.cjs` 要求先构建，强制输出名以 `-DEV.json` 结尾，脚本名称和说明明确标注开发候选。包内部保留基线版本及正式身份；这不是新版本分配或可发布的 0.6.0 替换包。

真实宿主脚本 `tests/migration-unified-realhost.cjs` 需要显式 `UNIFIED_ISOLATED=yes`、`UNIFIED_CANDIDATE`、`UNIFIED_REALHOST_OUT`，只用于独立 8538/8539 测试实例。不得指向日常数据。测试使用真实 Helper、原生保存及完整对象回读，允许通过原生 saveSettings 等待测试设置持久化。实际新功能操作通过生产 UI 完成。

## 验证范围

本轮结果及最终候选 SHA 以独立输出的 Development & Validation Report 和原始结果文件为准。Core 新增 19 项，并保留原有 408 项；旧批量测试适配统一位置和严格待处理门槛，保留原安全断言。浏览器专项覆盖 PC、390/320、短窗口、横屏、visualViewport 125% 缩放、长标题／合法长分类、Reduced Motion、逐帧动效、返回、Esc、快速重开及大批次。虚拟键盘仅模拟可视高度，不能代表物理 iOS 键盘。

Hub Runtime 与 Managed Package 分别验证。未发布，因此不进行公网新版本在线安装／升级验收。Hub Esc 既有问题仍属 Hub 项目。

## 单条目自动分类调整

合并开发候选取消分类至少两项的限制：一个合法前缀条目即可显示分类。prefix 解析、24 字限制、装饰符、Emoji、大小写和宽松括号行为保持不变；禁用和未挂接条目仍参与分类。分类末尾迁移仍需要活动顺序锚点。复制、UI 和批量迁移实现未改动。


> 隐私历史迁移说明：文中涉及的提交标识已对应至迁移后历史；历史测试时间、结论及贡献归属保持原意，不表示重新执行了当时的验收。原始记录由维护者受保护保存。
