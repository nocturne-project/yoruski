/**
 * BullMQ Worker mainLoop パッチ
 * キュー専用コンテナでBullMQのポーリングがCPUを占有する問題の対策。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Dockerビルド時は /misskey/node_modules/.pnpm、ローカルは packages/backend/node_modules/.pnpm
const candidates = [
	path.resolve(__dirname, '..', 'node_modules', '.pnpm'),
	path.resolve(__dirname, '..', '..', '..', 'node_modules', '.pnpm'),
	'/misskey/node_modules/.pnpm',
];
const nodeModulesDir = candidates.find(d => fs.existsSync(d));

let workerFile = null;
if (fs.existsSync(nodeModulesDir)) {
	const dirs = fs.readdirSync(nodeModulesDir).filter(d => d.startsWith('bullmq@'));
	for (const dir of dirs) {
		const candidate = path.join(nodeModulesDir, dir, 'node_modules', 'bullmq', 'dist', 'cjs', 'classes', 'worker.js');
		if (fs.existsSync(candidate)) {
			workerFile = candidate;
			break;
		}
	}
}

if (!workerFile) {
	console.log('[patch-bullmq] BullMQ worker.js not found, skipping');
	process.exit(0);
}

console.log(`[patch-bullmq] Patching ${workerFile}`);

let content = fs.readFileSync(workerFile, 'utf-8');

if (content.includes('YORUSKI_YIELD_PATCH')) {
	console.log('[patch-bullmq] Already patched, skipping');
	process.exit(0);
}

// _getNextJobのmoveToActive呼び出し前にyieldを追加
const target = 'return this.moveToActive(client, token, this.opts.name);';
const replacement = `{ // YORUSKI_YIELD_PATCH: キュー専用プロセスのCPUスピン対策
                await new Promise(r => setTimeout(r, 50));
                return this.moveToActive(client, token, this.opts.name);
            }`;

if (!content.includes(target)) {
	console.error('[patch-bullmq] Target string not found in worker.js');
	process.exit(1);
}

content = content.replaceAll(target, replacement);
fs.writeFileSync(workerFile, content);
console.log('[patch-bullmq] Patch applied successfully');
