import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { bundledLicenses } from './scripts/bundled-licenses.mjs';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss(), bundledLicenses()]
});
