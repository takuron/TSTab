# Changelog

本文件记录用户可感知的版本级变更。LLM 的逐条工作日志见根目录 `llm_log.txt`（由 `llm_log.py` 维护）。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

## [Unreleased]

### Added

- 设置面板「关于」区新增独立的「开源许可」小节：以紧凑的单行分组罗列运行时依赖 / 构建工具 / 引用素材，逐项以圆点分隔并在括号内标注许可与 Copyright，另说明本项目 GPL v3 许可；新增 `src/lib/licenses.ts` 集中维护该清单
- 修复预置图标域名匹配不准确的问题：映射改为带完整 TLD 的域名，并按「全域名或任意子域」通配匹配（如 chat.deepseek.com、app.ubuntu.com、gemini.google.com 均能正确命中），更具体子域优先；域名按类型注释分组排序
- 快捷访问预置图标：内置常见站点（Google/百度/Bing/GitHub/哔哩哔哩/YouTube 等）的 dashboard-icons 图标，命中域名时默认替换 Dock 图标（本地 SVG，无网络请求）
- 预置图标扩充：新增 AI 助手（OpenAI/ChatGPT/Gemini/Grok/DeepSeek/Z.ai/Claude/Perplexity/通义千问/Kimi 等）、设计（Figma/Behance/Excalidraw/Framer）、云服务商（Vercel/DigitalOcean/Azure/Netlify/Railway 等）、动漫（Pixiv/Crunchyroll/MangaDex）、音乐（Apple Music/YouTube Music/Deezer）与多邻国等 30+ 站点
- 预置图标扩充：新增 Google 在线服务（Gmail/翻译/云端硬盘/文档/表格/日历/地图/相册/Talk）、邮件服务（Proton/Tuta/Fastmail/iCloud/Zoho）、流媒体（Disney+）、在线服务（Bitwarden/DeepL/Dropbox/Box/OneDrive/Mastodon/Signal）、游戏平台（Epic/PlayStation/Xbox）以及大量 Linux 发行版官网（Ubuntu/Debian/Arch/Fedora/Alpine/Mint/Manjaro 等）；本地自托管软件（Docker/K8s/Nextcloud/Syncthing 等）不内置，走站点 favicon
- 设置面板快捷访问区新增「使用预置图标」开关（默认开启），关闭后 Dock 回退使用站点 favicon
- 快捷访问新增「主菜单模式」：可支持从「书签文件夹」读取链接展示为 Dock，且仅显示该文件夹的直接书签（不递归子文件夹）
- 设置面板快捷访问区新增数据来源切换（手动添加 / 书签文件夹）与书签文件夹下拉选择
- manifest 新增 `bookmarks` 权限，用于读取用户书签
- 国际化（i18n）：接入 `svelte-i18n`，全站文案改为多语言（简体中文/英文）响应式输出
- 设置面板新增「语言」选项：跟随浏览器 / 简体中文 / English，切换即时生效
- 新增语言包 `src/lib/i18n/locales/zh-CN.json` 与 `en-US.json`
- 日期与一言兜底文案按当前语言本地化
- 自定义背景新增「默认图片」模式
- 使用图片背景时叠加一层暗色调覆盖层，提升文字可读性

### Fixed

- 修复快捷访问 Dock 已有图标时仍默认显示占位图标的问题
- 关闭每日一言时隐藏右下角刷新按钮
- 背景设置中移除独立的「恢复默认背景」按钮（改用类型单选恢复）
- 微调时间/搜索区域垂直位置

## [1.0.0] - 2026-09-03

### Added

- 实时时间与日期显示（每秒刷新）
- 智能搜索：百度 / Google / Bing 多引擎，自动识别网址直达
- 每日一言：一言 API，支持类型筛选与本地缓存（1 小时）
- 自定义背景：默认渐变 / 本地图片 / URL 图片三种模式
- 快捷访问 Dock：增删改、拖拽排序、顶部/底部位置切换
- 设置面板：背景、搜索引擎、一言、复制保护、配置导入/导出
- 工具栏弹窗：一键将当前标签页加入/移出快捷访问
- 自定义圆点光标与毛玻璃 UI
- MV3 CSP 自动补丁脚本（`scripts/patch-manifest.mjs`）
