
# 《咩咩预设管理 MieMie Preset Manager》完整开发企划

> 本文件为正式产品需求基线，来自 SheepSheep 提供的《咩咩预设管理-计划书.txt》，保留原文内容，仅整理 Markdown 排版。原文中无 URL 的“GitHub”、文档及附件标记按原文保留，不视为已核验的技术证据。文中工具或推理强度建议是原文背景，不构成仓库运行或协作的强制设置。
>
> 原始计划初始版本为 0.1.0。社区 Contributor 已交付原型，维护者另持有标记 0.1.2 的兼容修订包；原型行为不自动替代本基线，也不等于官方发布或验收通过。后续确认的需求补充应明确记录，不能通过实现反向缩减产品要求。


## 0. 项目信息

项目名称： 咩咩预设管理\
英文名称： MieMie Preset Manager\
建议 Product ID： miemie.preset-manager\
初始版本： 0.1.0\
版本规则： 只使用纯 x.x.x，不使用 alpha/beta/build 后缀。\
推荐 Codex 推理强度：Ultra\
原因：本项目并不是单纯做一个预设编辑 UI，而是涉及：\
- SillyTavern 当前预设格式完整兼容\
- Prompt Manager 行为兼容\
- 原生预设读写 / 当前预设切换\
- 无损导入导出\
- 拖拽排序\
- PC / 手机双端交互\
- Hub / Standalone 双生命周期\
- SillyTavern 后续字段变化的兼容性\
请不要为了快速出界面而降低兼容层设计质量。\

## 1. 项目目标

开发一个运行于 SillyTavern / Tavern Helper 环境中的「咩咩预设管理」Extension。\
目标不是重新创造一种 MieMie 私有预设格式，而是：\
完整读取、编辑、管理、导入、导出和切换 SillyTavern 原生 Chat Completion Preset，同时将 SillyTavern 原生 Prompt Manager 的复杂操作重新设计成更直观、更适合普通用户的 UI。\

原则：\
数据上忠于 SillyTavern。\
操作上比 SillyTavern 简单。\
最终用户应该可以几乎不用理解 Prompt Manager 的复杂结构，也能完成日常预设管理。\

## 2. 开发前必须先完成 SillyTavern 调研

正式写业务代码之前，先研究当前 SillyTavern release 分支。\
不要凭记忆实现。\
重点确认当前版本：\
1. Chat Completion Preset 的完整 JSON 数据结构。\
2. 当前预设读取方法。\
3. 当前预设切换方法。\
4. 预设新建 / 复制 / 删除 / 重命名。\
5. 预设导入 / 导出。\
6. Prompt Manager 的 prompts 与 prompt_order 对应关系。\
7. Prompt 新建、编辑、启用/关闭。\
8. Prompt 拖拽重排。\
9. 默认 / Marker / System Prompt 的锁定与删除规则。\
10. SillyTavern 当前 UI 中“解锁 → 删除”的真实行为。\
11. Role、Trigger、Position、Depth、Order 等字段如何实际写回。\
12. 是否已有 Tavern Helper / SillyTavern API 可直接调用。\
优先调用 SillyTavern 已有的数据层/API/函数。\
不要优先：\
- 模拟点击酒馆原 UI；\
- 读取 DOM 文本猜当前状态；\
- 手工篡改页面控件后再让酒馆同步。\
如果官方内部接口能够完成操作，则直接调用数据层。\
开发前先形成一份简短的：\
SillyTavern Preset Compatibility Map\
再开始实现。\
当前官方文档确认 Prompt Manager 是 Chat Completion 请求构造的核心，条目顺序就是发送顺序；In-Chat 模式还涉及 Role、Depth 和 Order。GitHub\

## 3. 最高优先级：无损兼容

这是本项目最重要的技术要求。\
咩咩预设管理器不得定义自己的替代格式。\
读取 SillyTavern Preset 后：\
已识别字段\
正常映射到咩咩 UI。\
暂未识别字段\
必须保留。\
用户编辑一个标题，不允许导致其他高级字段消失。\
用户拖动一个条目，不允许重建整个 JSON 时把未知字段扔掉。\
用户导入未来版本 SillyTavern 的 preset，新增加的字段即使咩咩暂时完全不认识，也应尽可能做到：\
导入 → 编辑已知字段 → 导出\

未知字段仍然存在。\
因此建议使用：\
原始对象 + 局部 patch\
而不是：\
读取 → 转换成 MieMie 简化模型 → 再从简化模型重建整个 JSON。\
后者禁止。\
官方当前默认 preset 本身就同时包含生成参数、模型配置、prompts[] 和按角色分组的 prompt_order[]，不能把“预设”错误理解为只有提示词列表。GitHub\

