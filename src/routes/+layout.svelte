<script>
	// 全局样式、语言和跨页面存储同步；统一展示异步操作错误。
	import '../app.css';
	import '$lib/i18n';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { _, locale } from 'svelte-i18n';
	import { operationError, startStorageSync } from '$lib/stores';

	$: if (browser && $locale) document.documentElement.lang = $locale;
	onMount(startStorageSync);
</script>

<slot />
{#if $operationError}
	<div role="alert" class="fixed bottom-3 left-3 right-3 z-[2000] p-3 glass-strong rounded-lg text-white flex items-center gap-3">
		<span>{$_($operationError)}</span>
		<button type="button" class="btn btn-xs" onclick={() => operationError.set('')}>{$_('common.dismiss')}</button>
	</div>
{/if}
