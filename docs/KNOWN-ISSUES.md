# Known Issues · v0.5.1

## Hub Escape Layer Conflict — Owner Accepted Known Issue

在官方 MieMie Hub 0.8.2 中，Hub 的 document capture 监听可能先处理 Esc，提前关闭整个 Hub Surface。特别是在迁移的同名对比、身份选项等嵌套编辑场景中，尚未确认的编辑草稿可能丢失。已确认的 Pending 在已测路径中保留；没有观察到已保存 Native 数据损坏，不将本问题描述为 Native 数据损坏。

临时请使用工具界面中明确的“返回”“取消”“关闭”按钮，并在确认修改后按需统一保存。Standalone 已包含自己的 Escape 层级修复，但这不解决 Hub 先处理按键的冲突。

Owner 于 2026-10-12 明确接受该问题用于 v0.5.0 发布，并继续接受其作为 v0.5.1 Patch Release 的已知限制，不将其标记为 PASS，也不宣称 Full Hub Runtime PASS。后续由 Hub 统一开发 Escape / Back Navigation Protocol，官方工具再逐步适配。本版没有 MPM Window Capture Hub Escape Workaround，也没有修改 Hub。

## iOS Simulator — Tool Blocked / NOT TESTED

本次迁移功能的剩余多选／批量、两种覆盖、身份与位置 Esc、软件键盘、Unified Save／刷新及完整生命周期路径，因 Computer Use 连接失败、noWindowsAvailable／锁屏等工具问题尚未完成，保持 NOT TESTED。Owner 已接受这一明确测试缺口用于本次发布；它不是测试通过。

桌面 Safari 的窄视口验证及离线 Chromium 响应式测试不等于 iOS Simulator 验收。没有宣称完整 iOS 验收通过，也没有验证实体 iPhone。历史 0.2.3 移动端证据仅适用于其原版本与范围。

## Compatibility and data boundaries

ST 1.18.x / 1.19.x 使用能力检查与版本固定的原生契约测试；当前代表性真实桌面宿主为 ST 1.19.0 + Tavern Helper 4.11.3。未穷尽所有补丁版本、第三方扩展组合或物理移动设备。

迁移始终使用原有 Dirty / Pending / Unified Save 路径，不绕过原生未保存修改保护。含未知引用或无法安全迁移的条目会保守拒绝，不通过删除未知字段强行迁移。来源预设只读，保存前建议保留可恢复备份。

仅前述 Hub Esc 与 iOS 工具阻断获本次发布例外；其他功能、数据安全及包验证失败不在豁免范围内。
