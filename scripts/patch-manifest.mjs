import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = resolve(root, 'static');
const buildDir = resolve(root, 'build');

const manifest = JSON.parse(readFileSync(resolve(staticDir, 'manifest.json'), 'utf8'));

/** 找出 HTML 中所有不带 src 的内联 <script> 正文。 */
function inlineScripts(file) {
	const html = readFileSync(file, 'utf8');
	const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
	const hashes = [];
	let m;
	while ((m = re.exec(html)) !== null) {
		hashes.push(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
	}
	return hashes;
}

const htmlFiles = readdirSync(buildDir)
	.filter((f) => f.endsWith('.html'))
	.map((f) => resolve(buildDir, f));

const hashes = [...new Set(htmlFiles.flatMap(inlineScripts))];

manifest.content_security_policy = {
	extension_pages: `script-src 'self' ${hashes.join(' ')}; object-src 'self';`
};

writeFileSync(resolve(buildDir, 'manifest.json'), JSON.stringify(manifest, null, '\t'));
console.log('[patch-manifest] inline script hashes:', hashes.length);
