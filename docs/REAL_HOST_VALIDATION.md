# Initial Real-Host Validation · 0.1.2

2026-10-04，Maintainer 完成 Foundation 基础宿主验收。此记录只覆盖下列实际组合及已执行路径，独立于 [自动测试](TESTING.md#自动检查结果)。不代表正式发布、完整 Phase 1、所有 18 项 Golden Path 或整个 ST 1.18.x / 1.19.x 系列通过。

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

## 剩余验收与 Gate

仍待 ST 1.19 实机及其他补丁版本、完整复杂预设 Round Trip、原生重新导入、Unknown Fields 深度实机、Built-in / Marker 全边界、失败／并发、第三方钩子、物理手机与软键盘、Role / Content 及其余未执行 Golden Path。具体逐项范围见 [Testing](TESTING.md#真实宿主-golden-path)。

Maintainer 判定本次 Foundation 基础实机 Gate 为通过；结合基础自动检查和不变交付哈希，可进入 Foundation PR 的合并决策。此记录不执行合并。[Issue #1](https://github.com/SheepSheepLab/MieMie-Preset-Manager/issues/1) 继续 Open，用于后续 Phase 1 验收与迭代。

## 0.2.2 Owner Review（2026-10-07）

Owner 在真实酒馆试用当前候选，确认聊天切换带动各聊天最后选择的预设，指出原生正则随预设切换产生重载提示；随后认可参数窗口、统一清透紫外观及只变形外框的设置动画，并授权收口发布。此处记录 Owner 反馈及认可，不推断新的 ST/Helper/Hub 精确版本，不声称所有新增路径已获得独立完整宿主回执。0.2.2 的自动/固定原生源码契约、Package 更新与公开发现检查单独见 [Release 0.2.2](RELEASE-0.2.2.md)。历史 Foundation 的实际组合和 SHA-256 不变；ST 1.19 全宿主、完整 Phase 1、移动软键盘等深度验收仍待完成。