## 4. 主界面

整体遵循 MieMie 现有视觉体系：\
- 深色紫色系\
- 圆角面板\
- 咩咩产品 Logo\
- 清晰层级\
- 不堆砌文字\
- PC / 手机响应式\
- 禁止 Emoji 作为功能图标\
- 所有编辑、复制、导入、导出、锁链、删除等功能图标统一使用 SVG\
顶部结构：\
咩咩预设管理\
下面：\
当前预设： [ 当前预设名称 ▼ ]　[导入] [导出] [复制]\
三个操作按钮全部 SVG。\

## 5. 当前预设选择

顶部始终明确显示：\
当前使用预设：XXXX\

点击名称后打开预设选择器。\
选择其他预设后：\
必须真正切换 SillyTavern 当前使用的 preset。\
不能只是咩咩管理器内部“看起来切换了”。\
切换成功后重新读取实际 SillyTavern 状态确认。\

## 6. 当前预设复制

点击顶部「复制」：\
例如：\
星夜预设\
生成：\
星夜预设 copy\
如果已经存在：\
星夜预设 copy\
继续生成：\
星夜预设 copy 2\
依此类推。\
复制必须是完整 preset 深复制，不能只复制 prompt 内容。\
复制成功后：\
立即把当前使用预设切换到新复制出的 preset。\

原 preset 不得发生任何变化。\

## 7. 导入

顶部点击导入 SVG 按钮，选择 SillyTavern 原生 preset JSON。\
导入流程：\
选择文件 → 校验 → 导入 → 保存成功 → 自动切换成刚导入的 preset → 刷新管理界面\
导入以后不需要用户再去下拉框手动寻找。\
成功以后当前预设就是新导入的预设。\
遇到同名时按照 SillyTavern 当前行为优先；如需自行处理，不允许静默覆盖。\
应该明确告诉用户：\
已存在同名预设。\

并安全生成唯一名称或让用户确认。\

## 8. 导出

导出的是：\
完整、可以重新导入原生 SillyTavern 的 Preset JSON。\

不能导出 MieMie 私有 JSON。\
关键验收测试：\
咩咩打开一个复杂 ST preset\
→ 什么都不修改\
→ 导出\
→ 用原生 SillyTavern 导入\
→ 功能语义不得发生变化。\


## 9. 条目分类

主界面在当前 preset 下显示分类栏：\
全部 | 分类A | 分类B | 分类C | …… | 未分类\
分类依据：\
条目名称。\

分类本身仅仅是一层 MieMie UI 视图。\
绝对不要为了实现分类，而修改 preset 中条目的：\
- name\
- identifier\
- content\
- order\
- 或其他数据。\
分类算法\
先分析当前 preset 中所有条目的名称，寻找明显重复的命名前缀/结构。\
例如名称：\
写作-正文\
写作-风格\
写作-文风限制\
可以归入：\
写作\
如果：\
剧情-推进\
剧情-节奏\
归入：\
剧情\
需要兼容常见分隔方式，例如：\
- -\
- —\
- |\
- /\
- ::\
- 【分类】标题\
- 其他明显一致的命名前缀\
可以忽略开头纯装饰符号进行分类识别，但：\
不要修改用户真实标题。\

为了避免产生几十个毫无意义的分类：\
原则上至少有多个条目共享稳定命名特征后，才生成该分类。\

无法稳定判断的进入：\
未分类\
第一版不需要做复杂 AI 分类，也不要把预设内容发送给外部模型。\
分类必须在本地确定。\
如果开发时可以拿到 SheepSheep 提供的真实复杂预设，请以真实预设进一步校准分类逻辑。\

## 10. Prompt 条目外观

每个条目视觉上是一个完整的卡片框。\
PC 示例：\
[ 条目标题　　　　　　　　　✎　⧉　🔗　◉ ]\
但正式 UI 中上面的符号全部换成真正 SVG，不使用 Emoji。\
从左到右：\
条目标题\
编辑\
复制\
锁链 / 删除\
激活开关\


## 11. 拖拽排序

不要单独设计六个点 / 拖动手柄。\
整个条目中：\
除按钮、开关和其他交互控件以外的区域\

