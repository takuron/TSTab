<script>
	import { onMount } from 'svelte';

	onMount(() => {
		if (window.innerWidth <= 768) return;

		const cursor = document.createElement('div');
		cursor.id = 'snow-cursor';
		cursor.classList.add('hidden');
		document.body.appendChild(cursor);

		const style = document.createElement('style');
		style.textContent = '*{cursor:none !important}';
		document.head.appendChild(style);

		let curr = null;
		let prev = null;
		let raf = 0;

		const lerp = (a, b, n) => (Math.round(a) === b ? b : (1 - n) * a + n * b);
		const move = (left, top) => {
			cursor.style.left = `${left}px`;
			cursor.style.top = `${top}px`;
		};

		const render = () => {
			if (curr) {
				if (prev) {
					prev.x = lerp(prev.x, curr.x, 0.35);
					prev.y = lerp(prev.y, curr.y, 0.35);
					move(prev.x, prev.y);
				} else {
					prev = { ...curr };
				}
			}
			raf = requestAnimationFrame(render);
		};

		const onMove = (e) => {
			if (curr === null) move(e.clientX - 8, e.clientY - 8);
			curr = { x: e.clientX - 8, y: e.clientY - 8 };
			cursor.classList.remove('hidden');
		};
		const onEnter = () => cursor.classList.remove('hidden');
		const onLeave = () => cursor.classList.add('hidden');
		const onDown = () => cursor.classList.add('active');
		const onUp = () => cursor.classList.remove('active');

		render();
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseenter', onEnter);
		document.addEventListener('mouseleave', onLeave);
		document.addEventListener('mousedown', onDown);
		document.addEventListener('mouseup', onUp);

		return () => {
			cancelAnimationFrame(raf);
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseenter', onEnter);
			document.removeEventListener('mouseleave', onLeave);
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('mouseup', onUp);
			cursor.remove();
			style.remove();
		};
	});
</script>
