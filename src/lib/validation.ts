import { DEFAULT_CONFIG, MAX_IMAGE_SIZE, SEARCH_ENGINES, STORAGE_KEYS } from './config';
import { webUrlOrNull } from './search';
import type { Hitokoto, QuickAccessItem, QuoteCache, Settings } from './types';

/** 配置导入大小上限；允许包含一张转为 base64 的 5 MiB 图片。 */
export const MAX_BACKUP_SIZE = 10 * 1024 * 1024;
const MAX_DATA_IMAGE = Math.ceil(MAX_IMAGE_SIZE / 3) * 4 + 1024;
const record = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 8192): value is string => typeof value === 'string' && value.length <= max;
const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * 判断图片来源是否可安全保存为 img/CSS 背景。
 * @param value 图片地址或本地图片数据
 * @returns 是否为允许的来源
 */
export function isImageSource(value: unknown): value is string {
	return text(value, MAX_DATA_IMAGE) && (value === '' || value === DEFAULT_CONFIG.backgroundImage ||
		/^icons\/qa\/[a-z0-9-]+\.svg$/.test(value) || webUrlOrNull(value) !== null ||
		/^data:image\/(?:png|jpeg|gif|webp|bmp|avif|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/]*={0,2}$/.test(value));
}

const validators: Record<keyof Settings, (value: unknown) => boolean> = {
	backgroundType: (v) => ['gradient', 'preset', 'local', 'url'].includes(v as string),
	backgroundImage: isImageSource,
	searchEngine: (v) => typeof v === 'string' && Object.hasOwn(SEARCH_ENGINES, v),
	quoteEnabled: (v) => typeof v === 'boolean',
	quoteTypes: (v) => Array.isArray(v) && v.length <= 12 && v.every((t) => typeof t === 'string' && /^[a-l]$/.test(t)),
	copyProtection: (v) => typeof v === 'boolean',
	quickAccessPosition: (v) => v === 'top' || v === 'bottom',
	quickAccessMode: (v) => v === 'manual' || v === 'bookmark',
	bookmarkFolderId: (v) => v === null || (text(v, 128) && /^\d+$/.test(v)),
	usePresetIcons: (v) => typeof v === 'boolean',
	locale: (v) => ['browser', 'zh-CN', 'en-US'].includes(v as string)
};

/**
 * 校验增量设置，不接受未知键或错误类型。
 * @param value 待保存的设置
 * @returns 通过校验的增量设置
 */
export function validateSettingsPatch(value: unknown): Partial<Settings> {
	if (!record(value)) throw new Error('Invalid settings');
	for (const [key, item] of Object.entries(value)) {
		if (!Object.hasOwn(validators, key) || !validators[key as keyof Settings](item)) throw new Error(`Invalid setting: ${key}`);
	}
	return value as Partial<Settings>;
}

/**
 * 读取旧设置时逐字段恢复默认值，防止历史损坏配置导致新标签页崩溃。
 * @param value 存储快照
 * @returns 完整且类型正确的设置
 */
export function normalizeSettings(value: Record<string, unknown>): Settings {
	return Object.fromEntries(Object.entries(validators).map(([key, validate]) =>
		[key, validate(value[key]) ? value[key] : DEFAULT_CONFIG[key as keyof Settings]])) as unknown as Settings;
}

/**
 * 校验快捷访问列表，并为旧条目补充稳定 ID。
 * @param value 原始列表
 * @param strict 导入时严格拒绝错误条目；读取旧数据时跳过损坏条目
 * @returns 可持久化的规范列表
 */
