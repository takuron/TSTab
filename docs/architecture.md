# TSTab 前端架构

本文档描述 TSTab 的整体架构、模块边界与数据流。任何结构性改动后必须同步更新本文档（见 `llm_readme.md` 第 3.1 节）。

## 1 项目概览

TSTab 是一个浏览器「新标签页」扩展（Chrome MV3），使用 **SvelteKit（adapter-static，全预渲染）+ Svelte 5 + Tailwind CSS v4 + DaisyUI 5（dark 主题）** 构建。它是原生 HTML/CSS/JS 实现的参考扩展 [Snow](https://github.com/ltba/Snow) 的现代化重写，功能与视觉基本保持一致。

核心功能：实时时间、多引擎智能搜索（可识别网址直达）、每日一言（hitokoto API + 本地缓存）、自定义背景（默认渐变 / 默认图片 / 本地图片 / URL）、macOS 风格快捷访问 Dock、复制保护、配置导入/导出。

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
  app.html                # SvelteKit HTML 模板（data-theme=dark；lang 由客户端按 locale 动态写入）
  lib/
    config.ts             # STORAGE_KEYS、SEARCH_ENGINES、DEFAULT_CONFIG、CACHE_EXPIRY 等常量与类型别名
    types.ts              # QuickAccessItem / Hitokoto / QuoteCache / Settings 接口
    storage.ts            # StorageManager：chrome.storage.local 封装，非扩展环境降级 localStorage
    stores.ts             # settings / quickAccess / quote 三个 store 及 applyPosition / faviconUrl 工具函数
    search.ts             # normalizeUrlOrNull / buildSearchUrl
    i18n/
      index.js            # svelte-i18n 初始化：注册语言包、init、与 settings.locale 偏好同步、resolveLocale
      locales/
        zh-CN.json        # 简体中文语言包（默认 / fallback）
        en-US.json        # 英文语言包
    components/
      TimeDisplay.svelte      # 时间与日期（日期按当前 locale 格式化），每秒 setInterval 刷新
      SearchBar.svelte        # 搜索输入 + 引擎切换（DaisyUI dropdown），提交后 window.location 跳转
      QuoteCard.svelte        # 一言展示（纯展示，数据来自 quote store）
      QuickAccessDock.svelte  # 底部/顶部 Dock，位置由 settings.quickAccessPosition 控制
      SettingsModal.svelte    # 设置弹窗：语言、背景、引擎、一言、快捷访问增删改拖拽排序、配置导入/导出
      Cursor.svelte           # 自定义圆点光标（仅桌面端 >768px，lerp 平滑跟随，直接操作 DOM）
      Security.svelte         # 复制保护：按 settings.copyProtection 动态挂载/卸载 contextmenu/copy/cut/keydown 监听
  routes/
    +layout.js             # export const prerender = true（全部路由预渲染）
    +layout.svelte         # 引入 app.css、导入 i18n（副作用）、同步 <html lang>，透传 slot
    newtab/+page.svelte    # 新标签页：加载 settings/quickAccess，组装全部组件（backgroundType 为图片时叠加暗色调覆盖层）
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
- 新增设置项时需同步修改：`DEFAULT_CONFIG`、`STORAGE_KEYS`、`SettingsState`（stores.ts）、`settings` store 的 `load()`/`save()` 映射、以及 `SettingsModal` 的 UI（若为语言类配置见第 9 节）。

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

SvelteKit 预渲染页面内含客户端挂载所需的内联 `<script>`，而 MV3 禁止 `unsafe-inline`；同时 Chrome 扩展**禁止 `_` 开头的文件/目录名**（系统保留），故产物目录不能用 SvelteKit 默认的 `_app`。因此：

1. `static/manifest.json` 是清单的**唯一事实来源**（不含 CSP 字段）。
2. `svelte.config.js` 设置 `kit.appDir = 'app'`：客户端 JS/CSS 产物输出到 `build/app/`，HTML 引用 `/app/**` 绝对路径（配合 `paths.relative = false`）。
3. `pnpm run build` = `vite build` + `node scripts/patch-manifest.mjs`。
4. `patch-manifest.mjs` 将 `build/` 下所有 `.html` 的内联脚本外部化为 `build/app/bootstrap/*.js`（以 `src` 引用），并在 `build/manifest.json` 写入 `content_security_policy.extension_pages`（`script-src 'self'`）。脚本中的 `APP_DIR` 常量必须与 `kit.appDir` 保持一致。
5. **任何构建产物问题优先排查此链路**；新增页面路由时需确认 `svelte.config.js` 的 `prerender.entries` 已包含（当前为 `/newtab` 与 `/popup`）。

## 7 外部依赖与网络

- 唯一外部 API：一言 `https://v1.hitokoto.cn/`（已在 manifest `host_permissions` 声明），类型参数由 `settings.quoteTypes`（`a/b/c/d/i` 等）映射为 `c=` 查询参数。
- 图标获取：`faviconUrl()` 直接拼接 `{origin}/favicon.ico`；popup 中优先使用 `chrome.tabs` 返回的 `favIconUrl`。
- 无任何第三方运行时依赖（package.json 中全部为 devDependencies）。

## 8 样式体系

- 设计令牌（颜色/背景/强调色）定义在 `app.css` 的 `:root`。
- 毛玻璃：`.glass`（blur 10px）与 `.glass-strong`（blur 24px）为 `@layer components` 工具类。
- `body` 保持透明、深色兜底放在 `html` 上——避免不透明背景盖住 `fixed -z-10` 的背景图层。改动背景层时必须保留此结构。
- 自定义光标 `#snow-cursor` 使用 `mix-blend-mode: difference`，样式在 `app.css`，逻辑在 `Cursor.svelte`。

## 9 国际化（i18n）

TSTab 使用 **`svelte-i18n`**（主流 SvelteKit 客户端国际化方案）实现多语言，而非自研方案。所有界面文案通过 `$_('key')` 按当前语言响应式输出，语言切换即时生效、无需刷新。

### 9.1 模块与目录

- `src/lib/i18n/index.js`：初始化入口，模块加载即执行——注册语言包（`addMessages`）、调用 `init({ fallbackLocale: 'zh-CN' })`，并与 `settings` store 的 `locale` 偏好做双向同步。
- `src/lib/i18n/locales/zh-CN.json` / `en-US.json`：两套平行的语言包（默认中文，`zh-CN` 兼作 fallback）。键采用点分（如 `settings.title`）、`{var}` 插值。
- `src/routes/+layout.svelte`：`import '$lib/i18n'`（副作用初始化）+ 订阅 svelte-i18n 的 `locale` 以动态写入 `<html lang>`。

### 9.2 语言偏好与解析

- 设置项 `settings.locale`（存储键 `locale`）取值：`'browser'`（默认，跟随浏览器）| `'zh-CN'` | `'en-US'`。
- `resolveLocale(pref)` 负责解析：固定语言直接返回；`browser`/空值回退到 `getLocaleFromNavigator()`，非浏览器环境回退 `zh-CN`。
- `settings.save({ locale });` 触发 store 更新 → i18n 订阅自动 `locale.set(...)`，全站文案与 `<html lang>` 随之切换。

### 9.3 使用规范（LLM 与开发者必须遵守）

1. **禁止硬编码用户可感知的中文文案**。所有出现在 UI 的字符串（含 `title`/`aria-label`/`placeholder`/`alert`/`confirm` 文本）一律通过 `$_('key')` 读取；JS 函数内的提示用 `$_('msg.xxx', { vars })` 插值。
2. **新增/修改文案必须同步两份语言包**：先在 `zh-CN.json` 增加 key，再在 `en-US.json` 补全对应英文，保证键名与层级一致；缺失时会在运行时回退 `zh-CN`，但文档规范要求始终补齐。
3. **组件内使用**：模板与脚本统一 `import { _ } from 'svelte-i18n'` 后用 `$_('key')`。注意 `$_` 是 Svelte 自动订阅语法，仅对字面命名为 `_` 的 store 生效，**禁止改名为 `_t` 等别名**。
4. **语言相关逻辑放在 `i18n/index.js`**；`stores.ts` 中需要取文案处（如一言的兜底文案 / loading）用 `get(_)('key')`（`_` 是 function store）。
5. **命名空间**：顶级按模块分组 `engine / search / quote / newtab / common / settings / msg / popup / qaDock`；`msg.*` 专放 `alert`/`confirm` 等脚本提示，`settings.*` 放设置面板，`popup.*` 放工具栏弹窗。
6. **manifest 与品牌**：`static/manifest.json` 的 `name`/`description` 为静态品牌文案（`_locales` 未启用），暂不随语言设置切换，正文界面不依赖此处。

### 9.4 注意事项

- `_` 目录限制：`svelte-i18n` 运行时依赖 `intl-messageformat` / `es5-ext`（已加入 `pnpm-workspace.yaml` 的 `allowBuilds`）。语言包为 JSON 静态资源，经 Vite 打包进客户端 chunk，无额外网络请求。
- 预渲染：页面在服务端以 `initialLocale: 'zh-CN'` 预渲染，客户端 hydration 后按偏好切换到正确语言（跟随浏览器或固定语言），符合扩展的无路由、运行时切换场景。
