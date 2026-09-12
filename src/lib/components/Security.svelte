<script>
	// 仅保护展示区域的文字，保留输入、设置面板与拖拽操作。
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { settings } from '$lib/stores';

	onMount(() => {
		const exempt = (target) => target instanceof Element &&
			(target.closest('dialog, input, textarea, select, button, a, [draggable="true"]') ||
				(target instanceof HTMLElement && target.isContentEditable));
		const protect = (event) => {
			if (get(settings).copyProtection && !exempt(event.target)) event.preventDefault();
		};
		const onKey = (event) => {
			if ((event.ctrlKey || event.metaKey) && ['c', 'x', 'a'].includes(event.key.toLowerCase())) protect(event);
		};
		const events = ['contextmenu', 'copy', 'cut', 'selectstart'];
		events.forEach((name) => document.addEventListener(name, protect));
		document.addEventListener('keydown', onKey);
		return () => {
			events.forEach((name) => document.removeEventListener(name, protect));
			document.removeEventListener('keydown', onKey);
		};
	});
</script>
