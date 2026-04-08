/**
 * BullMQ Worker 包括的CPUスピン対策パッチ
 * キュー専用コンテナでBullMQのポーリングがCPUを占有する問題の対策。
 * 全ループ・ポーリング箇所にyieldを追加。CJS版とESM版の両方にパッチ適用。
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

const YIELD = 'await new Promise(r => setTimeout(r, 100)); /* YORUSKI_YIELD */';

const patches = [
	// 1. mainLoopの外側whileループ冒頭
	[
		'while ((!this.closing && !this.paused) || asyncFifoQueue.numTotal() > 0) {',
		`while ((!this.closing && !this.paused) || asyncFifoQueue.numTotal() > 0) {\n            ${YIELD}`,
	],
	// 2. mainLoopの内側whileループ冒頭（ジョブフェッチループ）
	[
		'while (!this.closing &&\n                !this.paused &&\n                !this.waiting &&\n                asyncFifoQueue.numTotal() < this._concurrency &&\n                !this.isRateLimited()) {',
		`while (!this.closing &&\n                !this.paused &&\n                !this.waiting &&\n                asyncFifoQueue.numTotal() < this._concurrency &&\n                !this.isRateLimited()) {\n                ${YIELD}`,
	],
	// 3. fetchキューのdoループ
	[
		'} while (!job && asyncFifoQueue.numQueued() > 0);',
		`${YIELD}\n            } while (!job && asyncFifoQueue.numQueued() > 0);`,
	],
	// 4. _getNextJobのmoveToActive呼び出し前（2箇所、replaceAllで対応）
	[
		'return this.moveToActive(client, token, this.opts.name);',
		`${YIELD}\n                return this.moveToActive(client, token, this.opts.name);`,
	],
	// 5. retryIfFailedのdoループ
	[
		'} while (++retry < maxRetries);',
		`${YIELD}\n        } while (++retry < maxRetries);`,
	],
	// 6. stalledCheckerのwhileループ冒頭
	[
		'while (!(this.closing || this.paused)) {\n            await this.checkConnectionError',
		`while (!(this.closing || this.paused)) {\n            ${YIELD}\n            await this.checkConnectionError`,
	],
];

let patched = 0;
for (const file of workerFiles) {
	let content = fs.readFileSync(file, 'utf-8');
	if (content.includes('YORUSKI_YIELD')) {
		console.log(`[patch-bullmq] Already patched: ${file}`);
		continue;
	}

	let filePatches = 0;
	for (const [target, replacement] of patches) {
		if (content.includes(target)) {
			content = content.replaceAll(target, replacement);
			filePatches++;
		}
	}

	if (filePatches > 0) {
		fs.writeFileSync(file, content);
		console.log(`[patch-bullmq] Patched ${file} (${filePatches} patches applied)`);
		patched++;
	} else {
		console.log(`[patch-bullmq] No targets found: ${file}`);
	}
}

console.log(`[patch-bullmq] Done: ${patched} files patched`);
