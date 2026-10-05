# Testing · 0.2.1

自动检查、源码核验和真实宿主验收分别记录。2026-10-04 已完成 ST 1.18.0 + Tavern Helper 4.11.2 + Hub 0.8.1 + Safari 26.6 / macOS 26.6 的 Foundation 基础实机验收，见 [Real Host Validation](REAL_HOST_VALIDATION.md)。ST 1.19、物理手机及其余深度验收仍待执行。该实机记录对应此前 Foundation 交付包。Maintainer 已确认统一保存与 Presentation 内容通过 Review，升版本前基线为 `2c84664207849af59460b81c50cf4b46fedcbd16c255422e38f3720dad2b792a`；0.2.0 为此内容的阶段 Pre-release，不据此新增完整宿主或移动端通过结论。

## 可复现命令

要求 Node.js `>=22`、npm。仓库根目录：

```sh
npm ci
npm run check
npm test
npm run build
npm run test:browser
npm run test:ui-performance
npm run test:save-performance
npm run test:presentation
```

`build` 已包含类型检查和 Node 测试；完整日常检查可直接运行 `npm ci`、`npm run build`、`npm run test:browser`。构建生成交付 JSON、manifest 和本地演示页面，浏览器检查必须在构建后运行。

浏览器测试固定 Playwright `1.62.1`，默认使用本机 Chrome。也可安装 Playwright 管理的 Chromium：

```sh
npx playwright install chromium
```

