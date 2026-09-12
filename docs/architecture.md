# TSTab 前端架构

## 1 项目与模块边界

TSTab 是 SvelteKit adapter-static 全预渲染的 Chrome/Edge MV3 新标签页扩展，使用 Svelte 5、Tailwind CSS v4、DaisyUI 5 dark 主题。界面参考 Snow，项目采用 GPL v3。

依赖方向：`routes → components → stores → storage / validation / search → config / types`。组件不直接访问 `chrome.storage`；展示组件使用经典 Svelte store 与 `export let`，DOM 行为只放在组件内。

## 2 目录与职责

| 文件 | 职责 |
| --- | --- |
| `src/lib/config.ts` | 默认设置、存储键、内置搜索引擎（`SEARCH_ENGINES` 与 `SearchEngine` 类型）、缓存与图片限制 |
| `src/lib/types.ts` | Settings、QuickAccessItem、QuoteCache 等共享类型 |
| `src/lib/storage.ts` | Chrome 本地存储、开发环境 localStorage、Web Locks 与变更监听 |
| `src/lib/validation.ts` | 设置、URL/图片来源、快捷访问、缓存与配置备份校验；`searchEngine` 取值与内置引擎清单同步 |
| `src/lib/controls.ts` | 表单控件 action，在保存失败时主动恢复已保存值 |
| `src/lib/search.ts` | HTTP(S) URL 校验、搜索输入识别和引擎查询地址 |
| `src/lib/stores.ts` | settings、quickAccess、bookmarkDock、quote、操作错误和导入导出 |
| `src/lib/dockIcons.ts` | 域名与本地 SVG 预置图标映射 |
| `src/lib/licenses.ts` | 设置面板中的第三方许可来源清单 |
| `src/lib/i18n/index.js` | 语言包注册、浏览器语言归一化、设置同步 |
| `src/lib/components/SettingsModal.svelte` | 原生模态 dialog、设置、背景、快捷访问编辑、导入导出 |
| `src/lib/components/SearchBar.svelte` | 搜索输入与原生 select 引擎选择器 |
| `src/lib/components/QuickAccessDock.svelte` | 按稳定 ID 渲染手动条目或书签，支持顶部/底部位置 |
| `src/lib/components/Security.svelte` | 复制保护，放行输入、设置、按钮、链接与拖拽 |
| `src/lib/components/TimeDisplay.svelte` / `QuoteCard.svelte` | 时间日期、一言展示 |
| `src/routes/+layout.svelte` | 全局样式、html lang、存储变更监听、错误提示 |
| `src/routes/newtab/+page.svelte` | 初始化本地数据，组装新标签页与按需加载一言 |
| `src/routes/popup/+page.svelte` | 加载语言偏好，读取当前标签页并管理快捷访问 |
| `tests/helpers.mjs` / `regressions.test.mjs` / `browser-smoke.mjs` | 独立页面上下文、共享锁/存储模拟及临时 Chromium 界面回归 |

## 3 存储与并发

`isExtension()` 判断 `chrome.storage.local` 是否可用；Chrome/Edge 使用 `chrome.storage.local`，本地开发使用 localStorage 的 `tstab:local` JSON 快照，兼容读取旧的逐键数据。单快照写入确保开发环境配额失败时不产生半份配置。

所有写入，以及涉及旧数据的读取—修改—写入，使用同一个同源 Web Lock：`tstab:storage`。锁作用于同一扩展的所有页面，popup 和新标签页共享。生产扩展及 localhost 均支持该 API；不支持 Web Locks 的环境不会使用不安全的无锁写入。

- `StorageManager.transaction(action)` 给回调提供 `get/getAll/set/setMultiple/removeMultiple`，回调内使用此接口，不得嵌套调用加锁的公共方法，也不得等待网络。
- Chrome 回调检查 `runtime.lastError` 并拒绝 Promise；页面状态在成功提交后才更新。
- `settings.load()` 在锁内读取并修复缺失/异常字段；`settings.save(partial)` 校验增量设置后先乐观更新界面，再在锁内合并最新快照、只写指定字段，仅当合并结果与乐观界面不同步时才重新刷新界面。保存失败不回退、不报错，保持乐观界面。
- `quickAccess.load()` 在锁内规范化旧数据、补充稳定 ID；增删改排序均重新读取最新列表。
- 布局挂载时调用 `startStorageSync()`，通过 `StorageManager.subscribe()` 监听 Chrome storage 或开发环境 storage 事件，重新加载受影响的 store；布局销毁时清理监听。
- 用户事件通过 `runAction()` 捕获失败，`operationError` 保存翻译键；页面及设置 dialog 显示可关闭的错误提示。设置保存自身不抛错，失败时保留乐观界面，因此不触发该提示。

新增设置项时同步 DEFAULT_CONFIG、STORAGE_KEYS、Settings、validation.ts 的字段校验、UI 和双语文案。

## 4 快捷访问与书签

