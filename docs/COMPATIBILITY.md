# SillyTavern Compatibility Notes · 0.2.3

目标范围为 ST `1.18.x` / `1.19.x`，固定源码、自动契约与真实宿主分别记录。历史 ST 1.18.0 + Helper 4.11.2 + Hub 0.8.1 + Safari 26.6 / macOS 26.6 Foundation 通过，只覆盖当时的 0.1.2 包。2026-10-08 汇总正式 MPM 0.2.3 + ST 1.19.0 commit `7e8663cd9c184a550b37238218bdd32c6efc68e9` + Helper 4.11.3 的代表性桌面及 iOS Simulator Mobile Safari 验收。Source Verification / Automated Contract / Representative Real Host：PASS；整个 1.19.x 补丁与第三方生态矩阵：NOT VERIFIED。范围见 [Real Host Validation](REAL_HOST_VALIDATION.md)。

## Owner-approved compatibility principle · 0.2.3

MieMie 优先兼容 SillyTavern 原生数据格式、数据完整性、externally observable contracts 和 Runtime / API / Event 行为语义；不要求机械复制其 UI 或内部实现。在保持 interoperability 的前提下，可提供更安全、更简单的产品交互。这是 Owner 在固定源码研究后对 Phase 1 需求的正式澄清。

该原则与独立 Prompt 操作资格已纳入 0.2.3，Owner 已验收当前 Candidate。当前验证见 [Release 0.2.3](RELEASE-0.2.3.md)；历史发行与实机记录保留其原范围，不扩大为整个 Phase 1 完成。

## 固定来源

| 组件 | 固定版本／commit | 证据用途 |
| --- | --- | --- |
| SillyTavern 1.18.0 | `51ad27fb86d39a3daca3adaa970375c9670c12df` | API、原生方法、Default 夹具 |
| SillyTavern 1.19.0 | `7e8663cd9c184a550b37238218bdd32c6efc68e9` | API 差异及原生方法 |
| SillyTavern 1.19.0 源码交叉基线 | `06bde939fb1e9c4c8d8641d810f0a916b5bce127` | Default 夹具及交叉检查；涉及的目标文件与 1.19.0 标签一致 |
| Tavern Helper 4.10.0 源码 | `e9aa5ba146d0f13b7a26742c26dd04d9132a30da` | `builtin.promptManager` 与预设转换实现的源码来源；不是已测试的运行版本 |

