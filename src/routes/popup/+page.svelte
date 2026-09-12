<script>
	// 工具栏弹窗：加载语言偏好后读取当前页面并管理快捷访问。
	import { onMount, onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { faviconUrl, quickAccess, settings } from '$lib/stores';
	import { isImageSource } from '$lib/validation';
	import { webUrlOrNull } from '$lib/search';
	import { isExtension } from '$lib/storage';

	let tab = { title: $_('popup.loadingTab'), url: '', icon: '' };
	let loaded = false;
	let exists = false;
	let working = false;
	let status = null; // { text, type }
	let statusTimer;

	async function loadTab() {
		if (isExtension()) {
			const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (!active) {
				showStatus($_('popup.statusNoTab'), 'error');
				return;
			}
			tab = {
				title: active.title || $_('popup.unknownTab'),
				url: webUrlOrNull(active.url) || '',
				icon: faviconFor(active.url, active.favIconUrl)
			};
		} else {
			// 开发调试：以当前地址作为示例
			tab = {
				title: $_('popup.previewTab'),
				url: window.location.href,
				icon: ''
			};
		}
		loaded = true;
	}

	function faviconFor(url, favicon) {
		if (favicon && isImageSource(favicon)) return favicon;
		return faviconUrl(url);
	}

	onMount(async () => {
		try {
			await Promise.all([settings.load(), quickAccess.load()]);
			await loadTab();
			if (!tab.url) showStatus($_('popup.unsupportedUrl'), 'error');
		} catch (error) {
			console.error(error);
			showStatus($_('msg.operationFailed'), 'error');
		}
	});
	onDestroy(() => clearTimeout(statusTimer));

	$: if (loaded) {
		exists = $quickAccess.some((it) => it.url === tab.url);
	}

	function showStatus(text, type = 'info') {
		clearTimeout(statusTimer);
		status = { text, type };
		statusTimer = setTimeout(() => (status = null), 3000);
	}

	async function handleAdd() {
		if (working || !tab.url) return;
		working = true;
		try {
			const ok = await quickAccess.add({
				title: tab.title || hostOf(tab.url),
				url: tab.url,
				icon: tab.icon,
				addedAt: Date.now()
			});
		if (ok) showStatus($_('popup.statusAdded'), 'success');
		else showStatus($_('popup.statusAlready'), 'info');
	} catch (err) {
		console.error(err);
		showStatus($_('popup.statusAddFailed'), 'error');
	}
	working = false;
}

async function handleRemove() {
	if (working || !tab.url) return;
	working = true;
	try {
		const index = $quickAccess.findIndex((it) => it.url === tab.url);
		if (index === -1) {
			showStatus($_('popup.statusNotIn'), 'info');
		} else {
			await quickAccess.remove($quickAccess[index].id);
			showStatus($_('popup.statusRemoved'), 'success');
		}
	} catch (err) {
		console.error(err);
		showStatus($_('popup.statusRemoveFailed'), 'error');
	}
	working = false;
}

	function hostOf(url) {
		try {
			return new URL(url).hostname.replace('www.', '');
		} catch {
			return url;
		}
	}
</script>

<svelte:head>
	<title>{$_('popup.title')}</title>
</svelte:head>

<div data-popup class="w-[320px] min-h-[260px] font-sans text-white flex flex-col">
	<!-- 头部 -->
	<header class="px-4 py-3 bg-white/10 backdrop-blur-md border-b border-white/20">
		<h2 class="text-base font-semibold">{$_('popup.header')}</h2>
	</header>

	<!-- 内容 -->
	<div class="flex-1 p-4">
		<div class="flex items-center gap-3 p-3 mb-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
			{#if tab.icon}
				<img src={tab.icon} alt="" class="w-8 h-8 rounded-md bg-white/20 flex-shrink-0" onerror={(e) => (e.currentTarget.style.visibility = 'hidden')} />
			{:else}
				<span class="w-8 h-8 rounded-md bg-white/20 flex-shrink-0"></span>
			{/if}
			<div class="flex-1 min-w-0">
				<div class="text-sm font-medium truncate">{tab.title}</div>
				<div class="text-xs text-white/70 truncate">{hostOf(tab.url) || tab.url}</div>
			</div>
		</div>

		{#if status}
			<div
				class="text-center text-sm px-3 py-2 rounded-md mb-3
				{status.type === 'success' ? 'bg-[#4caf50]/20 border border-[#4caf50]/40 text-[#a5d6a7]'
					: status.type === 'error' ? 'bg-[#f44336]/20 border border-[#f44336]/40 text-[#ef9a9a]'
					: 'bg-[#2196f3]/20 border border-[#2196f3]/40 text-[#90caf9]'}"
			>
				{status.text}
			</div>
		{/if}
	</div>

	<!-- 底部 -->
	<footer class="p-4 bg-white/5 backdrop-blur-md border-t border-white/10 space-y-2">
		{#if !isExtension()}
			<p class="text-xs text-white/80 text-center">
				{$_('popup.nonExt')}
			</p>
		{/if}
		<button
			type="button"
			class="w-full py-2.5 rounded-md font-medium text-white bg-[#399fff]/90 hover:bg-[#399fff] transition disabled:bg-white/20 disabled:cursor-not-allowed
			{exists ? 'hidden' : ''}"
			disabled={working || !loaded || !tab.url}
			onclick={handleAdd}
		>
			{$_('popup.add')}
		</button>
		<button
			type="button"
			class="w-full py-2.5 rounded-md font-medium text-white bg-white/10 border border-white/30 hover:bg-white/20 transition disabled:bg-white/10 disabled:cursor-not-allowed
			{exists ? '' : 'hidden'}"
			disabled={working || !loaded || !tab.url}
			onclick={handleRemove}
		>
			{$_('popup.remove')}
		</button>
	</footer>
</div>
