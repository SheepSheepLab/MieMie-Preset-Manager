# MieMie Preset Manager 0.2.3

Tavern Helper Script JSON · GitHub Extension Package v1 · Pre-release

## Prompt compatibility semantics

Copy／Detach／Delete 使用独立资格，细化兼容语义。Copy 为 MieMie 便利功能，仅复制普通自定义 Prompt，以新 UUID 保留完整深层字段。Detach 对齐固定 ST 1.18.0／1.19.0 原生资格 `system_prompt === false`，仅移除当前 active prompt_order reference；定义、其他组、其他引用与未知字段保留。物理 Delete 使用 Owner 批准的保守策略：普通自定义条目先 Detach，再确认删除定义及全部组中目标引用；Marker、Built-in／protected identifier 和 system_prompt=true 继续保护。Edit／Toggle 保持既有原生语义，Marker 内容不作普通编辑，malformed raw 安全失败。

| Prompt 类型 | Copy | Detach | Delete |
| --- | --- | --- | --- |
| 普通 custom，system_prompt=false | 是 | 是 | 是 |
| role=system 普通 custom | 是 | 是 | 是 |
| non-marker，system_prompt=true | 否 | 否 | 否 |
| marker=true，system_prompt=false | 否 | 是 | 否 |
| normal native marker，system_prompt=true | 否 | 否 | 否 |
| protected ID，non-marker，system_prompt=false | 否 | 是 | 否 |
| missing system_prompt | 否 | 否 | 否 |

表中 Detach 还要求有效 active reference；Delete 要求已从当前活动组解除并确认。Raw object + local patch 保持权威；未统一保存前零 Host writes。原生保存、磁盘回读、应用和 confirmed state 流程不变。

## Launcher resilience

Standalone／Shortcut PNG 正常时继续显示正式 PNG；加载失败时使用固定本地 sheep SVG，无外部网络或 Emoji fallback。Dispose 清理错误事件，不修改 Hub Host。Manifest launcher.icon 仍为“预设”。Native Launcher／Floating／Dock／Orb 动画与双模式保留。

## Owner-approved UI polish / Scope Audit

- **Visual only**：顶部预设菜单与参数菜单统一清透紫样式；上下边缘渐变阴影仅在对应方向仍可滚动时出现，到头消失，支持淡入淡出与 reduced motion。阴影独立覆盖层不改变菜单尺寸，不拦截点击。
- **Interaction**：预设选择改为页面内菜单；预设和推理选项以当前选中行定位，保留原顺序与高亮。推理菜单恢复 Owner 指定参考包的自适应高度／边界算法，不固定行数；预设高度／展开位置保留。支持键盘方向键、Home／End、Enter、Escape、外部点击和生命周期清理。
- **Accessibility**：combobox／listbox／option 语义、aria-selected／expanded／controls、键盘焦点；阴影 aria-hidden，减少动画偏好生效。
- **State behavior**：仅管理菜单开关、confirmed label、焦点、滚动与 observer。选择仍经既有 Controller／Binding；参数仍先暂存。没有新增 Host 写入、Raw patch、Binding schema／namespace／stable ID／tombstone 或 Generation Gate 改动。controller.ts、st-adapter.ts、preset-binding.ts、chat-binding-host.ts、automatic-regex-display.ts 与公开基线逐字不变。

## Compatibility / regression

MieMie 兼容原生数据、数据完整性、externally observable contracts 与 Runtime／API／Event 语义；在 interoperability 保持的前提下可以提供更安全、简单的专属交互，不要求机械复制 ST UI 或内部实现。

Per-Chat 默认／inherit／override／missing／tombstone／rename／delete preset、快速 A→B→C、Native autoSelect late race、manual deviation、dirty chat switch 和 Generation Gate 保持。只有安全状态下 Resolved Target = Confirmed Applied 才允许受保护的普通原生生成；绕过 Native Generate 的直接扩展请求仍不在范围。Prompt Delete 与 Preset Delete 独立。

B1／B2、编辑／复制／Toggle／排序／Detach／Attach／Delete、统一保存、冲突／外部变动、导入导出、预设复制／重命名／删除、Round Trip／Unknown Fields／全部 groups／metadata／hidden entries／deep fields、参数／正则显示与 Standalone／Hub／Shortcut 回归通过。

Owner 已完成当前 Candidate 及后续 UI 真实使用验收。没有新的精确 ST／Helper／Hub／移动浏览器组合证据，不宣称 ST 1.19 fully real-host tested、物理移动全面通过或整个 Phase 1 完成；Issue #1 继续 Open。历史 Foundation 实机范围见 [Real Host Validation](REAL_HOST_VALIDATION.md)。

## Acceptance Anchor

升版前从源码重现 Owner-tested 0.2.2：

