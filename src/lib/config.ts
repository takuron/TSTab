/** 持久化存储键；组件不得硬编码存储键。 */
export const STORAGE_KEYS = {
	BACKGROUND_IMAGE: 'backgroundImage',
	BACKGROUND_TYPE: 'backgroundType',
	SEARCH_ENGINE: 'searchEngine',
	QUOTE_CACHE: 'quoteCache',
	QUOTE_ENABLED: 'quoteEnabled',
	QUOTE_TYPES: 'quoteTypes',
	COPY_PROTECTION: 'copyProtection',
	QUICK_ACCESS: 'quickAccess',
	QUICK_ACCESS_POSITION: 'quickAccessPosition',
	QUICK_ACCESS_MODE: 'quickAccessMode',
	BOOKMARK_FOLDER_ID: 'bookmarkFolderId',
	USE_PRESET_ICONS: 'usePresetIcons',
	LOCALE: 'locale'
} as const;

/** 内置搜索引擎及其查询地址。 */
export const SEARCH_ENGINES = {
	google: { name: 'Google', url: 'https://www.google.com/search?q=' },
	baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
	bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
	duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
	startpage: { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=' },
	sogou: { name: '搜狗', url: 'https://www.sogou.com/web?query=' }
} satisfies Record<string, { name: string; url: string }>;

/** 内置搜索引擎标识。 */
export type SearchEngine = keyof typeof SEARCH_ENGINES;

/** 一言 JSON API 地址。 */
export const HITOKOTO_API = 'https://v1.hitokoto.cn/';

/** 新安装时的默认设置。 */
export const DEFAULT_CONFIG = {
	backgroundType: 'preset',
	backgroundImage: 'images/kevin-jiner-g-6gKgRC30k-unsplash.jpg',
	searchEngine: 'baidu',
	quoteEnabled: true,
	quoteTypes: ['a', 'b', 'c', 'd', 'i'],
	copyProtection: true,
	quickAccessPosition: 'bottom',
	quickAccessMode: 'manual',
	bookmarkFolderId: null,
	usePresetIcons: true,
	locale: 'browser'
} as const;

/** 一言槽位展示时长上限（毫秒）。 */
export const CACHE_EXPIRY = 60 * 60 * 1000;
/** 本地背景图片大小上限（字节）。 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
/** 常见图片后缀。 */
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
/** 常见图片服务名称。 */
export const IMAGE_HOSTS = ['unsplash', 'pexels', 'pixabay', 'imgur'];

/** 背景类型。 */
export type BackgroundType = 'gradient' | 'preset' | 'local' | 'url';
/** Dock 位置。 */
export type QuickAccessPosition = 'top' | 'bottom';
/** 快捷访问数据来源：手动添加（manual）或读取书签文件夹（bookmark） */
export type QuickAccessMode = 'manual' | 'bookmark';
/** 一言分类标识数组。 */
export type QuoteTypes = string[];
