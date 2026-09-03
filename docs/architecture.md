# TSTab 前端架构

本文档描述 TSTab 的整体架构、模块边界与数据流。任何结构性改动后必须同步更新本文档（见 `llm_readme.md` 第 3.1 节）。

## 1 项目概览

TSTab 是一个浏览器「新标签页」扩展（Chrome MV3），使用 **SvelteKit（adapter-static，全预渲染）+ Svelte 5 + Tailwind CSS v4 + DaisyUI 5（dark 主题）** 构建。它是原生 HTML/CSS/JS 实现的参考扩展 [Snow](https://github.com/ltba/Snow) 的现代化重写，功能与视觉基本保持一致。

核心功能：实时时间、多引擎智能搜索（可识别网址直达）、每日一言（hitokoto API + 本地缓存）、自定义背景（渐变 / 本地图片 / URL）、macOS 风格快捷访问 Dock、复制保护、配置导入/导出。

## 2 分层架构

```
┌─────────────────────────────────────────────┐
│ routes（页面入口）                            │
│   /newtab  -> build/newtab.html（新标签页）    │
│   /popup   -> build/popup.html（工具栏弹窗）   │
├─────────────────────────────────────────────┤
│ components（展示组件，不含持久化逻辑）          │
│   TimeDisplay / SearchBar / QuoteCard /      │
│   QuickAccessDock / SettingsModal /          │
│   Cursor / Security                          │
├─────────────────────────────────────────────┤
│ stores（响应式状态层，读写 StorageManager）     │
│   settings / quickAccess / quote             │
├─────────────────────────────────────────────┤
│ lib 基础层                                   │
│   storage.ts  StorageManager（chrome.storage  │
│               + localStorage 降级）           │
│   search.ts   URL 识别与搜索链接构造           │
│   config.ts   常量 / 默认值 / 存储键名         │
│   types.ts    共享类型                        │
└─────────────────────────────────────────────┘
```

**依赖方向自上而下**：组件不直接调用 `chrome.storage`，一律通过 store；store 不直接操作 DOM；`config.ts` / `types.ts` 是最底层，被所有层引用。修改时应保持该边界。

## 3 目录结构

```
src/
  app.css                 # Tailwind/DaisyUI 入口 + 设计令牌 + glass 工具类 + 关键帧动画 + #snow-cursor 样式
  app.html                # SvelteKit HTML 模板（lang=zh-CN, data-theme=dark）
  lib/
    config.ts             # STORAGE_KEYS、SEARCH_ENGINES、DEFAULT_CONFIG、CACHE_EXPIRY 等常量与类型别名
    types.ts              # QuickAccessItem / Hitokoto / QuoteCache / Settings 接口
    storage.ts            # StorageManager：chrome.storage.local 封装，非扩展环境降级 localStorage
    stores.ts             # settings / quickAccess / quote 三个 store 及 applyPosition / faviconUrl 工具函数
    search.ts             # normalizeUrlOrNull / buildSearchUrl
    components/
      TimeDisplay.svelte      # 时间与日期，每秒 setInterval 刷新
      SearchBar.svelte        # 搜索输入 + 引擎切换（DaisyUI dropdown），提交后 window.location 跳转
      QuoteCard.svelte        # 一言展示（纯展示，数据来自 quote store）
      QuickAccessDock.svelte  # 底部/顶部 Dock，位置由 settings.quickAccessPosition 控制
      SettingsModal.svelte    # 设置弹窗：背景、引擎、一言、快捷访问增删改拖拽排序、配置导入/导出
      Cursor.svelte           # 自定义圆点光标（仅桌面端 >768px，lerp 平滑跟随，直接操作 DOM）
      Security.svelte         # 复制保护：按 settings.copyProtection 动态挂载/卸载 contextmenu/copy/cut/keydown 监听
  routes/
    +layout.js             # export const prerender = true（全部路由预渲染）
    +layout.svelte         # 引入 app.css，透传 slot
    newtab/+page.svelte    # 新标签页：加载 settings/quickAccess，组装全部组件
    popup/+page.svelte     # 弹窗：读取当前标签页（chrome.tabs.query），添加/移除快捷访问
static/
  manifest.json           # MV3 清单（构建时被 patch-manifest.mjs 补写 CSP 后复制到 build/）
  icons/  images/         # 图标与内置背景图（取自 Snow，GPL v3）
scripts/
  patch-manifest.mjs      # 构建后处理：见第 6 节
```

## 4 双环境模型（扩展 / 网页开发）

`storage.ts` 的 `isExtension()` 检测 `chrome.storage` 是否存在，决定 `StorageManager` 走 `chrome.storage.local` 还是 `localStorage` 降级实现（接口签名对齐 chrome.storage，全部返回 Promise）。

- `vite dev` 网页预览：数据存 `localStorage`；popup 页会显示「非扩展环境」提示，用当前地址模拟标签页。
- 扩展环境：数据存 `chrome.storage.local`，manifest 声明的权限为 `storage` / `tabs` / `activeTab`。

**规则：** 所有需要区分环境的代码必须通过 `isExtension()` 判断，不得散落 `typeof chrome` 检查。

## 5 数据层

### 5.1 存储键与默认值

- 键名统一定义在 `config.ts` 的 `STORAGE_KEYS`（如 `backgroundType`、`quickAccess`、`quoteCache` 等），**禁止**在别处硬编码字符串键。
- 默认值统一定义在 `config.ts` 的 `DEFAULT_CONFIG`；`StorageManager.initDefaults()` 在 `settings.load()` 时仅补写缺失键。
- 新增设置项时需同步修改：`DEFAULT_CONFIG`、`STORAGE_KEYS`、`SettingsState`（stores.ts）、`settings` store 的 `load()`/`save()` 映射、以及 `SettingsModal` 的 UI。

### 5.2 store 契约

| store | 方法 | 说明 |
| --- | --- | --- |
| `settings` | `load()` / `save(partial)` | `load` 会先 `initDefaults` 再全量读取；`save` 乐观更新内存后整批写存储 |
| `quickAccess` | `load()` / `add(item)` / `remove(i)` / `updateItem(i, patch)` / `reorder(from, to)` | 以 `url` 去重；所有变更即写存储 |
| `quote` | `load()` / `refresh()` / `clearCache()` | `load` 走 `CACHE_EXPIRY`（1 小时）缓存；失败展示罗曼·罗兰兜底文案 |

派生 store：`backgroundStyle`（由 settings 派生背景 CSS `url(...)`，渐变模式为空串）。

### 5.3 数据类型

见 `types.ts`：`QuickAccessItem { title, url, icon, addedAt }`、`Hitokoto`（一言 API 响应）、`QuoteCache { data, timestamp }`、`Settings`。

### 5.4 配置导入/导出

`SettingsModal.handleExport/handleImport`：导出为 `{ version, exportTime, exportDate, config }` JSON；导入校验 `config` 字段后整批 `setMultiple` 并重新 `load()` 两个 store。修改配置格式时需考虑旧导出文件的兼容性。

## 6 MV3 与 CSP（构建链关键点）

SvelteKit 预渲染页面内含客户端挂载所需的内联 `<script>`，而 MV3 禁止 `unsafe-inline`。因此：

1. `static/manifest.json` 是清单的**唯一事实来源**（不含 CSP 字段）。
2. `pnpm run build` = `vite build` + `node scripts/patch-manifest.mjs`。
3. `patch-manifest.mjs` 扫描 `build/` 下所有 `.html` 的内联脚本正文，计算 SHA-256 哈希，写入 `build/manifest.json` 的 `content_security_policy.extension_pages`（`script-src 'self' 'sha256-…'`）。
4. **任何构建产物问题优先排查此链路**；新增页面路由时需确认 `svelte.config.js` 的 `prerender.entries` 已包含（当前为 `/newtab` 与 `/popup`）。

## 7 外部依赖与网络

- 唯一外部 API：一言 `https://v1.hitokoto.cn/`（已在 manifest `host_permissions` 声明），类型参数由 `settings.quoteTypes`（`a/b/c/d/i` 等）映射为 `c=` 查询参数。
- 图标获取：`faviconUrl()` 直接拼接 `{origin}/favicon.ico`；popup 中优先使用 `chrome.tabs` 返回的 `favIconUrl`。
- 无任何第三方运行时依赖（package.json 中全部为 devDependencies）。

## 8 样式体系

- 设计令牌（颜色/背景/强调色）定义在 `app.css` 的 `:root`。
- 毛玻璃：`.glass`（blur 10px）与 `.glass-strong`（blur 24px）为 `@layer components` 工具类。
- `body` 保持透明、深色兜底放在 `html` 上——避免不透明背景盖住 `fixed -z-10` 的背景图层。改动背景层时必须保留此结构。
- 自定义光标 `#snow-cursor` 使用 `mix-blend-mode: difference`，样式在 `app.css`，逻辑在 `Cursor.svelte`。
