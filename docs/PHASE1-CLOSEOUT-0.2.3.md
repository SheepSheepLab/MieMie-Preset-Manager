# Phase 1 Final Closeout · MieMie Preset Manager 0.2.3

Date: 2026-10-08。**A — Phase 1 Acceptance Complete。18 PASS / 0 PARTIAL / 0 FAIL；原始 Phase 1 验收已通过 Owner 最终审核。** 本轮仅补齐#12/#13/#14，其他15项复用此前已接受证据，没有重新测试或扩展关闭Gate。没有新确认的产品Bug。

本次正式文档发布经 Owner 授权；Phase 1 完成不代表整个产品开发结束。本次验收文档发布于 v0.2.3 Release 之后，不属于原 v0.2.3 Tag 的文档内容；历史 Tag 与 Release Assets 保持不变。Issue 的实时状态以 [Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 为准。

## Baseline / Scope

最终导出验收时的 HEAD / origin/main / v0.2.3：`fc8145a9b59ae0ef3f4df3ebaebd69a33dc0f07c`；版本仍0.2.3。开始前fetch、status、现有diff和上轮报告已核对，五份Markdown改动保留，未发现未知代码改动。最终导出验收阶段只读核对 Issue #1 原始正文及 PRODUCT_PLAN 第25节，当时未执行 GitHub 评论或关闭操作。本次文档发布重新核对原 Issue 全文、全部评论、计划、身份与贡献记录后，依序执行 Commit / Push、远端验证、正式评论和关闭 Gate。

环境：正式MPM0.2.3、ST1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`、Helper4.11.3、8001 Standalone。Extension SHA-256 `a1bffdf271b03ad618f8cf90d99346fd4298e116337f315943bb3cceb23231b7`，content `5060feb3ccbe4c76d3d1dd2c305ff843e8d66882ceea9f13190605b15e52a46b`。没有新Candidate、Hub、Build或源码/安全规则改动。

## Real Export Capture / A–C

| 测试 | 实际执行与比较 | 结果 |
| --- | --- | --- |
| A Actual MPM Export | 正式UI导入公开复杂fixture→自动选择→无修改Export；真实浏览器下载文件9,559 bytes，严格结构/数组比较与原fixture一致 | PASS |
| B ST Native Re-import | Test A文件逐字相同，仅重命名副本避免覆盖；通过ST Native Import UI→Native Selector→原生参数/order和MPM16定义/role/content/enabled读回；Original=Export=Native完整结构 | PASS |
| C Edited Export | 普通Alpha content→Editor Dirty→Unified Save→ST刷新/显式选择/Editor读回→正式MPM Export真实文件9,571 bytes；唯一差异`$.prompts[12].content` | PASS |

真实下载文件：

- Test A `MPM-Phase1-Export-A.json`：`dd70a3100e3c0df8a1c09bded3595a372eafdd1ef6d2a1b9e9e9a70569a3638d`。
- Test C 实际下载 `MPM-Phase1-Export-Reimport.json`，证据副本 `MPM-Phase1-Edited-Export.json`：`c0d47c700fbe33f6427bbf1d055fbab1f8f16cba0dcb87dd2daebe714630908f`。

下载事件8秒等待未回传，工具不开放acceptDownloads/下载目录配置；精确磁盘检查取得本次实际下载文件并核对birth/mtime及UI截图。Safari备用尝试遇到锁屏，Owner确认解锁；此后实际IAB文件已取得，无需Owner手动导出。没有读取内部raw、Adapter对象、自行序列化或复制数据库冒充Export。Native raw只用于独立保存结果比较。

Original fixture比Test A多末尾LF；Native序列化不同但完整JSON相同。**Native字段规范化差异为空**，本样本无MPM数据损失。编辑后所有unknown fields、extensions、其他Prompt、identifiers、enabled、全部order和group metadata保持原值。详细步骤/语义/时间/hash见 [Final Export Real Host记录](REAL_HOST_VALIDATION.md#final-export-interoperability-acceptance2026-10-08)。

## Golden Paths / Evidence

**GP#12 PASS / #13 PASS / #14 PASS；最终18 PASS / 0 PARTIAL / 0 FAIL。** 完整七列矩阵见 [Testing](TESTING.md#真实宿主-golden-path)。本轮C证据ST119-FINAL-EXPORT报告SHA-256：`a93d33212ab71dacc1f9cfe1af0bd5843f32d434e8aa5530a61dc539c8a9cd32`。上轮ST119-FINAL-RA-RB15/3报告（`9c4afcefbb1b74bf035b200097f21d30d2294aa561ffc9c7f07ef1a24d954c0a`）和历史报告保留不变。

F18仅历史0.1.2/ST1.18 Foundation；ST119-R1 A–I代表性宿主、安全保护与协调PASS；本轮补真实文件互操作。IOS27-R1仍29 PASS / 16 NOT TESTED（D），OWNER-IOS-01/02只以E补充人工确认。REL023的Node325/Package71/Hub专项15/Browser192/UI24/Save8仍是2026-10-07发行回执，没有本轮重跑声明。

## Data Safety / Cleanup

核对独立dataRoot、原Native选择/Binding/Helper后备份，不覆盖同名Preset。结束UI恢复原选择、关闭测试页，逐身份可恢复归档两个新Preset和两份本轮自动settings backup，再恢复原settings/Binding/Helper。没有创建或编辑聊天，实际公开下载和脱敏证据保留。ST1.19原256文件content/size/mtime零变化，无新增/删除；宿主原子保存替换两处inode，独立记录。ST1.18原3,487文件content/size/mtime/inode零变化；没有操作8000或改动源码/配置/runtime。

## Minimum Remaining Acceptance Checklist

原Issue#1的18项必要验收 **无剩余**。Owner 已完成对本次证据的最终审核；不增加物理设备、全补丁、完整插件生态或真实Managed Package新Gate。

## Known Limitations / Identity

保留非原子后端/无CAS、旧格式原生迁移、特殊格式安全拒绝、全局活动组、设备/补丁/第三方范围、RH-01历史观察和Helper context optimization真实Native修改的正确保护。Hub Runtime真实Foundation与Managed Package公开discovery/合成install-update分开，真实在线安装/CORS/持久化未验，不推断所有生态无Bug。

Manifest author=SheepSheep；official repository=https://github.com/SheepSheepLab/MieMie-Preset-Manager；Contributor louisSSR的原Author/PR#2/history/Credits/copyright完整保留。版本、身份、资产、生产源码不变。

## 结项评论参考文本

> Phase 1 在正式 MieMie Preset Manager 0.2.3 上完成原始18项 Golden Path 验收：**18 PASS / 0 PARTIAL / 0 FAIL**，Issue #1 具备关闭条件。

> 交付范围包括原生Preset read/save/switch/import/export/copy、Prompt编辑/复制/开关/排序/Detach/Reattach/安全Delete、完整raw局部patch、Unknown Fields/Round Trip、PC/Mobile操作及Hub/Standalone单业务实例；兼容研究、模块化源码、构建与可导入JSON、文档和真实attribution已具备。发行自动回执保留原日期，本次不声称重跑其他15项或发行全套。

> 证据分别记录：ST1.18.0 / Helper4.11.2 / Hub0.8.1 / Safari26.6的历史Foundation只对应当时0.1.2包；正式0.2.3在ST1.19.0 commit 7e8663cd9c184a550b37238218bdd32c6efc68e9 / Helper4.11.3 / Standalone中的代表性切换、安全保护、完整Prompt生命周期及最终导出互操作通过。真实MPM下载文件经ST Native Import UI导入，16 definitions/两组order/参数/extensions/unknown fields与原fixture全结构一致；本样本Native字段规范化差异为空。无关Prompt编辑、统一保存和刷新后的实际Export只改变目标content，其他字段完整保留。未绕过checkLive或Delete Eligibility，真实未保存修改仍受保护。

> iOS Simulator Mobile Safari 原始报告29 PASS / 16 NOT TESTED保留不变；Owner另明确完成长按拖动、排序、统一保存/刷新持久化、切换以及普通滑动到底且不改顺序。补充证据为Owner Manual Acceptance，不是Codex独立观察或物理iPhone验证。GP#15已满足，其他未测移动细项不伪造PASS。

> Hub Runtime与Managed Package为独立Gate；真实Hub在线安装/更新/CORS/持久化仍未验，不新增为原Issue关闭条件。保留后端非原子事务/无CAS、旧格式须原生迁移、特殊malformed格式安全拒绝、全局活动组、物理设备/全补丁/完整第三方生态范围边界；历史RH-01继续观察。Helper context optimization真正修改Native live导致保护的记录保留，不写成MPM缺陷。测试数据已备份并恢复。

> Product Author为SheepSheep，官方维护/发布namespace为SheepSheepLab；感谢louisSSR的Foundation贡献，原Commit Author、PR#2、Git History、Credits和copyright继续完整保留。证据见docs/REAL_HOST_VALIDATION.md、docs/TESTING.md及docs/PHASE1-CLOSEOUT-0.2.3.md。正式结项评论及实时关闭状态以 [Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 为准。

## Documentation Publication Scope

本次正式发布仅涉及 README.md、COMPATIBILITY.md、TESTING.md、REAL_HOST_VALIDATION.md 和本 Closeout 文档。此前真实宿主测试与报告不重跑、不改写；diff、Markdown、链接、矩阵、证据、隐私和身份核对作为文档发布 Gate。无生产代码、ST/Helper、Binding schema、安全规则、Manifest、Product/Script ID、版本、Package、Tag 或 Release 变化，不改写贡献历史。Issue #1 的最终评论与状态通过上方实时链接查询；不自动进入 Phase 2。

---

## Previous 15 PASS / 3 PARTIAL Review（历史原文保留）

以下完整保留上轮文本；其中“当前”“本轮”“剩余”指当时状态，最新结论以上方Final Closeout及Testing当前矩阵为准。

### Historical — Phase 1 Final Real-Host Acceptance · 0.2.3

Date: 2026-10-08。**结论 B：Implementation Complete — Acceptance Evidence Still Missing。15 PASS / 3 PARTIAL / 0 FAIL；Issue #1 保持 Open。** R-B 和 R-C 已满足，复杂 Native Import / 自动选择通过；剩余 #12/13/14 是实际 Export 文件及 Native Re-import 证据缺口。没有新确认的生产实现问题，不因浏览器下载捕获限制进入开发或伪造 PASS。

### Historical — Baseline / 本轮范围

HEAD / fetch 后 origin/main / v0.2.3 tag：`fc8145a9b59ae0ef3f4df3ebaebd69a33dc0f07c`；main、版本 0.2.3。开始时五份已知 Markdown 未提交修改保留并继续更新，没有未知代码改动。Issue #1 原始正文与 PRODUCT_PLAN 第 25 节再次只读核对，当前 Open；没有 GitHub 写入。

正式 Extension SHA-256 `a1bffdf271b03ad618f8cf90d99346fd4298e116337f315943bb3cceb23231b7`；content SHA-256 `5060feb3ccbe4c76d3d1dd2c305ff843e8d66882ceea9f13190605b15e52a46b`。实际 ST 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9` / Helper 4.11.3 / Standalone 8001。Helper 最大化上下文关闭，未修改生产源码/核心/安全规则。R-A / R-B 通过真实产品 UI，原生文件只读核验；没有内部 API、Mock 或 Runtime 拦截代替实际流程。

### Historical — R-C Owner Evidence

**OWNER-IOS-02，E / Owner Manual Acceptance**：同一 iOS Simulator Mobile Safari，Owner 明确确认普通 Prompt 滑动正常、不触发排序、能到列表底部、最后 Prompt 可见。结合 IOS27-R1 与 OWNER-IOS-01，#15 PASS。原始 **29 PASS / 16 NOT TESTED** 原封保留，新回执单列；不是 Codex 独立观察或 physical iPhone。Owner receipt SHA-256：`c354d60d4471a3e99624059d8267f1792dc5a5a31b1617102623e1968e41b653`。

### Historical — R-A Native Interoperability

| Golden Path | 当前状态 | 真实证据与缺口 |
| --- | --- | --- |
| #4 复杂 Import / 自动选择 | PASS | MPM 文件选择器导入公开复杂 native fixture，16 definitions / 两组 / 非默认顺序 / 开关 / 参数 / future fields 均在 Native / MPM 读回；实际落盘与 fixture 结构相等 |
| #12 Export→Native Re-import | PARTIAL | 实际 Export 点击有完成提示；工具未捕获文件，Native Import UI 没有执行，不以 disk raw 冒充 Export |
| #13 无修改复杂 Round Trip | PARTIAL | Import raw 完整无损；完整 Export 文件比对与 Native 原生往返仍缺 |
| #14 编辑其他 Prompt 后未知字段仍在 Export | PARTIAL | 实际 Editor Dirty→Unified Save→刷新/重新选中读回，Raw Preservation PASS，只有 Alpha content 改变；Export 文件仍未核验 |

第一次等待下载失败、第二次有界 8 秒捕获仍未取得文件；精确文件与已观察页面资产检查没有结果；Safari 备用操作未能可靠打开 Launcher 取得下载。不修改下载实现/注入 Hook，不将该工具限制算为产品 FAIL。固定 Native importer 源码直接处理完整 presetBody，但实际迁移/unknown-field normalization 未执行，保留 NOT TESTED。

完整参数、hash、structured diff、真实操作和清理见 [本轮 Real Host 记录](REAL_HOST_VALIDATION.md#phase-1-final-real-host-acceptance2026-10-08)。fixture 来自公开原生 Default，不依赖私有 schema；key 顺序允许变化，数组/order 顺序严格保留。未观察到已执行路径的数据损失；未执行的 export/import 不推断无损。

### Historical — R-B Prompt Lifecycle

**#6 / #10 / #11 全部 PASS（C）。** 另一公开独立 Preset：Title / Role / Content Cancel 无 Pending / Native 写入；Editor Save 只 Dirty；Unified Save 只改三字段并刷新读回。Detach 只删活动组引用，definition / 其他组保留；重新挂接建立唯一正确引用；均经保存/刷新。两个独立 disposable custom Prompt 分别做真实 Delete Cancel 与 Confirm：取消无 Dirty / 写入，刷新仍在；确认只 Dirty，统一保存后刷新确认 definition / 全部 target refs 清除，其他数据和未知字段不变，无悬空/重复引用。全程遵循正式资格、不删除内建/Marker、不绕过 checkLive。

### Historical — 18 Golden Paths / Evidence

完整七列矩阵见 [Testing](TESTING.md#真实宿主-golden-path)，**15 PASS / 3 PARTIAL / 0 FAIL**。先前只读整理 10/8；加入 OWNER-IOS-02 后 11/7；本轮新增 #4 / #6 / #10 / #11 PASS 达到 15/3。既有 F18 / REL023 / ST119-R1 / IOS27-R1 / OWNER-IOS-01 保持原范围，未重跑全部 18 项、自动发行套件、A–I 或 Simulator 45 项。

本轮报告 ST119-FINAL-RA-RB SHA-256：`9c4afcefbb1b74bf035b200097f21d30d2294aa561ffc9c7f07ef1a24d954c0a`；独立 checkpoint、逐项比较、截图与可恢复私有备份本地保留。公开文档仅脱敏 ID/hash，无私人文件路径、Prompt/聊天或凭据。

### Historical — Data Safety / Cleanup

先核对8001独立 dataRoot / 当前 native preset / Binding / Helper，再完整备份；没有覆盖现有同名 Preset。结束恢复原 Native 选择、关闭本轮浏览器页、可恢复归档两个测试 Preset 与五个本轮自动 backup，恢复原 settings/Binding/Helper。未创建聊天；Safari 备用尝试打开过公开默认角色聊天，未提交内容，最后所有聊天字节一致。ST1.19 原 **256 文件**无新增/删除、content/size/mtime 一致；两处 host atomic-save inode 替换明确记录。ST1.18 **3,487 文件** content/size/mtime/inode 零变化，不操作8000。

### Historical — Minimum Remaining Acceptance Checklist

只剩 **R-A 的实际文件互操作链**，不再要求重做 R-B / R-C 或新设备 Gate：

1. 在已备份的 8001 环境，通过 MPM 导入同一公开复杂 fixture 为新独立名称。不修改，More→Export full preset，保留实际下载文件；结构化比较原 fixture，数组/order 不忽略。
2. 将该实际下载文件改为全新测试文件名，通过 ST Native Preset Import UI 导入；Native Selector 选中并由 MPM 读回，对比 definitions / orders / parameters / extensions / unknown fields。若 Native 自己规范化，记录差异和源码依据。
3. 在该复杂测试 Preset 修改一个普通 Prompt content，Unified Save、刷新/重新选择后 Export，保留实际下载文件；对比未知字段/其他 Prompt/排序，仅允许预期 content 改动。保存后的 raw 保留已通过，本步仅补真实 export 文件。
4. 恢复原 Native 选择/Binding/Helper，仅清理本次明确创建数据，并交回两份实际 Export 文件及原生重新导入结果。无需重跑此前通过的完整生命周期或普通滑动。

### Historical — Known Limitations / Identity

保留非原子后端/无 CAS、旧格式须原生迁移、特殊 malformed 数据安全拒绝、仅全局活动组、RH-01 历史 Hub 超时未稳定复现、物理设备/全补丁/完整第三方生态未验。Helper context optimization 的真实 live 改动仍属于正确 Native 未保存保护。Runtime Hub 与 Managed Package 独立；真实 Hub 在线 install/update/CORS/持久化未验，不新增为原 Issue 门槛。

Product author **SheepSheep**；官方 namespace **SheepSheepLab**；真实 Contributor **louisSSR**。原 Commit Author、PR #2、Git history、Credits、copyright、README / BRAND attribution 保留；Manifest / repository / 版本 / Package 未修改。

### Historical — Draft Issue Comment — Remaining Acceptance（未发布）

> Phase 1 implementation 已完成，本轮补验后完整18项为 **15 PASS / 3 PARTIAL / 0 FAIL**，建议 Issue #1 暂时保持 Open。
>
> 正式0.2.3在ST1.19.0 / Helper4.11.3中，复杂Native Import/自动选择和普通Prompt完整生命周期（Title/Role/Content Cancel→Editor Dirty→Unified Save→刷新；Detach/Reattach；两个独立条目的Delete Cancel/Confirm）通过。编辑其他Prompt后，实际Native raw中的unknown fields、extensions、其他definitions和orders完整保留。
>
> iOS Simulator Mobile Safari 原始 **29 PASS / 16 NOT TESTED** 不变。Owner 另明确确认长按排序、统一保存/刷新持久化、切换及普通滑动到底且不改顺序；GP#15 PASS。该证据为Owner Manual Acceptance，不是Codex独立观察或物理iPhone。历史ST1.18 Foundation只按原0.1.2/Hub0.8.1范围引用。
>
> 剩余只有#12/13/14：取得实际无修改MPM Export文件并结构化比对；经ST原生Importer以独立名称重新导入/读回，记录Native normalization；取得无关编辑保存刷新后的Export文件核对unknown fields。当前工具未捕获下载文件，不以保存raw替代Export，也不因此确认产品Bug。不需要重做已通过的R-B/R-C或增加设备、完整插件生态、Managed Package实机新门槛。
>
> 安全保护没有放宽，测试状态已恢复。保留后端无原子事务/CAS、旧格式迁移、特殊格式拒绝等限制；Hub Runtime和Managed Package Gate独立。感谢louisSSR的Foundation贡献，原Author/PR#2/历史/版权/Credits继续保留。证据见docs/REAL_HOST_VALIDATION.md、docs/TESTING.md和docs/PHASE1-CLOSEOUT-0.2.3.md。完成这条实际文件链后再复核关闭条件。

### Historical — Scope / Owner Review

只更新此前五份必要本地Markdown。无生产代码/安全逻辑/身份/版本/核心修改；无Build/Candidate/Package；无Commit/Push/Tag/Release/Issue改动或评论发布。停在Owner Review，不自行关闭Issue。

---

### Historical — Previous Evidence Consolidation（保留上轮 10 PASS / 8 PARTIAL 历史）

以下为上轮只读整理的完整文本；其中“当前”“本轮”“剩余”均指当时状态，最新结论以上方Final Acceptance和Testing矩阵为准。

### Historical — Phase 1 Real-Host Evidence Consolidation & Final Closeout Review · 0.2.3

Date: 2026-10-08。**结论 B：Phase 1 implementation complete but required acceptance evidence remains — Keep Issue #1 Open。** 本轮只读审计与本地文档整理，不重新执行宿主操作或发布测试。没有确认的生产实现缺项；保留最小必要验收链，等待 Owner Review。

### Historical — Baseline / 审计输入

本地 HEAD、fetch 后 origin/main、v0.2.3 tag 均为 `fc8145a9b59ae0ef3f4df3ebaebd69a33dc0f07c`；工作区开始干净；版本 0.2.3。[Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 为 Open，正文和全部评论已读。[PR #2](https://github.com/SheepSheepLab/MieMie-Preset-Manager/pull/2) 已合并，正文、会话评论、行内评论与 reviews 已读；当前后两类为空。

重新读取 README、BRAND、PRODUCT_PLAN 第 25 节及 Owner clarification、COMPATIBILITY、TESTING、REAL_HOST_VALIDATION、PER-CHAT-PRESET-BINDING、RELEASE-0.2.3、validation-results.release023，以及 ST119-I0 / ST119-R1、IOS27-R1 / IOS27-T1 和 Owner 本次手动回执。原始报告在本地保留，不把不可公开的本机路径当作公共证据链接。脱敏 ID / 原始报告 hash 见 [Evidence Ledger](REAL_HOST_VALIDATION.md#evidence-ledger--当前收口状态)。

### Historical — Evidence / 版本范围

| 证据 | 类型 | 可确认范围 | 不能推导 |
| --- | --- | --- | --- |
| REL023（2026-10-07） | A Automated Contract / B Browser Simulation | Node 325、Package 71、当前 Hub 专项 15、Browser 192、UI/Drag 24、Save comparison 8 | 本轮重跑或真实宿主全矩阵 |
| F18（2026-10-04） | C Real Desktop Host，含人工 RH-01 复核 | ST 1.18.0 / Helper 4.11.2 / Hub 0.8.1 / Safari 26.6，0.1.2 Foundation 基础路径 | 0.2.3 全功能 / 全部 1.18.x |
| ST119-I0 / ST119-R1 | C Real Desktop Host；诊断片段另标 | 正式 0.2.3 / ST 1.19.0 / Helper 4.11.3，Standalone 代表性路径，真实冲突保护 | Entire 1.19.x / 插件生态 / 当前 Hub 实机 |
| IOS27-R1 / IOS27-T1 | D Simulator Mobile Host | iOS 27.0 Simulator iPhone 17 / Mobile Safari，原始 29 PASS / 16 NOT TESTED | Physical iPhone / Android / 全部未测交互 |
| OWNER-IOS-01 | E Owner Manual Acceptance | 长按/拖动/排序/统一保存/刷新持久化、预设切换 | Codex 独立观察、普通滚动、删除、全部参数/阴影/横屏/输入法 |

ST 1.19 Source Verification / Automated Contract / Representative Real Host PASS；Helper context optimization 实际改动 live 引发 Correct Conflict Protection，不是 MPM false positive。关闭优化并安全重新读取后同一切换正常。首次异常没有字段快照的边界及后续字段复现分开记录，历史报告未删除。完整详情见 [ST 1.19 记录](REAL_HOST_VALIDATION.md)。

### Historical — 18 Golden Paths

完整 Requirement / Implemented / Automated / Real Host / Status / Evidence 表以 [Testing 当前矩阵](TESTING.md#真实宿主-golden-path) 为唯一逐项表：**10 PASS / 8 PARTIAL**。#8 由 F18 桌面顺序证据与 OWNER-IOS-01 移动完整统一保存/刷新链 PASS；#15 的长按、拖动、按钮、编辑、软件键盘已通过，核心普通列表滑动还缺证据。

实现与契约依据包括 [Controller](../controller.ts) 的完整 import/export/copy 与统一保存、[Model](../model.ts) 的 raw patch / 所有组保留 / 独立操作资格 / detach-attach-delete、[Adapter](../st-adapter.ts) 的 native completion 与 checkLive；[model tests](../tests/model.test.cjs)、[adapter tests](../tests/st-adapter.test.ts)、[native contracts](../tests/st-native-contracts.test.cjs)、[prompt policy](../tests/prompt-policy.test.cjs)、[browser flow](../tests/browser-check.cjs)、[mobile responsive](../tests/mobile-responsive.cjs)、[presentation](../tests/presentation-browser.cjs) 及 REL023 发行回执。A/B 覆盖不是 C/D/E 证据的替代品。

### Historical — Previously Missing Four Groups

| 组 | 当前判断 | 真正剩余 |
| --- | --- | --- |
| A Native Interoperability | Acceptance Evidence Missing | 复杂导入→自动选择→无修改导出→原生重导入→数据/语义；未知字段编辑保留（#4/12/13/14） |
| B Prompt Lifecycle | PARTIAL | Role Cancel/Save；Detach 持久化/定义保留及 Reattach；Delete Cancel/Confirm 与保存刷新（#6/10/11）。Title/Content 已有 D 实机，不重列待验 |
| C Mobile | PARTIAL，大部分核心链已完成 | Prompt 列表普通触摸滑动到底、且不改变顺序（#15）。长按排序、软键盘及保存刷新不再待验 |
| D Representative ST 1.19 | PASS，已完成 | 无。完整补丁/第三方生态不是原 Issue 新关闭门槛 |

### Historical — Implementation Gaps

None identified within the original Phase 1 scope and Owner-approved clarification。无证据指向必须修改 MPM 安全规则才能验收；已查明 Helper 交互不算未解决兼容 Bug。当前结论不宣称所有设备/第三方组合无 Bug。

### Historical — Minimum Remaining Acceptance Checklist

只补以下三组，在隔离、备份、无私人内容的可恢复副本上执行；无需重跑全部 18 项。

- **R-A（#4/12/13/14）：复杂 Native 互操作 + 未知字段。** 使用一份有效全局活动组 100001 的复杂安全测试 Preset，包含多组/order metadata/hidden entries/深层未知字段。通过 MPM Import，确认原生自动选择且原来源不变；不修改直接 Export，比对完整 JSON（含未知字段与所有组）。将导出经 ST 原生导入器导入到独立名称，核对实际载入、原生识别设置与 Prompt/order 语义，分别记录 MPM raw 保留与 ST 原生迁移/白名单行为。再注入明确未来字段，修改另一个 Prompt，统一保存并导出，核对只有预期变化、未来字段仍在。Fixture round-trip 与准备 JSON 本身不计这条真实链通过。
- **R-B（#6/10/11）：剩余 Prompt 生命周期。** 在普通 custom 测试条目改 Role→Cancel，确认无改；再改 Role→Editor Save→Unified Save→刷新，确认持久化。Detach→统一保存→刷新，确认移出活动顺序/位于解锁条目区、definition 与其他组保留；Reattach→统一保存→刷新，核对合法引用与状态。再 Detach，打开真正 Delete 确认，先 Cancel 核对未删，再 Confirm→统一保存→刷新，确认目标定义/所有目标引用删除、无关内容保留，并核对受保护内建/Marker 无非法物理删除入口。上述分别对应 R-B1（Role）、R-B2（Detach/Reattach）、R-B3（Delete）。无需再次重复已通过的 Title/Content 键盘链。
- **R-C（#15）：剩余核心移动滑动。** 在现有 iOS Simulator Mobile Safari 的安全测试列表做普通触摸上下滑动至底部，确认最后条目可达、仅滚动不进入排序、不改变顺序。记录 SCROLL-01 + TOUCH-04 的明确结果。无需重新长按排序/键盘/保存，不要求物理 iPhone/Android 或全部未测组合。

其余原始未测参数 Switch、reasoning、长菜单阴影、拖动旋转、Dirty Chat 切换等保持真实状态，不借此扩大 Issue #1 关闭条件。若三组补证出现真实问题，再按具体失败判断，不以放宽 checkLive 通过测试。

### Historical — Runtime / Managed Package / Known Limitations

Hub Runtime API v1 使用 F18 的真实 Hub 0.8.1 基础证据和当前 A/B 契约；0.2.3 Managed Package 有公开 discovery/digest 与 synthetic install/update，真实 Hub 在线安装/CORS/持久保存未验。两者分开，Managed Package 不追加为原 Issue #1 门槛。

保留 ST 后端非原子事务/无 CAS、旧格式须原生迁移、特殊 malformed 格式 fail-closed、全局活动组限制、物理移动设备与完整第三方生态未验。RH-01 一次历史 Hub 打开超时未确认根因，后续无法稳定复现、不再是 Foundation merge blocker，保留观察；不声称控制台全零。Helper 最大化上下文会修改 Native live settings，MPM 正确保护；本轮没有代码修复。

### Historical — Identity / Attribution

Manifest author = SheepSheep（Founder / Project Initiator / official product author）；SheepSheepLab 是官方开发/维护/发布命名空间。louisSSR 仍为真实 Community Contributor，原始 Commit Author、PR #2、Git history、copyright、Credits、README / BRAND attribution 保留。Manifest、repository、Product ID、Script ID、版本和资产未修改。

### Historical — Draft Issue Comment — Remaining Acceptance（未发布）

> Phase 1 的实现已完成，Issue #1 建议暂时保持 Open，等待三组最小验收证据。
>
> 已汇总历史 ST 1.18.0 / Helper 4.11.2 / Hub 0.8.1 Foundation 记录；该记录只对应当时的 0.1.2 包。正式 0.2.3 在 ST 1.19.0 / Helper 4.11.3 的代表性读、切换、编辑、保存、刷新、Native 未保存保护与 Per-Chat 协调通过。此前切换提示已确认是 Helper 最大化上下文实际改变 Native live settings，属于正确冲突保护；关闭优化并明确重新读取后切换正常。
>
> iOS Simulator Mobile Safari 原始报告为 29 PASS / 16 NOT TESTED，保留不变；Owner 后续明确确认长按拖动、排序、统一保存、刷新持久化和预设切换。#8 PASS；#15 的按钮、编辑、软键盘与长按拖动已有证据，仅普通列表滑动且不触发排序仍待确认。没有声称物理 iPhone/Android 或整个 ST 插件生态通过。
>
> 完整 18 项：10 PASS / 8 PARTIAL。只剩：（1）复杂 Native Import→自动选择→无修改 Export→ST 原生 Re-import 的数据/语义，以及编辑其他 Prompt 后未知字段保留；（2）Role Cancel/Save、Detach/Reattach、真正 Delete Cancel/Confirm 的统一保存/刷新链；（3）Simulator 普通触摸列表滑动到底且不改变顺序。无需重跑全部 Golden Path，ST 1.19 代表性实机不再待验。
>
> Runtime Hub 与 Managed Package 分开；真实 Hub 在线安装未验，但不新增为原 Issue #1 关闭门槛。保留非原子后端、旧格式迁移、特殊格式安全拒绝及设备/插件范围限制。感谢 louisSSR 的 Foundation 贡献；其 Commit Author、PR #2、版权与 Credits 继续完整保留。
>
> 证据与最小操作见 docs/REAL_HOST_VALIDATION.md、docs/TESTING.md、docs/PHASE1-CLOSEOUT-0.2.3.md。上述剩余实际回执完成后，再复核关闭条件。

### Historical — Scope / Review

仅本地 Markdown 文档变化；没有 production code / schema / Generation Gate / Adapter safety 修改，没有版本/identity 修改，没有 Commit / Push / Tag / Release / Issue 修改，没有重新打包 0.2.3 或改写原始报告。此草稿未发到 GitHub；等待 Owner Review。
