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

export const SEARCH_ENGINES: Record<string, { name: string; url: string }> = {
	google: { name: 'Google', url: 'https://www.google.com/search?q=' },
	baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
	bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' }
};

export const HITOKOTO_API = 'https://v1.hitokoto.cn/';

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

export const CACHE_EXPIRY = 60 * 60 * 1000;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
export const IMAGE_HOSTS = ['unsplash', 'pexels', 'pixabay', 'imgur'];

export type BackgroundType = 'gradient' | 'preset' | 'local' | 'url';
export type QuickAccessPosition = 'top' | 'bottom';
/** 快捷访问数据来源：手动添加（manual）或读取书签文件夹（bookmark） */
export type QuickAccessMode = 'manual' | 'bookmark';
export type QuoteTypes = string[];
