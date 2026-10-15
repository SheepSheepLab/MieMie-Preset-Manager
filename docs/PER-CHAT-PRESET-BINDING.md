# Per Chat Preset Binding 0.6.0 Candidate

0.6.0 尚未发布。此文档取代 0.5.1 的 inherit / override 业务规则。公开历史和旧数据保持不变。

## 正式规则

一个真实聊天记住一个预设。原生重命名保持绑定语义，文件名只是可变化的定位符。单人身份是 avatar + chat filename，群聊身份是 group ID + chat filename。角色名称不是身份；新聊天、分支等获得新文件身份时使用当时默认，不继承复制进来的旧 chatKey。相同身份继续生成、重新生成或删除部分消息不改变绑定。

全局默认只提供新聊天初值和确认删除后的回退。A → B → A 仍保存聊天自己的 A；之后默认改 C，原聊天仍 A，新聊天才 C。绑定仅引用预设身份，不存内容快照。用户保存 A 的新内容后，所有绑定 A 的聊天自然使用新内容。

原生手动选择与 MPM 选择双向同步；有聊天时更新聊天，无聊天时更新默认。不要求面板打开。CHAT_CHANGED 的原生自动选择属于聊天加载过程，不覆盖新聊天已经保存的目标。不建立第三方脚本来源白名单。

## 存储

唯一新版字面量 namespace 是 `miemie.preset-manager.binding-v2`。旧 `miemie.preset-manager` 不读取、不迁移、不删除。其他 metadata 和 extension settings 保留。

全局对象为 `{schemaVersion:2, revision, defaultBindingId, bindings:{UUID:{nativeName,tombstone?}}}`。每聊天对象为 `{schemaVersion:2, presetBindingId, chatKey}`。chatKey 相同时承认绑定；不相同时，只有原文件仍存在且身份域相同才能确认为复制并独立初始化。原文件不存在或读取失败时先保护旧绑定，不猜测新聊天。通过 CHAT_RENAMED 和旧文件缺失 / 新文件绑定回读核验后，才将原 ID 保存到新 chatKey。全局可暂存 `chatRenames` 回执，以支持未打开聊天的重命名及重启；成功写回后消费并清除。UUID 仅在绑定存储中，绝不加入 Raw Preset。无效新版数据明确报错，不猜测修复。

首次启动以安全读取成功的当前原生预设初始化默认。已有聊天第一次进入新版且无新版绑定，也按此时默认建立绑定。没有可用预设时停止并提示用户创建或选择可用预设；不删除原始数据。

## 新聊天与持久确认

每次 CHAT_CHANGED 都开启新的加载生命周期，即使 chatKey 相同也取消旧读取并使旧结果失效。身份不变时保留已经捕获的新聊天默认初值。固定两版 ST 在新聊天加载时建立文件及 metadata；MPM 捕获身份稳定时的默认 ID，再保存初始化结果。新身份出现时清除上一个初值。异步期间默认变化不会把已捕获的初值换成后来默认。

全局保存先比较磁盘与 live 基线，只改本 namespace，调用原生 saveSettingsDebounced，等待 SETTINGS_UPDATED，再回读。聊天保存指定目标文件预检，再修改捕获的 metadata 对象，调用 saveMetadata，最后核对身份、对象和磁盘。保存响应丢失只回读确认，不重复写入，不把旧对象回滚进新聊天。协调还验证现有 live 绑定确实在对应文件上，防止未确认保存被误当作 ready。

原生保存没有后端 CAS；跨浏览器并发写入仍非事务。发生不一致时明确提示重新加载/读取，不声称保存成功。

## 原生同步和异步边界

Host 使用原生 makeFirst / makeLast 为 CHAT_CHANGED 建立开始/结束边界；BEFORE 捕获当时 chatKey、切换序号及是否在聊天加载中，PRESET_CHANGED 作为完成回执。1.18 selectPreset 返回 void，1.19 可返回 Promise，均必须等原生完成事件及安全回读。

