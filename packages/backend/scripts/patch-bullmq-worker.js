/**
 * BullMQ Worker mainLoop パッチ
 * キュー専用コンテナでBullMQのポーリングがCPUを占有する問題の対策。
 * mainLoopの全ループにyieldを追加。CJS版とESM版の両方にパッチ適用。
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

// パッチ定義: [検索文字列, 置換文字列]
const patches = [
	// 1. 外側whileループ冒頭にyield
	[
		'while ((!this.closing && !this.paused) || asyncFifoQueue.numTotal() > 0) {',
		`while ((!this.closing && !this.paused) || asyncFifoQueue.numTotal() > 0) {
            // YORUSKI_YIELD_PATCH_1: 外側whileループのyield
            await new Promise(r => setTimeout(r, 500));`,
	],
	// 2. 内側whileループのジョブフェッチ後にyield
	[
		'const job = await fetchedJob;',
		`const job = await fetchedJob;
                // YORUSKI_YIELD_PATCH_2: 内側whileループのyield
                await new Promise(r => setTimeout(r, 100));`,
	],
	// 3. fetchキューのdoループにyield
	[
		'} while (!job && asyncFifoQueue.numQueued() > 0);',
		`// YORUSKI_YIELD_PATCH_3: fetchキューループのyield
                await new Promise(r => setTimeout(r, 100));
            } while (!job && asyncFifoQueue.numQueued() > 0);`,
	],
];

let patched = 0;
for (const file of workerFiles) {
	let content = fs.readFileSync(file, 'utf-8');
	if (content.includes('YORUSKI_YIELD_PATCH')) {
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
		console.log(`[patch-bullmq] Patched ${file} (${filePatches} patches)`);
		patched++;
	} else {
		console.log(`[patch-bullmq] No targets found: ${file}`);
	}
}

console.log(`[patch-bullmq] Done: ${patched} files patched`);
