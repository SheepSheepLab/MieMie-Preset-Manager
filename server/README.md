# 咩咩预设下载服务

定时任务从官方预设仓库读取公开目录和发行日志，核对标签、发行编号、文件大小与 SHA-256。所有文件就绪后才替换目录文件。同步失败时继续提供上一次成功的目录和文件。

酒馆从 `/v1/catalog.json` 一次读取目录、日期和更新日志，再按目录里的 SHA-256 从 `/v1/files/<sha256>/<文件名>` 下载。香港入口连接失败时可以回退 GitHub。酒馆在导入或绑定前会再次校验文件。

## 本地同步与部署

1. 使用 Node.js 24，在仓库根目录运行 `node server/sync.mjs <缓存目录>`。先确认生成的 `v1/catalog.json` 和索引引用的全部文件。
2. 在香港服务器为服务配置专用系统账号 `miemie-preset-download`。把该版本源码放到 `/opt/miemie-preset-download/current`，确保运行账号可读取源码和 Node.js。安装本目录的 systemd 单元，手动运行同步服务并确认成功，再启用定时器。
3. 为下载服务配置独立 HTTPS 域名。将 `Caddyfile.example` 中的域名改为实际地址，加入 Caddy 配置。同步目录由 systemd 创建，Caddy 需要有读取权限。检查配置通过后加载，验证跨域目录、日志和文件下载。
4. 用 `MIEMIE_PRESET_DOWNLOAD_ORIGIN=https://实际下载域名 npm run build` 构建脚本。此变量应使用已验收的 HTTPS 服务根地址。未填写时，构建脚本沿用 GitHub 直连。

在仓库根目录运行 `node --test server/sync.test.mjs`，验证成功发布、重复同步命中缓存和失败后保留上一份目录。
