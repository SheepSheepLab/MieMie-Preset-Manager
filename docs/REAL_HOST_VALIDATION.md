# Initial Real-Host Validation · 0.1.2

当前证据汇总于 2026-10-08 追加在本文后部；以下 0.1.2 Foundation 与 0.2.2 / 0.2.3 发布时记录保留原日期和范围。最新逐项结论见 [Final Closeout Review](PHASE1-CLOSEOUT-0.2.3.md)。

本次验收文档发布于 v0.2.3 Release 之后，不属于原 v0.2.3 Tag 的文档内容；历史 Tag 与 Release Assets 保持不变。Issue 的实时状态以 [Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 为准。

2026-10-04，Maintainer 完成 Foundation 基础宿主验收。此记录只覆盖下列实际组合及已执行路径，独立于 [自动测试](TESTING.md)。不代表正式发布、完整 Phase 1、所有 18 项 Golden Path 或整个 ST 1.18.x / 1.19.x 系列通过。

## 实际环境与固定测试包

| 项目 | 实际值 |
| --- | --- |
| SillyTavern | 1.18.0，release |
| ST commit | `8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8`（界面短值 `8172dcd0e`） |
| Tavern Helper | 4.11.2 |
| MieMie Hub | 0.8.1 |
| 浏览器 | Safari 26.6 |
| 操作系统 | macOS 26.6 |
| 被测 PR #2 Head | `aac26f19db964aeb92b8e2b96b2eb39a142d0410` |
| 被测文件 | `delivery/MieMie-Preset-Manager-Extension-0.1.2.json` |
| Extension JSON SHA-256 | `5bd899fe9ea776cb7fe50d4149e7dc7b938c6747f4e650354e6e95be900145a5` |

这些是实际运行版本，不是固定源码夹具版本。后续纯文档提交不改变被测生产源码或交付包；自动验证与产物哈希见 [validation-results.json](validation-results.json)。

## 已执行结果

测试前备份 11 份原始预设，写入在两份可恢复测试副本上进行。本记录不包含私人 Prompt 正文、预设名称、凭据、连接内容或完整导出文件。

| 范围 | 已通过的实际结果 |
| --- | --- |
| Standalone | 一个正式 PNG Launcher；实际拖动；打开后球隐藏，正常关闭后恢复，再次打开；未出现第二面板或业务实例 |
| 读取与切换 | 当前真实 Preset 读取、名称与 ST 同步；测试副本间切换真正同步 ST，刷新后状态正确 |
| Preset Copy | 创建两份完整副本、来源不变、自动切换；副本初始完整 JSON 与来源一致 |
| Prompt 基础编辑 | 标题取消不写入；保存同步 ST，刷新后保留；仅目标标题改变。Role / Content 尚未覆盖 |
| Toggle | UI 与原生发送状态一致，刷新后保留 |
| Prompt Copy | 新 identifier，位于原条目之后，原 Prompt 不变；刷新后保留 |
| Prompt Reorder | 实际鼠标拖动改变 `prompt_order`，刷新后顺序保留 |
| Export | 实际下载完整原生 JSON，与已保存测试副本一致；尚未执行原生导入器重新导入 |
| Hub 收纳与图片 | 独立入口收起；Hub Launcher 显示同一正式 PNG，未使用短文本 fallback |
| Hub 正常关闭 | 打开、正常关闭返回 Launcher、再次打开通过；未观察到第二面板或重复业务实例 |
| 草稿与生命周期 | 未保存草稿跨面板关闭／重开、Hub 停用后 Standalone 恢复、Hub ready 重新收纳保留；仍为同一业务实例 |
| Hub restart 复核 | Maintainer 手动复核退出、重新接入、打开、正常关闭返回 Launcher、再次打开；状态正常，没有再次出现打开超时 |
| 数据安全 | 11 份原始预设逐字未改变；测试副本只有预期修改；未发现数据损坏 |

基础路径由实际 UI 操作及原生／持久化状态核对记录；最后一次 RH-01 打开／关闭／重开由 Maintainer 手动执行并确认。自动操作工具最后一次点击未能激活按钮，不能计作独立通过或新的产品失败；以上最终复核以 Maintainer 人工结果为依据。

## RH-01：继续观察

曾出现一次打开超时，根因未确认；后续在相同真实宿主环境完成 Hub 退出、重新接入、打开、关闭、再次打开后均未再次复现。当前没有稳定复现证据，不再作为 Foundation PR Merge blocker，后续迭代继续观察。

此前诊断本身也遇到操作工具超时，不能排除工具干扰，也不能据此判定根因。本记录不将“后续无法复现”写成“问题已被证明不存在”。最后人工复核没有新的超时、重复面板或业务实例，Launcher 返回正常。没有取得完整最终控制台快照，不声称真实宿主所有控制台错误均为零；此前 ST 原生 autocomplete 错误与此项的因果关系未建立。

## 剩余验收与 Gate（Foundation 当时状态）

仍待 ST 1.19 实机及其他补丁版本、完整复杂预设 Round Trip、原生重新导入、Unknown Fields 深度实机、Built-in / Marker 全边界、失败／并发、第三方钩子、物理手机与软键盘、Role / Content 及其余未执行 Golden Path。具体逐项范围见 [Testing](TESTING.md#真实宿主-golden-path)。

Maintainer 判定本次 Foundation 基础实机 Gate 为通过；结合基础自动检查和不变交付哈希，可进入 Foundation PR 的合并决策。此记录不执行合并。[Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 继续 Open，用于后续 Phase 1 验收与迭代。

## 0.2.2 Owner Review（2026-10-07）

Owner 在真实酒馆试用当前候选，确认聊天切换带动各聊天最后选择的预设，指出原生正则随预设切换产生重载提示；随后认可参数窗口、统一清透紫外观及只变形外框的设置动画，并授权收口发布。此处记录 Owner 反馈及认可，不推断新的 ST/Helper/Hub 精确版本，不声称所有新增路径已获得独立完整宿主回执。0.2.2 的自动/固定原生源码契约、Package 更新与公开发现检查单独见 [Release 0.2.2](RELEASE-0.2.2.md)。历史 Foundation 的实际组合和 SHA-256 不变；ST 1.19 全宿主、完整 Phase 1、移动软键盘等深度验收仍待完成。

## 0.2.3 Owner acceptance（2026-10-07）

Owner 明确确认当前 Phase 1 Closeout Candidate 及后续 UI 细节已完成真实使用验收，并授权发布 0.2.3。升版前源码重新生成的 0.2.2 JSON SHA-256 为 `7f739c10bc994ccfd8cf3c3119138dc2aab6b1c8047bc2c0d993463fa5dd7129`，contentSha256 为 `7d66a76c4cc75aee7fe43011e8dff5036318971b4a025b6fc4f329d3b45e79c2`，与 Owner 指定 Acceptance Anchor 完全一致。

本次反馈没有提供新的精确 ST／Helper／Hub／浏览器版本矩阵，不据此宣称 ST 1.19 全宿主、物理移动端或整个 Phase 1 完成。历史 Foundation 组合及其包摘要不变；Issue #1 保持 Open。自动与公开 Package 契约验证分别见 [Release 0.2.3](RELEASE-0.2.3.md)。

## ST 1.19.0 Real-Host Validation（2026-10-08）

证据类型 **C — Real Desktop Host**。环境为 ST 1.19.0 commit `7e8663cd9c184a550b37238218bdd32c6efc68e9`、Tavern Helper 4.11.3、正式 MPM 0.2.3，Standalone，未安装 Hub，macOS 26.6。原始安装/调查在 Codex in-app browser；复核先检查原有长期 Safari 会话，再在独立 in-app browser 页面执行首次启动与刷新路径。不能把 in-app browser 路径全部写作 Safari 覆盖。

正式 Extension SHA-256：`a1bffdf271b03ad618f8cf90d99346fd4298e116337f315943bb3cceb23231b7`；contentSha256：`5060feb3ccbe4c76d3d1dd2c305ff843e8d66882ceea9f13190605b15e52a46b`。使用无私人内容、可恢复的公开测试副本；既有 1.18 环境未操作或修改。

### 已执行路径

| 路径 | 实际结果 | 证据 |
| --- | --- | --- |
| 正式脚本加载、Native Launcher、Manager 打开、当前 Preset / 列表读取 | PASS | 原始安装记录，由 ST119-R1 original 的操作摘录还原 |
| 公开测试 Prompt 编辑、保存、刷新持久化 | PASS | ST119-R1 original 的原生保存及磁盘核对摘录；不扩大为 Role / 完整 Prompt 生命周期 |
| A：首次启动 MPM 后直接切换 | PASS | ST119-R1 tests.A |
| B：不打开聊天切换 | PASS | ST119-R1 tests.B |
| C：打开公开单人聊天后切换 | PASS | ST119-R1 tests.C |
| D：MPM A→B→A | PASS，无原生未保存误报 | ST119-R1 tests.D |
| E：原生选择器 A→B→A | PASS，原生参数真正应用 | ST119-R1 tests.E |
| F：刷新后再次切换 | PASS | ST119-R1 tests.F |
| G：原生设置已保存后切换 | PASS | ST119-R1 tests.G |
| H：原生温度真正未保存时切换 | PASS protection，阻止覆盖并保留真实改动 | ST119-R1 tests.H；ST119-I0 早期负向核对 |
| I：Native autoSelect 与 Per-Chat Binding 协调 | PASS，最终 Native / MPM 均为已解析目标 | ST119-R1 tests.I |
| 原有长期 Safari 会话，刷新前既有测试预设往返 | PASS | ST119-R1 longRunningSession；该旧页未加载另一页后来新增的名称，目标不存在保护另记，不算未保存误报 |

**该次 ST119-R1 调查当时 NOT TESTED：**完整复杂 Native Import→Export→Native Re-import、Role / Detach / Reattach / Delete 的完整宿主链（本轮补验见下方 ST119-FINAL-RA-RB）、完整 1.19.x 补丁矩阵、完整第三方插件生态、完整生成/群成员循环/SSE、当前 0.2.3 Hub 实机在线安装。它们不由以上代表性路径推导。

### 首次异常、根因确认与成功复测

1. **首次异常观察保留。** ST119-R1 从原始安装操作记录还原：刚安装不久、已打开/保存/刷新 MPM，在公开单人测试聊天中从测试 Smoke 预设切到 Default；原生目标已改变，MPM 随后显示未保存保护。当时没有瞬间 raw/live 字段快照，不能给首次报错凭空补字段证据。早期 ST119-I0 的调查状态与待确认项是当时结果，不作为当前未解决 Bug 结论。
2. **后续相同条件复现并有字段证据。** Helper“最大化预设上下文长度”启用后，Default 磁盘为 `openai_max_context=4095`、`max_context_unlocked=false`，实际 live 为 `2000000`、`true`。第三方确实改动 Native 设置，MPM 正确拒绝覆盖：**Correct Conflict Protection**。同时以未保存温度变化验证保护仍有效。
3. **关闭优化后成功复测。** 仅关闭 Helper 开关不会自动清掉已有保护状态；明确安全重新读取后，同一 Smoke→Default 切换确认成功，正常 A–I 路径通过。未修改 MPM、未绕过 checkLive()，没有观察到合法原生差异误报或未完成应用时序 Bug。

因此 Source Verification、Automated Contract 和 **Representative ST 1.19.0 Real Host 均 PASS**；Full 1.19.x patch matrix / Full third-party plugin ecosystem 为 **NOT VERIFIED**。已查明的保护不阻止继续 Simulator 验收，也不写成“MPM 修复了 Bug”。

复核恢复回执：settings 结构与备份一致，测试预设 JSON 值恢复、聊天文件字节一致、临时自动选择目标删除、原长期 Safari 会话保留。Public-A 原生重新导入恢复的是 JSON 值，报告另注其序列化可能不同，不扩大为所有文件字节不变。

## iOS Simulator Mobile Safari Validation（2026-10-08）

证据类型 **D — Simulator Mobile Host**，不是 B 响应式模拟，也不是物理 iPhone。macOS 26.6、Xcode 27.0 build 27A266a、iOS Runtime 27.0 build 24A434、iPhone 17 型号 Simulator、Mobile Safari 27.0；ST 1.19.0 commit 同上、Helper 4.11.3、正式 MPM 0.2.3（同一 Extension / content SHA-256），Standalone，无 Hub。

### 原始报告（保持不变）

IOS27-R1 / IOS27-T1 原始结果：**45 项，29 PASS / 16 NOT TESTED，未确认稳定 MPM Bug**。本次整理没有重新执行这些操作，也没有改写原报告。

| 原始实际通过范围 | 证据项目 |
| --- | --- |
| 真实 Mobile Safari 加载、Native Launcher、多次打开/关闭/返回与 Dirty 关闭确认 | HOST-01/02、UI-01–03 |
| 普通点击无意外排序；Prompt Editor 打开 | TOUCH-01、DIALOG-01；DIALOG-05 另观察到条目断链点击进入 Dirty |
| Title / Content Cancel 不写 Native；Editor Save 仅暂存；Unified Save 后刷新持久化 | DIALOG-02–04 |
| 参数数字输入与 Cancel；Slider 点击改变值；参数 Save 仅 Dirty | PARAM-01/02/03/07；不等于 Slider drag 或全部 Switch |
| 自定义 Preset 菜单选中项定位、选择后收起、Native Applied 一致 | PICKER-01/02；只有 5 个安全项，非长列表验收 |
| 实际 iOS 软件键盘，Title / Content / 数字输入、自动可见区域适配，Save / Cancel 可达 | KEYBOARD-01/02；不依赖桌面改变视口 |
| 编辑时竖横屏旋转保留草稿，Save / Cancel 可达 | ROTATE-01；不是所有横屏/键盘组合或拖动旋转 |
| 公开聊天 Default / Override 与切回默认 | CHAT-01/02 |
| 隔离与恢复 | SAFE-01–04：1.18 的 4,008 文件零变化；1.19 原 254 data 文件恢复字节一致；3 个变化恢复、7 个测试文件可恢复归档；正式脚本和 ST/Helper 核心不变，设备正常关机保留 |

原始 **NOT TESTED**：SCROLL-01/02/03、TOUCH-02/03/04、DIALOG-05/06、PARAM-04/05/06、PICKER-03、KEYBOARD-03、ROTATE-02/03、CHAT-03。工具未可靠执行的长按/滚动/拖动不计产品失败。

### Owner 补充人工验收（独立记录）

**OWNER-IOS-01 — E / Owner-Reported Manual Acceptance。** 环境与上述 Simulator + Mobile Safari + ST 1.19 + Helper 4.11.3 + MPM 0.2.3 相同。Owner 明确回执：“成功了。切换也可以。”，并进一步确认：长按拖动 Prompt 改顺序→点击“保存修改”→刷新酒馆，顺序依旧保持。

可据此补充 **TOUCH-02 长按启动、TOUCH-03 拖动/排序/统一保存/刷新持久化、预设切换 PASS（E）**。这是 Owner 后续确认，不是 Codex 独立观察；原始 29/16 不重新计数。#8 因此 PASS。

在 OWNER-IOS-01 当时，没有新的 Owner 回执证明 SCROLL-01/02/03、TOUCH-04、DIALOG-05/06、PARAM-04/05/06、PICKER-03、KEYBOARD-03、ROTATE-02/03、CHAT-03；它们继续保持原始 NOT TESTED 范围。不由一句“成功了”推断 Dirty Chat A→B、所有参数/推理菜单、滚动阴影边界、所有横屏或输入法通过。

#15 在上轮整理时的分项判断（保留历史）：按钮点击不误拖、Editor / Save / Cancel、实际软件键盘与可见布局适配由 D 通过；长按/拖动由 E 通过；**Prompt 列表普通触摸滑动到底部且不触发排序（SCROLL-01 + TOUCH-04）仍缺证据**，故 #15 PARTIAL。不要求重新跑已通过项，也不把其余 14 个未测细项或物理设备全矩阵自动加为 Issue #1 新门槛。

### Owner 普通滑动补充验收（2026-10-08）

**OWNER-IOS-02 — E / Owner Manual Acceptance。** Owner 本轮明确确认同一 iOS Simulator / Mobile Safari / ST 1.19.0 / Helper 4.11.3 / 正式 MPM 0.2.3 中：普通滑动 Prompt 列表正常，不触发排序；可滑到底部，最后一条 Prompt 可见。补充 SCROLL-01 / TOUCH-04 核心需求，结合 IOS27-R1 和 OWNER-IOS-01，当前 **GP #15 PASS**。不是 Codex Independently Observed，也不是 Physical iPhone Validation。

原始 IOS27-R1 **29 PASS / 16 NOT TESTED** 完全保留，不重新统计；新证据单列。SCROLL-02/03（更细边界）、DIALOG-05/06 的原始 D 记录、PARAM-04/05/06、PICKER-03、KEYBOARD-03、ROTATE-02/03、CHAT-03 仍保留原始未测标注；桌面本轮 R-B 不冒充这些移动操作。它们不新增为原 Issue 的关闭 Gate。

## Phase 1 Final Real-Host Acceptance（2026-10-08）

**以下 ST119-FINAL-RA-RB 为上轮15/3阶段记录，保留当时PARTIAL判断；最终导出补验结果见下一节 ST119-FINAL-EXPORT。**

证据 **ST119-FINAL-RA-RB — C / Real Desktop Host**：实际 ST 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`、Helper 4.11.3、正式 MPM 0.2.3 Standalone，Codex in-app browser 自动控制真实产品 UI；落盘 JSON 另做只读核对。未调用内部 Controller / Adapter 来代替 UI，未改变 checkLive / Delete Eligibility。Extension / content 摘要与上方正式包一致，Helper 最大化上下文保持关闭。Safari 备用下载尝试没有形成可核验的导出结果，不计该路径 PASS。

### R-A：复杂 Native 互操作

安全 fixture 来自固定 ST 1.19 公开 Default 原生格式：16 Prompt definitions（12 个原生内建/Marker，4 个普通 custom）、100000 / 100001 两组；活动 custom 顺序为 Gamma→Alpha→Beta，角色 assistant / system / user，Beta disabled，Hidden 无活动引用。覆盖 identifier、完整参数、extensions、root / prompt / group / order-entry 嵌套 future fields。上下文 4095、unlock false、回复 321、温度 0.73、Top-P 0.87、stream false。fixture 文件 SHA-256：`dbc6a76ea8e1642f352cd13317df6907bf04edc9e8958d84ecfeb98a42a58abf`。

| 实际路径 | 结果 | 核验 |
| --- | --- | --- |
| MPM 文件选择器 Import 新独立名称→自动选择→Native / MPM 回读 | PASS，GP #4 | 真实落盘 JSON 与原 fixture 结构完全一致，数组顺序不忽略；原生 Drawer 参数和 Prompt 顺序/开关可读 |
| 无修改 More→Export full preset | PARTIAL | 实际点击，footer 显示导出成功；首轮等待和第二次 8 秒有界捕获均未取得下载文件，精确文件检查和页面已观察资产也未找到；不认定文件内容通过 |
| Export 文件→真实 ST Native Import UI→独立名称→语义核对 | NOT TESTED，GP #12/13 PARTIAL | 缺真实下载文件；不以 disk raw 副本替代 Export，不以源码推断实际 importer 行为 |
| Alpha 无关 content 编辑→Editor Save→Unified Save→刷新→重新选中测试预设→打开 Editor 回读 | Raw Preservation PASS；GP #14 完整链 PARTIAL | Editor Save 原生文件不变；统一保存后只改变该 content，root / prompt / group / order-entry / extensions 及其他 Prompt 完全保留；仍缺导出文件核对 |

MPM 初始 Native 落盘 SHA-256 `6817d78aa6e23050285bc3992510fa381e8b3cd766f203d87a86dce50a1999ba`；无关编辑统一保存后 `74d0b84af3a728ca39bd00a4f1772faca2e98a4893c7ff37dd952d810ef289ae`。结构化 expected diff 仅 Alpha content；JSON key 排列与序列化不当作损失。

**Native Importer Behavior 未执行，不能声明 PASS 或数据丢失。** 固定源码 `public/scripts/openai.js:onPresetImportFileChange` 解析完整 JSON、可触发 sensitive-field 选择及 OAI_PRESET_IMPORT_READY，再将 presetBody 原样 POST 保存；没有直接 whitelist 重建。这仅为源码依据，事件/迁移仍须实际重新导入记录。

### R-B：Prompt 完整生命周期

另一独立 Lifecycle Preset 同样使用公开 fixture；仅操作 `system_prompt=false, marker=false` 的普通 custom Prompt。全程没有绕过保护，没有删除内建/Marker。

| 实际路径 | 结果 | 实际落盘 / 刷新证据 |
| --- | --- | --- |
| Alpha Title / Role / Content 改动→Cancel→重开 | PASS | UI 原值恢复、无 Dirty、Native raw 未改变 |
| 同三字段改动→Editor Save | PASS | Dirty 提示出现，Native raw 仍与原 fixture 相等 |
| Unified Save→Native readback→刷新并显式选中 Lifecycle→Editor 读回 | PASS，GP #6 | 只改变 name / role / content；读回 Saved / assistant / 公开测试内容，Native raw hash `e5f8a3f727b4f2a52506a92f249af84ba58f63deae8b138d16107c0ea25ac28a` |
| Alpha Detach→Unified Save→刷新/选中→Detached | PASS | 只去掉活动组 100001 目标 reference；definition、其他组、metadata 保留；hash `66bb78e8553c53c0e1d79b1bbcdfd7b26b34d7cd040ff47aff31fbc1b8ae7860` |
| Alpha Reattach→Unified Save→刷新/选中→Attached | PASS，GP #10 | 只新增一个合法 enabled reference；无重复 identifier/reference；hash `32bc64806be34fe66efc99dfb42a6717affa1630a2618800d9f75df188ff85b7` |
| Hidden Delete 确认窗口→Cancel→刷新/选中 | PASS | 确认窗口实际可见；取消无 Dirty / Native 写入；Prompt 仍存在 |
| 另一个 Beta Detach/统一保存满足资格→Delete 确认→Dirty→Unified Save→刷新/选中 | PASS，GP #11 | 删除确认前后 Dirty 阶段 Native 不变；保存后 target definition / 全部 target references 不存在，其他定义/分组/扩展/future fields 不变，无悬空引用；hash `73b8305c616123385fc8cd57ab47fdf59d01ae2d885825f1257c9269f29e96d4` |

每次刷新后 MPM 初始化协调无聊天默认 Smoke，因此各持久化验证都通过 UI 显式重新选择独立测试 Preset，再检验新载入内容；不声称临时 Native 选择跨初始化保持。上述 hash 是真实保存时 Native 文件摘要，其他 checkpoint 副本有单独 hash；删除/Detach 意图移除的对象不被错误算作未知字段丢失。

### 隔离、清理与范围

测试前已确认独立 8001 dataRoot、非共享目录，记录 Native 选择和 Binding，并建立私有可恢复备份。仅创建两个有明确身份的新 Preset，未创建/编辑测试聊天；Safari 备用尝试曾打开公开默认角色聊天，没有提交消息或改写内容，最终聊天字节不变。结束先恢复原 Native 选择、关闭本轮创建的浏览器页，再逐文件可恢复归档两份测试 Preset 和五份本轮自动 settings backup，恢复原 settings（含 Binding / revision / Helper / 原选择）。没有通配符清理，没有重置长期安装。

最终 ST 1.19 原有 **256 文件**：无新增/删除，内容、大小和 mtime 逐文件一致；宿主原子保存导致 settings 与字节相同的公开 Default QuickReplies 两个 inode 被替换，明确保留该 metadata 说明。ST 1.18 **3,487 文件**：hash / size / mtime / inode 全部零变化，没有操作其 8000 页面、核心/配置/依赖或运行服务。

本轮没有重跑 ST119 A–I、Simulator 45 项、ST1.18 Foundation、REL023 Node/Package/Browser，未生成 Candidate/Build/Package，未修改生产代码/版本/身份或 GitHub。结果为 **B，15 PASS / 3 PARTIAL / 0 FAIL**；仅 #12/13/14 需要实际导出文件 / Native Re-import 补证。

## Final Export Interoperability Acceptance（2026-10-08）

**ST119-FINAL-EXPORT — C / Real Desktop Host。结论 A：Phase 1 Acceptance Complete，18 PASS / 0 PARTIAL / 0 FAIL，已通过 Owner 最终审核。** 本轮仅补 #12/13/14；其他已通过15项未重测，前述15/3报告、F18、ST119-R1、IOS27-R1、Owner独立回执均保留其原始日期、版本与证据类型。

环境仍为正式 MPM 0.2.3 / ST 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9` / Helper4.11.3 / Standalone8001。通过 Codex in-app browser 控制真实产品 UI；没有安装新Candidate/Hub、没有内部raw/Adapter/序列化函数替代Export、没有下载Hook或生产修改。fixture复用上轮公开复杂文件，原字节 SHA-256 `dbc6a76ea8e1642f352cd13317df6907bf04edc9e8958d84ecfeb98a42a58abf`，9,560 bytes、16 definitions、两组order、参数/extensions/嵌套unknown fields；独立新名称不覆盖现有Preset。

### 真实下载文件捕获

正式 MPM UI Import→自动选择→无修改 More/Export。下载事件有界8秒等待没有回传，当前工具没有acceptDownloads或独立下载目录设置；但精确文件系统检查找到本次新生成的真实浏览器下载文件，birth/mtime均在UI操作之后，内容/大小/hash已验证。Safari备用操作曾遇到Mac锁屏，Owner确认解锁；随后已取得IAB实际下载文件，无需Safari下载操作。不是凭页面成功提示判断文件，也不是自行重建JSON。

| 阶段 | 实际下载 filename | bytes | SHA-256 |
| --- | --- | ---: | --- |
| Test A 无修改 MPM Export | MPM-Phase1-Export-A.json | 9,559 | `dd70a3100e3c0df8a1c09bded3595a372eafdd1ef6d2a1b9e9e9a70569a3638d` |
| Test C 保存/刷新后 MPM Export | MPM-Phase1-Export-Reimport.json | 9,571 | `c0d47c700fbe33f6427bbf1d055fbab1f8f16cba0dcb87dd2daebe714630908f` |

Test A与原fixture仅差末尾LF，解析后的完整对象/数组完全相等；比较不忽略数组顺序、identifier、role/content、enabled、任何unknown fields。导出文件保留，测试报告另记录实际文件时间及UI截图。

### Test B：ST Native Re-import / Semantics

将Test A实际下载文件作逐字相同的副本，仅改文件名为全新Reimport名称；通过**ST原生 #import_oai_preset 文件选择器**导入，不经过MPM Import。再用Native Selector明确选择，读取原生实际context4095/unlockfalse/maxTokens321/temperature0.73/topP0.87/streamfalse，原生发送顺序Gamma→Alpha→Beta及开关一致。MPM读取全部16个definition、活动15个reference及未挂接Hidden，四个custom的Editor title/role/content逐项与原文件一致。

**Original Fixture = Actual MPM Export = Native Re-import，完整结构相等；Native字段规范化差异 `[]`。** 两组order、extensions及root/prompt/group/order-entry嵌套未知字段完全一致；JSON属性排列/缩进等序列化差异不当作字段变化。真实Native文件SHA-256 `6817d78aa6e23050285bc3992510fa381e8b3cd766f203d87a86dce50a1999ba`，11,957 bytes。固定Importer源码会解析完整presetBody、发出OAI_PRESET_IMPORT_READY再保存；本样本实际结果确认无字段变换，不泛化为所有旧格式/第三方Hook均无规范化。

### Test C：Edited Export / Unknown Fields

在普通custom Alpha只改content。Editor Save显示Dirty且Native未写；Unified Save确认成功，真实Native raw仅改变该content。完整刷新ST后，通过MPM显式重新选中Reimport（初始化仍协调原无聊天默认），Editor读回预期content，再从正式MPM UI Export。第二份文件真实落盘，证据副本以 `MPM-Phase1-Edited-Export.json` 保留；与Test A比较唯一字段路径为 **`$.prompts[12].content`**。

其他全部字段、unknown root / prompt / group / order-entry、extensions、其他Prompt、identifiers、enabled、全部order及metadata保持一致；数组严格逐项比较。刷新后的Native raw与实际第二份Export结构相等；Native保存时hash `a3fbd8b74bdf9baf80bd03133cd343ecac8cfcf3bd36686699c36e53dc697f47`。

因此 **GP#12 PASS / GP#13 PASS / GP#14 PASS**。本轮未观察到数据损失或实现缺陷，不修改checkLive、安全资格、Binding或核心源码。

### 数据恢复与证据

本轮单独备份原data及五份未提交文档，核对原Native选择/Binding/Helper与关闭的context optimization。结束通过UI恢复原选择、关闭本轮IAB页；逐文件核对身份后将两个测试Preset和两份本轮自动backup可恢复归档，恢复原settings（包括Binding/revision/Helper）逐字相同。没有新建或编辑聊天；实际公开导出下载及证据副本保留。

最终ST1.19原 **256文件**：无新增/删除，content/size/mtime全相同，宿主原子保存产生两处inode替换单独记录。ST1.18原 **3,487文件** content/size/mtime/inode零变化；不操作8000或修改其runtime/源码/配置。没有重置长期1.19安装，也没有通配符删除。

本轮报告SHA-256 `a93d33212ab71dacc1f9cfe1af0bd5843f32d434e8aa5530a61dc539c8a9cd32`。当前18项矩阵使用本轮C补三项，其他15项继续引用历史C/D/E和发行A/B；原Simulator **29 PASS / 16 NOT TESTED**不改，Owner回执不伪装为独立观察/物理iPhone。没有全量Node/Package/Browser、A–I、45项Simulator或ST1.18 Foundation重跑，也没有Build/Candidate/Release/GitHub写入。

## Evidence Ledger / 当前收口状态

| ID | 原始来源 | 类型 | 原始记录 SHA-256 / 范围 |
| --- | --- | --- | --- |
| F18 | 本文保留的 2026-10-04 Foundation 记录、PR #2 正文及讨论 | C，部分 Maintainer 人工复核 | 0.1.2 固定 Head / Extension hash 见历史环境表；不冒充 0.2.3 全功能 |
| REL023 | RELEASE-0.2.3.md 与 validation-results.json.release023 | A/B；另有公开 GitHub discovery | 2026-10-07 发布测试回执，本轮未重跑 |
| ST119-I0 | 本地保留的早期 real-host switch investigation/report.json | C；instrumented adapter 诊断单独区分 | `dd41dac1a44a7bb9a8dd3ef64dad5e981fc685c5eec0192f9662c17601320f1a` |
| ST119-R1 | 本地保留的 st119-switch-recheck/report.json，含原始安装操作摘录 | C | `8c465cbf25b9ae55c80c3772ae1bd0765a2ba3fb9a87a9fbbfd8bb1c59b5724d` |
| IOS27-R1 | 本地保留的 mobile-validation.json，45 个原始分项 | D | `643476daae1bb562de06b6097836d83f2e2737f1620aad26dc3d6ab46870d166` |
| IOS27-T1 | 同次 mobile-validation-report.txt | D | `d8cbd3139245b2cbfa8b3484b7c81665daad5daa5ce84f9a77c578a11e2ecd71` |
| OWNER-IOS-01 | Owner 前次明确提供的后续手动回执 | E | 仅长按、拖动、排序、统一保存、刷新持久化和预设切换 |
| OWNER-IOS-02 | 本轮 Owner 普通滑动/到达底部/最后 Prompt/不改顺序回执 | E | `c354d60d4471a3e99624059d8267f1792dc5a5a31b1617102623e1968e41b653` |
| ST119-FINAL-RA-RB | 上轮真实产品 UI、实际 Native raw checkpoints / 比较 / 恢复报告 | C | `9c4afcefbb1b74bf035b200097f21d30d2294aa561ffc9c7f07ef1a24d954c0a`；当时15 PASS / 3 PARTIAL / 0 FAIL |
| ST119-FINAL-EXPORT | 本轮真实导出下载、ST Native Import、双向读回及编辑后导出/恢复报告 | C | `a93d33212ab71dacc1f9cfe1af0bd5843f32d434e8aa5530a61dc539c8a9cd32`；当前18 PASS / 0 PARTIAL / 0 FAIL |

原始诊断在本地保留，公开文档只记录脱敏 ID、摘要和 hash，不公开本机路径、用户标识或未审查截图。完整 18 项矩阵见 [Testing](TESTING.md#真实宿主-golden-path)；结论 **A：Phase 1 Acceptance Complete，18 PASS / 0 PARTIAL / 0 FAIL**。原 Issue #1 必要验收无剩余，具备关闭条件；实时状态以 [Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 为准。最终结项依据见 [Final Closeout Review](PHASE1-CLOSEOUT-0.2.3.md)。Hub Runtime 0.8.1 的历史 F18 实机与 Managed Package 的公开 discovery / 合成 install-update 分开；真实 Hub 在线安装未验，不追加为原 Issue #1 关闭条件。
