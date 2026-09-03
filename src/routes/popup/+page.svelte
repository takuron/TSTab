<script>
	import { onMount } from 'svelte';
	import { faviconUrl, quickAccess } from '$lib/stores';
	import { isExtension } from '$lib/storage';

	let tab = { title: '加载中...', url: '', icon: '' };
	let loaded = false;
	let exists = false;
	let working = false;
	let status = null; // { text, type }
	let statusTimer;

	async function loadTab() {
		if (isExtension()) {
			const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (!active) {
				showStatus('无法获取当前标签页信息', 'error');
				return;
			}
			tab = {
				title: active.title || '未知网站',
				url: active.url || '',
				icon: faviconFor(active.url, active.favIconUrl)
			};
		} else {
			// 开发调试：以当前地址作为示例
			tab = {
				title: '本地预览（非扩展环境）',
				url: window.location.href,
				icon: ''
			};
		}
		loaded = true;
	}

	function faviconFor(url, favicon) {
		if (favicon && !favicon.includes('chrome://')) return favicon;
		return faviconUrl(url);
	}

	onMount(async () => {
		await quickAccess.load();
		await loadTab();
	});

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
			if (ok) showStatus('添加成功！', 'success');
			else showStatus('该网站已在快捷访问中', 'info');
		} catch (err) {
			console.error(err);
			showStatus('添加失败，请重试', 'error');
		}
		working = false;
	}

	async function handleRemove() {
		if (working || !tab.url) return;
		working = true;
		try {
			const index = $quickAccess.findIndex((it) => it.url === tab.url);
			if (index === -1) {
				showStatus('该网站不在快捷访问中', 'info');
			} else {
				await quickAccess.remove(index);
				showStatus('移除成功！', 'success');
			}
		} catch (err) {
			console.error(err);
			showStatus('移除失败，请重试', 'error');
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
	<title>添加到快捷访问</title>
</svelte:head>

<div class="w-[320px] min-h-[260px] font-sans text-white flex flex-col">
	<!-- 头部 -->
	<header class="px-4 py-3 bg-white/10 backdrop-blur-md border-b border-white/20">
		<h2 class="text-base font-semibold">快捷访问</h2>
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
				当前为非扩展环境，无法读取当前标签页。请在扩展中打开本弹窗使用。
			</p>
		{/if}
		<button
			type="button"
			class="w-full py-2.5 rounded-md font-medium text-white bg-[#399fff]/90 hover:bg-[#399fff] transition disabled:bg-white/20 disabled:cursor-not-allowed
			{exists ? 'hidden' : ''}"
			disabled={working || !loaded}
			onclick={handleAdd}
		>
			添加到快捷访问
		</button>
		<button
			type="button"
			class="w-full py-2.5 rounded-md font-medium text-white bg-white/10 border border-white/30 hover:bg-white/20 transition disabled:bg-white/10 disabled:cursor-not-allowed
			{exists ? '' : 'hidden'}"
			disabled={working || !loaded}
			onclick={handleRemove}
		>
			从快捷访问移除
		</button>
	</footer>
</div>

<style>
	:global(body) {
		width: 320px;
		margin: 0;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}
</style>