全部都是拖拽区域。\
PC：\
鼠标按住卡片主体即可拖动。\
手机：\
支持长按卡片主体后拖动。\
需要避免：\
- 用户上下滑列表时误触排序；\
- 用户点编辑按钮却触发拖动；\
- 用户点击开关时触发拖动。\
建议触摸端加入短暂 long-press 判定和移动阈值。\
拖动中应有：\
- 卡片抬起效果；\
- 插入位置指示；\
- 顺滑移动动画。\
拖动结束后应立刻持久化到 SillyTavern 的实际 prompt_order。\

## 12. 条目激活开关

条目最右侧提供 Toggle。\
不使用文字：\
启用 / 禁用\
作为主要操作方式。\
用直观开关表现。\
开关点击应具有短动画：\
OFF → thumb 滑动 → ON\
并即时写入 ST 对应 enabled 状态。\
如果保存失败：\
UI 必须回滚到实际状态，并提示失败。\

不能出现 UI 显示开、实际 SillyTavern 仍然关闭。\

## 13. 编辑 Prompt

点击铅笔 SVG。\
弹出编辑窗口。\
普通模式只呈现三个最重要字段：\
标题\
自定义 prompt 名称。\
身份\
与 SillyTavern 完全一致：\
- 系统\
- 用户\
- AI 助手\
分别对应：\
- system\
- user\
- assistant\
内容\
多行文本编辑框。\
底部：\
取消　保存\
这里不要沿用 Polisher 旧版的“输入即自动保存”。\
这次必须：\
修改内容 → 保存\

才提交。\
点击：\
取消\

必须完全丢弃本次未保存编辑。\
这正是为了用户“改了一半发现不对可以反悔”。\

## 14. 高级字段

因为项目目标是“完整 SillyTavern preset 兼容”，不能只处理三个字段。\
普通用户默认看不到复杂选项。\
编辑窗口下面提供：\
高级设置 ▸\
折叠状态默认关闭。\
根据当前 SillyTavern release 实际结构提供相应高级属性，包括但不限于：\
- Triggers\
- Position\
- Depth\
- Order\
- forbid overrides\
- 其他当前 release 已支持的 prompt 属性\
目前官方 Prompt Manager 已明确支持 Normal、Continue、Impersonate、Swipe、Regenerate、Quiet 等触发条件，以及 Relative / In-Chat Position、Depth 与 Order。SillyTavern Documentation\
最终字段定义不要以本企划中的名字猜测实现，必须以开发当日 SillyTavern release 源码为准。\
即使 UI 暂时无法编辑某个未来字段，也必须无损保留。\

## 15. 条目复制

点击复制 SVG：\
立即在当前条目的正下方插入一个完整副本。\
例如：\
防抢话\
复制为：\
防抢话 copy\
第二次：\
防抢话 copy 2\
依此类推。\
必须生成符合 SillyTavern 当前要求的新 identifier。\
不能让原条目和复制条目共用会产生冲突的唯一 ID。\
除 ID / 名称 / 排列位置之外：\
原条目的兼容字段尽可能完整复制。\

## 16. 锁定 → 解锁 → 删除

这一部分禁止直接按照猜测实现。\
开发者首先必须查看当前 SillyTavern：\
Prompt Manager 中为什么某些条目显示锁定，以及解锁之后实际做了什么。\

必须明确：\
- 哪些是默认 Marker\
- 哪些是内建 Prompt\
- 哪些是真正用户 Prompt\
- 哪些允许移除\
- 哪些只能关闭\
- 解锁具体意味着什么\
- 原生删除最终如何改变 prompts / prompt_order\
在确认 ST 当前规则后，实现 MieMie UI。\
MieMie 希望的操作表现\
正常区域里的可解锁条目显示：\
锁链 SVG\
点击锁链：\
条目进入“已解锁区域”。\

页面所有正常 Prompt 的最下方增加独立区域：\
已解锁条目\
里面集中展示刚刚解锁的 Prompt。\
这些卡片结构基本保持一致，但是：\
原来的：\
锁链按钮\
变成：\
删除 SVG\
点击删除：\
弹出确认框，例如：\
确定删除「防抢话」吗？\
此操作会从当前预设中删除这个条目。\

按钮：\
取消 / 删除\
只有确认后才真正删除。\
特别要求\
如果 SillyTavern 某类系统 Prompt 按设计实际上不能物理删除：\
MieMie 不允许绕过 ST 强删。\

应该保留原生规则，例如仅关闭。\
也就是说：\
MieMie 简化交互，但不能破坏 ST 数据模型。\

## 17. Marker / 系统条目

