import { derived, get, writable } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { CACHE_EXPIRY, DEFAULT_CONFIG, HITOKOTO_API, STORAGE_KEYS } from './config';
import { isExtension, StorageManager } from './storage';
import { webUrlOrNull } from './search';
import { normalizeQuickAccess, normalizeQuoteCache, normalizeSettings, validateBackup, validateHitokoto, validateSettingsPatch } from './validation';
import type { BookmarkFolderOption, Hitokoto, QuickAccessItem, QuoteCache, Settings } from './types';

/** 当前操作错误的翻译键；空串表示没有错误。 */
export const operationError = writable('');

/**
 * 将异步操作错误展示在当前页面，同时避免事件处理器产生未捕获拒绝。
 * @param action 待执行的用户操作
 * @returns 操作处理完成
 */
export async function runAction(action: () => unknown | Promise<unknown>): Promise<void> {
	try { await action(); } catch (error) {
		console.error('操作失败:', error);
		operationError.set('msg.operationFailed');
	}
}

function createSettingsStore() {
	const { subscribe, set, update } = writable<Settings & { ready: boolean }>({ ...normalizeSettings({}), ready: false });
	return {
		subscribe,
		async load(): Promise<void> {
			await StorageManager.transaction(async (storage) => {
				const all = await storage.getAll();
				const next = normalizeSettings(all);
				const repair = Object.fromEntries(Object.entries(next).filter(([key, value]) => JSON.stringify(all[key]) !== JSON.stringify(value)));
				if (Object.keys(repair).length) await storage.setMultiple(repair);
				set({ ...next, ready: true });
			});
		},
		async save(partial: Partial<Settings>): Promise<void> {
			const patch = validateSettingsPatch(partial);
			// 1. 先按乐观改动更新界面：保存立即生效，不等待落盘，失败也不回退。
			const optimistic = { ...get(settings), ...patch };
			update(() => optimistic);
			try {
				await StorageManager.transaction(async (storage) => {
					// 2. 在锁内合并最新快照，只提交本次改动字段，保留其他字段的最新值。
					const merged = normalizeSettings({ ...await storage.getAll(), ...patch });
					await storage.setMultiple(patch);
					// 3. 仅当快照合并结果与乐观界面不同步（并发改动或值被规范化）时才刷新界面。
					if (JSON.stringify({ ...merged, ready: optimistic.ready }) !== JSON.stringify(optimistic)) {
						set({ ...merged, ready: true });
					}
				});
			} catch (error) {
				// 保存失败保持乐观界面，不向页面报错；后续同步或重新加载时再校准。
				console.error('设置保存失败，保留乐观界面:', error);
			}
		}
	};
}

/** 设置状态；加载修复历史异常值，保存先乐观更新界面再增量提交并按快照校准。 */
export const settings = createSettingsStore();

/** 背景 CSS 值；转义 URL 中的引号与控制字符，渐变模式返回空串。 */
export const backgroundStyle = derived(settings, ($s) =>
	$s.backgroundType === 'gradient' || !$s.backgroundImage ? '' : `url(${JSON.stringify($s.backgroundImage)})`);