- JSON SHA-256：`7f739c10bc994ccfd8cf3c3119138dc2aab6b1c8047bc2c0d993463fa5dd7129`
- contentSha256：`7d66a76c4cc75aee7fe43011e8dff5036318971b4a025b6fc4f329d3b45e79c2`
- schemaVersion 1、productId miemie.preset-manager、version 0.2.2、scriptId 98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1、完整官方 repository 均匹配。

正式 0.2.3 JSON 由同一源码 build 生成，未手工编辑 bundle。

## Fresh release validation

锁定依赖安装（npm ci，使用本地已缓存锁定包）、check、test、build 均 PASS。Node 24.13.1、TypeScript 6.0.3、webpack 5.108.4、Playwright 1.62.1／Chromium 151.0.7922.34。

| 检查 | 本轮 PASS |
| --- | ---: |
| Node，含 Binding／Generation／Regex／Eligibility／native contracts | 325/325 |
| Managed Package，15 production + 56 原始 Hub 上游 | 71/71 |
| 当前正式 Hub Package 源码，commit 9c81bbcbf9b87b5118b92415a34c57783592bccc | 15/15 |
| 功能浏览器 | 19/19 |
| Responsive／Mobile synthetic | 9/9 |
| Binding 浏览器 | 35/35 |
| Parameters 浏览器 | 44/44 |
| Parameter Motion 浏览器 | 28/28 |
| Presentation，含 8 条 PNG success/failure SVG 回退路径 | 57/57 |
| UI／拖拽 | 24/24 |
| 保存比较正确性 | 8/8 |

功能／展示浏览器共 192 项，页面错误 0；UI 专项另 24 项，页面错误 0。性能耗时仅本机诊断，没有跨机器阈值或真实总保存延迟结论。独立 clean checkout 新安装锁定依赖后 build／package 为发布前强制门槛：四份资产与 production／preview JS 六份文件必须逐字一致；实际结果由最终发布回执确认。

## Hub / Package

Runtime API v1；Managed Package v1。Product ID `miemie.preset-manager`；Script ID `98c9a9af-7fd3-41a6-81bc-cd86ebf5e0b1`；author `SheepSheep`；repository `https://github.com/SheepSheepLab/MieMie-Preset-Manager`；Hub API min/max 1/1。

测试使用完整官方 0.2.1 与 0.2.2 资产，分别验证 enabled true／false 更新至 0.2.3：实例 ID、enabled、data、folder/order 与其他脚本保留，新 content／display／Runtime version 和 persisted readback 均为 0.2.3。官方 0.2.2 资产固定摘要 `7ef1df562a850097212aba5fd322bdffe7ca50d7b6149002fe876ce440fbcd58`。

发布后用 `tools/verify-public-package.cjs` 配合当前正式 Hub 原始模块，直接执行真实公开 GitHub discovery、四份资产 digest／本地 bytes 校验、fresh install 和两个历史版本更新。宿主树、运行版本读取及持久保存依赖为隔离合成环境，不执行下载脚本，不写真实 Helper；不替代 CORS／实机持久化验收。最终公开 discovery 必须 latest=0.2.3、installable=true。

## Assets / integrity

公开 Script data={}，生产资产不包含 Owner 私人 Preset、聊天内容、凭据、测试账号或本机绝对路径。运行时不向 Hub Server／Registry／第三方分析／遥测／AI 服务上传 Prompt／Chat；Hub 仅处理入口、package 和 runtime contract。

| Asset | SHA-256 |
| --- | --- |
| `MieMie-Preset-Manager-Extension-0.2.3.json` | `a1bffdf271b03ad618f8cf90d99346fd4298e116337f315943bb3cceb23231b7` |
| `MieMie-Extension-update.json` | `c4cec49a52e4a4ba2bcb84bac46ecb28ffa95670f3deb1cd3f6825e446107585` |
| `manifest.json` | `76c3d628f20aabc64b43d8c58a9eab2897c5a5232764d84fe801b88161981873` |
| `SHA256SUMS` | `165eaa176720929b32f413a13b5800be276ab6fea7cc5f39bef7304d7a836c4f` |

contentSha256：`5060feb3ccbe4c76d3d1dd2c305ff843e8d66882ceea9f13190605b15e52a46b`。

## Attribution / boundaries

SheepSheep 为 Founder／Project Initiator／official product author；SheepSheepLab 为官方开发／维护／发布命名空间。louisSSR 的原始 Commit Author、PR #2、Git history、contribution copyright 和 Credits 保留；未将 Contributor 贡献重新署名。BRAND／素材／GPL／第三方声明不变。

仅发布 Preset Manager 0.2.3；Hub／Registry zero modifications。0.2.0／0.2.1／0.2.2 的 Tag、Release、Notes 和 Assets 不改写；保留历史官方资产进行更新测试。Issue #1 不关闭、不编辑、不评论、不改标签或负责人；Phase 1 Closeout Audit 后续单独执行。
