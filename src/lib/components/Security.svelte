<script>
	import { onMount } from 'svelte';
	import { settings } from '$lib/stores';

	onMount(() => {
		const isEditable = (target) =>
			target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

		const onContext = (e) => {
			if (!editableEnabled()) return;
			e.preventDefault();
		};
		const onCopy = (e) => {
			if (!editableEnabled()) return;
			const t = e.target;
			if (t && t.tagName === 'INPUT') return; // 允许输入框复制（按钮场景）
			e.preventDefault();
		};
		const onCut = (e) => {
			if (!editableEnabled()) return;
			e.preventDefault();
		};
		const onKey = (e) => {
			if (!editableEnabled()) return;
			if (isEditable(e.target)) return;
			if (e.ctrlKey || e.metaKey) {
				const k = e.key.toLowerCase();
				if (k === 'c' || k === 'x' || k === 'a') e.preventDefault();
			}
		};

		let on = false;
		function editableEnabled() {
			return on;
		}

		const handlers = { onContext, onCopy, onCut, onKey };

		return settings.subscribe((s) => {
			const want = s.copyProtection;
			if (want && !on) {
				on = true;
				document.addEventListener('contextmenu', onContext);
				document.addEventListener('copy', onCopy);
				document.addEventListener('cut', onCut);
				document.addEventListener('keydown', onKey);
			} else if (!want && on) {
				on = false;
				document.removeEventListener('contextmenu', onContext);
				document.removeEventListener('copy', onCopy);
				document.removeEventListener('cut', onCut);
				document.removeEventListener('keydown', onKey);
			}
		});
	});
</script>
