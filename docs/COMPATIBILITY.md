# SillyTavern Compatibility Notes · 0.1.2

目标范围为 ST `1.18.x` / `1.19.x`。这是基于固定源码、模拟宿主及运行时能力检查的适配范围，**真实 ST / Tavern Helper / MieMie Hub 尚未验证**。以下 source 和 mock 证据不能代替完整宿主运行，也不覆盖每个补丁或分叉版本。

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

Role 为 `system` 不等于内建删除锁。原生物理删除要求 `system_prompt === false`；本实现还有下文所列保守限制。`chatHistory` / `dialogueExamples` 可切换但不编辑文本；允许进入编辑器的 Marker 内容仍不可更改。高级属性包括 `injection_position`、`injection_depth`、`injection_order`、`injection_trigger`、`forbid_overrides`，未知值和其他字段继续保留。规则依据：[PromptManager](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/PromptManager.js)。

## 启动、并发与 Hub

启动检查 ST 版本字符串、实际管理器方法、事件、live 设置对象，以及 `promptOrder.strategy === 'global'` / `dummyId === 100001`。缺少任一必要能力便在写入前停止。等待原生事件与 Promise 都受超时和停用控制，退出时清理监听器与计时器；停止等待不能取消宿主已经开始的操作。

Adapter 内串行写入，以原始快照、切换代次、当前名称及 live 指纹防止旧操作覆盖新状态。保存响应丢失时先回读磁盘；已落盘但未能应用的结果与完全失败区分。每次操作前保留内存备份，停用、关闭或刷新页面后备份消失。草稿绑定原预设，恢复时必须确认原始数据未改变。

同一控制器和视图在独立入口与 Hub API v1 间切换。通过 `window.__MieMieHub`、`miemie:hub-ready` / `miemie:hub-disposed` 与 `hub.extensions.provide(manifest, factory)` 接入。Hub 不接收 raw、控制器或草稿；失去 Hub 后面板回到独立容器。双模式不构成同源脚本安全隔离。

## Maintainer Review 修复：live 新增字段与关闭路由

Prompt 定义采用双向完整对象比较，顺序条目和全部分组（包括分组元数据、额外分组与重复标识）也参与冲突检查。新增、删除或修改的属性会阻止读取成为安全快照，并在写入前再次阻止操作；失败的 refresh 不更新 snapshot / draft revision。不把完整 live 投影合并进 raw。

固定两版 `PromptManager.js` 的 `sanitizeServiceSettings()` / `checkForMissingPrompts()` 只为缺失的内建定义补上 `chatCompletionDefaultPrompts` 对象。Adapter 使用这些完整默认对象的固定双指纹，仅放行匹配的缺失内建补项；仅 identifier 匹配不再足够。补项不会写回 raw。`Prompt` 构造器的 Order / Trigger 默认值与编辑表单默认显示值不等于 service settings 的安全补值：既有 Prompt 上新增属性，即使看起来是默认值，也保守地作为未保存变化处理。未知补值／迁移需先在可恢复副本中确认并原生保存。本轮保留既有 1.18 `pollinations_endpoint` 和 1.19 三种模型迁移的比较投影。

UI 的关闭按钮及关闭面板的 Escape 分支统一请求 Dual Mode 的关闭能力。Standalone 本地隐藏；Hub 模式由当前有效实例的 `api.closePanel()` 完成 Surface 过渡与 Launcher 恢复，关闭不 deactivate、不销毁控制器、不清除草稿。生命周期停用仍可执行内部本地隐藏与清理。没有正式 `closePanel` 能力的 Hub API v1 实例注册失败后恢复 Standalone，不猜测其私有 DOM 或状态。

Hub 依据：[API v1 的 closePanel](https://github.com/SheepSheepLab/MieMie-Hub/blob/928362c1eb224afe780801060c6d867e01cf5013/docs/EXTENSION-API.md)、同提交 `src/surface-controller.js` / `src/extension-runtime.js`。当前 Hub 源码状态机的补充本地复现仅模拟动画与 Launcher 依赖；真实 Hub 尚未验收。测试中 Surface 关闭可返回原 Launcher 菜单，不要求 Hub 整体退出。

## 已知限制与需求差距

1. **真实宿主未验。** 尚未验证 ST iframe 执行、真实事件时序、第三方钩子、实际 Hub、物理手机和软键盘。源码／mock 不证明整个 1.18.x 或 1.19.x 系列可用。
2. **删除／解锁／复制比原生更严格。** 当前 `removable` 除要求 `system_prompt === false`，还拒绝 `marker` 或保留 identifier；三个操作共用此判断。即使文件把这些条目标为 `system_prompt:false`，也不会放行。对异常或特殊预设而言，这与原生规则不完全等价，需在真实宿主审查后完善。
3. **旧格式迁移不自动执行。** 会触发原生迁移的 `main_prompt`、`nsfw_prompt`、`jailbreak_prompt` 旧字段会阻止操作。缺失 `100001`、重复 identifier 或悬空引用也拒绝写入，不自动修复。应先在副本中完成原生迁移。其他历史模型迁移和第三方 BEFORE／AFTER 转换未全面覆盖。
4. **仅支持全局活动组。** 非全局策略或非 `100001` 活动组停止运行；保留多组数据不等于支持切换任意角色组来编辑。
5. **没有后端原子事务。** ST 不提供比较后交换或原子重命名；最后一次回读与保存／删除之间仍可能有另一个浏览器写入。重命名可部分成功。磁盘确认不能消除该后端窗口。
6. **顶层缺失字段与其他迁移仍有限。** Prompt / 顺序对象的新增字段现已阻止不安全写入；顶层缺失的已知设置仍可能是原生默认值，缺少较早基线时不能总是区分已有 live 修改。未识别的 Prompt 补值保守阻止操作；不会以保存全部 live 设置绕过这些限制。
7. **完整导出含敏感设置。** `proxy_password`、`custom_include_headers`、连接地址及未知字段均保留，备份同样如此。文件不会自动脱敏，分享前需检查；没有 Prompt 遥测不意味着导出文件适合公开。

18 项产品 Golden Path 的真实宿主状态均见 [Testing](TESTING.md)，不能以开发测试替代维护者验收。
