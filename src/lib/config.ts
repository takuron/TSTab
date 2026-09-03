export const STORAGE_KEYS = {
	BACKGROUND_IMAGE: 'backgroundImage',
	BACKGROUND_TYPE: 'backgroundType',
	SEARCH_ENGINE: 'searchEngine',
	QUOTE_CACHE: 'quoteCache',
	QUOTE_ENABLED: 'quoteEnabled',
	QUOTE_TYPES: 'quoteTypes',
	COPY_PROTECTION: 'copyProtection',
	QUICK_ACCESS: 'quickAccess',
	QUICK_ACCESS_POSITION: 'quickAccessPosition'
} as const;

export const SEARCH_ENGINES: Record<string, { name: string; url: string }> = {
	google: { name: 'Google', url: 'https://www.google.com/search?q=' },
	baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
	bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' }
};

export const HITOKOTO_API = 'https://v1.hitokoto.cn/';

export const DEFAULT_CONFIG = {
	backgroundType: 'preset',
	backgroundImage: 'images/img1.png',
	searchEngine: 'baidu',
	quoteEnabled: true,
	quoteTypes: ['a', 'b', 'c', 'd', 'i'],
	copyProtection: true,
	quickAccessPosition: 'bottom'
} as const;

export const CACHE_EXPIRY = 60 * 60 * 1000;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
export const IMAGE_HOSTS = ['unsplash', 'pexels', 'pixabay', 'imgur'];

export type BackgroundType = 'gradient' | 'preset' | 'local' | 'url';
export type QuickAccessPosition = 'top' | 'bottom';
export type QuoteTypes = string[];
