# Per-Chat Preset Binding · Phase A

**0.2.2 阶段版本**，基于已发布 0.2.1 main `e9f9dfd9c8d8ce5029f79356db506d791a8b1fab`，收口 Owner 已认可的本地功能。自动/native-contract、Owner Review 与带环境的真实宿主验收分别记录；不扩大历史 Foundation 实机结论。

## 模型与最终 authority

Global Default → Per-Chat inherit / override → Resolved Target → Confirmed Current Applied。

没有 override 就跟随默认；选择非默认预设保存该预设的稳定 binding ID；选择默认清除 override。当前存在 Chat 时，Resolved Target 是最终 authority。ST autoSelectPreset、原生手动选择及其他来源的 PRESET_CHANGED 都作为 Applied State Deviation 处理，重新应用聊天目标；不识别来源，不依赖监听顺序、名称猜测、DOM 点击或固定稳定延迟。

例如默认 A、Chat 2 override B：进入 Chat 2 后，即使 ST 选 C，也最终恢复 B。用户要改为 C，应在 MPM 的“当前使用预设”选择 C。原生 Selector 不修改默认或 override。

状态独立保存 chat identity、mode（no-chat / inherit / override / missing）、status（starting / reconciling / ready / paused-dirty / error）、desired target 和已确认 applied。应用未确认时不会把目标显示为实际 Applied。

## 最小存储与确认

只使用字面量 namespace **`miemie.preset-manager`**，不是多层 `miemie.preset.manager`。

