# 参与贡献 · Contributing

欢迎参与 MieMie Preset Manager（咩咩预设管理）。请先阅读 [README](README.md) 与正式需求基线 [PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md)。

## 协作流程

Issue → Contributor 认领 → Fork / Branch → Development → Pull Request → Review / Test → Maintainer Merge

- 社区 Contributor 在自己的 Fork 与工作分支中提交，并向官方 `main` 发起 PR；不需要 Admin 或直接写入权限。
- PR 对应明确 Issue，说明变化、验证结果和限制；维护者 SheepSheep 负责产品方向、最终验收与合并。
- 较大的产品调整先在 Issue 讨论；工程文件组织和内部接口可按研究证据判断，保持轻量协作。

## 现有原型与贡献归属

项目已有社区 Contributor 实现的 0.1.0 原型及标记 0.1.2 的兼容修订包。本阶段将原型纳入可维护、可构建、可验证的官方协作流程，不要求从零重写。

在 Contributor 回复 GitHub 账号并确认协作方式前，维护者仅准备文档与 Issue，不以自己的身份向正式仓库提交该实现源码或包含源码的 Extension JSON。首份实现优先由 Contributor 本人 Commit → PR 提交。

保留真实 Author、版权声明、Commit 和 PR 记录。合并时核对贡献归属，优先使用保留作者与提交记录的合并方式；不将他人提交重新包装为维护者自己的实现，也不通过错误的 Squash 署名抹去贡献。收到账号不自动构成由维护者代提交的授权。

## 产品与兼容边界

- 计划书是需求基线，原型是现状参考；原型未覆盖部分应记录为差距，不能静默降级要求。
- 共用 Core、UI、Hub Adapter，宿主版本差异集中在 ST Adapter / Compatibility Layer。
- 先研究 ST 与 Tavern Helper 实际源码和 API，记录版本、commit 与位置，形成 Compatibility Map。
- 保留原始对象并局部 Patch；覆盖全部 Preset、Prompt、顺序分组、未知及第三方字段。
- Built-in / Marker 遵守原生规则；分类仅是本地视图，不修改原始名称、标识、内容或顺序。
- Prompt 正文不发送至外部服务；Hub 不读取完整预设。仅使用获准公开的脱敏测试数据。
- 保存、回读、并发检测与失败恢复须保持一致，不能冒报保存或切换成功。

## 提交与验收

- 提交模块化源码、构建配置与锁文件、可复现构建步骤、Extension JSON、Compatibility Map / Notes、测试与已知限制。
- ST 1.18.x / 1.19.x 分别验证 read、save、switch、import、export、copy、prompt_order、Prompt edit、Toggle、Built-in / Marker 和 Round Trip，记录准确版本与 commit；不凭版本检测或 Mock 测试宣称整个版本系列兼容。
- 对照计划书第 25 节完成 Golden Path，包含手机触控 / 软键盘、Hub 加入 / 退出 / 再加入与单实例。
- 自动测试与真实宿主验证分别报告；未测项目明确标注，不虚构 CI 或检查通过。
- 不提交 Token、API Key、私有预设、会话数据、无关二进制或本地依赖。用于测试的 Extension JSON 应由源码可复现构建，交付位置在源码 PR 中约定。
- 软件代码沿用 [GPL-3.0-or-later](LICENSE)，品牌与素材见 [BRAND.md](BRAND.md) 和 [ASSETS-LICENSE.md](ASSETS-LICENSE.md)。第三方代码及素材记录实际来源、版本与许可，并更新 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