function createQuickAccessStore() {
	const { subscribe, set } = writable<QuickAccessItem[]>([]);
	async function mutate<T>(change: (items: QuickAccessItem[]) => T): Promise<T> {
		return StorageManager.transaction(async (storage) => {
			const original = await storage.get(STORAGE_KEYS.QUICK_ACCESS);
			const items = normalizeQuickAccess(original ?? []);
			const result = change(items);
			if (JSON.stringify(original) !== JSON.stringify(items)) await storage.set(STORAGE_KEYS.QUICK_ACCESS, items);
			set(items);
			return result;
		});
	}
	return {
		subscribe,
		async load(): Promise<void> { await mutate(() => undefined); },
		async add(item: Omit<QuickAccessItem, 'id'>): Promise<boolean> {
			const [entry] = normalizeQuickAccess([{ ...item, id: crypto.randomUUID() }], true);
			return mutate((items) => {
				if (items.some((it) => it.url === entry.url)) return false;
				if (items.length >= 2000) throw new Error('Quick access limit reached');
				items.push(entry);
				return true;
			});
		},
		async remove(id: string): Promise<void> {
			await mutate((items) => { const index = items.findIndex((it) => it.id === id); if (index >= 0) items.splice(index, 1); });
		},
		async updateItem(id: string, patch: Pick<QuickAccessItem, 'title' | 'url'>): Promise<boolean> {
			return mutate((items) => {
				const index = items.findIndex((it) => it.id === id);
				if (index < 0) throw new Error('Item removed in another page');
				const [next] = normalizeQuickAccess([{ ...items[index], ...patch, icon: faviconUrl(patch.url) }], true);
				if (items.some((it) => it.id !== id && it.url === next.url)) return false;
				items[index] = next;
				return true;
			});
		},
		async reorder(fromId: string, toId: string): Promise<void> {
			await mutate((items) => {
				const from = items.findIndex((it) => it.id === fromId), to = items.findIndex((it) => it.id === toId);
				if (from < 0 || to < 0 || from === to) return;
				const [moved] = items.splice(from, 1);
				items.splice(to, 0, moved);
			});
		}
	};
}

/** 手动快捷访问；所有修改在跨页面锁内读取最新列表，以稳定 ID 定位。 */
export const quickAccess = createQuickAccessStore();

/**
 * 获取站点根目录的 favicon 地址。
 * @param url HTTP(S) 页面地址
 * @returns 图标地址，非法协议返回空串
 */
export function faviconUrl(url: string): string {
	const valid = webUrlOrNull(url);
	return valid ? `${new URL(valid).origin}/favicon.ico` : '';
}

/**
 * 在写入前严格校验备份，然后一次提交；缺失设置恢复默认值。
 * @param data 解析后的备份对象
 * @returns 导入及当前页面刷新完成
 */
export async function importBackup(data: unknown): Promise<void> {
	const config = validateBackup(data);
	await StorageManager.transaction(async (storage) => {
		await storage.setMultiple({ ...DEFAULT_CONFIG, [STORAGE_KEYS.QUICK_ACCESS]: [],
			[STORAGE_KEYS.QUOTE_CACHE]: emptyQuoteCache(), ...config });
	});
	await Promise.all([settings.load(), quickAccess.load()]);
}

/**
 * 导出已知配置字段与已校验的数据，不包含无关存储键。
 * @returns 兼容 1.0 格式的备份对象
 */
export async function exportBackup() {
	return StorageManager.transaction(async (storage) => {
		const all = await storage.getAll();
		return { version: '1.0', exportTime: new Date().toISOString(), exportDate: new Date().toLocaleString(),
			config: { ...normalizeSettings(all), [STORAGE_KEYS.QUICK_ACCESS]: normalizeQuickAccess(all[STORAGE_KEYS.QUICK_ACCESS] ?? []),
				[STORAGE_KEYS.QUOTE_CACHE]: normalizeQuoteCache(all[STORAGE_KEYS.QUOTE_CACHE]) ?? emptyQuoteCache() } };
	});
}

/**
 * 同步其他新标签页与 popup 的设置和快捷访问；布局挂载时注册。
 * @returns 清理所有监听的函数
 */
export function startStorageSync(): () => void {
	return StorageManager.subscribe((keys) => {
		if (!keys.length || keys.some((key) => Object.hasOwn(DEFAULT_CONFIG, key))) void runAction(() => settings.load());
		if (!keys.length || keys.includes(STORAGE_KEYS.QUICK_ACCESS)) void runAction(() => quickAccess.load());
	});
}

/* ---------- 书签 Dock ---------- */
interface BookmarkDockState {
	items: QuickAccessItem[];
	folderName: string;
}

