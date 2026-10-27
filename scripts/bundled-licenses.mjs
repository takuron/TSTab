import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 沿模块路径查找所属 npm 包，不依赖 npm/pnpm 的具体目录布局。
function packageDirectory(file) {
	let current = dirname(file);
	while (true) {
		const manifest = join(current, 'package.json');
		if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name) return current;
		const parent = dirname(current);
		if (parent === current) throw new Error(`无法定位依赖所属的包：${file}`);
		current = parent;
	}
}

/**
 * 为客户端产物收集实际打包依赖及样式依赖的完整许可，并附带项目 GPL 正文。
 * 仅在正式构建时生成静态文本；缺失许可正文时阻止构建，避免静默漏发。
 *
 * @returns {import('vite').Plugin} 客户端许可归档插件。
 */
export function bundledLicenses() {
	let ssr = false;
	return {
		name: 'tstab-bundled-licenses',
		apply: 'build',
		configResolved(config) { ssr = Boolean(config.build.ssr); },
		generateBundle(_options, bundle) {
			if (ssr) return;
			// 样式生成器不会出现在 JS chunk.modules 中，因此显式纳入其许可。
			const directories = new Set(['tailwindcss', 'daisyui'].map((name) =>
				realpathSync(join(root, 'node_modules', name))));
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== 'chunk') continue;
				for (const id of Object.keys(chunk.modules)) {
					const file = id.split('?')[0];
					if (isAbsolute(file) && /[/\\]node_modules[/\\]/.test(file)) {
						directories.add(packageDirectory(file));
					}
				}
			}
			const packages = [...directories].map((directory) => {
				const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
				const files = readdirSync(directory, { withFileTypes: true })
					.filter((entry) => entry.isFile() && /^(?:(?:licen[sc]e|notice|copying)(?:[.-]|$)|copyright)/i.test(entry.name))
					.map((entry) => entry.name).sort();
				if (!files.some((name) => /^(licen[sc]e|copying)([.-]|$)/i.test(name))) {
					throw new Error(`缺失完整许可正文：${pkg.name}@${pkg.version}`);
				}
				return { directory, pkg, files };
			}).sort((a, b) => `${a.pkg.name}@${a.pkg.version}`.localeCompare(`${b.pkg.name}@${b.pkg.version}`, 'en'));
			const sections = packages.map(({ directory, pkg, files }) => [
				`${pkg.name}@${pkg.version}`,
				`License: ${pkg.license ?? 'See license text below'}`,
				...files.map((file) => `--- ${file} ---\n${readFileSync(join(directory, file), 'utf8')}`)
			].join('\n'));
			this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_LICENSES.txt', source:
				'TSTab bundled third-party software licenses\n\n' + sections.join('\n\n' + '='.repeat(72) + '\n\n') + '\n' });
			this.emitFile({ type: 'asset', fileName: 'licenses/bundled-packages.json', source:
				JSON.stringify(packages.map(({ pkg, files }) => ({
					name: pkg.name, version: pkg.version, license: pkg.license, files
				})), null, 2) + '\n' });
			this.emitFile({ type: 'asset', fileName: 'LICENSE', source: readFileSync(join(root, 'LICENSE')) });
		}
	};
}
