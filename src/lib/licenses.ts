/**
 * 第三方开源许可清单：集中维护本项目所依赖、引用或分发的库、工具与素材，
 * 供设置面板「关于 → 开源许可」小节展示，以满足 MIT / Apache-2.0 / GPL 等
 * 许可的署名、来源标注与许可副本可查要求。
 *
 * 维护约定：新增/移除依赖或引入外部素材时，须同步增删此处条目；
 * `notice` 中需原样保留第三方要求的 Copyright 声明，不得翻译或改动。
 */

/** 单条第三方许可记录 */
export interface LicenseEntry {
	/** 名称（项目 / 库 / 素材） */
	name: string;
	/** 许可标识（SPDX 标识或素材许可名称） */
	license: string;
	/** 可翻译的许可类型键（对应 `settings.licenseLabel.<key>`，可选） */
	licenseKey?: string;
	/** 来源地址（仓库 / 官网 / 作品页） */
	url: string;
	/** 版权声明等需原样展示、不可翻译的文本（可选） */
	notice?: string;
	/** 可翻译的补充说明键（对应 `settings.licenseNotice.<key>`，可选） */
	noticeKey?: string;
}

/** 许可分组：每组渲染为一行，组内条目以圆点分隔 */
export type LicenseGroup = LicenseEntry[];

/** 运行时依赖：随扩展构建产物一并分发 */
export const RUNTIME_LICENSES: LicenseEntry[] = [
	{ name: 'Svelte', license: 'MIT', url: 'https://github.com/sveltejs/svelte' },
	{ name: 'SvelteKit', license: 'MIT', url: 'https://github.com/sveltejs/kit' },
	{ name: 'Tailwind CSS', license: 'MIT', url: 'https://github.com/tailwindlabs/tailwindcss' },
	{ name: 'DaisyUI', license: 'MIT', url: 'https://github.com/saadeghi/daisyui' },
	{ name: 'svelte-i18n', license: 'MIT', url: 'https://github.com/kaisermann/svelte-i18n' }
];

/** 构建与开发工具：仅用于构建流程，不随产物分发 */
export const DEV_LICENSES: LicenseEntry[] = [
	{ name: 'Vite', license: 'MIT', url: 'https://github.com/vitejs/vite' },
	{ name: '@sveltejs/adapter-static', license: 'MIT', url: 'https://github.com/sveltejs/kit/tree/main/packages/adapter-static' },
	{ name: '@sveltejs/vite-plugin-svelte', license: 'MIT', url: 'https://github.com/sveltejs/vite-plugin-svelte' },
	{ name: '@tailwindcss/vite', license: 'MIT', url: 'https://github.com/tailwindlabs/tailwindcss' },
	{ name: 'svelte-check', license: 'MIT', url: 'https://github.com/sveltejs/language-tools' },
	{ name: 'TypeScript', license: 'Apache-2.0', url: 'https://github.com/microsoft/TypeScript' },
	{ name: '@types/chrome', license: 'MIT', url: 'https://github.com/DefinitelyTyped/DefinitelyTyped' },
	{ name: '@types/node', license: 'MIT', url: 'https://github.com/DefinitelyTyped/DefinitelyTyped' }
];

/** 所引用的项目、图标与素材 */
export const ASSET_LICENSES: LicenseEntry[] = [
	{
		name: 'Snow',
		license: 'GPL-3.0',
		url: 'https://github.com/ltba/Snow',
		noticeKey: 'snow'
	},
	{
		name: 'dashboard-icons',
		license: 'Apache-2.0',
		url: 'https://github.com/homarr-labs/dashboard-icons',
		notice: 'Copyright (c) 2024 Bjorn Lammers, Meier Lukas, Thomas Camlong and Homarr Labs'
	},
	{
		name: 'Kévin JINER (Unsplash)',
		license: 'Unsplash License',
		url: 'https://unsplash.com/photos/a-snow-covered-mountain-with-a-clear-blue-sky-g-6gKgRC30k',
		noticeKey: 'unsplash'
	},
	{
		name: 'Hitokoto',
		license: 'Third-party API',
		licenseKey: 'thirdPartyApi',
		url: 'https://hitokoto.cn/',
		noticeKey: 'hitokoto'
	}
];

/** 分组后的完整许可清单，按展示顺序排列（每组渲染为一行） */
export const LICENSE_GROUPS: LicenseGroup[] = [RUNTIME_LICENSES, DEV_LICENSES, ASSET_LICENSES];

/** 项目自身仓库地址（用于展示本项目 GPL-3.0 许可） */
export const PROJECT_URL = 'https://github.com/takuron/TSTab';