Coordinator 使用一个串行队列，事件合并为最新状态；每次协调最多八轮，持续竞争明确报错。晚到的读取/应用错误在新加载生命周期或新原生事件已接管时丢弃，由最新状态重读。自己的应用不反向生成用户选择意图。新原生选择在旧绑定保存过程中到达时保留新意图，不清除它。目标已正确应用则不重复选择。

状态为 no-chat / initializing / bound / missing，执行状态为 starting / reconciling / ready / paused-dirty / error。只有预设、安全读取及聊天文件确认后才 ready。有本地草稿时保留原快照，暂停自动应用；保存/放弃后协调最新聊天。

## 聊天身份延续

两版 ST 都在重载后才发出 CHAT_RENAMED。重载期间遇到来源已不存在的旧 chatKey，只报待确认，不保存默认。事件完成后验证 avatar / group ID、原文件缺失、新文件原绑定及已存在的连续重命名回执，然后持久保存身份延续。回执只允许对应目标文件消费，不赋予复制文件继承权。原生保存文件名的 sanitize-filename / UTF-8 长度规则按固定宿主契约核验，避免事件中的未清理名称定位错误。

如果外部工具移动文件或在脚本停用期间重命名，没有可信原生回执，则明确停止并保护原 metadata；不凭正文或 metadata 相同猜测身份。这是数据保护边界。

## 删除和重命名

只有成功读取完整目录且名称确实不存在才 tombstone。目录失败、超时、Helper 不可用、存在但不安全均不等于删除。重命名需原生完成回执及旧名消失/新名有效证据，更新同一个 ID 的名称。

聊天绑定被确认删除后，把当前默认 ID 正式保存为新绑定。之后默认再次变化不会移动该聊天。删除再创建同名预设不会复活旧 tombstone。

默认本身被确认删除时，按原生 getAllPresets 的既有顺序选择第一个通过安全结构校验的预设；规则确定且不重排。没有安全候选则 default=null 并停止。仍存在但不可读取的默认不能自动替换。当前 UI 显示替代后的默认名称；不批量遍历未打开聊天。

## 生成安全

移除 generationDepth；STARTED / ENDED 不要求成对。STARTED 只替换本次检查的取消信号；AFTER_COMMANDS 确认聊天、预设、草稿状态并保存许可；CHAT_COMPLETION_SETTINGS_READY 再核对身份、epoch 和预设 revision。工具续接可以重新取得许可。Stop 取消 MPM 自己的等待，脚本停用清理事件、计时器、读请求；新尝试不继承旧计数。

确实不安全时调用原生 stopGeneration，并显示原因和重新读取的恢复路径。原生 Generate 之外的扩展自发请求不受保护。MPM 不替代 ST 的真实生成锁和 AbortController。

## Helper 和请求有界性

仅当 Helper 的 maximize_preset_context_length 实际启用，且 live 恰为 max_context_unlocked=true 与 openai_max_context=2000000 时，将这两个字段视为已知运行投影。其余 Prompt、顺序、扩展及受支持参数仍严格核对，磁盘 raw 不改写。

自有 HTTP 的响应头和 JSON body 共用 10 秒 deadline，关联服务/聊天/生成取消信号。原生应用屏障从首个未完成 BEFORE 开始共享一个绝对 20 秒期限，后续 BEFORE / 完成事件不能重新起算；所有待完成应用清空后，新应用才获得新期限。每个 adapter 应用也有独立 20 秒上限，生成协调整体 30 秒。原生保存超时只能停止等待，不能证明服务器没保存，因此必须回读后报告。无永久轮询、无限重试或新增全局事件补丁。

## 验证范围

Core/native-contract fixtures、离线浏览器、真实隔离 ST + Helper + 本机合成模型分别记录。合成模型用于验证真实请求链路、工具续接、SSE、落盘和 DOM，不代表真实模型质量或社区角色卡渲染问题已确认。完整数字与 Candidate 哈希由本轮 Development & Validation Report 给出。
