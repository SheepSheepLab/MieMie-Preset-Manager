# MieMie Preset Manager 0.7.0

咩咩预设管理 0.7.0 简化批量条目迁移，让单个条目即可形成分类，并修复独立窗口重复打开时跳到屏幕中央的问题。

## 批量迁移体验优化

- 多个无同名条目只需统一选择一次插入位置，安全条目自动准备，无需逐条核对。
- 部分同名时，仅同名冲突需要人工核对或跳过；全部同名时，直接进入批量核对。
- 保持来源顺序，支持顶部、底部与有效分类末尾；继续保护同名、来源重复标题及不可迁移条目。
- 确认批次后进入未保存修改（Pending），最后仍通过“保存修改”统一写入酒馆。未知字段、原生条目身份和其他顺序分组保留。

## 单条目自动分类

符合已有标题规则的单个条目现在即可显示分类，方便建立分类后直接使用“复制条目”继续制作。原有标题格式、识别规则和分类插入位置安全检查不变。

## 独立窗口定位修复

修复已打开窗口再次点击独立悬浮球后突然居中的问题。保留 520ms 展开、460ms 收回、Header Hero Landing、焦点与编辑草稿，以及系统减少动画设置。重复点击继续采用“打开”语义，不改为开关切换。

## 兼容与升级

继续支持 SillyTavern 1.18 / 1.19、真实 Tavern Helper，以及 Standalone、Hub 0.8.3 Surface 和 Shortcut。每聊天独立绑定、原生双向同步、生成安全、Dirty / Pending / Unified Save 是已有能力，本版继续保留。

**从 0.6.0 升级会保留有效的 binding-v2 聊天绑定。** 0.5.1 旧绑定不迁移的历史规则不适用于这次升级。请保留 Hub 更新流程生成的恢复文件，只启用一个预设管理实例。

本版继续使用 Extension API v1 与 Package v1；未接入可选的 Native Window Ownership，不代表已完成该能力适配。

## 验证范围

发布前对正式 0.7.0 重新执行类型检查、正式构建、Core 436 项、Package 77 项以及 21 个浏览器／性能测试命令。浏览器具名功能回执 596 项；保存比较和性能采样另计，不重复累计。

已验收开发源码重建与指定 Candidate 字节一致，升版本不改变业务逻辑。真实 ST 1.18.0 / 1.19.0、Tavern Helper 4.11.3 的每版 66 项复合场景以及 Safari ST 1.18 代表性验证，引用该开发 Candidate 的独立验收，不冒充正式版本的新运行日志。Hub Runtime 与 Managed Package 分别验收；正式公网安装／更新须在发布后实际验证，结果以发行执行报告为准。

## 已知限制

- Hub Shortcut 首次重复打开可能随悬浮球悬停变化微调约 1.92px；属于既有锚点行为。
- 390px 窄屏中，打开的面板可能盖住其后的独立悬浮球；仍可使用面板“返回”正常关闭、再打开。
- Hub Esc 层级冲突仍存在，建议使用界面返回、取消、关闭按钮。
- 社区“42 层后失效”和特定角色卡正文隐藏尚缺完整复现材料；不宣称解决所有相关反馈。
- 物理手机、真实模型供应商组合及完整 Safari 跨浏览器矩阵未全部验收。

## 正式文件与身份

脚本：`MieMie-Preset-Manager-Extension-0.7.0.json`

SHA-256：`442cfe8416c8781dae1e0551644ad3b5d9c783d3d53045a00e168d47fc499f5e`

四个附件：脚本 JSON、`manifest.json`、`MieMie-Extension-update.json`、`SHA256SUMS`。

Product ID：`miemie.preset-manager`；Script ID：`98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1`。

产品 Author / Founder：SheepSheep；官方维护与发布命名空间：SheepSheepLab。保留 louisSSR 等实际贡献者的真实 Git / PR 历史、版权与许可来源。软件采用 GPL-3.0-or-later，品牌与指定素材遵循 BRAND 和 ASSETS-LICENSE。
