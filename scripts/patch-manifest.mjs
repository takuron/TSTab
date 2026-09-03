import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = resolve(root, 'static');
const buildDir = resolve(root, 'build');

const manifest = JSON.parse(readFileSync(resolve(staticDir, 'manifest.json'), 'utf8'));

// 与 svelte.config.js 的 kit.appDir 保持一致（扩展禁止 '_' 开头目录，故为 'app'）
const APP_DIR = 'app';

/** 外部化 HTML 中的内联 <script>：写入独立 .js 文件并以 src 引用，
 *  从而满足 MV3 扩展页 CSP（script-src 仅允许 'self'，禁止哈希/内联）。 */
function externalizeInlineScripts(file) {
	const html = readFileSync(file, 'utf8');
	const name = basename(file, '.html');
	const scriptDir = resolve(buildDir, APP_DIR, 'bootstrap');
	mkdirSync(scriptDir, { recursive: true });

	// 匹配不带 src 属性的 <script ...>...</script>
	const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
	let out = html;
	let counter = 0;
	let m;
	while ((m = re.exec(html)) !== null) {
		const attrs = m[1];
		if (/\bsrc\s*=/.test(attrs)) continue; // 跳过已带 src 的脚本
		const body = m[2];
		// 原脚本正文的首行缩进，用于对齐替换后的标签
		const indent = /^[ \t]*/.exec(body)[0];
		const outName = `${name}-${counter++}.js`;
		const outFile = resolve(scriptDir, outName);
		writeFileSync(outFile, body, 'utf8');
		// 保留原属性（如 type/id），插入 src 引用
		const original = m[0];
		const replacement = `${indent}<script src="/${APP_DIR}/bootstrap/${outName}"${attrs}></script>`;
		out = out.replace(original, replacement);
	}
	writeFileSync(file, out, 'utf8');
}

/** 移除 <link rel="modulepreload">：MV3 扩展页中这些预加载标签会在与脚本实际
 *  加载不同的隔离世界执行，导致 "cross-world extension resource mismatch" 报错；
 *  脚本已由 <script src> 加载，预加载链接冗余，直接去除即可。 */
function stripModulePreloads(file) {
	const html = readFileSync(file, 'utf8');
	const out = html.replace(/<link\b[^>]*\brel="modulepreload"[^>]*>/g, '');
	writeFileSync(file, out, 'utf8');
}

const htmlFiles = readdirSync(buildDir)
	.filter((f) => f.endsWith('.html'))
	.map((f) => resolve(buildDir, f));

for (const file of htmlFiles) {
	externalizeInlineScripts(file);
	stripModulePreloads(file);
}

// MV3 扩展页 CSP：仅允许自身源。所有脚本已外部化到 '/app/**'，无内联脚本。
manifest.content_security_policy = {
	extension_pages: `script-src 'self'; object-src 'self';`
};

writeFileSync(resolve(buildDir, 'manifest.json'), JSON.stringify(manifest, null, '\t'));
console.log('[patch-manifest] externalized inline scripts in', htmlFiles.length, 'html file(s).');
