# MieMie-Preset-Manager API2 新版发行说明草稿

未分配正式新版版本号，未发布；不得用本候选替换任何已发布 Asset。版本、Tag 与正式附件须 Owner 单独批准后从最终源码重新构建、计算 hash 并验收。

- 最低 Hub Runtime 要求：**Extension API2（Hub 0.9.0）**。新版不维护 API1 Runtime、Shortcut 或兼容包装层；不自动降级。
- Standalone 保留；蜂窝与 Native 入口共用一个 Hub 业务 Session，原生窗口交互由本扩展控制。
- Manifest／Managed Package／Machine Metadata／Build Identity Schema 保持 1；Package 身份和完整性验证、已有用户数据与设置保护保留。
- Escape 的 IME 保护覆盖 isComposing 与 keyCode 229；真实系统输入法范围与回归见 [Testing](TESTING.md#api2-pre-main2026-10-20)。

隔离 Runtime 与 Managed Package 已测范围分别记录在 [API2 接入](HUB-API2.md) 和 Testing；机器校验不代替 Runtime、新版持久保存或生产在线验收。生产 Registry API2、Origin／OAuth、正式新资产、正式在线安装更新、物理移动 Safari、真实外部模型服务及 Owner 手验仍 Pending。
