import { DEFAULT_CONFIG, STORAGE_KEYS } from './config';

/**
 * 是否运行在浏览器扩展环境中（存在 chrome.storage）。
 * 在浏览器开发调试（vite dev）时回退到 localStorage。
 */
export function isExtension(): boolean {
	return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
}

interface ChromeStorageArea {
	get(keys: string[] | null, cb: (items: Record<string, unknown>) => void): void;
	set(items: Record<string, unknown>, cb?: () => void): void;
	remove(keys: string[], cb?: () => void): void;
	clear(cb?: () => void): void;
}

function getArea(): ChromeStorageArea | null {
	if (isExtension()) return chrome.storage.local;
	return null;
}

/**
 * 在非扩展环境下用 localStorage 实现兼容的异步存储。
 * 键值全部 JSON 序列化。
 */
const localFallback = {
	async get(keys: string[] | null): Promise<Record<string, unknown>> {
		const result: Record<string, unknown> = {};
		if (keys === null) {
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i)!;
				result[key] = parse(localStorage.getItem(key));
			}
		} else {
			for (const key of keys) {
				result[key] = parse(localStorage.getItem(key));
			}
		}
		return result;
	},
	async set(items: Record<string, unknown>): Promise<void> {
		for (const [key, value] of Object.entries(items)) {
			localStorage.setItem(key, JSON.stringify(value));
		}
	},
	async remove(keys: string[]): Promise<void> {
		for (const key of keys) localStorage.removeItem(key);
	},
	async clear(): Promise<void> {
		localStorage.clear();
	}
};

function parse(raw: string | null): unknown {
	if (raw === null) return undefined;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

export const StorageManager = {
	async get(key: string): Promise<unknown> {
		const area = getArea();
		if (area) {
			return new Promise((resolve) =>
				area.get([key], (r) => resolve(r[key] ?? undefined))
			);
		}
		return localFallback.get([key]).then((r) => r[key]);
	},

	async getMultiple(keys: string[]): Promise<Record<string, unknown>> {
		const area = getArea();
		if (area) {
			return new Promise((resolve) => area.get(keys, (r) => resolve(r)));
		}
		return localFallback.get(keys);
	},

	async getAll(): Promise<Record<string, unknown>> {
		const area = getArea();
		if (area) {
			return new Promise((resolve) => area.get(null, (r) => resolve(r)));
		}
		return localFallback.get(null);
	},

	async set(key: string, value: unknown): Promise<void> {
		const area = getArea();
		if (area) {
			return new Promise((resolve) => area.set({ [key]: value }, resolve));
		}
		return localFallback.set({ [key]: value });
	},

	async setMultiple(items: Record<string, unknown>): Promise<void> {
		const area = getArea();
		if (area) {
			return new Promise((resolve) => area.set(items, resolve));
		}
		return localFallback.set(items);
	},

	async remove(key: string): Promise<void> {
		const area = getArea();
		if (area) {
			return new Promise((resolve) => area.remove([key], resolve));
		}
		return localFallback.remove([key]);
	},

	async removeMultiple(keys: string[]): Promise<void> {
		const area = getArea();
		if (area) {
			return new Promise((resolve) => area.remove(keys, resolve));
		}
		return localFallback.remove(keys);
	},

	async clear(): Promise<void> {
		const area = getArea();
		if (area) {
			return new Promise((resolve) => area.clear(resolve));
		}
		return localFallback.clear();
	},

	async getWithDefault<T>(key: string, defaultValue: T): Promise<T> {
		const value = await this.get(key);
		return value !== undefined && value !== null ? (value as T) : defaultValue;
	},

	/**
	 * 首次运行时写入默认配置（仅写入缺失项）。
	 * 传入已读取的全量数据可复用，避免启动时对 chrome.storage 重复全量读取造成卡顿；
	 * 返回补写默认值后的完整存储数据，供调用方直接使用。
	 *
	 * @param existing 可选，调用方已读取的存储数据；传入后本次内部不再读取
	 * @returns 补写默认值后的完整存储数据
	 */
	async initDefaults(existing?: Record<string, unknown>): Promise<Record<string, unknown>> {
		const all = existing ?? (await this.getAll());
		if (Object.keys(all).length === 0) {
			// 首次运行：整批写入默认值以尽早填充，避免逐个键导致多次写。
			await this.setMultiple(DEFAULT_CONFIG as Record<string, unknown>);
			return all;
		}
		const configKeyMap: Record<keyof typeof DEFAULT_CONFIG, string> = {
			backgroundType: STORAGE_KEYS.BACKGROUND_TYPE,
			backgroundImage: STORAGE_KEYS.BACKGROUND_IMAGE,
			searchEngine: STORAGE_KEYS.SEARCH_ENGINE,
			quoteEnabled: STORAGE_KEYS.QUOTE_ENABLED,
			quoteTypes: STORAGE_KEYS.QUOTE_TYPES,
			copyProtection: STORAGE_KEYS.COPY_PROTECTION,
			quickAccessPosition: STORAGE_KEYS.QUICK_ACCESS_POSITION,
			quickAccessMode: STORAGE_KEYS.QUICK_ACCESS_MODE,
			bookmarkFolderId: STORAGE_KEYS.BOOKMARK_FOLDER_ID,
			usePresetIcons: STORAGE_KEYS.USE_PRESET_ICONS,
			locale: STORAGE_KEYS.LOCALE
		};
		const updates: Record<string, unknown> = {};
		for (const key of Object.keys(DEFAULT_CONFIG) as (keyof typeof DEFAULT_CONFIG)[]) {
			const storageKey = configKeyMap[key];
			if (all[storageKey] === undefined) updates[storageKey] = DEFAULT_CONFIG[key];
		}
		if (Object.keys(updates).length) {
			await this.setMultiple(updates);
			return { ...all, ...updates };
		}
		return all;
	}
};
