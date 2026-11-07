# MieMie-Preset-Manager 0.8.0 — 发行说明草稿

Owner 已批准下一正式版本为 **0.8.0**，预期 Tag `v0.8.0`；当前为未发行候选，尚未创建 Tag／Release 或上传 Assets。正式附件由当前源码构建并重新核验大小、双 hash 与机器身份，不替换旧版已发布 Asset。

- 最低 Hub Runtime 要求：**Extension API2（Hub 0.9.0）**。新版不维护 API1 Runtime、Shortcut 或兼容包装层；不自动降级。
- Standalone 保留；蜂窝与 Native 入口共用一个 Hub 业务 Session，原生窗口交互由本扩展控制。
- Manifest／Managed Package／Machine Metadata／Build Identity Schema 保持 1；Package 身份和完整性验证、已有用户数据与设置保护保留。
- Escape 的 IME 保护覆盖 isComposing 与 keyCode 229；真实系统输入法范围与回归见 [Testing](TESTING.md#api2-pre-main2026-10-20)。

隔离 Runtime 与 Managed Package 已测范围分别记录在 [API2 接入](HUB-API2.md) 和 Testing；机器校验不代替 Runtime、新版持久保存或生产在线验收。生产 Registry API2、Origin／OAuth、正式新资产、正式在线安装更新、物理移动 Safari、真实外部模型服务及 Owner 手验仍 Pending。

## 本版范围与恢复

本版收口已实现的 API2 适配与版本身份同步，不重做业务实现或用户数据模型。更新前保存编辑、停止生成并保留可恢复脚本／业务备份；通过 Package v1 原地更新时分别核对安装实例、用户名称、data、文件夹／排序、启用、服务器保存和新 Runtime 版本。代码恢复优先在原条目恢复经核验的 content／name，保留此后的用户数据，不自动回滚外部业务存储或导入双实例。

测试与 SHA-256 以本版最终构建回执为准，不能使用先前同版内部候选或旧发行包的 hash。已发布版本及历史验收继续保留原范围，未把旧 Hub 向后兼容增加为新版发行条件。