export function normalizeQuickAccess(value: unknown, strict = false): QuickAccessItem[] {
	if (!Array.isArray(value) || value.length > 2000) {
		if (strict) throw new Error('Invalid quick access list');
		return [];
	}
	const ids = new Set<string>();
	const urls = new Set<string>();
	const result: QuickAccessItem[] = [];
	for (const entry of value) {
		const url = record(entry) ? webUrlOrNull(entry.url) : null;
		if (!record(entry) || !url || !text(entry.title, 1024) || !entry.title.trim() ||
			!isImageSource(entry.icon) || !timestamp(entry.addedAt) || urls.has(url) ||
			(entry.id !== undefined && (!text(entry.id, 256) || !entry.id || ids.has(entry.id)))) {
			if (strict) throw new Error('Invalid quick access item');
			continue;
		}
		const id = (entry.id as string | undefined) ?? crypto.randomUUID();
		ids.add(id); urls.add(url);
		result.push({ id, title: entry.title.trim(), url, icon: entry.icon, addedAt: entry.addedAt });
	}
	return result;
}

/**
 * 校验一言 API 数据，避免错误响应或异常字段进入缓存。
 * @param value 原始 JSON
 * @returns 规范一言对象
 */
export function validateHitokoto(value: unknown): Hitokoto {
	if (!record(value) || !text(value.hitokoto, 10000) || !value.hitokoto.trim() ||
		!['from', 'from_who', 'uuid'].every((key) => value[key] == null || text(value[key], 1024))) {
		throw new Error('Invalid quote');
	}
	return {
		hitokoto: value.hitokoto,
		...(typeof value.from === 'string' ? { from: value.from } : {}),
		...(typeof value.from_who === 'string' ? { from_who: value.from_who } : {}),
		...(typeof value.uuid === 'string' ? { uuid: value.uuid } : {})
	};
}

/**
 * 校验缓存结构；不接受越界使用位与损坏槽位。
 * @param value 存储或导入的缓存
 * @returns 有效缓存，无效时返回 null
 */
export function normalizeQuoteCache(value: unknown): QuoteCache | null {
	if (!record(value) || typeof value.initialized !== 'boolean' || ![0, 1].includes(value.active as number) ||
		!Array.isArray(value.slots) || value.slots.length !== 2 ||
		(value.revision !== undefined && !text(value.revision, 256))) return null;
	try {
		const slots = value.slots.map((slot) => {
			if (!record(slot) || !timestamp(slot.timestamp) || (slot.shownAt !== undefined && !timestamp(slot.shownAt))) throw new Error('Invalid slot');
			return { data: slot.data === null ? null : validateHitokoto(slot.data), timestamp: slot.timestamp,
				...(slot.shownAt === undefined ? {} : { shownAt: slot.shownAt as number }) };
		});
		return { initialized: value.initialized, active: value.active as 0 | 1,
			slots: slots as QuoteCache['slots'], ...(value.revision ? { revision: value.revision as string } : {}) };
	} catch { return null; }
}

/**
 * 严格校验配置备份。兼容旧版 1.0 格式，缺失版本及未来版本均拒绝。
 * @param value 已解析的备份 JSON
 * @returns 仅含已知存储键的配置；无效时抛错，调用方不得写入
 */
export function validateBackup(value: unknown): Record<string, unknown> {
	if (!record(value) || value.version !== '1.0' || !record(value.config) || !Object.keys(value.config).length ||
		(value.exportDate !== undefined && !text(value.exportDate, 256)) ||
		(value.exportTime !== undefined && (!text(value.exportTime, 128) || !Number.isFinite(Date.parse(value.exportTime))))) {
		throw new Error('Invalid backup');
	}
	const config: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value.config)) {
		if (key === STORAGE_KEYS.QUICK_ACCESS) config[key] = normalizeQuickAccess(entry, true);
		else if (key === STORAGE_KEYS.QUOTE_CACHE) {
			const cache = normalizeQuoteCache(entry);
			if (!cache) throw new Error('Invalid quote cache');
			config[key] = { ...cache, revision: crypto.randomUUID() };
		} else Object.assign(config, validateSettingsPatch({ [key]: entry }));
	}
	return config;
}
