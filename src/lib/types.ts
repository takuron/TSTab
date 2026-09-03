export interface QuickAccessItem {
	title: string;
	url: string;
	icon: string;
	addedAt: number;
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
}
