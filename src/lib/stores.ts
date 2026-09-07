import { derived, get, writable } from 'svelte/store';
import { _ as _t } from 'svelte-i18n';
import {
	CACHE_EXPIRY,
	DEFAULT_CONFIG,
	HITOKOTO_API,
	STORAGE_KEYS,
	type BackgroundType,
	type QuickAccessMode,
	type QuickAccessPosition
} from './config';
import { isExtension, StorageManager } from './storage';
import type { BookmarkFolderOption, Hitokoto, QuickAccessItem, QuoteCache } from './types';

/** 快捷访问位置应用 */
export function applyPosition(el: HTMLElement | null, position: QuickAccessPosition): void {
	if (!el) return;
	el.classList.toggle('position-top', position === 'top');
	el.classList.toggle('position-bottom', position !== 'top');
}

function useFallback<T>(val: unknown, fb: T): T {
	return val === undefined || val === null ? fb : (val as T);
}

/* ------------------------------------------------------------------ */
/* 设置                                                                */
/* ------------------------------------------------------------------ */

interface SettingsState {
	backgroundType: BackgroundType;
	backgroundImage: string;
	searchEngine: string;
	quoteEnabled: boolean;
	quoteTypes: string[];
	copyProtection: boolean;
	quickAccessPosition: QuickAccessPosition;
	quickAccessMode: QuickAccessMode;
	bookmarkFolderId: string | null;
	usePresetIcons: boolean;
	locale: string;
	ready: boolean;
}

const defaults: SettingsState = {
	backgroundType: DEFAULT_CONFIG.backgroundType as BackgroundType,
	backgroundImage: DEFAULT_CONFIG.backgroundImage,
	searchEngine: DEFAULT_CONFIG.searchEngine,
	quoteEnabled: DEFAULT_CONFIG.quoteEnabled,
	quoteTypes: [...DEFAULT_CONFIG.quoteTypes],
	copyProtection: DEFAULT_CONFIG.copyProtection,
	quickAccessPosition: DEFAULT_CONFIG.quickAccessPosition as QuickAccessPosition,
	quickAccessMode: DEFAULT_CONFIG.quickAccessMode as QuickAccessMode,
	bookmarkFolderId: DEFAULT_CONFIG.bookmarkFolderId as string | null,
	usePresetIcons: DEFAULT_CONFIG.usePresetIcons,
	locale: DEFAULT_CONFIG.locale,
	ready: false
};

function createSettingsStore() {
	const { subscribe, set, update } = writable<SettingsState>(defaults);

	return {
		subscribe,
		async load(): Promise<void> {
			// 一次性读取全部数据并补写缺失默认值，避免启动时对 chrome.storage 重复全量读取导致卡顿。
			const items = await StorageManager.initDefaults();
			set({
				backgroundType: useFallback(items[STORAGE_KEYS.BACKGROUND_TYPE], defaults.backgroundType) as BackgroundType,
				backgroundImage: useFallback(items[STORAGE_KEYS.BACKGROUND_IMAGE], defaults.backgroundImage) as string,
				searchEngine: useFallback(items[STORAGE_KEYS.SEARCH_ENGINE], defaults.searchEngine) as string,
				quoteEnabled: useFallback(items[STORAGE_KEYS.QUOTE_ENABLED], defaults.quoteEnabled) as boolean,
				quoteTypes: useFallback(items[STORAGE_KEYS.QUOTE_TYPES], defaults.quoteTypes) as string[],
				copyProtection: useFallback(items[STORAGE_KEYS.COPY_PROTECTION], defaults.copyProtection) as boolean,
				quickAccessPosition: useFallback(
					items[STORAGE_KEYS.QUICK_ACCESS_POSITION],
					defaults.quickAccessPosition
				) as QuickAccessPosition,
				quickAccessMode: useFallback(
					items[STORAGE_KEYS.QUICK_ACCESS_MODE],
					defaults.quickAccessMode
				) as QuickAccessMode,
				bookmarkFolderId: useFallback(
					items[STORAGE_KEYS.BOOKMARK_FOLDER_ID],
					defaults.bookmarkFolderId
				) as string | null,
				usePresetIcons: useFallback(
					items[STORAGE_KEYS.USE_PRESET_ICONS],
					defaults.usePresetIcons
				) as boolean,
				locale: useFallback(items[STORAGE_KEYS.LOCALE], defaults.locale) as string,
				ready: true
			});
		},
		async save(partial: Partial<SettingsState>): Promise<void> {
			const current = get(settings);
			const next: SettingsState = { ...current, ...partial };
			update((s) => ({ ...s, ...partial }));
			await StorageManager.setMultiple({
				[STORAGE_KEYS.BACKGROUND_TYPE]: next.backgroundType,
				[STORAGE_KEYS.BACKGROUND_IMAGE]: next.backgroundImage,
				[STORAGE_KEYS.SEARCH_ENGINE]: next.searchEngine,
				[STORAGE_KEYS.QUOTE_ENABLED]: next.quoteEnabled,
				[STORAGE_KEYS.QUOTE_TYPES]: next.quoteTypes,
				[STORAGE_KEYS.COPY_PROTECTION]: next.copyProtection,
				[STORAGE_KEYS.QUICK_ACCESS_POSITION]: next.quickAccessPosition,
				[STORAGE_KEYS.QUICK_ACCESS_MODE]: next.quickAccessMode,
				[STORAGE_KEYS.BOOKMARK_FOLDER_ID]: next.bookmarkFolderId,
				[STORAGE_KEYS.USE_PRESET_ICONS]: next.usePresetIcons,
				[STORAGE_KEYS.LOCALE]: next.locale
			});
		}
	};
}

