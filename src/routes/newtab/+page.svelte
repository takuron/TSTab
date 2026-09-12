<script>
	// 新标签页入口：加载本地状态并组装展示组件。
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import QuickAccessDock from '$lib/components/QuickAccessDock.svelte';
	import QuoteCard from '$lib/components/QuoteCard.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import Security from '$lib/components/Security.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import TimeDisplay from '$lib/components/TimeDisplay.svelte';
	import { backgroundStyle, bookmarkDock, quickAccess, quote, runAction, settings } from '$lib/stores';

	let openSettings = false;
	let quoteEnabledRef = false;
	let quoteBooted = false;
	// 背景图延迟到首帧绘制后再应用，避免大图（预设/URL/base64）解码阻塞正文渲染。
	let bgReady = false;

	onMount(async () => {
		// settings 与 quickAccess 相互独立，并行加载缩短启动等待。
		await runAction(() => Promise.all([settings.load(), quickAccess.load()]));
		// 双帧 rAF 确保首帧完全绘制后，再加载背景图，实现“先进入首页，后加载背景”。
		requestAnimationFrame(() => requestAnimationFrame(() => (bgReady = true)));
	});

	// 快捷访问开启书签模式时，随文件夹变化同步加载书签 Dock。
	$: bookmarkFolder = $settings.ready && $settings.quickAccessMode === 'bookmark' ? $settings.bookmarkFolderId : null;
	$: if ($settings.ready) {
		const folder = bookmarkFolder;
		runAction(() => bookmarkDock.load(folder));
	}

	// 一言仅在开启时拉取：首次就绪走缓存；由“关闭→开启”时额外强制拉取一次新内容。
	// quoteEnabledRef 记录上一时刻的开启状态以识别上升沿，quoteBooted 区分首次就绪。
	$: {
		const enabled = $settings.ready && $settings.quoteEnabled;
		if (enabled && !quoteEnabledRef) {
			if (!quoteBooted) {
				quoteBooted = true;
				runAction(() => quote.load());
			} else {
				runAction(() => quote.refresh());
			}
			quoteEnabledRef = true;
		} else if (!enabled) {
			quoteEnabledRef = false;
		}
	}
</script>

<svelte:head>
	<title>{$_('newtab.title')}</title>
</svelte:head>

<!-- 背景：首帧先以渐变占位，bgReady（首帧绘制完毕）后才应用真实背景图，避免大图解码阻塞首屏。 -->
<div
	class="fixed inset-0 -z-10 bg-cover bg-center animate-[fade-blur-in_0.65s_cubic-bezier(0.25,0.45,0.45,0.94)_forwards]"
	style="background-image: {$backgroundStyle && bgReady ? $backgroundStyle : 'linear-gradient(135deg, rgba(91,134,229,0.6) 0%, rgba(54,209,220,0.6) 100%)'}"
></div>
<!-- 使用图片背景时叠加暗色调层，提升文字可读性 -->
{#if $backgroundStyle && bgReady}
	<div class="fixed inset-0 -z-10 bg-black/35"></div>
{/if}

<!-- 主内容：时间+搜索固定在顶部，一言区域预留固定高度保证布局不跳动、与 dock 之间始终保留空隙 -->
<main class="relative flex min-h-screen flex-col items-center px-5 pt-[21vh] text-white">
	<TimeDisplay />
	<SearchBar />

	<!-- 每日一言：预留固定高度，避免显示/隐藏时上下布局移动 -->
	<div class="w-full max-w-[800px] min-h-[130px]">
		{#if $settings.quoteEnabled}
			<QuoteCard />
		{/if}
	</div>
</main>

<!-- 快捷访问 Dock -->
<QuickAccessDock />

<!-- 浮动操作按钮 -->
<div class="fixed bottom-7 right-7 z-40 flex gap-3 animate-[fade_0.5s_ease-in-out]">
	{#if $settings.quoteEnabled}
		<button
			type="button"
			title={$_('newtab.refreshQuote')}
			aria-label={$_('newtab.refreshQuote')}
			class="w-12 h-12 rounded-full glass border border-white/20 text-white flex items-center justify-center cursor-pointer transition hover:bg-[#399fff]/30 hover:-translate-y-0.5 focus:outline-2 focus:outline-[#399fff] active:scale-95"
			onclick={() => runAction(() => quote.refresh())}
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="23 4 23 10 17 10"></polyline>
				<polyline points="1 20 1 14 7 14"></polyline>
				<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
			</svg>
		</button>
	{/if}
	<button
		type="button"
		title={$_('newtab.settings')}
		aria-label={$_('newtab.openSettingsAria')}
		class="w-12 h-12 rounded-full glass border border-white/20 text-white flex items-center justify-center cursor-pointer transition hover:bg-[#399fff]/30 hover:-translate-y-0.5 focus:outline-2 focus:outline-[#399fff] active:scale-95"
		onclick={() => (openSettings = true)}
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="3"></circle>
			<path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m-2 2l-4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m-2-2l-4.2-4.2"></path>
		</svg>
	</button>
</div>

<SettingsModal bind:open={openSettings} />

<!-- 组件效果 -->
<Security />