原生片段夹具记录 commit、文件、行号和源文件 SHA-256，见 [fixtures](../tests/fixtures/README.md)。测试执行其中的方法体，DOM、HTTP 和事件依赖使用模拟实现；没有启动真实 ST 服务或 Tavern Helper iframe。Tavern Helper 的版本号来自固定提交的 [package.json](https://github.com/N0VI028/JS-Slash-Runner/blob/e9aa5ba146d0f13b7a26742c26dd04d9132a30da/package.json)。

## 1.18 / 1.19 实际差异

所有差异集中在 `st-adapter.ts`，Core、UI 和 Hub 生命周期共用。

| 能力 | 1.18.0 | 1.19.0 | Adapter 行为 |
| --- | --- | --- | --- |
| `selectPreset(value)` | 返回 `void`，触发异步 change | 返回 Promise，等待原生应用 | 先订阅完成事件，再调用；两版都等待匹配事件，并等待可能返回的 Promise |
| `getPresetApplicationPromise()` | 不提供 | 提供 | 不列为共同必需接口，不在 iframe 重载宿主模块 |
| 应用事件 | BEFORE → 设置应用 → AFTER → `PRESET_CHANGED` | 相同时序，数据均为 `{apiId, name}` | 检查 API、目标名、当前选择与切换代次 |
| `updateList(name, raw)` | 同步返回，异步应用 | 相同 | 共用完成事件等待逻辑 |
| `savePreset(name, raw, {skipUpdate:true})` | 接受完整对象，先保存 | 实现相同 | 保存、磁盘回读确认后，再应用到当前设置 |
| 读取／保存／删除端点 | `/api/settings/get`、`/api/presets/save`、`/api/presets/delete` | 对应实现相同 | 共用完整 JSON 和失败恢复流程 |
| `pollinations_endpoint` | 无对应 live 字段 | 有对应 live 字段 | 1.18 不用于 live 比较，原始保存和导出仍保留 |
| `proxy_password` | 旧 DOM selector | DOM selector 更名 | 数据键未变，不依赖此 DOM，无需分支 |
| 三个 Google / Vertex preview 模型名 | 保留原名 | 原生迁移为稳定名 | 仅在 1.19 live 比较时投影，磁盘和导出保持 raw |
| PromptManager、Marker、高级字段和活动组 | 目标源码一致 | 目标源码一致 | 共用模型与 UI |

两版 `settingsToUpdate` 分别有 102 和 103 个键，唯一新增的 raw 键为 `pollinations_endpoint`。模型名比较仅覆盖 `google_model` / `vertexai_model` 的 `gemini-3.1-flash-lite-preview`、`gemini-3.1-flash-image-preview`、`gemini-3-pro-image-preview` 到对应去掉 `-preview` 后缀的名称。其他连接字段和实际用户修改仍参与冲突检查。

源码依据：

- [1.18 选择方法](https://github.com/SillyTavern/SillyTavern/blob/51ad27fb86d39a3daca3adaa970375c9670c12df/public/scripts/preset-manager.js#L411)、[1.19 选择方法](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/preset-manager.js#L415)。
- [1.18 应用时序](https://github.com/SillyTavern/SillyTavern/blob/51ad27fb86d39a3daca3adaa970375c9670c12df/public/scripts/openai.js#L4898)、[1.19 应用时序](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/openai.js#L5009)。
- [1.18 字段映射](https://github.com/SillyTavern/SillyTavern/blob/51ad27fb86d39a3daca3adaa970375c9670c12df/public/scripts/openai.js#L298)、[1.19 新字段](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/openai.js#L345)、[1.19 模型迁移](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/openai.js#L4280)。

## 原生数据与操作约定

| 操作 | 实现 | 边界 |
| --- | --- | --- |
| 读取 | 原生 context，加同源 `/api/settings/get` 磁盘读取 | 保留完整 raw；不依靠 DOM 文本推断状态 |
| 切换 | 订阅事件、调用原生选择、等待完成、核对当前名称 | 外部切换或 live 修改使旧操作失效；支持超时与停用清理 |
| 保存 | 显式传完整 raw，`skipUpdate:true`，磁盘核对，再应用 | 不用原生白名单重建结果代替完整对象 |
| 导入／复制 | 验证、唯一名称、保存完整 raw、回读、原生应用 | 不静默覆盖同名文件；复制不修改来源 |
| 导出 | 序列化磁盘核对后的完整 raw | 不补默认值，不移除未知或敏感连接字段 |
| 重命名 | 保存新名称、回读、切换、再次核对旧文件、删除旧文件 | 多请求操作；可能新文件已保存而旧文件未删除，明确报告部分成功 |
| 删除预设 | 切换到保留项、再次核对目标、原生删除、确认磁盘不存在 | 原生缓存先于 HTTP 结果变化；仅在选择和 live 值未改变时恢复失败缓存 |

两版原生 `getChatCompletionPreset()` 都按白名单重建顶层字段，所以本工具不把它用于完整持久化。Tavern Helper 的简化预设转换也会重建 Prompt 和分组，因此通过其 `builtin.promptManager` 访问宿主已有能力，不用转换模型保存。所用的是宿主已有模块，不在脚本 iframe 导入另一份核心模块。

相关原生依据：[完整对象保存](https://github.com/SillyTavern/SillyTavern/blob/51ad27fb86d39a3daca3adaa970375c9670c12df/public/scripts/preset-manager.js#L466)、[服务端写入](https://github.com/SillyTavern/SillyTavern/blob/51ad27fb86d39a3daca3adaa970375c9670c12df/src/endpoints/presets.js#L42)、[磁盘读取](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/settings.js)、[原生白名单保存](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/openai.js)、[Helper 原生对象暴露](https://github.com/N0VI028/JS-Slash-Runner/blob/e9aa5ba146d0f13b7a26742c26dd04d9132a30da/src/function/builtin.ts)、[Helper 预设转换](https://github.com/N0VI028/JS-Slash-Runner/blob/e9aa5ba146d0f13b7a26742c26dd04d9132a30da/src/function/preset.ts)。

`prompts` 存定义，`prompt_order[].order` 存引用与开关。当前只编辑宿主全局策略的 `100001` 活动组，保留其余组。解锁只移除活动组引用，保留定义，不改 `system_prompt` 或 `forbid_overrides`。永久删除可删除的自定义条目时，清理所有组的该条目引用；其余内容保留。

Role 为 `system` 不等于内建删除锁。Prompt 操作使用独立资格，不能用一个删除资格同时控制三个动作。`chatHistory` / `dialogueExamples` 可切换但不编辑文本；允许进入编辑器的 Marker 内容仍不可更改。高级属性包括 `injection_position`、`injection_depth`、`injection_order`、`injection_trigger`、`forbid_overrides`，未知值和其他字段继续保留。规则依据：[PromptManager](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/PromptManager.js)。

## Prompt Copy / Detach / Delete 正式政策

- **Edit / Toggle**：固定官方 ST 1.18.0 / 1.19.0 的既有原生规则不变。Marker 内容不可作为普通文本编辑。未假设第三方 `toggleDisabled` 配置。
- **Copy**：MPM 自己提供的便利功能，原生没有一一对应的单 Prompt Copy。只允许 `system_prompt === false`、非 Marker、非 protected/native ID 的普通自定义 Prompt。复制完整字段及深层未知字段，生成新 UUID，保留 order metadata，放在原条目之后；不复制其原生身份语义。
- **Detach / Unlock**：对齐两版固定原生 `isPromptDeletionAllowed()` 的挂接资格：严格 `system_prompt === false`。即使 `marker === true` 或使用 protected/native ID，也允许从当前活动组解除挂接，前提是 raw 有效且实际存在引用。只移除当前组的引用；definition、identifier、content、其他组及未知字段不变。
- **Delete**：Owner 批准的保守破坏性政策。只允许普通自定义 Prompt，继续保护 Marker、protected/native ID 与 `system_prompt === true`，缺失 `system_prompt` 也不放行。先 Detach，再确认物理删除；删除目标 definition 并清理所有组的目标引用，保留无关 entries、metadata、连接／生成设置及未知字段。

`copyable`、`detachable`、`deletable` 分别驱动 Row 和按钮；UI 的 Detach 能力还要求当前组已挂接。所有修改仍暂存于 pendingRaw，只有统一保存才写入宿主。Prompt Delete 与整个 Preset Delete 的 Binding tombstone / fallback 流程独立。

两版固定 PromptManager.js SHA-256 均为 `b0054793b763d92b265f5f487645b68b4eca0867cb5ad6b5deb1034004b2c1cc`。本轮夹具重新摘取 eligibility、detach 与 collection 方法体，检查特殊条目 Detach 的结果与原生一致；依赖为模拟实现，尚不代表完整真实宿主生成通过。

## 本地统一保存候选（方案 B）

本轮 Maintainer 反馈后批准改为本地暂存，不再每次条目操作都同步酒馆。原始已确认 Snapshot 不变，局部修改单独保留；排序只复制发生变化的 order 数组／分组，保留未变化的 Prompt 正文、其他分组与未知元数据。编辑只复制被编辑的 Prompt，组件保留已完成的阴影隔离、分类宽度、拖动帧布局与卡片节点缓存优化。

分类行按“新增条目｜分类｜保存与重新读取”排列，两处竖线分隔；“保存修改”使用软盘 SVG 图标并保留提示文字；只有实际改动才启用保存。编辑窗口内保存仅暂存，编辑取消仅撤回该窗口的输入。重新读取有未保存修改时先确认，成功取得真实快照才丢弃；失败仍保留修改。没有单独取消修改按钮。关闭确认选择是会丢弃本地暂存及尚未暂存的编辑输入，不写入旧备份。UI 标记“尚未同步酒馆”，不将本地开关／顺序显示当作已保存宿主状态。

多个本地操作在显式保存时合并成一笔原生 save；正常路径保留三次必要 settings 读取与精确 revision／live 检查。失败保留本地修改并读取实际状态；检测到外部切换／修改时拒绝覆盖，不静默接纳新基线。切换、导入、复制、新建、重命名、删除与导出预设要求先保存或重新读取。保存期间不能继续编辑、重复保存或确认关闭；生命周期停用仍不能取消宿主已开始的写入。

本轮只做离线自动检查，未导入真实 ST。此前 Foundation 的草稿跨用户关闭验收仅适用于旧包；当前关闭丢弃确认及统一保存须重新实机验收。Hub 仓库、正式 PNG、Manifest、版本与原 Adapter 的数据安全规则未修改。

## 启动、并发与 Hub

启动检查 ST 版本字符串、实际管理器方法、事件、live 设置对象，以及 `promptOrder.strategy === 'global'` / `dummyId === 100001`。缺少任一必要能力便在写入前停止。等待原生事件与 Promise 都受超时和停用控制，退出时清理监听器与计时器；停止等待不能取消宿主已经开始的操作。

Adapter 内串行写入，以原始快照、切换代次、当前名称及 live 指纹防止旧操作覆盖新状态。保存响应丢失时先回读磁盘；已落盘但未能应用的结果与完全失败区分。每次操作前保留内存备份，停用、关闭或刷新页面后备份消失。本地暂存绑定读取时的原预设与精确 revision；外部通知和刷新不自动改用新 revision。统一保存仍通过原 Adapter 的预检、磁盘回读与原生应用屏障。

同一控制器和视图在独立入口与 Hub API v1 间切换。通过 `window.__MieMieHub`、`miemie:hub-ready` / `miemie:hub-disposed` 与 `hub.extensions.provide(manifest, factory)` 接入。Hub 不接收 raw、控制器或草稿；失去 Hub 后面板回到独立容器。双模式不构成同源脚本安全隔离。

## Maintainer Review 修复：live 新增字段与关闭路由

Prompt 定义采用双向完整对象比较，顺序条目和全部分组（包括分组元数据、额外分组与重复标识）也参与冲突检查。新增、删除或修改的属性会阻止读取成为安全快照，并在写入前再次阻止操作；失败的 refresh 不更新 snapshot / draft revision。不把完整 live 投影合并进 raw。

固定两版 `PromptManager.js` 的 `sanitizeServiceSettings()` / `checkForMissingPrompts()` 只为缺失的内建定义补上 `chatCompletionDefaultPrompts` 对象。Adapter 使用这些完整默认对象的固定双指纹，仅放行匹配的缺失内建补项；仅 identifier 匹配不再足够。补项不会写回 raw。`Prompt` 构造器的 Order / Trigger 默认值与编辑表单默认显示值不等于 service settings 的安全补值：既有 Prompt 上新增属性，即使看起来是默认值，也保守地作为未保存变化处理。未知补值／迁移需先在可恢复副本中确认并原生保存。本轮保留既有 1.18 `pollinations_endpoint` 和 1.19 三种模型迁移的比较投影。

UI 的关闭按钮及关闭面板的 Escape 分支统一请求 Dual Mode 的关闭能力。Standalone 完成 Native Panel → Orb 动画后隐藏；Hub 模式由当前有效实例的 `api.closePanel()` 完成 Surface 过渡与 Launcher 恢复，关闭不 deactivate、不销毁控制器。本地统一保存候选的用户关闭先检查未保存内容：选否不关闭；选是丢弃本地修改后执行同一正式 closePanel 路由。Hub disposed／ready 等生命周期内部隐藏仍保留暂存和编辑草稿。生命周期停用仍可执行内部本地隐藏与清理。没有正式 `closePanel` 能力的 Hub API v1 实例注册失败后恢复 Standalone，不猜测其私有 DOM 或状态。

Hub 依据：[API v1 的 closePanel](https://github.com/SheepSheepLab/MieMie-Hub/blob/928362c1eb224afe780801060c6d867e01cf5013/docs/EXTENSION-API.md)、同提交 `src/surface-controller.js` / `src/extension-runtime.js`。当前 Hub 源码状态机的补充本地复现仅模拟动画与 Launcher 依赖。另在真实 Hub 0.8.1 中已确认正常关闭返回 Launcher、再次打开、草稿保留及 disposed / ready 重新接入；不要求 Hub 整体退出。RH-01 曾出现一次打开超时，根因未确认，后续同环境重启、重新接入与打开／关闭／重开未再次复现；当前不作为 Foundation Merge blocker，后续继续观察。

## Hub Manifest 与正式产品 Icon

`contributes.launcher.icon` 使用短文本 fallback `预设`，符合当前 Hub API v1 的最多 16 字符约束，不放 data URL，也不使用 Emoji。Standalone、Manifest 的图片元数据与 `api.attachPanel(view.panel, { icon: ICON })` 共用维护者提供的正式 PNG；构建将原始 PNG 内嵌为 `data:image/png;base64,`，替换临时羊头 SVG，不依赖远程图片服务。

当前固定 Hub 的 `renderMenu()` 优先读取已挂载 panel 的 `presentation.icon`，接受 PNG/WebP/JPEG base64 data URL 或 HTTPS 图片；原先的 SVG data URL不在此范围。正式图片可用时 Launcher 使用 PNG；图片加载失败才回到 `预设`。本轮没有修改 Hub 或放宽 validator。依据：[Runtime validator](https://github.com/SheepSheepLab/MieMie-Hub/blob/928362c1eb224afe780801060c6d867e01cf5013/src/extension-runtime.js#L38)、[Launcher 渲染](https://github.com/SheepSheepLab/MieMie-Hub/blob/928362c1eb224afe780801060c6d867e01cf5013/src/hub-ui.js#L170)、[Icon guideline](https://github.com/SheepSheepLab/MieMie-Hub/blob/928362c1eb224afe780801060c6d867e01cf5013/docs/ICON-GUIDELINE.md)。

新增固定 Hub 原始 `validate/provide`、UI 和 Surface 契约测试，生产 Manifest 不经测试包装替换；执行注册、factory/activate、正式图片选择、加载失败 fallback、正式关闭/重开及超长 SVG 元数据拒绝。PNG 在 Node 中核对原始字节，在浏览器中核对实际解码与尺寸。以上仍是源码摘录与离线测试，不是 Hub 实机验收；素材来源及代码／图片授权边界见 [ASSETS-LICENSE.md](../ASSETS-LICENSE.md)。

## 已知限制与需求差距

1. **真实宿主范围有明确边界。** 历史 1.18 Foundation 的基础读写、刷新与 Hub 双模式通过；正式 0.2.3 在 ST 1.19.0 代表性读/切换/编辑/保存/刷新、原生未保存保护与 Per-Chat 协调通过，Simulator 软件键盘及 Owner 长按排序保存刷新、普通滑动到底且不改顺序通过。本轮 ST 1.19 正式 0.2.3 的复杂 Import / 自动选择、Title / Role / Content、Detach / Reattach、Delete Cancel / Confirm 的保存刷新链通过，编辑后 Raw Unknown Fields 完整保留。本轮通过真实下载文件核验完整 Export / Native Re-import / 编辑后 Export：测试样本三阶段结构一致，无 Native 字段规范化或 MPM 数据损失；18 Golden Path 全部满足。该结论仍限于实际样本及记录的宿主组合，下载事件接口未回传不代表产品导出失败。物理设备、完整版本/插件矩阵、失败/并发深度组合不由基础通过推导。最终矩阵见 [Closeout Review](PHASE1-CLOSEOUT-0.2.3.md)。
2. **产品政策与原生资格明确分开。** Copy 与 Delete 使用 Owner 批准的普通自定义条目安全边界；Detach 对齐严格 `system_prompt === false` 的原生资格。特殊条目 Detach 的真实宿主保存、重新应用和生成仍需在可恢复测试副本上验收。
3. **旧格式迁移不自动执行。** 会触发原生迁移的 `main_prompt`、`nsfw_prompt`、`jailbreak_prompt` 旧字段会阻止操作。缺失 `100001`、重复 identifier 或悬空引用也拒绝写入，不自动修复。应先在副本中完成原生迁移。其他历史模型迁移和第三方 BEFORE／AFTER 转换未全面覆盖。
4. **仅支持全局活动组。** 非全局策略或非 `100001` 活动组停止运行；保留多组数据不等于支持切换任意角色组来编辑。
5. **没有后端原子事务。** ST 不提供比较后交换或原子重命名；最后一次回读与保存／删除之间仍可能有另一个浏览器写入。重命名可部分成功。磁盘确认不能消除该后端窗口。
6. **顶层缺失字段与其他迁移仍有限。** Prompt / 顺序对象的新增字段现已阻止不安全写入；顶层缺失的已知设置仍可能是原生默认值，缺少较早基线时不能总是区分已有 live 修改。未识别的 Prompt 补值保守阻止操作；不会以保存全部 live 设置绕过这些限制。
7. **完整导出含敏感设置。** `proxy_password`、`custom_include_headers`、连接地址及未知字段均保留，备份同样如此。文件不会自动脱敏，分享前需检查；没有 Prompt 遥测不意味着导出文件适合公开。

18 项产品 Golden Path 的真实宿主状态均见 [Testing](TESTING.md)，不能以开发测试替代维护者验收。

## Presentation Alignment · 0.2.0

0.2.0 保留已 Review 的统一保存与 Presentation 内容，升版本前完整构建基线为 `2c84664207849af59460b81c50cf4b46fedcbd16c255422e38f3720dad2b792a`；本次版本收口不改变 `controller.ts` / `model.ts` / `st-adapter.ts` 或 Hub 生命周期。实际应用窗口替代全屏 Overlay，Standalone 与可选 Shortcut 共用64px原生入口和 Floating Presentation；蜂窝继续使用 Hub Surface Motion。Hub 消失/重接入保留同一面板、Controller、Dirty、未保存排序、分类和 Editor 草稿。`registerShortcutLauncher` 为可选能力，没有该能力仍使用蜂窝与 Standalone 双模式。

Manifest 短文本 `预设` 和正式 PNG presentation.icon 不变。入口、窗口动画与避让只处理视觉，不新增 ST API、网络请求、业务存储或 Prompt 传输。新增的浏览器测试执行固定 Hub 原始 Runtime / Surface / Shortcut registry，并使用实际 DOM/WAAPI；宿主与 Launcher依赖仍是 synthetic，不能写作真实 Hub 实机。此前 Foundation 实机结论仅对应其旧交付包。参见 [Application Presentation](APPLICATION-PRESENTATION.md) 与 [Review](PRESENTATION-REVIEW.md)。

## 0.2.0 阶段状态

本阶段完成 Foundation、ST Adapter 基础、Local Dirty Session、Prompt 基础管理与本地拖动排序、官方应用 UI、Native Launcher / Floating Presentation、Hub / Standalone / Shortcut 入口收口。内容已通过 Maintainer Review，本次发布只更新版本与交付元数据，不新增真实宿主验收范围。基础实机环境仍按此前 Foundation 记录；ST 1.19、完整 Round Trip / Unknown Fields、Built-in / Marker 全边界、失败／并发深度实机及物理手机／软键盘仍待验，[Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 保持 Open。


## 0.2.1 Managed Distribution

Hub Runtime API v1 与 GitHub Extension Package v1 分别验证。0.2.1 首次提供标准机器包：正式 Manifest 同源、完整 repository Build Identity、标准 metadata、原始 JSON 与 content SHA-256、发布 Asset digest。Runtime 正式 PNG/短文本 fallback、Standalone/Hub/Shortcut 和所有预设业务保持既有行为。测试直接锁定 Hub `928362c1eb224afe780801060c6d867e01cf5013` 的实际 Package 源码，不改 Hub，也不将它打入生产 bundle。

自动安装/更新契约使用合成脚本树；真实 Hub 在线安装/CORS/持久保存和更新尚待 Owner 测试。历史 Foundation 实机结论仅适用于其记录的宿主组合与交付包；不据此声称 0.2.1 已实机通过、ST 1.19 或整个 Phase 1 已完成。旧手工 0.2.0 缺少 repository 身份，不在实际 Hub legacy whitelist 中；不能安全识别自动升级。先备份停用、手动移除旧实例，再安装标准 0.2.1，详见 README。


## Per-Chat Preset Binding · Phase A（0.2.2）

新增协调器只针对固定官方 1.18.0 / 1.19.0 原生能力提供源码契约证据。原生手动切换和 autoSelectPreset 在有 Chat 时都恢复 Resolved Target，不修改 ST；1.18 void / 1.19 Promise 完成追踪沿用 Adapter。全局存储用 extensionSettings、override 用 chatMetadata，字面量 `miemie.preset-manager`，各自 native save 后精确回读，不写 Raw Preset 或 Hub。

Generation Gate 使用 AFTER_COMMANDS 与 CHAT_COMPLETION_SETTINGS_READY，加原生 stopGeneration/AbortSignal；不是 UI disabled、listener throw 或固定 delay。单份 dirty 暂停自动应用/生成；连续争夺有界失败。目录仍存在但不安全的默认不会被视作删除。源文件/hash、测试执行和未模拟部分见 [Binding](PER-CHAT-PRESET-BINDING.md)、[Testing](TESTING.md) 和 [Provenance](source-provenance.json)。

本功能完整 ST 1.18 / 1.19、Helper、Hub 与物理手机实机矩阵尚未完成；不能声称整个 1.18.x / 1.19.x 系列通过。既有 Foundation 实机记录和线上 0.2.1 Release 未改变。普通原生 Chat Completion Generate 之外的直接请求不在 Gate 范围；全局 settings 无多浏览器 CAS。Owner 已认可本次功能收口；发行检查见 RELEASE-0.2.2.md。


### Preset parameters / regex display (0.2.2)

Preset generation controls use native saved-preset names, including temperature/frequency_penalty/presence_penalty/top_p (not live UI aliases), openai_max_context/openai_max_tokens/n/stream_openai/show_thoughts/reasoning_effort. Root patches, defaults only for absent fields after dialog confirmation, and native readback are covered by pinned 1.18.0/1.19.0 contract tests with mocked dependencies. The native model and context-unlock rules are preserved.

Quiet regex display applies only during automatic per-chat selection. Native first-use permission remains mandatory; manual changes and unrelated notices remain native. If the exact notice/callback cannot be matched or the visible chat cannot safely be redrawn, the original notice is retained. This has automatic contract coverage, with remaining full real-host coverage recorded separately.

## 0.2.2 验证边界

Owner 已认可本地新功能和外观；这与此前有版本、环境和哈希的 Foundation 实机记录分别记录。两版原生固定方法在模拟依赖下验证默认/override、持久化回读、晚到应用、A→B→C、dirty 隔离及生成阻止/允许；完整 Generate、群聊成员循环、实际 SSE、第三方绕过原生 Generate 的直接请求不属于这组证据。ST 1.19 全宿主及物理手机/软键盘仍待验，Issue #1 保持 Open。

参数白名单：`openai_max_context`、`openai_max_tokens`、`n`、`temperature`、`frequency_penalty`、`presence_penalty`、`top_p`、`stream_openai`、`show_thoughts`、`reasoning_effort`。缺失字段明确确认后默认值为 2000000、30000、温度 1、两项惩罚 0、Top P 0.9、两个开关 false、推理 auto；`n` 无额外缺失默认。打开/取消不暂存或写入；Dialog 保存只暂存，统一保存才通过原生接口写入并回读。未知字段、已存在 0/false/未知推理值、扩展、所有 Prompt/order 分组保留。实际模型和原生 context unlock 仍限制可用长度，不自动更改解锁标志。

Runtime API v1 与 Managed Package v1 分开验证。离线 Package 契约使用完整官方 0.2.1 资产（公开 digest `071a97a35721688312f631e2c19b4eb6382edef64fef55d97a1573999d60d7c0`）验证启用/停用实例到 0.2.2 的更新，检查名称、内嵌 Runtime Manifest、树/持久化回读、data、文件夹及其他脚本保留。公开 discovery 另用发布时当前 Hub 官方源码与真实公开 GitHub API。脚本树和宿主持久化接口仍为隔离合成环境，不将其称为真实 Tavern Helper 安装/CORS/持久化实机通过。

## Native Launcher 本地 SVG 回退 · post-0.2.2 Candidate

Standalone / Shortcut 共用 Native Launcher：正式 PNG 正常加载时保持原图；加载失败时使用内置固定 `createIcon(doc, 'sheep')` SVG，无外部请求、Emoji、文本替代或 HTML 注入。入口维持 64px、圆形、Dock、拖动、动画和 button aria-label；SVG 为 aria-hidden / focusable=false，dispose 移除监听。Hub Launcher 不变，仍由 Host 管理 image failure → Manifest 短文本（`launcher.icon = "预设"`）。

## ST 1.19 / Simulator 当前证据补充（2026-10-08）

ST119-R1 先检查长期 Safari 会话，再复测首次启动、无聊天/单人聊天、MPM 与 Native A→B→A、刷新、已保存设置、真实未保存温度及 Native auto-select / Binding 协调，代表性路径 PASS。Helper 最大化预设上下文功能实际把 live 的 `openai_max_context` 从 4095 改为 2000000、`max_context_unlocked` 从 false 改为 true；MPM 正确检测第三方修改并拒绝覆盖。关闭优化后须明确安全重新读取，正常切换恢复。历史首次异常保留，根因已确认；没有修改 MPM 或放宽 checkLive()。

IOS27-R1 原始 29 PASS / 16 NOT TESTED 不变；Owner 后续补充长按、拖动、排序、统一保存、刷新持久化与切换（OWNER-IOS-01，E），以及普通滑动到底、最后 Prompt 可见且不改顺序（OWNER-IOS-02，E）。#8 / #15 PASS；其他原始未测项不擅自升级。本轮 ST119-FINAL-EXPORT 实际文件链补齐 #12/13/14，当前18 PASS / 0 PARTIAL / 0 FAIL。真实 Hub 0.8.1 Runtime 使用历史 Foundation 证据；Managed Package 是公开 discovery + synthetic install/update，真实在线安装仍未验，不增加为 Issue #1 新关闭条件。历史 Candidate / Release 段落的“待验”描述只表示当时状态，当前汇总与结项依据见 [Final Closeout Review](PHASE1-CLOSEOUT-0.2.3.md)。本次验收文档发布于 v0.2.3 Release 之后，不属于原 v0.2.3 Tag 的文档内容；历史 Tag 与 Release Assets 保持不变。Issue 的实时状态以 [Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 为准。
