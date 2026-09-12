import type { SearchEngine } from './config';

/** 快捷访问条目；id 在修改标题、URL 与排序时保持不变。 */
export interface QuickAccessItem {
	id: string;
	title: string;
	url: string;
	icon: string;
	addedAt: number;
}

/** 书签文件夹下拉选项：供设置面板选择“用哪个书签文件夹作为 Dock 来源” */
export interface BookmarkFolderOption {
	id: string;
	title: string;
	path: string;
}

/**
 * 一言「双缓存位」槽位：每个缓存位保存一条一言及其写入时间。
 * 轮换即以 Slot 为单位，界面只展示当前 active 位。
 */
export interface QuoteSlot {
	data: Hitokoto | null;
	/** 最近一次写入时间。 */
	timestamp: number;
	/** 该槽位最近一次「开始展示」的时间（切换到 active 时记录），用于按展示时长判断过期。 */
	shownAt?: number;
}

/**
 * 一言「双缓存位 + 使用位置标记」状态：两个缓存位 + 一个表示当前正在使用的位下标。
 * - UI 切换显示（含到期轮换、刷新）一律通过切换 `active` 实现，不直接依赖网络。
 * - 网络补充只填充「空闲槽」（非 active 位），从不直接更新界面。
 */
export interface QuoteCache {
	/** 每次切换或重置生成新标记，阻止旧请求覆盖新缓存。 */
	revision?: string;
	/** 是否已完成首次初始化（首次已成功拉取）。 */
	initialized: boolean;
	/** 两个缓存位，下标 0 / 1。 */
	slots: [QuoteSlot, QuoteSlot];
	/** 当前正在使用的缓存位下标（0 或 1）。 */
	active: 0 | 1;
}

/** 经过校验的一言响应字段。 */
export interface Hitokoto {
	hitokoto: string;
	from?: string;
	from_who?: string;
	// 其他字段：id, type, creator 等
	[key: string]: unknown;
}

/** 持久化设置字段，与 DEFAULT_CONFIG 保持一致。 */
export interface Settings {
	backgroundType: 'gradient' | 'preset' | 'local' | 'url';
	backgroundImage: string;
	searchEngine: SearchEngine;
	quoteEnabled: boolean;
	quoteTypes: string[];
	copyProtection: boolean;
	quickAccessPosition: 'top' | 'bottom';
	quickAccessMode: 'manual' | 'bookmark';
	bookmarkFolderId: string | null;
	locale: 'browser' | 'zh-CN' | 'en-US';
	usePresetIcons: boolean;
}
