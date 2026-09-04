/**
 * 快捷访问预置图标：域名（通配）-> dashboard-icons 内置图标（本地静态资源）。
 *
 * 图标下载自 https://github.com/homarr-labs/dashboard-icons（svg 目录），
 * 存于 static/icons/qa/。映射键为带完整 TLD 的域名（如 `deepseek.com`），
 * 命中时用作 Dock 图标的默认替换，优先于站点 favicon。
 *
 * 匹配规则：目标主机名「等于该域名，或以其作为任意子域结尾」，即全域名 + 子域通配。
 * 遍历时按键长度降序，使更具体的子域（如 gemini.google.com）优先命中专用图标。
 *
 * 选取原则：仅内置「在线服务」与「Linux 发行版官网」；
 * 本地运行/自托管软件（浏览器、Docker、Nextcloud 等）不内置，回退站点 favicon。
 */

/** 预置图标基础路径（SvelteKit 静态资源以根路径引用） */
const ICON_BASE = '/icons/qa/';

/**
 * 域名（小写，含 TLD）-> 预置图标文件名（不含扩展名）。
 * 分组并排序：组内按域名字符长度降序，保证更具体的子域优先匹配。
 */
const DOCK_ICON_MAP: Record<string, string> = {
	/* ---------- 搜索引擎 ---------- */
	'duckduckgo.com': 'duckduckgo',
	'bing.com': 'bing',
	'google.com': 'google',
	'baidu.com': 'baidu',
	'yahoo.com': 'yahoo',

	/* ---------- 社交 ---------- */
	'linkedin.com': 'linkedin',
	'instagram.com': 'instagram',
	'facebook.com': 'facebook',
	'reddit.com': 'reddit',
	'tiktok.com': 'tiktok',
	'twitter.com': 'twitter',
	'x.com': 'x',
	'weibo.com': 'weibo',
	'mastodon.social': 'mastodon',
	'signal.org': 'signal',

	/* ---------- 通信 · 邮件 ---------- */
	'discord.com': 'discord',
	'discord.gg': 'discord',
	'whatsapp.com': 'whatsapp',
	'telegram.org': 'telegram',
	't.me': 'telegram',
	'fastmail.com': 'fastmail',
	'proton.me': 'proton-mail',
	'protonmail.com': 'proton-mail',
	'tuta.com': 'tuta-mail',
	'tutamail.com': 'tuta-mail',
	'zohomail.com': 'zohomail',
	'zoho.com': 'zohomail',
	'icloud.com': 'icloud',
	'gmail.com': 'gmail',
	'outlook.com': 'microsoft-outlook',
	'hotmail.com': 'microsoft-outlook',
	'live.com': 'microsoft-outlook',

	/* ---------- Google 在线服务 ---------- */
	'gemini.google.com': 'google-gemini',
	'translate.google.com': 'google-translate',
	'drive.google.com': 'google-drive',
	'docs.google.com': 'google-docs',
	'sheets.google.com': 'google-sheets',
	'calendar.google.com': 'google-calendar',
	'maps.google.com': 'google-maps',
	'photos.google.com': 'google-photos',
	'meet.google.com': 'google-meet',

	/* ---------- 开发者平台 · 代码托管 ---------- */
	'cloudflare.com': 'cloudflare',
	'github.com': 'github',
	'gitlab.com': 'gitlab',
	'gitee.com': 'gitee',
	'bitbucket.org': 'bitbucket',
	'codeberg.org': 'codeberg',
	'leetcode.com': 'leetcode',

	/* ---------- AI 助手与模型 ---------- */
	'copilot.microsoft.com': 'microsoft-copilot',
	'perplexity.ai': 'perplexity',
	'openai.com': 'openai',
	'chatgpt.com': 'chatgpt',
	'chat.openai.com': 'chatgpt',
	'z.ai': 'z-ai',
	'anthropic.com': 'claude-ai',
	'claude.ai': 'claude-ai',
	'grok.com': 'grok',
	'deepseek.com': 'deepseek',
	'kimi.moonshot.cn': 'kimi-ai',
	'moonshot.cn': 'kimi-ai',
	'qwen.ai': 'qwen',
	'ollama.com': 'ollama',

	/* ---------- 设计 ---------- */
	'excalidraw.com': 'excalidraw',
	'behance.net': 'behance',
	'framer.com': 'framer',
	'figma.com': 'figma',

	/* ---------- 云服务商 ---------- */
	'digitalocean.com': 'digital-ocean',
	'vercel.com': 'vercel',
	'azure.com': 'azure',
	'microsoft.com': 'microsoft',
	'hetzner.com': 'hetzner',
	'linode.com': 'linode',
	'railway.com': 'railway',
	'netlify.com': 'netlify',

	/* ---------- 视频 · 流媒体 ---------- */
	'disneyplus.com': 'disney-plus',
	'netflix.com': 'netflix',
	'crunchyroll.com': 'crunchyroll',
	'youtube.com': 'youtube',
	'twitch.tv': 'twitch',

	/* ---------- 动漫 ---------- */
	'pixiv.net': 'pixiv',
	'mangadex.org': 'manga-dex',

	/* ---------- 音乐 -------- */
	'music.apple.com': 'apple-music',
	'music.youtube.com': 'youtube-music',
	'deezer.com': 'deezer',
	'spotify.com': 'spotify',

	/* ---------- 电子商务 · 支付 ---------- */
	'amazon.com': 'amazon',
	'amazon.co.uk': 'amazon',
	'amazon.de': 'amazon',
	'amazon.co.jp': 'amazon',
	'paypal.com': 'paypal',
	'steampowered.com': 'steam',
	'steam.com': 'steam',
	'epicgames.com': 'epic-games',
	'playstation.com': 'playstation',
	'xbox.com': 'xbox',

	/* ---------- 在线工具/服务 ---------- */
	'bitwarden.com': 'bitwarden',
	'deepl.com': 'deepl',
	'dropbox.com': 'dropbox',
	'box.com': 'box',
	'onedrive.com': 'microsoft-onedrive',
	'notion.so': 'notion',
	'wordpress.com': 'wordpress',
	'wordpress.org': 'wordpress',
	'adobe.com': 'adobe',
	'apple.com': 'apple',
	'zoom.us': 'zoom',
	'zoom.com': 'zoom',
	'slack.com': 'slack',

	/* ---------- 中国大陆常用 ---------- */
	'bilibili.com': 'bilibili',
	'qq.com': 'qq',
	'wechat.com': 'wechat',
	'weixin.qq.com': 'wechat',
	'aliyun.com': 'aliyun',
	'pinterest.com': 'pinterest',

	/* ---------- 知识 · 问答 ---------- */
	'wikipedia.org': 'wikipedia',
	'duolingo.com': 'duolingo',

	/* ---------- Linux 发行版官网 ---------- */
	'archlinux.org': 'arch-linux',
	'endeavouros.com': 'arch-linux',
	'alpinelinux.org': 'alpine-linux',
	'linuxmint.com': 'linux-mint',
	'rockylinux.org': 'rocky-linux',
	'raspberrypi.com': 'raspberry-pi',
	'ubuntu.com': 'ubuntu-linux',
	'download.fedoraproject.org': 'fedora',
	'fedoraproject.org': 'fedora',
	'debian.org': 'debian-linux',
	'manjaro.org': 'manjaro-linux',
	'opensuse.org': 'opensuse',
	'kali.org': 'kali-linux',
	'zorin.com': 'zorin-linux',
	'garudalinux.org': 'garuda-linux',
	'nixos.org': 'nixos',
	'voidlinux.org': 'void-linux',
	'centos.org': 'centos'
};

/** 组件内缓存：按域名字符长度降序排列，保证更具体的子域先被匹配。 */
const MATCH_KEYS: string[] = Object.keys(DOCK_ICON_MAP).sort((a, b) => b.length - a.length);

/**
 * 返回某 URL 命中预置图标时的图标路径；未命中返回 null。
 *
 * 匹配规则：主机名规范化后（小写、去 www.），对域名表按长度降序做
 * 「全域名或任意子域」通配匹配（`host === key || host.endsWith('.' + key)`）。
 *
 * @param url 快捷访问项或标签页的完整 URL
 * @returns 预置图标资源路径；未命中预置表时返回 null
 */
export function presetIconFor(url: string): string | null {
	if (!url) return null;
	let hostname: string;
	try {
		hostname = new URL(url).hostname.toLowerCase();
	} catch {
		return null;
	}
	// 去掉 www. 前缀统一比较，其余子域名继续走「以父域结尾」匹配。
	if (hostname.startsWith('www.')) hostname = hostname.slice(4);
	for (const key of MATCH_KEYS) {
		if (hostname === key || hostname.endsWith('.' + key)) {
			return `${ICON_BASE}${DOCK_ICON_MAP[key]}.svg`;
		}
	}
	return null;
}