export const settings = createSettingsStore();

/** 背景样式（不含 backgroundType=gradient 时为空字符串） */
export const backgroundStyle = derived(settings, ($s) => {
	if ($s.backgroundType === 'gradient' || !$s.backgroundImage) return '';
	return `url(${$s.backgroundImage})`;
});

/* ------------------------------------------------------------------ */
/* 快捷访问                                                            */
/* ------------------------------------------------------------------ */

function createQuickAccessStore() {
	const { subscribe, set } = writable<QuickAccessItem[]>([]);

	return {
		subscribe,
		async load(): Promise<void> {
			const items = await StorageManager.getWithDefault<QuickAccessItem[]>(
				STORAGE_KEYS.QUICK_ACCESS,
				[]
			);
			set(Array.isArray(items) ? items : []);
		},
		async add(item: QuickAccessItem): Promise<boolean> {
			const items = get(quickAccess);
			if (items.some((i) => i.url === item.url)) return false;
			const next = [...items, item];
			set(next);
			await StorageManager.set(STORAGE_KEYS.QUICK_ACCESS, next);
			return true;
		},
		async remove(index: number): Promise<void> {
			const items = get(quickAccess);
			if (index < 0 || index >= items.length) return;
			const next = items.filter((_, i) => i !== index);
			set(next);
			await StorageManager.set(STORAGE_KEYS.QUICK_ACCESS, next);
		},
		async updateItem(index: number, patch: Partial<QuickAccessItem>): Promise<void> {
			const items = get(quickAccess);
			if (index < 0 || index >= items.length) return;
			const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
			set(next);
			await StorageManager.set(STORAGE_KEYS.QUICK_ACCESS, next);
		},
		async reorder(from: number, to: number): Promise<void> {
			const items = [...get(quickAccess)];
			if (
				from < 0 ||
				from >= items.length ||
				to < 0 ||
				to >= items.length ||
				from === to
			) {
				return;
			}
			const [moved] = items.splice(from, 1);
			items.splice(to, 0, moved);
			set(items);
			await StorageManager.set(STORAGE_KEYS.QUICK_ACCESS, items);
		}
	};
}

export const quickAccess = createQuickAccessStore();

export function faviconUrl(url: string): string {
	try {
		return `${new URL(url).origin}/favicon.ico`;
	} catch {
		return '';
	}
}

/* ------------------------------------------------------------------ */
/* 书签 Dock（从书签文件夹读取链接，不递归子文件夹）                      */
/* ------------------------------------------------------------------ */

