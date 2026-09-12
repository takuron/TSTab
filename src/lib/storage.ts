import { DEFAULT_CONFIG } from './config';

/**
 * 检测 Chrome/Edge 扩展环境。
 * @returns 是否支持扩展本地存储
 */
export function isExtension(): boolean {
	return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

function chromeCall<T>(invoke: (done: (value: T) => void) => void): Promise<T> {
	return new Promise((resolve, reject) => invoke((value) => {
		const error = chrome.runtime.lastError;
		if (error) reject(new Error(error.message));
		else resolve(value);
	}));
}

// 开发环境用单个快照保存全部数据，确保一次写入失败时原配置不受影响。
const LOCAL_KEY = 'tstab:local';
function readLocal(): Record<string, unknown> {
	const snapshot = localStorage.getItem(LOCAL_KEY);
	if (snapshot) return JSON.parse(snapshot);
	// 兼容旧版开发环境的逐键存储。
	const all: Record<string, unknown> = {};
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i)!;
		try { all[key] = JSON.parse(localStorage.getItem(key)!); } catch { /* 忽略非 JSON 旧值。 */ }
	}
	return all;
}

const localListeners = new Set<(keys: string[]) => void>();
const area = {
	async getAll(): Promise<Record<string, unknown>> {
		return isExtension() ? chromeCall((done) => chrome.storage.local.get(null, done)) : readLocal();
	},
	async get(key: string): Promise<unknown> {
		if (!isExtension()) return readLocal()[key];
		const values = await chromeCall<Record<string, unknown>>((done) => chrome.storage.local.get([key], done));
		return values[key];
	},
	async setMultiple(items: Record<string, unknown>): Promise<void> {
		if (isExtension()) await chromeCall<void>((done) => chrome.storage.local.set(items, done));
		else {
			localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...readLocal(), ...items }));
			localListeners.forEach((listener) => listener(Object.keys(items)));
		}
	},
	async set(key: string, value: unknown): Promise<void> {
		await area.setMultiple({ [key]: value });
	},
	async removeMultiple(keys: string[]): Promise<void> {
		if (isExtension()) await chromeCall<void>((done) => chrome.storage.local.remove(keys, done));
		else {
			const all = readLocal();
			keys.forEach((key) => delete all[key]);
			localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
			localListeners.forEach((listener) => listener(keys));
		}
	}
};

/**
 * 跨页面串行访问存储。回调内只能使用传入的存储接口，不能嵌套事务。
 * @param action 锁内读取、修改和提交操作；禁止等待网络
 * @returns 操作结果，存储失败时拒绝
 */
async function transaction<T>(action: (storage: typeof area) => Promise<T>): Promise<T> {
	// Chrome/Edge MV3 与 localhost 均支持 Web Locks；不支持时拒绝写入，避免静默丢数据。
	return await navigator.locks.request('tstab:storage', () => action(area));
}

/** 本地存储入口；所有写操作使用同一跨页面锁，Chrome 错误原样传播。 */
export const StorageManager = {
	/** 跨页面读取、修改和提交；回调接收未重复加锁的存储接口。 */
	transaction,
	/** @returns 全部存储数据 */
	getAll: area.getAll,
	/** @param key 存储键 @returns 对应值 */
	get: area.get,
	/** @param keys 存储键列表 @returns 对应键值 */
	async getMultiple(keys: string[]): Promise<Record<string, unknown>> {
		const all = await area.getAll();
		return Object.fromEntries(keys.map((key) => [key, all[key]]));
	},
	/** @param key 存储键 @param value 新值 @returns 写入完成 */
	set(key: string, value: unknown): Promise<void> {
		return transaction((storage) => storage.set(key, value));
	},
	/** @param items 一批键值 @returns 整批写入完成 */
	setMultiple(items: Record<string, unknown>): Promise<void> {
		return transaction((storage) => storage.setMultiple(items));
	},
	/** @param key 存储键 @returns 删除完成 */
	remove(key: string): Promise<void> {
		return transaction((storage) => storage.removeMultiple([key]));
	},
	/** @param keys 存储键列表 @returns 删除完成 */
	removeMultiple(keys: string[]): Promise<void> {
		return transaction((storage) => storage.removeMultiple(keys));
	},
	/** @returns 清空完成 */
	clear(): Promise<void> {
		return transaction(async (storage) => storage.removeMultiple(Object.keys(await storage.getAll())));
	},
	/** @param key 存储键 @param fallback 缺失时的默认值 @returns 存储值或默认值 */
	async getWithDefault<T>(key: string, fallback: T): Promise<T> {
		return (await area.get(key) as T | undefined) ?? fallback;
	},
	/** 在锁内补写缺失默认值。@returns 补齐后的完整配置 */
	initDefaults(): Promise<Record<string, unknown>> {
		return transaction(async (storage) => {
			const all = await storage.getAll();
			const missing = Object.fromEntries(Object.entries(DEFAULT_CONFIG).filter(([key]) => all[key] === undefined));
			if (Object.keys(missing).length) await storage.setMultiple(missing);
			return { ...all, ...missing };
		});
	},
	/**
	 * 监听当前页面及其他页面的存储变化。
	 * @param listener 接收已变化的键；空数组表示全部重新加载
	 * @returns 清理监听的函数
	 */
	subscribe(listener: (keys: string[]) => void): () => void {
		if (isExtension()) {
			const handler = (changes: Record<string, chrome.storage.StorageChange>, name: string) => {
				if (name === 'local') listener(Object.keys(changes));
			};
			chrome.storage.onChanged.addListener(handler);
			return () => chrome.storage.onChanged.removeListener(handler);
		}
		const handler = (event: StorageEvent) => { if (event.key === LOCAL_KEY || event.key === null) listener([]); };
		window.addEventListener('storage', handler);
		localListeners.add(listener);
		return () => { window.removeEventListener('storage', handler); localListeners.delete(listener); };
	}
};