function createBookmarkDockStore() {
	const { subscribe, set } = writable<BookmarkDockState>({ items: [], folderName: '' });
	let requestId = 0;

	// 1. 仅扩展环境下可读取书签；非扩展环境或权限缺失时返回空数组，避免报错。
	function getBookmarksTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
		if (!isExtension() || typeof chrome.bookmarks === 'undefined') {
			return Promise.resolve([]);
		}
		return new Promise((resolve, reject) => chrome.bookmarks.getTree((tree) => {
			if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
			else resolve(tree);
		}));
	}

	// 2. 按 id 在树中深度查找节点。
	function findNode(
		nodes: chrome.bookmarks.BookmarkTreeNode[],
		id: string | null
	): chrome.bookmarks.BookmarkTreeNode | undefined {
		if (!id) return undefined;
		for (const node of nodes) {
			if (node.id === id) return node;
			if (node.children) {
				const found = findNode(node.children, id);
				if (found) return found;
			}
		}
		return undefined;
	}

	// 3. 仅取目标文件夹的直接子节点（存在 url 即视为书签），不递归遍历子文件夹。
	async function load(folderId: string | null): Promise<void> {
		const request = ++requestId;
		if (!folderId) {
			set({ items: [], folderName: '' });
			return;
		}
		const tree = await getBookmarksTree();
		if (request !== requestId) return;
		const folder = findNode(tree, folderId);
		if (!folder) {
			set({ items: [], folderName: '' });
			return;
		}
		const items: QuickAccessItem[] = (folder.children ?? [])
			.filter((c): c is chrome.bookmarks.BookmarkTreeNode & { url: string } => Boolean(webUrlOrNull(c.url)))
			.map((c) => ({
				id: `bookmark:${c.id}`,
				title: c.title || c.url,
				url: c.url,
				icon: faviconUrl(c.url),
				addedAt: c.dateAdded ?? 0
			}));
		set({ items, folderName: folder.title || '' });
	}

	// 4. 遍历树汇总所有文件夹节点（含层级路径），供设置面板下拉选择。
	function flattenFolders(
		nodes: chrome.bookmarks.BookmarkTreeNode[],
		path: string
	): BookmarkFolderOption[] {
		const result: BookmarkFolderOption[] = [];
		for (const node of nodes) {
			// 无 children 的节点是书签而非文件夹，跳过。
			if (!node.children) continue;
			const nodePath = path ? `${path} / ${node.title || node.id}` : node.title || node.id;
			result.push({ id: node.id, title: node.title || node.id, path: nodePath });
			result.push(...flattenFolders(node.children, nodePath));
		}
		return result;
	}

	async function listFolders(): Promise<BookmarkFolderOption[]> {
		const tree = await getBookmarksTree();
		return flattenFolders(tree, '');
	}

	return { subscribe, load, listFolders };
}

/** 书签 Dock 状态，重复 URL 以书签 ID 区分。 */
export const bookmarkDock = createBookmarkDockStore();

/* ---------- 一言双缓存 ---------- */

function emptyQuoteCache(): QuoteCache {
	return { initialized: false, active: 0, revision: crypto.randomUUID(),
		slots: [{ data: null, timestamp: 0 }, { data: null, timestamp: 0 }] };
}

