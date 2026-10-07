# MieMie Preset Manager 0.2.2

Tavern Helper Script JSON · GitHub Extension Package v1 · Pre-release

## 功能

- **对话级预设绑定 · Phase A**：单人/群聊可独立选择预设；未独立选择时跟随全局默认。默认按钮与预设选择共用外框，其他对话独立选择保留。绑定使用稳定 ID，重命名保留，复制/新建生成新 ID；删除/缺失明确处理，同名重建不接管旧绑定。
- **生成安全**：原生 Chat Completion 在自动应用、未保存或尚未确认目标时阻止本次生成，确认后正常允许。晚到原生应用与快速聊天切换按最新对话协调，持续争夺停止重试；脏会话留在原预设，不写入新聊天。
- **预设参数设置**：列表顶部独立设置入口，可编辑上下文与回复长度、备选回复数量、温度、频率/存在惩罚、Top P、流式、请求思维链和推理强度。打开/取消不写入；确认先暂存，统一保存再原生写入和回读，保留未知字段和 Prompt/order。
- **正则显示**：仅在自动应用预设时，对已授权内嵌正则尝试原生可见消息重绘，减少重复重载提示；首次权限、手动选择和其他通知不变，无法安全刷新则保留原生提示，不保存/重写聊天内容。
- **统一界面**：清透紫主题，共框默认操作区，导出/复制收进更多菜单；参数窗口使用自定义推理选项、左右开关、宽底部取消/保存和只变形外框的展开/收回动画，支持减少动画。保留 Native/Floating/Dock、Hub/Standalone/Shortcut 与统一保存。

## 参数与默认

只修改原生 root 字段：`openai_max_context`、`openai_max_tokens`、`n`、`temperature`、`frequency_penalty`、`presence_penalty`、`top_p`、`stream_openai`、`show_thoughts`、`reasoning_effort`。

仅字段缺失且用户确认时补默认：上下文 2000000、回复 30000、温度 1、两项惩罚 0、Top P 0.9、流式 false、请求思维链 false、推理 auto。`n` 无额外缺失默认；已有 0/false/未知推理值不覆盖。实际模型和原生 context unlock 仍限制长度，不改变解锁标志。

## 兼容与验证

源码适配范围 ST 1.18.x / 1.19.x，启动能力检查失败会停止操作。固定原生契约针对 1.18.0 `51ad27fb86d39a3daca3adaa970375c9670c12df` 和 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`，方法体配合模拟依赖；不称为完整真实 ST 运行。完整 Generate/群成员循环/SSE、直接绕过 Generate 的扩展请求、ST 1.19 全宿主和物理移动软键盘仍待验收。

Owner 已认可本次本地功能和外观。历史 Foundation 实机仅适用于已记录的 ST 1.18.0 + Helper 4.11.2 + Hub 0.8.1 + Safari/macOS 26.6 组合及旧交付包，不扩大为新版全面实机、整个补丁系列或 Phase 1 完成。Issue #1 继续 Open。

- 全新锁文件安装、类型检查、294/294 Node、build：PASS。
- Package 专项：69/69（生产产物 13 + 原始上游 Hub 56）；额外当前 Hub Package 源码检查 13/13。
- 离线浏览器：功能 19、响应式 9、绑定 25、参数 32、外框动画 28、Presentation 49，共 162；页面错误 0。
- UI/拖拽 23、保存比较正确性 8：PASS。性能耗时仅本机诊断。
- 独立目录全新安装依赖后 build：四份发布资产、production JS 和 preview JS 共六个文件逐字一致。

原有 B1/B2 closePanel、未知字段/Raw Round Trip、Marker、编辑/复制/开关/解锁/挂接/删除/排序、分类、导入导出及复制/重命名、冲突/磁盘回读/失败恢复回归保留。测试结果和历史证据见 [Testing](TESTING.md)、[validation-results.json](validation-results.json)、[Real Host](REAL_HOST_VALIDATION.md)。

## Managed Package 与更新

Product ID `miemie.preset-manager`；固定 Script ID `98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1`；author `SheepSheep`；repository `https://github.com/SheepSheepLab/MieMie-Preset-Manager`；Hub API min/max 1/1。

Runtime API 与 Managed Install/Update 分开验证。使用完整官方 0.2.1 包验证启用/停用实例更新到 0.2.2，保留实例 ID、启用状态、data、文件夹/顺序及其他脚本，确认新内容、名称、内嵌 Runtime Manifest 和保存回读。旧包 digest 固定为 `071a97a35721688312f631e2c19b4eb6382edef64fef55d97a1573999d60d7c0`。宿主树和持久保存为隔离合成环境；不是实际 Helper/CORS/持久化实机通过。

发布后用 `tools/verify-public-package.cjs` 和当前官方 Hub Package 模块直接访问公开 GitHub API，检查最新版本 installable、四份 Asset digest、fresh install 和 0.2.1 更新。它不执行下载脚本、不修改真实宿主；在线最终结果由 Maintainer 发布回执记录。标准 Pre-release 三段版本参与 Hub 发现。

## 发布资产

- `MieMie-Preset-Manager-Extension-0.2.2.json`
- `MieMie-Extension-update.json`
- `manifest.json`
- `SHA256SUMS`

公开 Script `data={}`；不包含私人预设、Chat、settings、凭据或本地绝对路径。完整私人预设导出仍需用户自行保管。

Extension JSON SHA-256：`7ef1df562a850097212aba5fd322bdffe7ca50d7b6149002fe876ce440fbcd58`。

contentSha256：`8554806ae686992a77fdf63154f06308fa0241025da443889341eab3df971f3a`。

## Credits 与边界

SheepSheep 是 Founder / Project Initiator / official product author；SheepSheepLab 为官方开发、维护、发布命名空间。louisSSR 的真实原始 Commit Author、PR、Git 历史、贡献版权和 Credits 保留。代码 GPL-3.0-or-later，正式品牌素材按 BRAND.md 分开管理。

本次仅 Preset Manager：Hub/Registry 无修改，v0.2.0/v0.2.1 Tag、Release 和 Assets 保持原样，Issue #1 不关闭。
