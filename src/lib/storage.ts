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

	/** 首次运行时写入默认配置（仅写入缺失项）。 */
	async initDefaults(): Promise<void> {
		const existing = await this.getAll();
		const configKeyMap: Record<keyof typeof DEFAULT_CONFIG, string> = {
			backgroundType: STORAGE_KEYS.BACKGROUND_TYPE,
			backgroundImage: STORAGE_KEYS.BACKGROUND_IMAGE,
			searchEngine: STORAGE_KEYS.SEARCH_ENGINE,
			quoteEnabled: STORAGE_KEYS.QUOTE_ENABLED,
			quoteTypes: STORAGE_KEYS.QUOTE_TYPES,
			copyProtection: STORAGE_KEYS.COPY_PROTECTION,
			quickAccessPosition: STORAGE_KEYS.QUICK_ACCESS_POSITION
		};
		const updates: Record<string, unknown> = {};
		for (const key of Object.keys(DEFAULT_CONFIG) as (keyof typeof DEFAULT_CONFIG)[]) {
			const storageKey = configKeyMap[key];
			if (existing[storageKey] === undefined) updates[storageKey] = DEFAULT_CONFIG[key];
		}
		if (Object.keys(updates).length) await this.setMultiple(updates);
	}
};
