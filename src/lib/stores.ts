import { derived, get, writable } from 'svelte/store';
import {
	CACHE_EXPIRY,
	DEFAULT_CONFIG,
	HITOKOTO_API,
	STORAGE_KEYS,
	type BackgroundType,
	type QuickAccessPosition
} from './config';
import { StorageManager } from './storage';
import type { Hitokoto, QuickAccessItem, QuoteCache } from './types';

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
	ready: false
};

function createSettingsStore() {
	const { subscribe, set, update } = writable<SettingsState>(defaults);

	return {
		subscribe,
		async load(): Promise<void> {
			await StorageManager.initDefaults();
			const items = await StorageManager.getAll();
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
				[STORAGE_KEYS.QUICK_ACCESS_POSITION]: next.quickAccessPosition
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
/* 一言                                                                */
/* ------------------------------------------------------------------ */

interface QuoteState {
	text: string;
	source: string;
	loading: boolean;
}

function createQuoteStore() {
	const { subscribe, set } = writable<QuoteState>({ text: '加载中...', source: '', loading: false });

	async function fetchQuote(): Promise<Hitokoto> {
		const $s = get(settings);
		const typeParams = $s.quoteTypes.map((t) => `c=${t}`).join('&');
		const res = await fetch(`${HITOKOTO_API}?${typeParams}`);
		if (!res.ok) throw new Error('网络请求失败');
		return (await res.json()) as Hitokoto;
	}

	function display(data: Hitokoto) {
		const source = data.from
			? data.from_who
				? `—— ${data.from_who}《${data.from}》`
				: `—— ${data.from}`
			: '';
		set({ text: data.hitokoto || '', source, loading: false });
	}

	async function load(): Promise<void> {
		set({ text: '加载中...', source: '', loading: true });
		try {
			const cached = (await StorageManager.get(STORAGE_KEYS.QUOTE_CACHE)) as QuoteCache | undefined;
			if (cached && cached.data && Date.now() - cached.timestamp < CACHE_EXPIRY) {
				display(cached.data);
				return;
			}
			const data = await fetchQuote();
			display(data);
			await StorageManager.set(STORAGE_KEYS.QUOTE_CACHE, { data, timestamp: Date.now() });
		} catch (err) {
			console.error('获取一言失败:', err);
			display({
				hitokoto: '世界上只有一种真正的英雄主义，那就是认清生活的真相后依然热爱生活。',
				from: '罗曼·罗兰'
			});
		}
	}

	return {
		subscribe,
		load,
		async refresh(): Promise<void> {
			await StorageManager.remove(STORAGE_KEYS.QUOTE_CACHE);
			await load();
		},
		async clearCache(): Promise<void> {
			await StorageManager.remove(STORAGE_KEYS.QUOTE_CACHE);
		}
	};
}

export const quote = createQuoteStore();