interface BookmarkDockState {
	items: QuickAccessItem[];
	folderName: string;
}

function createBookmarkDockStore() {
	const { subscribe, set } = writable<BookmarkDockState>({ items: [], folderName: '' });

	// 1. 仅扩展环境下可读取书签；非扩展环境或权限缺失时返回空数组，避免报错。
	function getBookmarksTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
		if (!isExtension() || typeof chrome.bookmarks === 'undefined') {
			return Promise.resolve([]);
		}
		return new Promise((resolve) => chrome.bookmarks.getTree((tree) => resolve(tree)));
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
		if (!folderId) {
			set({ items: [], folderName: '' });
			return;
		}
		const tree = await getBookmarksTree();
		const folder = findNode(tree, folderId);
		if (!folder) {
			set({ items: [], folderName: '' });
			return;
		}
		const items: QuickAccessItem[] = (folder.children ?? [])
			.filter((c): c is chrome.bookmarks.BookmarkTreeNode & { url: string } => Boolean(c.url))
			.map((c) => ({
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

export const bookmarkDock = createBookmarkDockStore();

/* ------------------------------------------------------------------ */
/* 一言                                                                */
/* ------------------------------------------------------------------ */

interface QuoteState {
	text: string;
	source: string;
	loading: boolean;
}

function createQuoteStore() {
	// 取当前语言的翻译文本；未加载时回退到 key 本身，避免抛出异常。
	const msg = (key: string): string => {
		try {
			return get(_t)(key);
		} catch {
			return key;
		}
	};

	const { subscribe, set } = writable<QuoteState>({ text: '加载中...', source: '', loading: false });

	async function fetchQuote(): Promise<Hitokoto> {
		const $s = get(settings);
		const typeParams = $s.quoteTypes.map((t) => `c=${t}`).join('&');
		const res = await fetch(`${HITOKOTO_API}?${typeParams}`);
		if (!res.ok) throw new Error('网络请求失败');
		return (await res.json()) as Hitokoto;
	}

	// 拉取两条不同的一言；若重复则重试，用于首次初始化填充两个缓存位。
	async function fetchTwoDistinct(): Promise<[Hitokoto, Hitokoto]> {
		const first = await fetchQuote();
		let second = await fetchQuote();
		for (let i = 0; i < 3 && second.uuid === first.uuid; i++) {
			second = await fetchQuote();
		}
		return [first, second];
	}

	function display(data: Hitokoto) {
		const source = data.from
			? data.from_who
				? `—— ${data.from_who}《${data.from}》`
				: `—— ${data.from}`
			: '';
		set({ text: data.hitokoto || '', source, loading: false });
	}

	// 将本地缺省一言作为展示（首个可用值优先，缺省兜底）。
	function displayDefault() {
		display({ hitokoto: msg('quote.fallbackText'), from: msg('quote.author') });
	}

	// 展示当前 active 位；该位无数据时空缺缺省兜底。
	// 若该槽位尚无展示起点（shownAt），则以此刻作为其本次展示的开始时间（按展示时长计）。
	function showActive(state: QuoteCache) {
		const slot = state.slots[state.active];
		if (slot.shownAt === undefined) slot.shownAt = Date.now();
		if (slot.data) display(slot.data);
		else displayDefault();
	}

	// 构造一份空状态（两个空缓存位，active 指向 0）。
	function emptyState(): QuoteCache {
		return {
			initialized: false,
			slots: [
				{ data: null, timestamp: 0 },
				{ data: null, timestamp: 0 }
			],
			active: 0
		};
	}

	// 翻转使用位下标（0<->1）。
	function flip(active: 0 | 1): 0 | 1 {
		return active === 0 ? 1 : 0;
	}

	// 异步网络请求：仅在“刚被轮换掉”的空闲槽位（非 active）为空时请求，取得后填充该槽，
	// 绝不直接更新界面；槽位非空（仍有可轮换内容）时不请求，避免覆盖未用内容。
	async function fillIdle(state: QuoteCache): Promise<void> {
		const idle = state.slots[1 - state.active];
		if (idle.data) return; // 被轮换槽位非空：不请求，保留其内容。
		try {
			const data = await fetchQuote();
			state.slots[1 - state.active] = { data, timestamp: Date.now() };
			await StorageManager.set(STORAGE_KEYS.QUOTE_CACHE, state);
		} catch (err) {
			console.error('非活跃槽一言填补失败:', err);
		}
	}

	async function load(): Promise<void> {
		// 3. 新打开：显示默认，随后并行填充两个缓存位。
		const state =
			((await StorageManager.get(STORAGE_KEYS.QUOTE_CACHE)) as QuoteCache) || emptyState();
		if (!state.initialized) {
			displayDefault();
			state.initialized = true;
			try {
				const [first, second] = await fetchTwoDistinct();
				state.slots[0] = { data: first, timestamp: Date.now() };
				state.slots[1] = { data: second, timestamp: Date.now() };
				state.active = 0;
				await StorageManager.set(STORAGE_KEYS.QUOTE_CACHE, state);
			} catch (err) {
				console.error('一言初始化拉取失败:', err);
			}
			return;
		}

		// 1. 自动轮换：以「展示时长」判断过期——当前槽位开始展示至今是否超过 CACHE_EXPIRY。
		const current = state.slots[state.active];
		const idle = state.slots[1 - state.active];
		const shownAt = current.shownAt ?? current.timestamp;
		const expired = Date.now() - shownAt >= CACHE_EXPIRY;

		if (expired) {
			if (idle.data) {
				// 另一槽位非空：切换另一槽位为主要槽位并显示，将其内容清空，再走网络更新流程。
				const prev = state.active;
				state.active = flip(state.active);
				state.slots[prev] = { data: null, timestamp: 0, shownAt: undefined }; // 被轮换掉的槽位置空。
				showActive(state);
			} else {
				// 另一槽位为空：不变更槽位，仅展示当前（空则缺省）并走网络更新流程。
				showActive(state);
			}
		} else {
			// 未过期：不轮换，展示当前槽位，但仍走网络更新流程以备不时之需。
			showActive(state);
		}

		// 4. 一律尝试网络更新：fillIdle 会先判断被轮换（空闲）槽位是否为空，非空则不请求。
		await fillIdle(state);
	}

	return {
		subscribe,
		load,
		async refresh(): Promise<void> {
			const state =
				((await StorageManager.get(STORAGE_KEYS.QUOTE_CACHE)) as QuoteCache) || emptyState();
			if (!state.initialized) {
				await load(); // 尚未初始化：按“新打开”处理。
				return;
			}

			// 2. 手动刷新 / 重新开启：检查另一槽位是否为空。
			const idle = state.slots[1 - state.active];
			if (idle.data) {
				// 另一槽位非空：切换到该槽位显示，将被轮换掉的槽位置空，再走网络更新流程。
				const prev = state.active;
				state.active = flip(state.active);
				state.slots[prev] = { data: null, timestamp: 0, shownAt: undefined };
				showActive(state);
			} else {
				// 另一槽位为空：不变更槽位，仅走网络更新流程。
				const current = state.slots[state.active];
				if (!current.data) {
					// 当前槽位也为空：填充默认并尝试更新两个槽位。
					displayDefault();
					try {
						const [first, second] = await fetchTwoDistinct();
						state.slots[0] = { data: first, timestamp: Date.now() };
						state.slots[1] = { data: second, timestamp: Date.now() };
						await StorageManager.set(STORAGE_KEYS.QUOTE_CACHE, state);
					} catch (err) {
						console.error('一言刷新填充失败:', err);
					}
					return;
				}
				showActive(state); // 当前有内容，保持展示（不变更槽位）。
			}

			// 网络更新：fillIdle 先判断被轮换（空闲）槽位是否为空，非空则不请求。
			await fillIdle(state);
		},
		async clearCache(): Promise<void> {
			await StorageManager.remove(STORAGE_KEYS.QUOTE_CACHE);
		}
	};
}

export const quote = createQuoteStore();
