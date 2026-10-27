# Edge 商店语言声明与提交说明

## 语言识别修复

界面的 Svelte 语言包不能直接声明商店语言。Partner Center 根据 manifest 的本地化引用及 `_locales` 消息文件识别语言；`name` 和 `description` 为硬编码时，可能只显示一个默认语言。现在 manifest 使用 `__MSG_extensionName__`、`__MSG_extensionDescription__` 和 `__MSG_actionTitle__`，并声明 `default_locale: "zh_CN"`。

| 用途 | 简体中文 | 英文 |
| --- | --- | --- |
| 原生扩展语言包 | `static/_locales/zh_CN/messages.json` | `static/_locales/en/messages.json` |
| 界面语言包 | `src/lib/i18n/locales/zh-CN.json` | `src/lib/i18n/locales/en-US.json` |

原生名称、简介和工具栏提示跟随浏览器语言；扩展页面由设置中的语言选项控制。一言正文与出处保留服务返回的原文，不随界面语言翻译。

官方依据：[Edge 多语言识别故障说明](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension#if-a-single-locale-appears-but-the-package-includes-multiple-languages)、[原生扩展语言代码](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales)。

## 重新上传与填写

1. 执行 `pnpm run test`、`pnpm run check`、`pnpm run build` 和 `pnpm run test:browser`。
2. 重新归档 `build/` 内的全部文件，使 `manifest.json` 和 `_locales/` 位于 ZIP 根目录。上传此前的旧 ZIP 不会获得本次修复。
3. 在 Partner Center 替换扩展包，进入“商店列表”，确认识别到简体中文及英文。
4. 在简体中文语言详情中填写完整描述并上传徽标，然后保存。至少完成一个语言详情才能继续；若保留英文条目，也应完成其描述与徽标，或按后台提供的选项暂时删除该商店条目。
5. 商店完整描述与徽标须在后台分别填写。manifest 的简短介绍和包内 `icons` 不会自动完成这两个字段。徽标可使用项目 `static/icons/icon128.png`；若本机已有 `release-materials/store-assets/logo-300x300.png`，优先使用该 300×300 版本，并使用后台的复制功能复用于英文。

完整描述要求 250–10,000 字符；徽标比例 1:1，最低 128×128，推荐 300×300。详见 [Edge 各语言商店字段要求](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension#step-7-enter-store-listing-details-for-each-language)。以下文案均满足长度要求，可直接复制到对应语言的完整描述字段。

## 简体中文完整描述

TSTab 是一款简洁的新标签页扩展，用时间、日期、搜索框和快捷访问，为每次打开浏览器提供一个清晰的起点。安装后，新标签页将显示 TSTab 页面；你可以在设置中调整背景、搜索引擎、语言与快捷访问方式。

支持默认渐变、内置图片、本地图片与图片链接作为背景。搜索框支持百度、Google、Bing、DuckDuckGo、Startpage 和搜狗；输入网址可直接访问，输入关键词则跳转到所选搜索引擎的结果页。

快捷访问可以手动添加网站，也可以展示所选书签文件夹中的直接链接。手动添加的条目支持编辑、删除、拖拽及按钮排序，快捷访问栏可以放在页面顶部或底部。浏览普通网页时，点击工具栏中的扩展图标，即可将当前页面加入或移出快捷访问。

每日一言提供句子展示、分类选择和本地缓存，也可以关闭。一言正文与出处保留原文。界面支持简体中文和英文，可跟随浏览器或手动选择；设置与手动快捷访问支持导出和导入 JSON 备份。

扩展无需注册或登录，配置与缓存保存在本机，不向开发者服务器上传，也不包含第三方分析。每日一言、远程背景图片与站点图标等功能会连接相应第三方服务，提交搜索会跳转到所选搜索引擎。书签模式仅显示所选文件夹的直接书签，不递归读取子文件夹；浏览器内部页面无法加入快捷访问。

## English full description

TSTab replaces your new tab page with a clean space for the time, date, search, and quick access to your favorite sites. Choose a gradient, the built-in image, a local image, or an image URL as your background.

Search with Google, Bing, Baidu, DuckDuckGo, Startpage, or Sogou. Enter a website address to visit it directly, or enter keywords to open results from your selected search engine.

Add quick access sites manually or display direct bookmarks from a selected folder. Manually added sites can be edited, removed, and reordered by dragging or using buttons. Place the quick access bar at the top or bottom of the page. While visiting a regular web page, click the extension's toolbar icon to add or remove that page from quick access.

An optional daily quote feature includes category selection and local caching. Quote text and attribution remain in their original language. The interface supports Simplified Chinese and English, with an option to follow your browser language. Export settings and manually added sites to a JSON backup, then import them when needed.

No account or sign-in is required. Settings and cached data are stored locally, with no uploads to a developer server and no third-party analytics. Daily quotes, remote background images, and site icons may connect to their respective third-party services. Searches open the selected search engine. Bookmark mode displays only direct links in the selected folder, and browser internal pages cannot be added to quick access.
