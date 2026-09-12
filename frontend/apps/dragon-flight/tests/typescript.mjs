import fs from 'node:fs';
import { transformWithEsbuild } from 'vite';

export async function transpile(source) {
	return (await transformWithEsbuild(source, 'test.ts', { loader: 'ts', target: 'es2022' })).code;
}
export async function loadTypescript(url) {
	const code = await transpile(fs.readFileSync(url, 'utf8'));
	return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
