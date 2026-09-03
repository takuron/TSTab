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

export interface QuoteCache {
	data: Hitokoto;
	timestamp: number;
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