`extensionSettings[namespace]`：

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "defaultBindingId": "UUID-v4 或 null",
  "bindings": {
    "UUID-v4": { "nativeName": "原生预设名", "tombstone": true }
  }
}
```

`tombstone` 只在失效映射上出现。首次仅在 namespace 不存在时，用安全读出的当前预设初始化默认；已有无效配置停止，不覆盖为新配置。

`chatMetadata[namespace]` 只存 `{ "schemaVersion": 1, "presetBindingId": "UUID-v4" }`；inherit 时删除这个 namespace，不保存冗余默认 ID，不改其他 metadata。Unknown binding ID 保留为 missing。

没有 Prompt、Raw Preset、聊天正文、API key、连接字段或秘密存入绑定配置。没有 Hub 存储、默认 localStorage、遥测或外部上传。必要 HTTP 只到当前 ST 同源的原生 settings/chat endpoint。

全局写入：先读磁盘 namespace 并比较当前 live namespace → 只更新本 namespace → `saveSettingsDebounced()` → 等 SETTINGS_UPDATED → 再读 settings，核对磁盘与 live 都等于新对象。事件本身不等于落盘成功。已知冲突拒绝覆盖；部分成功不会回写旧配置。

聊天写入：捕获完整 ChatIdentity → 指定目标聊天文件读回原 namespace → 检查身份与 live 基线 → 只修改捕获的 metadata 对象 → `saveMetadata()` → 再次检查 identity 和对象身份 → 指定原聊天文件 readback。原生 save 等待期间切换到 B，不把捕获的 A namespace 复制进 B；没有确认 A 写入就报错，不能宣称成功。B 原 metadata 保持不被迁移。

ST 保存整个 settings/chat，没有后端 CAS 或跨浏览器事务。预检与回读不能消除两者之间的并发写窗口。部分成功明确报错，重新协调读取真实状态，不通过补偿旧写入掩盖。

## Stable Binding ID 与目录

UUID v4 只放注册表和 metadata，绝不加进 Raw Preset。MPM 新建、复制、导入的新预设取得新 ID；重命名在原生成功且目录确认旧名消失、新名有效后更新映射，ID 不变。可核验的原生重命名事件同样保留 ID；不靠两个名字相似推断。

已确认删除的名称对应 ID 成为 tombstone。override 仍保留原 ID，运行时回退默认，UI 显示“此对话 · 绑定缺失”；显式选择新预设或选择默认预设才替换/清除。未来同名预设不复活已知 tombstone。

Default 已确认删除时，按原生 `getAllPresets()` 顺序选择第一个存在且能安全支持的预设。真正没有预设时，default 为 null、UI 提示无可用预设并阻止生成，不声称清空了 ST live settings。目录/HTTP 读取失败不等于空目录；仍存在但不可安全读取的默认不记作删除，停止并报错。

宿主只有名字，没有原生永久 ID。脚本未观察到的“删除后立刻同名重建”、停用期间的外部重命名不能可靠追溯；不作猜测式迁移。已经识别的 tombstone 永不复活。

## 协调、并发与有界恢复

一个应用队列串行处理命令与协调。chatEpoch、operation identity、nativeEpoch、真实 BEFORE / PRESET_CHANGED 和现有 Adapter 回执一起确认应用；1.18 的 void select 与 1.19 Promise select 均保留原生完成屏障。

A → B → C 快速切 Chat：未开始的 B 可合并；A 已开始的副作用不能假装取消，等待其完成后读取最新身份，最终只确认 C。较晚 auto-select 完成后重新核对目标，并有界回放。已经正确时 no-op。

每次协调最多两个实际应用：目标应用，加一次由可观察冲突触发的纠正回放。在已经确认的同一 authority epoch 中，只允许一次外部偏离恢复；再次争夺进入明确 error/unresolved，不继续自动争夺。显式重新协调、当前 Chat 改变或用户新命令才重置预算。这个限制按应用回执设计，不按任意时间窗口计数。

原生 idle 等待使用单次 20 秒失败期限，不会因其他 completion 事件反复重置。此时间只用于失败终止，不是等待“应该稳定”的 delay。超时、冲突或读取失败阻止生成，不重写旧状态。

## Dirty Session

保留 Phase A 单份 Dirty Session。草稿/暂存仍绑定开始编辑时的 Preset A 和精确 revision。Chat A → B → C 时保留 A，不自动保存、丢弃或 Apply B/C；状态 paused-dirty，生成被阻止。

保存仍只能写 A，沿用 B1 安全预检；宿主已经被外部换成 B 时拒绝保存，不把 A 草稿迁移给 B。成功保存 A，或成功重新读取/确认丢弃后，只协调当前最新 Chat C。没有 per-chat 多草稿缓存；不能一边保留旧 dirty，一边偷偷应用新目标。

## Generation Safety Gate

固定源：

- ST 1.18.0：`51ad27fb86d39a3daca3adaa970375c9670c12df`。
- ST 1.19.0：`7e8663cd9c184a550b37238218bdd32c6efc68e9`。

使用 getContext 暴露的原生事件和 `stopGeneration()`。两版 `Generate()` 在 GENERATION_STARTED 之后建立 AbortController，故不能只在 STARTED 调取消，也不能靠 listener 抛异常（原生 EventEmitter 会捕获）。

在 GENERATION_AFTER_COMMANDS 检查 ready、身份、目标/实际状态、native idle、fresh Adapter revision，并记录本次 permit；在 CHAT_COMPLETION_SETTINGS_READY 再核对同一 chatEpoch/nativeEpoch/revision。失败通过 stopGeneration abort 原生 controller；BEFORE、CHAT_CHANGED 和绑定命令会使当前生成失效。独立普通生成发生重叠时，在 STARTED 先取消旧 controller，再在 AFTER_COMMANDS 取消新 controller，避免旧 permit 复用。

普通 Chat Completion 非流式请求使用原生 abort signal；流式路径还检查原生 controller 并取消 streaming processor；原生 group wrapper 传递父 signal 并检查 aborted。applying、reconciling、paused-dirty、无法确认 fallback、持续争夺、错误状态下，本地固定契约测试确认不发送错误预设的正常生成请求；ready 后请求正常。

测试执行 **未修改的 Generate 前段直到 AFTER_COMMANDS、原生 EventEmitter、stopGeneration、发送函数、sendOpenAIRequest**；完整 Generate 与 group wrapper 存入夹具用于控制流/信号审阅，但提示词组装、群成员循环和后端为模拟依赖。没有声称运行完整真实 ST 生成或 SSE 流。取消请求不等于撤销此前已发生的 ST 用户消息/命令副作用。

范围是固定两版的原生普通 Chat Completion Generate 生命周期。其他扩展自行发送 HTTP、绕过 Generate 的 Helper/direct quiet API 或不遵守原生 abort signal 的代码不在此 Gate 保证内。尚需真实单人/群聊、流式、regen/swipe/continue、工具调用与第三方扩展组合验收。

## Default、No Chat 与生命周期

Default Indicator 确认当前已应用预设后设置默认，保存+回读，再清除当前 Chat 中同 ID override；其他 Chat override 不变。选择 Default 直接进入 inherit；选择默认预设清除当前 override；现有重新读取按钮显式重读配置并重新协调。

无 Chat 时启动/显式协调尽量应用 Default；此后原生或 MPM 切换 C 可保持 Applied C，Default 不自动变化，直到打开 Chat、显式 Set Default 或重新协调 Default。没有无对话争夺循环。

单人 identity 用 avatar + chat filename（包括 characterId=0）；群聊用 groupId + chat filename。同角色/同群不同文件不共享 override。ST 原生 Branch/Bookmark 复制 metadata 时沿用 ID；新空 Chat 没有 namespace 就 inherit，不扫描迁移旧聊天。

Binding service 归脚本/pagehide 生命周期管理。Panel close、Hub dispose、Standalone 恢复、Hub ready/Shortcut 都不能停掉绑定。Dual Mode 只处理展示，未加入业务逻辑；ST 和 Hub 仓库零修改。脚本停用后 namespace 留存但无主动行为。

## UI 与 Owner Review

现有选择栏：[Preset Select + 空心/中心实心 Default SVG 共框][import][…]；完整导出与复制当前预设位于更多菜单。44px hit target、aria-pressed、title、键盘与 focus-visible；绑定徽标在“当前使用预设”同一行，使用现有 footer 提示状态，不新增横条。320/390px、桌面与短窗口均做合成浏览器检查；不等于真机键盘验收。

`delivery/preview.html?binding=1` 使用生产 Core/Controller/UI/Dual Mode，绑定 transport 为页内合成存储，全部为虚构预设与聊天。默认 preview 不启用绑定演示；没有私人 Prompt。Alt+1 / Alt+2 / Alt+0 / Alt+G 可切换合成对话。预览不模拟真实生成 Gate，后者单独由固定源码 Node 契约验证。

安装阶段版本前先备份重要预设和 ST settings/chat，使用可恢复测试对话，停用旧 MPM 实例。需 Owner 验：首次初始化与刷新保存、不同聊天继承/override、原生手动与晚到 auto-select、默认切换、单人/群聊、dirty 切换与解除、缺失/删除/重命名、生成安全、Hub/Standalone/Shortcut 下关闭仍协调。Owner 已认可本次功能收口；完整 Phase 1 验收仍未完成，Issue #1 保持 Open。


## Package v1 发行

0.2.2 沿用正式 manifest、Package v1 metadata、完整 repository Build Identity、SHA256SUMS 和产品 author 一致性 Gate。从完整官方 0.2.1 资产验证更新，保留安装实例 ID、启用状态、data、文件夹和顺序。正式 PNG、Native Launcher、Floating Presentation 和 Hub Runtime/Shortcut 生命周期保留。0.2.0 / 0.2.1 的公开 Tag、Release 和资产保持原样。最终自动检查见 [Release 0.2.2](RELEASE-0.2.2.md)。
