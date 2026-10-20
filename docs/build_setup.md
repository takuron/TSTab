# 构建与扩展环境说明

## 1 前置要求

- Node.js（建议 LTS 版本）
- pnpm（仓库含 `pnpm-lock.yaml`，优先使用 pnpm；npm 亦可）
- Python 3（仅用于执行 `llm_log.py` 变更日志脚本，见 `llm_readme.md` 第 3.2 节）

## 2 常用命令

```bash
pnpm install        # 安装依赖
pnpm run dev        # 本地开发（网页预览）
pnpm run build      # 构建浏览器扩展产物到 build/
pnpm run preview    # 预览构建产物
pnpm run test       # 运行代码审计回归测试
pnpm run check      # svelte-check 类型检查（每次编码任务后必须通过）
```

## 3 本地开发（网页预览）

```bash
pnpm install
pnpm run dev
```

打开 `http://localhost:5173/newtab` 与 `http://localhost:5173/popup` 预览。

> 注意：`chrome.*` 扩展 API 仅在扩展环境可用。开发调试时 `StorageManager` 会自动降级存入浏览器 `localStorage`（见 `docs/architecture.md` 第 4 节）。

## 4 构建浏览器扩展

```bash
pnpm run build
```

产物输出到 `build/` 目录，包含 `manifest.json`、`newtab.html`、`popup.html` 及静态资源。

**必须通过此命令构建**：它会自动执行 `scripts/patch-manifest.mjs`，将 SvelteKit 预渲染页面的内联脚本外部化到 `app/bootstrap/` 并写入 MV3 CSP（详见 `docs/architecture.md` 第 6 节）。注意：Chrome 扩展禁止 `_` 开头的文件/目录名，因此产物目录为 `app/`（由 `svelte.config.js` 的 `kit.appDir` 控制），禁止手改 `build/` 目录下的文件。

## 5 加载到浏览器（开发者模式）

1. 打开扩展管理页：Chrome `chrome://extensions/` / Edge `edge://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `build/` 目录
4. 打开新标签页即可看到新界面；点击工具栏扩展图标可使用「添加到快捷访问」弹窗

## 6 调试技巧

- 修改代码后需重新 `pnpm run build` 并在扩展管理页点击「重新加载」才能生效。
- newtab 页面可通过右键「检查」打开 DevTools；popup 可在弹窗上右键「检查」。
- 存储数据可在 DevTools Console 中通过 `chrome.storage.local.get(null, console.log)` 查看。

## 7 发布前回归

运行 `pnpm run test`、`pnpm run check` 与 `pnpm run build`。回归测试使用独立 store 上下文和共享锁/存储模拟，并验证实际 svelte-i18n 插值。浏览器验收应加载最终 build，覆盖多页面保存、popup 固定语言、导入失败、离线一言、重复书签和设置 dialog 的 Tab/Esc/焦点恢复。开发模式须使用 localhost 或 HTTPS，保证 Web Locks 可用。

可执行的 Chromium 冒烟测试：先 `pnpm run build`，再运行 `pnpm run test:browser`。需要系统安装 Chromium（可用 `CHROMIUM_PATH` 指定可执行文件）以及本机调试端口访问权限。脚本自行创建临时浏览器配置并在结束后删除，只操作其中的测试书签与存储，不连接日常使用的浏览器。涵盖原生 dialog 的 Tab/Esc/焦点、跨页面保存、复制/拖拽、键盘排序、重复书签、popup 语言与真实存储配额错误后的控件回退。

## 8 隐私政策与 GitHub Pages

`docs/privacy.html` 是独立的中英双语静态单页，样式内嵌，无脚本、远程字体或图片，不依赖扩展构建，可直接打开或由 GitHub Pages 提供。

将该文件提交并推送到计划使用的发布分支后，在仓库 **Settings → Pages → Build and deployment** 选择 **Deploy from a branch**，选取该分支及 **/docs**，保存并等待部署完成。按当前 `takuron/TSTab` 仓库名和默认项目站点配置，政策地址预计为 `https://takuron.github.io/TSTab/privacy.html`；使用自定义域名时以 Pages 后台实际地址为准。提交商店前，在未登录的浏览器窗口中确认实际 HTTPS 地址可访问，再将其填写到隐私政策字段。仅创建文件不代表已部署。

页面使用单个 HTML 文件，不需要运行 SvelteKit 构建，也无需设置 Jekyll 主题。站点根路径未提供首页时，请直接访问 `/privacy.html`。发布源为 `/docs` 时，该目录下其他文件也可能被公开访问。

维护隐私政策时，需同步核对本地存储、工具栏与书签访问、第三方网络请求、数据删除方式及联系渠道。当前联系渠道为项目 GitHub Issues；发布者须确认仓库公开且 Issues 已启用，需要私密联系方式时应替换或补充实际可用的邮箱。

官方说明：[GitHub Pages 发布来源配置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