`QuickAccessItem { id, title, url, icon, addedAt }`：手动条目使用 UUID，编辑 URL 或排序时不改变 ID。旧版缺少 ID 的条目在加锁加载时迁移。所有入口统一校验 HTTP(S) 地址并规范化 URL，手动添加/编辑禁止重复 URL。

- `quickAccess.add(item)`：传入无 ID 的条目，返回是否新增。
- `remove(id)` / `updateItem(id, { title, url })` / `reorder(fromId, toId)`：按 ID 定位，不接受旧的数组下标；目标删除后不误操作其他条目。编辑冲突报错，重复 URL 返回 false。
- `bookmarkDock.load(folderId)`：读取文件夹直接子书签，过滤非 HTTP(S) 链接，ID 使用 `bookmark:${bookmark.id}`，重复 URL 的书签可同时展示；请求序号避免旧文件夹的异步结果覆盖新选择。
- `bookmarkDock.listFolders()`：返回文件夹路径列表；非扩展环境返回空。
- 书签在新标签页打开、模式/文件夹变化时重新读取；编辑浏览器书签后可重新打开标签页查看。
- Dock 使用 `quickAccessPosition` 决定顶部/底部，按域名匹配本地 SVG，未命中回退 favicon。
- 设置中支持拖拽排序及上移/下移按钮，键盘用户无需依赖拖拽。

## 5 配置导入导出

备份格式维持 `{ version: '1.0', exportTime, exportDate, config }`，兼容原先导出的 1.0 备份。

`exportBackup()` 在锁内生成已知字段的快照。`validateBackup()` 在写入之前校验版本、普通对象、已知键、字段类型/枚举、数组元素、时间戳、图片来源、URL 协议和重复 ID/URL；未知版本、未知配置键与无效字段均拒绝。导入文件上限 10 MiB，本地图片上限 5 MiB；base64 图片具有相应编码大小限制，单个列表最多 2000 项。

`importBackup(data)` 再次校验后一次 `setMultiple`，缺失设置恢复默认值、缺失列表恢复空列表、缺失一言缓存恢复空缓存。验证失败不写入，Chrome 配额失败不更新界面。新缓存 revision 使导入前发出的网络响应失效。成功后刷新设置与快捷访问；其他页面通过存储事件同步。

## 6 一言

采用两个缓存位与 active 使用标记。切换与 shownAt 在本地事务中先保存，网络补充不直接更新展示。网络锁独立于存储锁，请求具有超时、响应校验和 revision 校验，避免并发刷新或清空/导入后的迟到请求覆盖新内容。详见 [一言文档](quote_api.md)。

## 7 MV3 构建与网络

- `static/manifest.json` 是清单来源；权限为 `storage / activeTab / bookmarks`，host permission 仅包含一言域名。
- popup 通过用户点击工具栏 action 获得当前标签页的临时访问权，不再申请广泛的 `tabs` 权限；不支持加入浏览器内部页等非 HTTP(S) 地址。
- 必须使用 `pnpm run build`：Vite 预渲染 `/newtab` 与 `/popup`，随后 patch-manifest.mjs 将 HTML 内联脚本外部化到 `build/app/bootstrap/`，移除 modulepreload，写入 `script-src 'self'; object-src 'self'`。
- `kit.appDir = 'app'` 避免使用保留目录名 `_app`，`paths.relative = false`；禁止手工修改 build。原生扩展本地化的 `_locales` 是允许的特殊目录，但本项目暂未启用。
- 运行时脚本与语言包全部本地打包；运行时依赖包含 Svelte 和 svelte-i18n 及其传递依赖。
- 一言使用 HTTPS JSON API；URL 背景、未命中预置图标的 favicon 会请求相应第三方，搜索提交直接跳转到选定引擎。没有第三方分析或远端上报。

## 8 样式与可访问性

使用 app.css 设计令牌、`.glass / .glass-strong`、Tailwind 与 DaisyUI dark。html 深色兜底、body 透明；popup 专属样式通过 `body:has([data-popup])` 放在 app.css。

设置使用原生 `dialog.showModal()`：浏览器限制背景交互、圈定焦点并支持 Esc；关闭后恢复打开按钮焦点。保持原毛玻璃样式。复制保护不拦截设置或可编辑内容，不取消 dragstart。项目不再包含自定义光标组件。

## 9 国际化

所有 UI 文案通过 svelte-i18n `_` 获取，语言包同时维护 zh-CN 与 en-US；组件必须使用 `$_`，不能重命名自动订阅标识。

**当前库的插值参数名是 `values`**：`$_('msg.importConfirmWithDate', { values: { time } })`，不得使用 `vars` 或顶层 `{ time }`。

语言偏好 `browser / zh-CN / en-US`；`resolveLocale()` 将浏览器 `en` 和全部 `en-*` 归一到 en-US，其他语言回退 zh-CN。固定语言直接使用。设置及 popup 均加载持久化偏好；模块订阅仅在实际语言变化时更新 locale，布局同步 html lang。一言缺省内容由翻译 store 派生，切换语言即时更新。

manifest 品牌文案仍为静态中文；扩展界面的两套语言包不等同于商店原生本地化。
