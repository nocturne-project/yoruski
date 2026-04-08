/**
 * BullMQ Worker mainLoop パッチ
 * キュー専用コンテナでBullMQのポーリングがCPUを占有する問題の対策。
 * CJS版とESM版の両方にパッチを適用。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
	path.resolve(__dirname, '..', 'node_modules', '.pnpm'),
	path.resolve(__dirname, '..', '..', '..', 'node_modules', '.pnpm'),
	'/misskey/node_modules/.pnpm',
];
const nodeModulesDir = candidates.find(d => fs.existsSync(d));

const workerFiles = [];
if (nodeModulesDir) {
	const dirs = fs.readdirSync(nodeModulesDir).filter(d => d.startsWith('bullmq@'));
	for (const dir of dirs) {
		for (const variant of ['cjs', 'esm']) {
			const candidate = path.join(nodeModulesDir, dir, 'node_modules', 'bullmq', 'dist', variant, 'classes', 'worker.js');
			if (fs.existsSync(candidate)) {
				workerFiles.push(candidate);
			}
		}
	}
}

if (workerFiles.length === 0) {
	console.log('[patch-bullmq] BullMQ worker.js not found, skipping');
	process.exit(0);
}

const target = 'return this.moveToActive(client, token, this.opts.name);';
const replacement = `{ // YORUSKI_YIELD_PATCH: キュー専用プロセスのCPUスピン対策
                await new Promise(r => setTimeout(r, 50));
                return this.moveToActive(client, token, this.opts.name);
            }`;

let patched = 0;
for (const file of workerFiles) {
	let content = fs.readFileSync(file, 'utf-8');
	if (content.includes('YORUSKI_YIELD_PATCH')) {
		console.log(`[patch-bullmq] Already patched: ${file}`);
		continue;
	}
	if (!content.includes(target)) {
		console.log(`[patch-bullmq] Target not found: ${file}`);
		continue;
	}
	content = content.replaceAll(target, replacement);
	fs.writeFileSync(file, content);
	console.log(`[patch-bullmq] Patched: ${file}`);
	patched++;
}

console.log(`[patch-bullmq] Done: ${patched} files patched`);
