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

**必须通过此命令构建**：它会自动执行 `scripts/patch-manifest.mjs`，为 SvelteKit 预渲染页面的内联脚本计算 SHA-256 哈希并写入 MV3 CSP（详见 `docs/architecture.md` 第 6 节）。禁止手改 `build/` 目录下的文件。

## 5 加载到浏览器（开发者模式）

1. 打开扩展管理页：Chrome `chrome://extensions/` / Edge `edge://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `build/` 目录
4. 打开新标签页即可看到新界面；点击工具栏扩展图标可使用「添加到快捷访问」弹窗

## 6 调试技巧

- 修改代码后需重新 `pnpm run build` 并在扩展管理页点击「重新加载」才能生效。
- newtab 页面可通过右键「检查」打开 DevTools；popup 可在弹窗上右键「检查」。
- 存储数据可在 DevTools Console 中通过 `chrome.storage.local.get(null, console.log)` 查看。
