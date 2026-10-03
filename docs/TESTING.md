# Testing · 0.1.2

自动检查、源码核验和真实宿主验收分别记录。当前没有真实 SillyTavern、Tavern Helper、MieMie Hub 或物理手机运行结果。

## 可复现命令

要求 Node.js `>=22`、npm。仓库根目录：

```sh
npm ci
npm run check
npm test
npm run build
npm run test:browser
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

2026-10-04，在独立依赖安装后执行以下检查，使用 Node `24.13.1`、Playwright `1.62.1` 与其 Chromium `151.0.7922.34`。这些结果是开发测试，不是真实 ST 运行记录；机器可读结果见 [validation-results.json](validation-results.json)。

| 检查 | 覆盖范围 | 结果 |
| --- | --- | --- |
| `npm ci` | 从锁文件安装开发依赖 | 通过，82 个包；审计 83 个包，无已知漏洞 |
| TypeScript 与脚本构建 | 严格类型检查、可读业务脚本、Extension JSON、打包后语法检查 | 通过 |
| Node：97 项 | 原始对象与 Round Trip、未知字段、所有顺序组、分类、Prompt 操作、Adapter 数据／失败／并发／停用、控制器草稿及模拟 Hub 生命周期、正式 Hub Manifest／图片契约 | 97 通过 |
| 其中 37 项原生契约测试 | 执行固定版本原生源码片段，以模拟 DOM／HTTP／事件依赖核对 1.18／1.19 行为 | 37 通过，包含在 97 项内 |
| 功能浏览器：18 项 | 编辑取消与保存、导入导出、复制切换、删除确认、鼠标拖动、触屏长按、窄屏控件与缩短视口、共享 UI 的 Hub 关闭／重开／草稿与重新接入、正式 PNG 解码 | 18 通过 |
| 响应式浏览器：9 项 | PC／窄屏／横屏、编辑草稿与焦点、视口缩短、安全区、旋转取消拖动、入口与菜单可达性 | 9 通过 |
| 干净目录重建 | 在没有父目录依赖的独立临时目录，从锁文件执行 `npm ci` 与 `npm run build` | 通过，4 项产物逐字一致 |

当前 Extension JSON 的 SHA-256：

```text
5bd899fe9ea776cb7fe50d4149e7dc7b938c6747f4e650354e6e95be900145a5
```

Node 夹具来自公开固定提交的 Default 预设、固定原生源码片段和人工数据。测试为克隆夹具加入未来字段和多组数据；**没有使用真实私人复杂预设**。出处和许可见 [fixtures](../tests/fixtures/README.md)，版本差异见 [Compatibility Notes](COMPATIBILITY.md)。

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

测试不替换 Manifest、不放宽 Hub validator、不使用 Emoji 功能图标，不在生产包中包含 Hub 测试源码。DOM／存储偏好／Launcher 依赖仍为模拟，Surface 动画未执行；这不是运行真实 Hub。正式 PNG 原样保存，来源及独立素材许可边界见 ASSETS-LICENSE.md。实际宿主仍全部待验。

## 版本证据边界

| 对象 | 源码／自动检查基线 | 真实宿主状态 |
| --- | --- | --- |
| ST 1.18.0 | `51ad27fb86d39a3daca3adaa970375c9670c12df`，固定原生方法与模拟宿主 | 未执行 |
| ST 1.19.0 | `7e8663cd9c184a550b37238218bdd32c6efc68e9`，固定原生方法与模拟宿主 | 未执行 |
| ST 1.19.0 交叉源码 | `06bde939fb1e9c4c8d8641d810f0a916b5bce127`，相关文件比对及 Default 夹具来源 | 未执行 |
| Tavern Helper 4.10.0 源码 | `e9aa5ba146d0f13b7a26742c26dd04d9132a30da` 的接口研究，版本号来自该提交的 package.json | 无已测试运行版本 |
| MieMie Hub | API v1 生命周期模拟 | 无已测试运行版本 |
| 手机 | 桌面浏览器的触控、视口和布局模拟 | 物理设备、移动 Safari、实际软键盘未执行 |

模拟真实方法体仍不包含完整 ST 服务、真实宿主页面、Tavern Helper iframe 或其他扩展。浏览器触控模拟也不能验证手机输入法、设备 safe-area 值或实际浏览器工具栏。

## 真实宿主 Golden Path

依据 [产品计划第 25 节](PRODUCT_PLAN.md#25-测试要求)，以下 **18 项全部待执行**。分别记录 ST 1.18 与 1.19 的准确版本／commit、Tavern Helper 版本、Hub 版本、浏览器／设备、交付 JSON 哈希、结果及失败证据。测试使用已备份且获准使用的预设；公开记录不得包含私人正文、连接凭据或完整导出。

| # | 验收项 | 需要确认的真实结果 | 状态 |
| --- | --- | --- | --- |
| 1 | 关闭 Hub | 独立悬浮入口出现 | 待执行 |
| 2 | 打开管理器 | 读取 ST 实际当前预设，名称与内容一致 | 待执行 |
| 3 | 切换预设 | ST 当前预设实际切换，管理器回读一致 | 待执行 |
| 4 | 导入复杂预设 | 保存成功后自动成为当前预设，同名不静默覆盖 | 待执行 |
| 5 | 复制预设 | 完整 copy、来源不变、自动切换至 copy | 待执行 |
| 6 | 编辑 Prompt | 标题／Role／Content 取消无变化，保存后刷新仍保留 | 待执行 |
| 7 | 复制 Prompt | 副本位于原条目下方，新 identifier 有效，其他字段保留 | 待执行 |
| 8 | 整卡拖动 | 实际 `prompt_order` 更新，刷新后顺序保留 | 待执行 |
| 9 | Toggle | 原生发送状态与 UI 一致，刷新后保留 | 待执行 |
| 10 | 解锁 | 从活动发送顺序移出，定义保留并位于解锁区 | 待执行 |
| 11 | 删除 | 确认框取消无变化，确认后合法删除；核对内建／Marker 限制 | 待执行 |
| 12 | 导出 | 完整原生 JSON 可以由 ST 原生导入器重新导入 | 待执行 |
| 13 | 无修改 Round Trip | 复杂预设导入再导出，字段及功能语义保持 | 待执行 |
| 14 | 未知字段 | 加入未来字段，修改其他 Prompt 后仍完整保留 | 待执行 |
| 15 | 手机 | 列表滑动、长按排序、按钮不误拖、软键盘和旋转后保存可达 | 待执行 |
| 16 | 启动 Hub | 独立入口隐藏，Hub 出现入口，原草稿和面板可用 | 待执行 |
| 17 | 关闭 Hub | 状态不丢失，独立入口与面板恢复 | 待执行 |
| 18 | 再启动 Hub | 重新接入，只有一个业务实例，无重复监听或入口 | 待执行 |

另需在可恢复副本上验证失败与并发场景：保存失败／响应丢失、同名预设被外部改动、保存中切换或停用、原生未保存设置、重命名部分成功。确认错误提示与磁盘实际状态一致，能导出操作前备份，不覆盖外部新状态。

已知需求差距包括保留 identifier／Marker 的额外删除保护、旧格式迁移、全局活动组限制及后端非原子事务，详见 [Compatibility Notes](COMPATIBILITY.md#已知限制与需求差距)。完成自动检查不等于这些限制已消除，也不构成维护者验收。
