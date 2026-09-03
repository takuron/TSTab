<script>
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { settings } from '$lib/stores';

	onMount(() => {
		// 每次事件触发时读取最新设置，避免因订阅时序导致开关失效
		const enabled = () => get(settings).copyProtection;

		const isEditable = (target) =>
			target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

		const onContext = (e) => {
			if (!enabled()) return;
			e.preventDefault();
		};
		const onCopy = (e) => {
			if (!enabled()) return;
			const t = e.target;
			if (t && t.tagName === 'INPUT') return; // 允许输入框复制（按钮场景）
			e.preventDefault();
		};
		const onCut = (e) => {
			if (!enabled()) return;
			e.preventDefault();
		};
		const onDragStart = (e) => {
			if (!enabled()) return;
			e.preventDefault();
		};
		const onSelect = (e) => {
			if (!enabled()) return;
			const t = e.target;
			if (isEditable(t)) return;
			e.preventDefault();
		};
		const onKey = (e) => {
			if (!enabled()) return;
			if (isEditable(e.target)) return;
			if (e.ctrlKey || e.metaKey) {
				const k = e.key.toLowerCase();
				if (k === 'c' || k === 'x' || k === 'a') e.preventDefault();
			}
		};

		document.addEventListener('contextmenu', onContext);
		document.addEventListener('copy', onCopy);
		document.addEventListener('cut', onCut);
		document.addEventListener('dragstart', onDragStart);
		document.addEventListener('selectstart', onSelect);
		document.addEventListener('keydown', onKey);

		return () => {
			document.removeEventListener('contextmenu', onContext);
			document.removeEventListener('copy', onCopy);
			document.removeEventListener('cut', onCut);
			document.removeEventListener('dragstart', onDragStart);
			document.removeEventListener('selectstart', onSelect);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>
