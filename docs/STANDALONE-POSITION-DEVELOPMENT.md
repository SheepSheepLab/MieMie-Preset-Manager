# Standalone Native Position · Unreleased Development Fix

> 本文记录已验收的开发过程；本次内容纳入正式 0.7.0，当前发行范围以 [Release 0.7.0](RELEASE-0.7.0.md) 为准。

本轮在批量迁移与单条目自动分类合并候选上继续开发，正式 Git 基线仍为 `582d073fa3b039de36a634c277bc4a82ca813a1e`，未分配新正式版本。

## 根因与修复边界

旧 Standalone 每次入口点击都调用 `view.setPresentation('native')`。该初始化清理 left/top 等定位并临时执行 local viewport 居中；随后 Native Launcher 对已经显示的面板只聚焦，不重新运行定位动画。因此窗口保留了居中坐标。1512×950 的真实 Chromium 重复点击复现了 `(826,160)` → `(456,85)`，窗口大小不变、没有新展开动画。

`dual-mode.ts` 现在仅在隐藏入口初始化 Native Presentation；已显示窗口的重复打开不再调用 View.open，避免清几何、提前解除动画锁或重置编辑焦点。closing 状态仍排队执行真正的重新打开。`native-launcher.ts` 的已显示分支保留面板内现有焦点和输入选区；焦点在外部时仍可聚焦面板。

保持原先 Open 语义，不改为 Toggle；没有改写 UI、Native Floating Presentation、动画时长、业务 Controller、Binding、Generation Gate、保存、迁移或分类。没有接入 `registerNativeWindow()`，也没有修改 Hub。

## Hub 0.8.3

对照 Tag `d6486096a1dd54bbe7c0b62bf182faa84cbb1296` 的 Developer Guide、Extension API 与 Launcher Protocol：Native Window Ownership 是可选能力，现有 Surface/Shortcut 仍有效。Standalone 的显隐由本地 Launcher 管理；Hub 模式的显隐、焦点与生命周期继续由 Hub Surface 管理，Shortcut 的几何和动画由提供者执行。

实际官方 Hub 0.8.3 对已打开 Surface 再次 open 时会重新 place。悬浮球 hover scale 为 1.06，因此首次 repeat 可能按放大后的球边缘微调约 1.92px。旧合并候选与本轮候选的真实坐标序列逐项相同；这项既有行为单独记录，不冒充完全无位移，也不扩大本轮修复到 Hub。

## 回归与复现

- `npm test`：含 Standalone 重复打开不重新初始化 View 的 Core 回归。
- `PLAYWRIGHT_CHANNEL=chromium npm run test:standalone-position`：无 Hub 的生产展示代码，真实 Chromium 几何、inline style、状态、焦点、动画、左右 Dock、拖动、缩放、滚动、刷新及 Reduced Motion。离线 adapter，不是 ST。
- `PLAYWRIGHT_CHANNEL=chromium npm run test:presentation`：原有展示／固定 Hub 合约回归。
- `tests/standalone-position-realhost.cjs`：真实 ST 1.18/1.19、Tavern Helper、正式 Hub 0.8.3；需要 `POSITION_ISOLATED=yes`、`POSITION_CANDIDATE`、`POSITION_HUB`、`POSITION_REALHOST_OUT`，仅使用隔离 8538/8539。不得指向 Owner 日常数据。

移动端全尺寸面板或 Hub 前景菜单可能遮挡入口。测试正常收起 Hub 菜单再执行 Shortcut 实际点击；对实际 ST 手机宽度中被遮挡的球，重入事件明确标为程序触发，不作为物理手机点击证据。正式的点击、动画、状态检查与未执行范围见本轮独立交付报告及日志。


> 隐私历史迁移说明：文中涉及的提交标识已对应至迁移后历史；历史测试时间、结论及贡献归属保持原意，不表示重新执行了当时的验收。原始记录由维护者受保护保存。
