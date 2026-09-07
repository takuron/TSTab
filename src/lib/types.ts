export interface QuickAccessItem {
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
 * - UI 切换显示（含下载、刷新）一律通过切换 `active` 实现，不直接依赖网络。
 * - 网络拉取自只填充「空闲槽」（非 active 位），从不直接更新界面。
 */
export interface QuoteCache {
	/** 是否已完成首次初始化（首次已成功拉取）。 */
	initialized: boolean;
	/** 两个缓存位，下标 0 / 1。 */
	slots: [QuoteSlot, QuoteSlot];
	/** 当前正在使用的缓存位下标（0 或 1）。 */
	active: 0 | 1;
}

export interface Hitokoto {
	hitokoto: string;
	from?: string;
	from_who?: string;
	// 其他字段：id, type, creator 等
	[key: string]: unknown;
}

export interface Settings {
	backgroundType: string;
	backgroundImage: string;
	searchEngine: string;
	quoteEnabled: boolean;
	quoteTypes: string[];
	copyProtection: boolean;
	quickAccessPosition: 'top' | 'bottom';
	quickAccessMode: 'manual' | 'bookmark';
	bookmarkFolderId: string | null;
	locale: string;
}
