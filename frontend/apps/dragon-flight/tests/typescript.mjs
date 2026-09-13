import fs from 'node:fs';
import { transformWithEsbuild } from 'vite';

export async function transpile(source) {
	return (await transformWithEsbuild(source, 'test.ts', { loader: 'ts', target: 'es2022' })).code;
}
export async function loadTypescript(url, { base = '' } = {}) {
	const cache = new Map();
	async function compile(file) {
		if (cache.has(file.href)) return cache.get(file.href);
		let code = await transpile(fs.readFileSync(file, 'utf8'));
		for (const match of [...code.matchAll(/from ["']([^"']+)["']/g)]) {
			const specifier = match[1];
			let replacement;
			if (specifier === '$app/paths') {
				replacement =
					'data:text/javascript;base64,' +
					Buffer.from(`export const base=${JSON.stringify(base)};`).toString('base64');
			} else if (specifier.startsWith('.')) {
				const relative = new URL(specifier, file);
				const dependency = [
					relative,
					new URL(relative.href + '.ts'),
					new URL(relative.href + '/index.ts'),
				].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
				if (!dependency) throw new Error('Missing module: ' + relative.href);
				replacement = await compile(dependency);
			} else {
				throw new Error('Unsupported test import: ' + specifier);
			}
			code = code.replace(match[0], `from ${JSON.stringify(replacement)}`);
		}
		const result = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
		cache.set(file.href, result);
		return result;
	}
	return import(await compile(url));
}
