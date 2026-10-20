# TSTab

一个简洁优雅的浏览器「新标签页」扩展，使用 **SvelteKit + Tailwind CSS v4 + DaisyUI 5** 构建。

本项目是将参考扩展 [Snow](https://github.com/ltba/Snow)（原生 HTML/CSS/JS 实现）以现代框架完整重写的版本。功能与 Snow 基本保持一致，代码则改为组件化、可维护的架构。

## ✨ 功能特性

- ⏰ **实时时间显示** — 时间与日期，每秒刷新
- 🔍 **智能搜索** — 百度 / Google / Bing 多引擎，可识别并直接打开网址
- 💬 **每日一言** — 使用 [一言 API](https://hitokoto.cn/)，支持类型筛选与本地缓存
- 🖼️ **自定义背景** — 默认渐变 / 默认图片 / 本地图片 / URL 图片四种模式
- 🖱️ **快捷访问 Dock** — macOS 风格顶部/底部 Dock，可增删改、拖拽或键盘排序
- 🎨 **毛玻璃 UI** — 半透明毛玻璃视觉效果
- ⚙️ **设置面板** — 背景、搜索引擎、快捷访问、一言、复制保护、配置导入/导出
- 🔒 **隐私保护** — 设置与快捷访问保存在本地；一言、远程图标、URL 背景及主动搜索会连接相应服务，详见[隐私政策](docs/privacy.html)
- 🧱 **组件化架构** — 基于 Svelte 组件与响应式 store

## 🛠️ 技术栈

- [SvelteKit](https://kit.svelte.dev/) + [Svelte](https://svelte.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)（通过 `@tailwindcss/vite`）
- [DaisyUI 5](https://daisyui.com/)
- `@sveltejs/adapter-static`（静态站点 / 扩展构建）
- Chrome Extensions MV3 API（`storage` / `activeTab` / `bookmarks`）

## 📁 目录结构

```
src/
  lib/
    config.ts          # 常量与默认配置
    storage.ts         # Storage 封装（chrome.storage + localStorage 降级）
    stores.ts          # 响应式 store（settings / quickAccess / quote）
    search.ts          # 搜索与网址识别
    types.ts           # 类型定义
    components/        # 页面组件（时间/搜索/一言/Dock/设置/复制保护…）
  routes/
    +layout.svelte     # 全局布局，引入 app.css
    newtab/            # 新标签页覆盖页  -> build/newtab.html
    popup/             # 扩展弹窗页面     -> build/popup.html
static/
  manifest.json        # MV3 清单（构建时自动补写 CSP）
  icons/  images/      # 静态资源
scripts/
  patch-manifest.mjs   # 构建后将内联脚本外部化并补写 CSP
```

## 🚀 快速开始

### 本地开发（网页预览）

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

打开 `http://localhost:5173/newtab` 与 `http://localhost:5173/popup` 预览样式与交互。
> 注意：`chrome.*` 扩展 API 仅在扩展环境可用。开发调试时数据会自动降级存入浏览器 `localStorage`。

### 构建浏览器扩展

```bash
pnpm run build
```

产物输出到 `build/` 目录，其中包含 `manifest.json`、`newtab.html`、`popup.html` 及静态资源。

### 加载到浏览器（开发者模式）

1. 浏览器打开扩展管理页：Chrome `chrome://extensions/` / Edge `edge://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `build/` 目录
4. 打开新标签页即可看到新界面；点击工具栏扩展图标可使用「添加到快捷访问」弹窗

> 默认背景图 `images/kevin-jiner-g-6gKgRC30k-unsplash.jpg` 来自 [Kévin JINER](https://unsplash.com/photos/a-snow-covered-mountain-with-a-clear-blue-sky-g-6gKgRC30k)（[Unsplash](https://unsplash.com/)）。站点预置图标来自 [dashboard-icons](https://github.com/homarr-labs/dashboard-icons)（Apache-2.0）；界面参考 Snow。项目采用 GPL v3，素材按各自许可证使用（见设置中的来源清单与仓库根目录 `LICENSE`）。

### 说明：MV3 与 CSP

SvelteKit 预渲染页面的启动脚本由 `scripts/patch-manifest.mjs` 外部化到 `app/bootstrap/`，同时移除 modulepreload 并写入 `script-src 'self'; object-src 'self'`。不使用内联脚本哈希或 unsafe-inline，请始终通过 `pnpm run build` 构建。

### 验证

```bash
pnpm run test   # 搜索、配置校验、存储并发、失败恢复、一言缓存回归
pnpm run check # 类型与组件诊断
pnpm run build # 生成最终扩展产物
```

配置导入兼容旧版 1.0 JSON，严格校验内容与大小。快捷访问使用稳定 ID，同一扩展的多个页面通过 Web Locks 与存储事件保持一致。本地开发请使用 localhost，以启用 Web Locks 所需的安全上下文。

## 📄 许可证

GPL v3，详见根目录 [LICENSE](./LICENSE)。重写实现与界面参考自 [Snow](https://github.com/ltba/Snow)。