随后设置 `PLAYWRIGHT_CHANNEL=chromium` 再执行 `npm run test:browser`。例如 PowerShell：

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npm run test:browser
```

POSIX shell：

```sh
PLAYWRIGHT_CHANNEL=chromium npm run test:browser
```

浏览器检查打开生成的 `delivery/preview.html`，使用内存 Adapter 和人工演示数据。截图与检查回执写入本地 `evidence/`，不作为预设数据上传。演示入口不进入 Tavern Helper 交付脚本。

## 自动检查结果

2026-10-05，在独立依赖安装后执行以下检查，使用 Node `24.13.1`、Playwright `1.62.1` 与其 Chromium `151.0.7922.34`。这些结果是开发测试，不是真实 ST 运行记录；机器可读结果见 [validation-results.json](validation-results.json)。

| 检查 | 覆盖范围 | 结果 |
| --- | --- | --- |
| `npm ci` | 从锁文件安装开发依赖 | 通过，从锁文件安装82个包；结果不作为安全审计结论 |
| TypeScript 与脚本构建 | 严格类型检查、可读业务脚本、Extension JSON、打包后语法检查 | 通过 |
| Node：157 项 | 原始对象、Round Trip、未知字段／所有组、Prompt、Adapter／并发、暂存控制器与 Hub 契约 | 157 通过；功能基线153项保留，新增4项Native/Hub展示检查 |
| 其中 70 项原生契约测试 | 固定原生源码片段与模拟 DOM／HTTP／事件 | 70 通过，包含在 157 项内 |
| 功能浏览器：19 项 | 显式保存后的编辑／复制／开关／排序、导入导出、触控、关闭丢弃及 Hub 生命周期 | 19 通过 |
| 响应式浏览器：9 项 | PC／窄屏／横屏、编辑草稿与焦点、视口缩短、安全区、菜单与按钮可达性 | 9 通过 |
| UI／性能回归：23 项 | 分类四视口、拖动选择、零自动写入、保存失败／重试、确认重读／失败保留、关闭丢弃、锁链图标与布局、外部冲突 | 23 通过，无页面错误；模拟 Adapter，不是实机性能结论 |
| Presentation 浏览器：49 项 | Native pointer/Dock/动画/焦点、固定Hub契约/Shortcut、减少动态效果、安全区与视口、跨模式状态及16张截图 | 49通过，0pageerror/外部网络请求，synthetic依赖 |
| 干净目录重建 | 在没有父目录依赖的独立临时目录，从锁文件执行 `npm ci` 与 `npm run build` | 通过，4 项产物逐字一致 |

0.2.0 从main基线 `ac81136caf623ce8f197296294b19c5f2a4f9cf6` 与已确认内容构建，本次收口只调整版本、交付元数据和文档。Presentation开始前源码完整重现功能候选 `c9c98c00a48c5bed1440a4cbae2e1425293b65ec138e834d08ffcad5c233382c`，Node153项通过。重构后核心业务文件及业务测试逐字未改，153项基线检查继续通过；新增4项Native Dock/dispose/pending open/activate重入检查，总157项。70项固定原生源码检查、B1、B2和原5项Hub契约检查保持通过；不是重新录制数据Golden。

19项功能、9项响应式、23项UI/性能与49项Presentation浏览器检查重新执行，均无pageerror。现有保存基准8项正确性检查继续通过。干净目录使用锁文件独立安装82个包后重建，JSON、manifest、production JS、preview JS四项逐字一致。

仅更改既有展示断言：60px隐藏球改为64px持续原生球、同步显示改为等待animation终点、全屏尺寸改为600×780 Clamp、Footer无按钮改为一个返回按钮；测试夹具补足实际DOM/style及可选Shortcut capability。数据、失败、冲突、写入次数、草稿/选区/单实例断言保留。Header引入PNG后，隔离UI测试bundle新增asset/inline loader，与生产构建一致。

历史 **0.2.0 阶段交付包** Extension JSON SHA-256（见机器可读结果；下方由最终构建更新）：

```text
b735bb507e7315389afe0197c7c6b56f614e0cdfd87e13a2b5b8b32a0d97c0ca
```

此前 Foundation 实机包 SHA-256 仍为 `5bd899fe9ea776cb7fe50d4149e7dc7b938c6747f4e650354e6e95be900145a5`；历史实机结果不覆盖本轮候选。

## 保存图标与分类行布局

Maintainer 已确认前一候选 `9d230354b0a9111d44667e0866e2041a4bae1a8c4aeeed3d56bb3efa95641ffd` 的交互“成实时的了”。此反馈只记录实时交互体验，不代表完整深度验收。当前继续在相同逻辑上调整位置与图标：新增条目、分类、保存／重读三组之间加入两条隐藏于无障碍树的细竖线；软盘保存按钮为 44px 透明 SVG 按钮，去除主按钮色块；未修改时与其他图标同色并以 0.4 透明度变暗，未保存修改时图标保持与其他图标相同的颜色与 1.7px 线条，底部显示一个 4px 绿色光点；保存成功或确认重读后光点隐藏，不使用流光动画。保留 title 与 aria-label，未保存启用／无修改禁用规则不变。已有四视口检查使用相同前缀的连字符／单冒号混排名称，并同时核对分隔线与两侧控件位置，分类单独横向滚动，不把保存和重读挤出窄屏。

## 统一保存、重新读取和关闭确认（方案 B）

上一候选 `1e8211ae01ea886e44ebbf7762eaed965d6d4a5b357da943d3dcd9e040bf05e6` 已完成自动检查，但 Maintainer 实机仍反馈卡顿，本轮按其最新要求改为本地暂存。保留之前分类边框、Drag Active 临时禁选、每帧先读后写、卡片缓存、文字阴影重置与 Adapter 通知回读优化，不再运行后台排序保存队列。

- 按“新增条目｜分类｜保存与重新读取”排列，两处分隔线；保存采用软盘 SVG，悬停与无障碍名称仍为“保存修改”，没有取消修改按钮。无改动保存按钮暗，有改动可用；外部冲突时禁用保存。新增条目在分类左侧；底部不重复放操作按钮。
- 排序、开关、编辑窗口保存及 Prompt 新增／复制／解锁／挂接／删除只改变本地未保存对象。已确认 Snapshot、宿主、原 revision 保持不变；多次操作只在统一保存时进行一次原生写入。原生预检、落盘核对、应用完成与最终回读仍保留。
- 拖放只复制变化的 order 数组与分组，不克隆／序列化完整 Prompt 正文；编辑只复制当前 Prompt。长正文输入和暂存不序列化完整正文（以约 1.3MB 人工正文并阻断 JSON.stringify 验证）；输入事件仅更新按钮／提示，不重建列表或编辑器；保存编辑后未变卡片保持原节点。
- 保存 pending 期间锁定编辑、重读、重复保存和关闭。失败保留本地修改可核对，不自动补偿写入；检测到外部修改或切换时拒绝覆盖，自动通知读取不能接受新安全 revision 或丢弃暂存。
- 有未保存修改时点击重读先确认；取消保留，确认后取得新快照才丢弃，失败仍保留并报错。当前编辑窗口尚未点击保存的输入也计入 dirty。关闭选择否保留，选择是丢弃后走原 Standalone／Hub closePanel 正式路由；生命周期 Hub disposed／ready 内部隐藏保留草稿／暂存和单实例。
- 切换、导入、复制、新建、重命名、删除及导出 Preset 需先统一保存或确认重新读取，避免操作对象歧义。编辑窗口取消仅丢弃该窗口输入，不清除已暂存操作。
- 挂接图标使用原锁链；解绑图标保留锁链加斜线。生产 SVG 是固定几何图形，没有解析用户图形字符串。

`npm run test:ui-performance` 使用生产 View／Controller、合成延迟 Adapter 和固定 main 的旧样式对照。23 项覆盖四个分类视口、文字阴影、真实鼠标拖放／选择／pointercancel、连续拖动零 host 调用、一次延迟保存失败／重试、节点身份、按钮位置和锁链路径、重读取消／确认／失败、关闭是／否和未暂存编辑输入、外部通知冲突。功能浏览器另核对未保存关闭选否不调用 Hub closePanel，选是才执行正式 Surface 关闭；五次重开复用同一实例。

本地 Node 测试在固定 1.18.0／1.19.0／1.19 交叉原生片段和模拟依赖上核对：混合编辑、复制、开关和排序在点全局保存前没有任何 HTTP；保存后仅一笔 POST 与三次必要 settings GET，完整 raw、其他组与未知字段一致。较晚通知、读取过程通知、手动 refresh 及身份变化保留额外读取。没有修改的编辑不发出任何读取／写入／apply；下一次实际全局保存仍预检 revision 和 live。

### 性能证据边界

拖动帧布局、视觉顺序与 card 缓存沿用前轮优化。松手和编辑窗口保存不执行 ST HTTP、磁盘回读或 apply，消除这两处触发原生操作的等待。显式“保存修改”仍需要等待完整持久化和确认，不声称它实时完成。人工五阶段 290ms 延迟只在点击全局保存后开始，回执在 `evidence/reorder-browser.json`；此检查不是实际 Safari／ST 耗时测量。

`npm run test:save-performance` 从生产源码提取 JSON 树比较函数，以 500 个**人工** Prompt（约 4.5MB JSON）核对 8 项等价／未知字段／数组行为并计时。只测比较 CPU，不测 Model、HTTP、disk、apply 或完整保存，没有性能通过门槛、外部 telemetry 或私人数据。该计时不构成真实宿主性能或深度验收结论，后续深度实机继续使用可恢复副本。

## B1 / B2 回归证据

在同一旧 Head `8fb308941753acc5fa90975f4c37f8e54ab1508f` 上仅加入最终 Node 回归测试：原有 75 项通过，新增 17 项全部失败；修复后 92 项全部通过。

- B1：固定 1.18.0、1.19.0 和 1.19 交叉源码片段、模拟依赖。raw 缺少字段时，live 新增 `injection_depth`、默认样式 `injection_order:100` 或第三方对象；refresh 不接受新 revision，编辑标题后的 save 被阻止，live 新字段及磁盘 raw 保持不变。另覆盖已有未知字段修改、顺序条目／分组新增字段、精确原生缺失 Marker 补项及其外部修改。
- B2：Node 协议测试核对 Standalone 关闭／重开、Hub 正式 close 调用、Surface 关闭与 Launcher 恢复、五次循环复用同一面板／实例、Hub disposed / ready 恢复与清理。缺少 close 能力时回到 Standalone。
- 浏览器：使用真实构建后的共享 UI 和内存 Controller，配合独立 Hub Surface 契约模拟，覆盖关闭按钮／Standalone Escape、五次 Hub 关闭重开、编辑草稿、退出与重新收纳。编辑层遮挡顶部按钮时使用 DOM click 事件验证关闭路由，不宣称物理触控可达或真实 Hub 集成；真实 Hub 可从自己的 Surface 返回入口关闭。
- 原 Review 复现再次运行：B1 两版均拒绝 refresh / save，字段未丢失；当前固定 Hub Surface 源码配合模拟动画／Launcher，在关闭后返回 `menu`、面板隐藏且 Launcher 不再暂停，closePanel 恰好一次。这仍是本地源码补充复现，不属于真实宿主验收。

## Hub 注册与正式 PNG 回归

在同一固定 Hub commit `928362c1eb224afe780801060c6d867e01cf5013` 上执行原始 Runtime `validate()`、bootstrap `provide()`、Hub UI `renderMenu()`／面板方法和 Surface 函数体。新增 5 项 Node contract 检查：

1. 不替换生产 Manifest，注册后 factory／activate 执行，attachPanel 接收正式 PNG 原始字节。
2. 当前 Hub Launcher 优先选择 presentation.icon 的图片，图片加载失败回到 `预设`。
3. open → 正式 closePanel → reopen 三次循环复用面板并恢复 Launcher，最终清理。
4. 把超长 SVG data URL 放回 launcher.icon 时，provide 在 factory 前拒绝。
5. Standalone 使用与 Hub 相同且逐字节保留的正式 PNG。

仅改短文本、仍挂载原临时 SVG 的本地候选运行了 96 项：95 通过，实际 Hub 渲染选图断言失败；接入维护者提供的正式 PNG 后，原有 92 项与新增 5 项共 97 项全部通过。新增浏览器检查确认内嵌 PNG 实际解码为 1254×1254，数据与仓库原图一致；功能检查共 18 项，响应式保持 9 项。

测试不替换 Manifest、不放宽 Hub validator、不使用 Emoji 功能图标，不在生产包中包含 Hub 测试源码。DOM／存储偏好／Launcher 依赖仍为模拟，Surface 动画未执行；这不是运行真实 Hub。正式 PNG 原样保存，来源及独立素材许可边界见 ASSETS-LICENSE.md。真实 Hub 0.8.1 的基础验收另见 [Real Host Validation](REAL_HOST_VALIDATION.md)，不将离线契约测试计作实机结果。

## 版本证据边界

| 对象 | 源码／自动检查基线 | 真实宿主状态 |
| --- | --- | --- |
| ST 1.18.0 | `51ad27fb86d39a3daca3adaa970375c9670c12df`，固定原生方法与模拟宿主 | 实际 `8172dcd0e` 的基础路径通过；与源码基线分开记录 |
| ST 1.19.0 | `7e8663cd9c184a550b37238218bdd32c6efc68e9`，固定原生方法与模拟宿主 | 未执行 |
| ST 1.19.0 交叉源码 | `06bde939fb1e9c4c8d8641d810f0a916b5bce127`，相关文件比对及 Default 夹具来源 | 未执行 |
| Tavern Helper 4.10.0 源码 | `e9aa5ba146d0f13b7a26742c26dd04d9132a30da` 的接口研究，版本号来自该提交的 package.json | 实际运行版本为 4.11.2，基础路径通过；不将 4.10.0 当作实测版本 |
| MieMie Hub | 固定 `928362c1eb224afe780801060c6d867e01cf5013` 的 API v1 源码契约与生命周期模拟 | 实际 0.8.1 的收纳、正式图片、关闭／重开、草稿及停用／重新接入通过 |
| 手机 | 桌面浏览器的触控、视口和布局模拟 | 物理设备、移动 Safari、实际软键盘未执行 |

模拟真实方法体仍不包含完整 ST 服务、真实宿主页面、Tavern Helper iframe 或其他扩展。浏览器触控模拟也不能验证手机输入法、设备 safe-area 值或实际浏览器工具栏。

## 真实宿主 Golden Path

依据 [产品计划第 25 节](PRODUCT_PLAN.md#25-测试要求)，以下记录本次 ST 1.18.0 实际组合的已执行范围，**不代表全部 18 项完成**。环境、测试 Head、交付 JSON 哈希及 RH-01 见 [Real Host Validation](REAL_HOST_VALIDATION.md)。ST 1.19 的所有实机项仍待执行。测试使用已备份且获准使用的预设；公开记录不得包含私人正文、连接凭据或完整导出。

| # | 验收项 | 需要确认的真实结果 | 状态 |
| --- | --- | --- | --- |
| 1 | 关闭 Hub | 独立悬浮入口出现 | 本次基础路径通过 |
| 2 | 打开管理器 | 读取 ST 实际当前预设，名称与内容一致 | 本次基础路径通过 |
| 3 | 切换预设 | ST 当前预设实际切换，管理器回读一致 | 本次基础路径通过 |
| 4 | 导入复杂预设 | 保存成功后自动成为当前预设，同名不静默覆盖 | 待执行 |
| 5 | 复制预设 | 完整 copy、来源不变、自动切换至 copy | 本次基础路径通过，两份完整副本 |
| 6 | 编辑 Prompt | 标题／Role／Content 取消无变化，保存后刷新仍保留 | 部分通过：标题取消／保存／刷新；Role／Content 待验 |
| 7 | 复制 Prompt | 副本位于原条目下方，新 identifier 有效，其他字段保留 | 本次基础路径通过 |
| 8 | 整卡拖动 | 实际 `prompt_order` 更新，刷新后顺序保留 | 本次桌面鼠标路径通过；物理触屏待验 |
| 9 | Toggle | 原生发送状态与 UI 一致，刷新后保留 | 本次基础路径通过 |
| 10 | 解锁 | 从活动发送顺序移出，定义保留并位于解锁区 | 待执行 |
| 11 | 删除 | 确认框取消无变化，确认后合法删除；核对内建／Marker 限制 | 待执行 |
| 12 | 导出 | 完整原生 JSON 可以由 ST 原生导入器重新导入 | 部分通过：下载完整 JSON 与测试副本一致；原生重新导入待验 |
| 13 | 无修改 Round Trip | 复杂预设导入再导出，字段及功能语义保持 | 待执行 |
| 14 | 未知字段 | 加入未来字段，修改其他 Prompt 后仍完整保留 | 待执行 |
| 15 | 手机 | 列表滑动、长按排序、按钮不误拖、软键盘和旋转后保存可达 | 待执行 |
| 16 | 启动 Hub | 独立入口隐藏，Hub 出现入口，原草稿和面板可用 | 本次基础路径通过 |
| 17 | 关闭 Hub | 状态不丢失，独立入口与面板恢复 | 本次基础路径通过 |
| 18 | 再启动 Hub | 重新接入，只有一个业务实例，无重复监听或入口 | 本次重新接入、单面板／业务实例及重开通过；监听器深度审计待验 |

另需在可恢复副本上验证失败与并发场景：保存失败／响应丢失、同名预设被外部改动、保存中切换或停用、原生未保存设置、重命名部分成功。确认错误提示与磁盘实际状态一致，能导出操作前备份，不覆盖外部新状态。

已知需求差距包括保留 identifier／Marker 的额外删除保护、旧格式迁移、全局活动组限制及后端非原子事务，详见 [Compatibility Notes](COMPATIBILITY.md#已知限制与需求差距)。完成自动检查和本次基础实机验收不等于这些限制已消除，Phase 1 尚未完成，Issue #1 继续 Open。

## Presentation Browser Review

`npm run test:presentation` 使用当前生产Controller/View/DualMode/Native组件和synthetic adapter。生成专项测试夹具 `evidence/presentation-review/preview.html`，Owner交互页 `evidence/presentation-review/app.html`（正常内存Adapter，与delivery预览脚本逐字一致）、`gallery.html`、16张Owner Review截图与 `results.json`。Node新增检查4项，浏览器专项49项；结果见 [Presentation Review](PRESENTATION-REVIEW.md)。实际执行固定Hub Runtime、Surface Motion、Surface Controller、provide与byte-identical Shortcut registry；只模拟宿主/Launcher等依赖，没有新建业务实例。

验证64px未修改PNG、7px阈值、真实鼠标及CDP触控拖动、左右Dock/持久化、键盘/焦点、Orb↔Panel/Header Hero/临时DOM清理、旋转中断、safe-area及panned visualViewport、减少动态效果、Shortcut开关/关闭origin/中途dispose、蜂窝和Native动画不混用。跨模式比较pendingRaw/localRevision/分类/Preset/未保存排序逐字一致，并确认Editor草稿和单一Controller/Panel保留。全部演示内容为synthetic，未触及用户真实Preset。Safari和真实Hub新Presentation仍待Owner复核。

### Owner Review: Native Orb clearance 修复

本轮新增11项Presentation浏览器回执。只有可见且已挂载的球在实际浏览器命中顺序中位于卡片前方时允许留白；面板上层、嵌套低层球、hidden/display/visibility/opacity、detached/disposed及无球均清零。桌面与390px卡片按钮对齐，前景遮挡时全部44px操作可点击；Dock、resize、close/reopen无残留。旧Candidate在新增上层面板断言失败，修复后41/41专项通过。未改变Native Launcher层级或冻结业务；没有新增真实Safari/ST验收结论。

### Header / Dirty banner follow-up

Header使用中文产品名与版本同一行、当前角色 / 无角色提示第二行；保留正式PNG和Header尺寸。既有UI/性能浏览器检查确认本地编辑后上方Dirty提示隐藏、下方小字和保存绿点保留，列表位置与高度不变。完整Node157、功能19、响应式9、Presentation41与UI/性能23项通过；独立重建四产物一致，未新增真实宿主结论。

Current-character Header新增3项Presentation回执：无角色/单人角色/切换/改名、数字0与字符串id、纯文本名称；上下文异常与重开恢复、每事件仅一个监听；dirty与草稿不变、零Host写入、dispose解绑。专项总计41项，0页面错误；仅synthetic上下文，仍待Owner真实ST/Safari复核。

### Complete top notice removal

删除顶部普通通知模块DOM、渲染逻辑与CSS，Controller notice及所有业务规则保持不变。修改、恢复原状态、保存成功及busy通知不再插入横栏。保留底部dirty小字/保存绿点、错误/冲突、确认Dialog和busy锁定。新增实际恢复原状态回归后UI/性能23项通过，列表y/height不变；Node157、功能19、响应式9、Presentation41通过，无页面错误。

### Footer ordinary status

既有23项UI检查追加busy、确认保存成功、重读完成、恢复原状态在Footer小字中的断言，保留dirty与列表位置/高度不变断言。功能19、响应式9、Presentation41及Node157通过。Footer单行截断防止扩高，title保留全文；无顶部通知DOM，未改变核心业务。

### Shortcut repeat-open regression

Owner录屏显示：Hub Shortcut打开后继续点击同一球会跳成Hub居中展示。新增检查先在旧Candidate复现（Native→Hub），再修复Dual Mode中的无条件布局重置：只有hidden面板的新入口初始化Hub布局并调用View.open；已显示或opening/closing的面板只请求正式showPanel，由Hub保留Surface origin、动画与inert。没有修改Hub或业务逻辑。

新增8项专项回执：1512px/390px各6次真实指针点击、编辑草稿期间真实按钮handler调用、蜂窝聚焦既有Shortcut、新入口/正式关闭/重开、正常动画中连续点击、closePanel期间立刻连续重开。49/49专项通过，0pageerror/外部请求，单Panel/Controller、dirty/草稿保留且零Host写入。Node157、功能19、响应式9、UI/性能23及保存基准8项正确性均通过；check/build通过，独立目录锁文件安装82个包后重建四产物逐字一致。固定Hub真实Runtime/Shortcut/Surface代码配合synthetic宿主依赖；不是新的Safari/ST实机验收，仍待Owner导入本轮包复核。

## 0.2.0 release gate

升版本前先从未改动源码重建0.1.2内容，SHA-256与已确认基线一致；业务、Launcher、动画、图标、Hub integration保持不变。0.2.0版本只写入package、锁文件、Product Identity、Header测试预期和构建元数据；固定Product/Extension ID与Script ID不变。交付目录仅保留当前版本JSON，历史Foundation包仍由真实宿主记录与Git历史标识。组件交付清单给出v0.2.0正式Release Asset URL，不是Hub Managed Package。

本版本按完整命令重新执行自动Gate及独立目录clean rebuild；当前结果与最终产物hash见validation-results.json。该阶段Pre-release不关闭Issue #1；ST1.19真实宿主、深度Round Trip/Unknown Fields、Built-in/Marker边界、失败/并发实机和物理手机/软键盘继续待验。此前候选修复记录为历史自动证据；Maintainer Review通过不等于这些深度项目均已完成。


## 0.2.1 Runtime / Managed Package 两道发布 Gate

Runtime gate：严格类型、Node、浏览器功能/响应式、UI/保存性能与 Presentation 检查；Hub provide/activate、panel、launcher/shortcut、closePanel、单实例、Dirty、数据完整性保持既有回归。自动 Mock 和预览测试不能替代真实宿主验收。

Managed Package gate：`npm run test:package-v1` 读取完整生产交付包，使用 Hub commit `928362c1eb224afe780801060c6d867e01cf5013` 的原始 validator/discovery/install/update 源码及原始上游测试（仅测试夹具，带 GPL 和 SHA-256 provenance）。覆盖正式 Manifest、纯三段版本/Tag、稳定 ID/repository、首行身份、空 data、确切 Helper 字段、ASCII Asset 名、16 MiB/64 KiB 限制、双 hash、GitHub digest、禁止 URL/未知 metadata 字段、短 launcher 和安全相对 icon；在合成全局脚本树验证安装、当前版本检查、后续版本原地更新保留实例和设置。不会执行下载脚本，也不写真实 Helper。

构建首先校验 package/manifest 身份、产品 author 与官方 repository 一致性，Runtime 与 Product Identity 直接读取 manifest；构建后自动执行 11 项生产产物契约。Package 专项总 67 项（11 项生产产物 + 56 项原始 Hub 测试）；Node 总 162 项，包含原 157 项和 5 项发布身份/来源检查。

每次正式发布另需：独立目录 npm ci/build，四份机器资产逐字相同；Tag/Release/Repository 一致，非 Draft；上传后确认 Asset API digest 与原始 bytes 一致；使用同一 Hub discovery 读取实际已发布 Release。只有完成这些检查才能报告“发布包符合 Package v1”。实际浏览器在线安装/更新、CORS/安全下载服务及宿主持久保存仍由 Owner 单独验收，不算本轮自动通过。

旧 0.2.0 身份缺少 repository，实际 Hub listInstalled/check 不识别，已锁定反例；不能自动升级。迁移操作见 README，先备份、停用并手动移除旧实例，再安装 0.2.1，不对生产数据尝试猜测升级。

```sh
npm ci
npm run check
npm test
npm run build
npm run test:package-v1
npm run test:browser
npm run test:ui-performance
npm run test:save-performance
npm run test:presentation
```

Polisher 1.2.1 parity：两者均有正式 manifest、带 repository 的首行 identity、标准 update metadata 和 SHA256SUMS。已核对 Polisher v1.2.1 实际四份 Release Assets 及 GitHub digest；身份、Script ID 和 PNG 各自独立。Preset Manager 继续 TypeScript，不复制 Polisher 产品身份。

依赖审计：当前 tracked 源码和文档、固定 Hub package consumer、Polisher 正式构建中未发现 component-update-manifest 的外部正式消费者；旧清单仅用于本项目历史构建/发布记录。0.2.1 不再生成/发布它，历史记录及 v0.2.0 Release 保留。