当前 SillyTavern 默认 preset 中存在：\
- Main Prompt\
- World Info before\
- World Info after\
- Persona Description\
- Character Description\
- Character Personality\
- Scenario\
- Chat Examples\
- Chat History\
- Post-History Instructions\
等内建或 Marker 类型条目。GitHub\
这些不能被错误地当成普通自定义文本条目处理。\
UI 可以保持统一外观，但：\
- 可编辑性；\
- 是否可删除；\
- 是否允许改 Role；\
- 是否允许改 Content；\
全部按照 SillyTavern 当前实际规则处理。\

## 18. 手机端

这是硬性需求，不是“有时间再适配”。\
需要同时支持：\
PC + 手机\
建议响应式规则：\
PC\
面板最大宽度类似现有 MieMie 工具。\
手机\
接近全屏/全高。\
顶部当前 preset 名称允许省略显示，但可点击看到完整名称。\
功能按钮保持至少约 44×44 的触摸热区。\
条目标题过长：\
单行省略或合理双行，不允许把右侧按钮挤出屏幕。\
编辑弹窗在窄屏可以转换成：\
全屏编辑页 / Bottom Sheet\

并正确处理手机软键盘和 visualViewport。\
现有 Polisher 已经有 visualViewport、resize、手机布局等实现，可以借鉴。MieMie-Polisher-Extension-1.1.0.jsonJSON\

## 19. MieMie Hub 双模式标准

直接参考随企划提供的 MieMie-Polisher-Extension-1.1.0.json。\
但是只参考：\
- Extension manifest 思路\
- Runtime 生命周期\
- attachPanel\
- cleanup\
- standalone / Hub 切换\
- Hub ready/disposed 事件\
- 单实例原则\
- UI 基础视觉\
不要复制 Polisher 的业务代码。\
无 Hub\
咩咩预设管理独立启动。\
显示自己的圆形悬浮球。\
点击：\
打开预设管理器。\

有 Hub\
检测到兼容的 MieMie Hub：\
注册为 Extension\
standalone orb 消失\
由 Hub 提供入口。\

Hub 运行中消失\
Extension 自动重新进入 standalone：\
独立悬浮球恢复。\

Hub 再次出现\
重新收纳。\
全过程：\
只能存在一份业务实例。\

不能 Hub 一套、standalone 又偷偷运行一套。\

## 20. Extension Manifest

建议：\
id: miemie.preset-manager\
name: 咩咩预设管理\
version: 0.1.0\
apiVersion: 1\
hubApi.min: 1\
hubApi.max: 1\
图标使用正式 MieMie Preset Manager PNG/SVG 素材。\
禁止用 Emoji 作为 launcher icon 或 fallback icon。\
如果 PNG 加载失败：\
使用一个内置简单 SVG fallback。\

## 21. 内容隐私

Preset 很可能包含：\
- 私人角色设定\
- 成人内容\
- NSFW Prompt\
- 剧情要求\
- 世界观资料\
MieMie Preset Manager：\
不审核、不分析、不上传这些内容。\
不得把 preset 内容发送到：\
- Registry\
- MieMie Hub Server\
- 第三方分析服务\
- AI 模型\
- 遥测接口\
分类也必须只在浏览器本地进行。\
Hub 只负责：\
启动 Extension。\

不能读取整个 preset 内容。\

## 22. 保存原则

任何修改操作必须遵守：\
UI 操作\
→ 修改 SillyTavern 数据\
→ 成功持久化\
→ UI 才显示最终成功状态\

不要：\
先改 UI → 保存失败 → 用户误以为成功。\

涉及整 preset 的重要操作，例如：\
- 导入\
- 删除\
- 复杂重排\
如果当前 SillyTavern API允许，优先使用事务式/原生保存流程。\
在危险变更发生前至少保留内存级旧状态，以便保存失败回滚。\

## 23. 异常处理

需要明确处理：\
- JSON 无法解析\
- 文件不是支持的 preset\
- prompts 数据损坏\
- prompt_order 与 identifier 不匹配\
- 重复 identifier\
- 缺失 prompt\
- 当前 preset 在操作过程中被其他脚本切换\
- 导入时同名\
- ST 保存失败\
- 拖动途中 preset 被切换\
- Extension 被停用\
- Hub 在编辑途中出现/退出\
原则：\
发现不确定数据时不要偷偷“帮用户修”。\

提示问题，保留源数据。\

## 24. 不做的功能