function createQuoteStore() {
	const activeData = writable<Hitokoto | null>(null);
	// 缺省文案随语言变化，不把翻译结果写入缓存。
	const display = derived([activeData, _], ([$data, $translate]) => ({
		text: $data?.hitokoto ?? $translate('quote.fallbackText'),
		source: $data ? ($data.from ? ($data.from_who ? `—— ${$data.from_who}《${$data.from}》` : `—— ${$data.from}`) : '')
			: `—— ${$translate('quote.author')}`,
		loading: false
	}));

	async function fetchQuote(types: string[]): Promise<Hitokoto> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 8000);
		try {
			const params = new URLSearchParams(types.map((type) => ['c', type]));
			const response = await fetch(`${HITOKOTO_API}?${params}`, { signal: controller.signal, credentials: 'omit' });
			if (!response.ok) throw new Error('Quote request failed');
			return validateHitokoto(await response.json());
		} finally { clearTimeout(timer); }
	}

	async function fillIdle(): Promise<void> {
		// 网络锁独立于存储锁，慢请求不会阻塞设置、导入或离线切换。
		await navigator.locks.request('tstab:quote-network', { ifAvailable: true }, async (lock) => {
			if (!lock) return;
			const state = normalizeQuoteCache(await StorageManager.get(STORAGE_KEYS.QUOTE_CACHE));
			const currentSettings = normalizeSettings(await StorageManager.getAll());
			if (!state || !currentSettings.quoteEnabled) return;
			const idle = 1 - state.active;
			if (state.initialized && state.slots[idle].data) return;
			let entries: Hitokoto[];
			try {
				entries = state.initialized ? [await fetchQuote(currentSettings.quoteTypes)]
					: await Promise.all([fetchQuote(currentSettings.quoteTypes), fetchQuote(currentSettings.quoteTypes)]);
				if (!state.initialized) {
					for (let i = 0; i < 3 && entries[0].hitokoto === entries[1].hitokoto; i++) entries[1] = await fetchQuote(currentSettings.quoteTypes);
				}
			} catch (error) {
				console.error('一言网络补充失败，保留本地内容:', error);
				return;
			}
			await StorageManager.transaction(async (storage) => {
				const latest = normalizeQuoteCache(await storage.get(STORAGE_KEYS.QUOTE_CACHE));
				const latestSettings = normalizeSettings(await storage.getAll());
				// 清空、导入、切换或修改分类之后，旧响应不得覆盖新的缓存。
				if (!latest || latest.revision !== state.revision || !latestSettings.quoteEnabled ||
					JSON.stringify(latestSettings.quoteTypes) !== JSON.stringify(currentSettings.quoteTypes)) return;
				if (!latest.initialized) {
					latest.slots = entries.map((data) => ({ data, timestamp: Date.now() })) as QuoteCache['slots'];
					latest.initialized = true;
				} else if (!latest.slots[idle].data) latest.slots[idle] = { data: entries[0], timestamp: Date.now() };
				await storage.set(STORAGE_KEYS.QUOTE_CACHE, latest);
			});
		});
	}

	async function advance(manual: boolean): Promise<void> {
		await StorageManager.transaction(async (storage) => {
			const raw = await storage.get(STORAGE_KEYS.QUOTE_CACHE);
			const state = normalizeQuoteCache(raw) ?? emptyQuoteCache();
			const slot = state.slots[state.active];
			const idle = (1 - state.active) as 0 | 1;
			const expired = slot.shownAt !== undefined && Date.now() - slot.shownAt >= CACHE_EXPIRY;
			if (state.initialized && (manual || expired) && state.slots[idle].data) {
				state.slots[state.active] = { data: null, timestamp: 0 };
				state.active = idle;
				state.revision = crypto.randomUUID();
			}
			if (state.slots[state.active].data && state.slots[state.active].shownAt === undefined) state.slots[state.active].shownAt = Date.now();
			state.revision ??= crypto.randomUUID();
			// 先提交使用位置与展示时间，再更新界面；离线不影响这一步。
			if (JSON.stringify(raw) !== JSON.stringify(state)) await storage.set(STORAGE_KEYS.QUOTE_CACHE, state);
			activeData.set(state.slots[state.active].data);
		});
		void runAction(fillIdle);
	}

	return {
		subscribe: display.subscribe,
		load: () => advance(false),
		refresh: () => advance(true),
		async clearCache(): Promise<void> {
			await StorageManager.set(STORAGE_KEYS.QUOTE_CACHE, emptyQuoteCache());
			activeData.set(null);
		}
	};
}

/** 一言状态；先持久化轮换，再在后台补充缓存，网络响应不直接改变展示。 */
export const quote = createQuoteStore();
