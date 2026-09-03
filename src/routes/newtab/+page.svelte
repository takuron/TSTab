<script>
	import { onMount } from 'svelte';
	import QuickAccessDock from '$lib/components/QuickAccessDock.svelte';
	import QuoteCard from '$lib/components/QuoteCard.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import Security from '$lib/components/Security.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import TimeDisplay from '$lib/components/TimeDisplay.svelte';
	import { backgroundStyle, quickAccess, quote, settings } from '$lib/stores';

	let openSettings = false;
	let quoteEnabledRef = false;

	onMount(async () => {
		await settings.load();
		await quickAccess.load();
	});

	// 首次就绪或“从关闭变为开启”时加载一言
	$: {
		if ($settings.ready && $settings.quoteEnabled) {
			if (!quoteEnabledRef) {
				quoteEnabledRef = true;
				quote.load();
			}
		} else {
			quoteEnabledRef = false;
		}
	}
</script>

<svelte:head>
	<title>新标签页</title>
</svelte:head>

<!-- 背景 -->
<div
	class="fixed inset-0 -z-10 bg-cover bg-center animate-[fade-blur-in_0.65s_cubic-bezier(0.25,0.46,0.45,0.94)_forwards]"
	style="background-image: {$backgroundStyle || 'linear-gradient(135deg, rgba(91,134,229,0.6) 0%, rgba(54,209,220,0.6) 100%)'}"
></div>

<!-- 主内容：时间+搜索固定在顶部，一言区域预留固定高度保证布局不跳动、与 dock 之间始终保留空隙 -->
<main class="relative flex min-h-screen flex-col items-center px-5 pt-[16vh] text-white">
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
	<button
		type="button"
		title="刷新一言"
		aria-label="刷新一言"
		class="w-12 h-12 rounded-full glass border border-white/20 text-white flex items-center justify-center cursor-pointer transition hover:bg-[#399fff]/30 hover:-translate-y-0.5 focus:outline-2 focus:outline-[#399fff] active:scale-95"
		onclick={() => quote.refresh()}
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polyline points="23 4 23 10 17 10"></polyline>
			<polyline points="1 20 1 14 7 14"></polyline>
			<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
		</svg>
	</button>
	<button
		type="button"
		title="设置"
		aria-label="打开设置"
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