第一版不要扩张。\
不做：\
- 在线创意工坊\
- 点赞\
- 评论\
- 用户账号\
- 云同步\
- MieMie Registry 上传\
- AI 自动改 Prompt\
- AI 分类\
- 预设评分\
- 社交功能\
- 世界书管理\
未来创意工坊会接这个项目，但现在只需要把：\
导入一个标准 ST preset\
做好。\
未来：\
创意工坊下载 preset\
→ 调用咩咩预设管理导入\
→ 自动成为当前 preset\

即可。\

## 25. 测试要求

至少完成以下 Golden Path：\
1. 关闭 Hub\
   - 独立悬浮球正常出现。\
2. 打开预设管理器\
   - 正确读取 SillyTavern 当前 preset。\
3. 切换 preset\
   - ST 实际当前 preset 同步切换。\
4. 导入真实复杂 preset\
   - 导入成功；\
   - 自动切换到刚导入 preset。\
5. 复制 preset\
   - 生成 copy；\
   - 原 preset 不变；\
   - 自动切换 copy。\
6. 条目编辑\
   - 修改标题 / Role / Content；\
   - 点取消不发生任何修改；\
   - 再次编辑点保存，正确持久化。\

## 7. 条目复制

   - 复制项出现在原条目下一行；\
   - 新 identifier 有效。\
8. 拖拽\
   - 拖动整个条目主体；\
   - 顺序写入 ST；\
   - 刷新后顺序仍在。\
9. Toggle\
   - 开启/关闭；\
   - 刷新后状态一致。\
10. 解锁\
    - 条目移动到最底部解锁区。\
11. 删除\
    - 显示确认框；\
    - 取消不删除；\
    - 确认后按 ST 合法方式删除。\

## 12. 导出

    - 原生 SillyTavern 可以重新导入。\
13. 无修改 Round Trip\
    - 复杂 preset 导入；\
    - 不修改；\
    - 导出；\
    - 未识别字段仍存在。\
14. 未知字段测试\
    - 人工加入一个 MieMie 完全不认识的 JSON field；\
    - 修改其他 Prompt；\
    - 导出；\
    - 未知 field 仍存在。\
15. 手机\
    - 滑动列表正常；\
    - 长按拖动正常；\
    - 点击按钮不会误拖；\
    - 编辑软键盘正常。\
16. 启动 Hub\
    - 独立球自动消失；\
    - Hub 中出现预设管理。\
17. 关闭 Hub\
    - Extension 不丢状态；\
    - 独立悬浮球恢复。\
18. Hub 再启动\
    - 再次收纳；\
    - 不生成第二业务实例。\

## 26. 最终交付物

第一阶段需要交付：\
1. 可直接导入测试的 Extension JSON\
与 MieMie-Polisher-Extension-1.1.0.json 类似。\
2. 源码\
不要只提供一个无法维护的巨大 minified blob。\
尽量把：\
- ST Adapter\
- Preset Model\
- Prompt Operations\
- UI\
- Dual Mode Adapter\
- Styles\
- SVG Icons\
逻辑分离。\
最终构建可以合并成 Tavern Helper 单文件。\
3. Compatibility Notes\
记录：\
测试时使用的 SillyTavern release 版本 / commit。\

并注明依赖的 ST API。\
4. README\
包括：\
- 安装方式\
- standalone 模式\
- Hub 模式\
- preset 兼容说明\
- 数据不会上传说明\

## 27. 开发顺序

不要一开始先把漂亮 UI 全画完。\
建议顺序：\
Phase 1 — SillyTavern Compatibility Research\
完成数据/API调查。\
↓\
Phase 2 — Preset Adapter\
做到：\
读取 → 切换 → 导入 → 导出 → 复制。\
先不用漂亮。\
↓\
Phase 3 — Prompt Operations\
做到：\
编辑 → 复制 → Toggle → 排序 → 解锁/删除。\
↓\
Phase 4 — MieMie UI\
实现分类、卡片、SVG、动画、编辑弹窗。\
↓\
Phase 5 — Mobile\
完成手机触控和布局。\
↓\
Phase 6 — MieMie Hub Dual Mode\
按 Polisher 1.1.0 接入。\
↓\
Phase 7 — Compatibility / Round Trip Tests\
最终验证后再交付。\
最终原则\
这个项目不是：\
“做一个看起来像 SillyTavern Prompt Manager 的页面。”\

而是：\
“为 SillyTavern 原生 Preset 做一个更好用的管理前端。”\

因此三个最高原则按顺序是：\
① SillyTavern 数据完整兼容\
② 用户操作明显比原版简单\
③ MieMie Hub / Standalone 标准一致\
任何为了 UI 简化而导致 Preset 数据丢失的实现，都视为不合格。\
