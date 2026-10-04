# Application Presentation · 0.2.0

0.2.0 阶段 Pre-release 的 Presentation 边界。Maintainer 已确认升版本前内容基线 `2c84664207849af59460b81c50cf4b46fedcbd16c255422e38f3720dad2b792a`；版本收口保持该内容，不扩大 Foundation 实机结论或宣称完整 Phase 1 完成。

## 分层与固定参考

- Business：`controller.ts`、`model.ts`、`st-adapter.ts`，本轮逐字未改。
- View：`ui.ts`，同一面板、卡片和编辑器；`setPresentation` 仅切换几何所有权。
- Presentation：`native-launcher.ts`、`native-floating-presentation.ts`、`presentation-styles.ts`、`official-presentation.ts`；只处理入口、几何、动画、焦点及清理。
- Adapter：`dual-mode.ts` 保持单 Source / Controller / Panel，注册可选 Hub Shortcut，保留正式 `closePanel` 路由与旧 session 隔离。

Native Launcher / Floating Presentation Adapted from [Polisher 1.2.1](https://github.com/SheepSheepLab/MieMie-Polisher/tree/5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1)，固定 commit `5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1`。官方应用结构与悬浮入口避让参考 [Story Director](https://github.com/SheepSheepLab/MieMie-Story-Director/tree/32f34865af156d35b628adc6e66018329026df96)，固定 commit `32f34865af156d35b628adc6e66018329026df96`。保留 GPL 来源说明，未复制其他产品 Core 或美术素材；源文件哈希见 [source-provenance.json](source-provenance.json)。

## Native Launcher

64px 圆形 PNG 入口；同一组件供 Standalone 和 Shortcut 使用。Pointer Events 的拖动阈值为 7px，拖动完成抑制鼠标/触摸 click，键盘 Enter / Space 使用原生 button 激活。横向自动 Dock 左或右，纵向存储比例；只读写 `miemie_preset_manager_dock_v1` 的 `{ side, ratio }`，不迁移或覆盖其他产品数据。默认右侧、ratio 0.6；存储不可用时保持本页状态。

使用 safe-area、visualViewport 偏移和大小，响应 resize / orientationchange / viewport resize、scroll；拖动基于缓存 origin 与 bounds，通过 transform 更新，后续窗口跟随合并到 requestAnimationFrame。dispose 取消 pointer capture、rAF、动画、监听器，移除自身 style / orb。独立入口在窗口打开后仍可见；不是旧的隐藏球方案。

## Native Floating Presentation

实际 Surface 对象就是 `.miemie-pm` 应用窗口，不是全屏透明 Overlay。桌面目标 600×780，靠近当前 Orb，按可视区及安全边距 Clamp；空间不足时仍使用同一窗口，内部独立滚动，不缩放整页。

Standalone：串行且去重的 `show/close` 管理 hidden / inert / surfaceState。打开使用 transform / scale / opacity / clip-path 从 Orb 展开，默认 520ms；正式 PNG 的 148px Hero Landing 到 52px Header，默认 760ms。关闭 460ms 回到当前 Dock / Orb rect，再隐藏并恢复 Orb 焦点。动画使用 WAAPI，结束移除临时 splash / veil / hero，清除 will-change 与动画句柄。resize / rotation / visualViewport 变化取消旧 flight，并使用最新 geometry 收口。减少动态效果偏好跳过复杂动画，功能与最终状态不变。

Shortcut：返回同一 Native Presentation handle，**Hub Surface 负责 hidden / inert / session**；Native 只负责视觉。关闭或销毁 Shortcut 不应擅自隐藏 Hub 持有的面板。关闭后从蜂窝入口重新打开时重置视觉所有权；已显示 Surface 的重复打开只聚焦，不重置 Native geometry 或解除动画中的 inert。

## Hub 与入口分工

| 入口 | 打开能力 | Motion 所有权 |
| --- | --- | --- |
| Standalone | 本地 Native Launcher `show` | Preset Manager Native Floating Presentation |
| Hub 蜂窝 | 当前 Extension `open` → `api.showPanel` | Hub 自身 Surface Motion |
| Hub Shortcut | Hub 提供的 `open()`；同一 Extension / Panel | 挂载组件提供 Native Presentation，Hub Surface 控制生命周期 |

Hub API v1 及 Manifest 约束不变：`contributes.launcher.icon` 是短文本 `预设`；正式 PNG 由 `api.attachPanel(panel, { icon: ICON })` / presentation.icon 提供。当前 Hub 提供 `registerShortcutLauncher` 时注册 Native provider；用户在 Hub 的“显示悬浮球”偏好中决定挂载。无此 capability 的兼容 Hub 继续走蜂窝入口。

Hub ready 收起 Standalone；Hub disposed 等待旧 lease / cleanup 后恢复同一业务视图的 Standalone；重新 ready 不生成新 Controller 或 Panel。旧 Hub 回调无法控制当前 session。activate 重入复用同一 Promise，避免重复 attach / register。没有正式 closePanel 能力时仍安全恢复 Standalone。

用户“返回”或 Escape 走现有 requestClose：有未保存内容，选否保留，选是丢弃后走正式 close 路由。Hub 内部退出、重接入等生命周期隐藏不等于用户丢弃；pendingRaw、localRevision、分类、Preset、排序和编辑草稿保留。

## 官方应用结构

Lilac Accent 保留，共享 16px 窗口/内部 Dialog、细边框、深色 Surface、阴影、10px 控件、12px 卡片与 focus-visible。Header 正式 PNG 52px、品牌标题与版本同一行18px、当前角色12px，常规 Header81px；低高度可适度收紧。底部隐私提示继续保留，长条“返回”沿用原 requestClose。顶部不再以 X 作为主窗口收起入口；编辑器/确认 Dialog 的原有操作仍保留。

信息架构不变：Preset 区 → 必要的错误/操作状态 → 新增条目｜分类｜保存/重新读取 → Card List → Unlocked → Editor → Footer。保存图标保持标准色、1.7px 线条、透明背景；干净时 disabled / 0.4 opacity，Dirty 时仅显示底部 4px 绿色光点。分类滚动、冒号/连字符语义和锁链图标体系保持功能基线。

窗口使用现有 compact / short / safe-area / visualViewport，手机与键盘高度下编辑器内部滚动、操作栏保持可达；不会重建草稿 DOM。卡片避让需要原生球实际可见、已挂载，且浏览器在交叠采样点的实际命中顺序确认球在卡片前方；单纯 rect overlap 或 z-index 数字不构成避让依据。面板在上层、球被覆盖、hidden / display:none / visibility:hidden / opacity:0、detached / disposed 或当前模式没有球时，清除左右 clearance 与标记，恢复统一布局。scroll、resize、Dock、面板重开、球/祖先样式变化及相关CSS动画/过渡结束重新判定。与固定操作栏或内部 Dialog 实际遮挡时保留既有临时下层 / inert 保护；未修改 Native Launcher 的层级、Dock 或动画。所有避让只改变 Presentation；不触发 controller.render 或 Host I/O。

Story Director 的固定参考 `clearOrbOverlap()` 针对持续右侧球遮住工具栏/卡片的特例，其固定样式把球设为2147483601、应用根层为2147483600。Preset Manager 不机械套用其矩形判断，而是仅在相同实际前景遮挡条件成立时使用。Owner 确认的“面板已在上层但按钮被推开”回归已在旧 Candidate 上复现；新浏览器检查覆盖桌面、390px、嵌套 stacking context、可见/不可见、移除/销毁及重开清理。本阶段经 Maintainer Review 确认；物理移动端等深度验收仍需继续执行。

## 验证范围

见 [Presentation Review](PRESENTATION-REVIEW.md) 和 [Testing](TESTING.md)。离线 Chromium 的真实 DOM、Pointer / CDP touch、WAAPI、固定 Hub Runtime / Surface / Shortcut registry 已验证；宿主/Launcher依赖和 Preset 仍为 synthetic。没有运行真实 SillyTavern / Tavern Helper iframe，也不能据此宣称 Safari、iOS / Android 或整系列 ST 实机通过。Owner 需导入本轮新候选复核实际入口、动画、软键盘及 Hub 偏好。

## Owner Review: Header 与 Dirty 提示

标题按故事导演/润色工具的“中文名 + 版本”布局对齐为「咩咩预设管理 0.2.0」，第二行为「当前角色：角色名（无单人角色时：请打开单人角色聊天）」。桌面18px/1.55标题、12px/1.55说明，窄屏16px/10px；保持52px正式PNG与81pxHeader，低高度仍使用既有54px紧凑头部。顶部普通通知模块已完整删除，DOM、渲染逻辑和样式均移除；修改、恢复、成功及操作进度不再显示顶部通知栏。保留底部小字和保存图标绿点；错误、冲突及必要确认仍保留，busy操作锁定不变。Controller notice/dirty、保存/取消/关闭规则未修改。

## Current character Header

已重新读取GitHub当前故事导演与润色工具实现：第二行是当前单人角色上下文，格式「当前角色：角色名」，没有有效单人角色或上下文暂不可用时为「请打开单人角色聊天」。只读取角色名/id与群组标记，不读取聊天正文；通过ST正式CHAT_CHANGED、CHARACTER_EDITED、CHARACTER_RENAMED事件及每次打开刷新，仅更新Header文本。单一View管理监听，dispose完整解绑；不影响Preset、dirty、editor draft或任何保存行为。群聊仅显示与参考相同的提示，不限制预设操作。

## Footer as the single ordinary status area

Owner要求将普通提示接入既有底部小字：导入读取/宿主处理时显示busy，修改中显示「有未保存修改 · 尚未同步酒馆」，干净状态显示Controller原有的恢复/重读/保存成功等notice。没有通知时显示隐私或分类说明；有错误时不显示过时的成功notice，原错误与确认机制保留。始终单行，长内容ellipsis并以title保留全文；aria-live polite，文本不变不重复写入。顶部普通通知DOM仍不存在；Controller及Host写入规则未变。
