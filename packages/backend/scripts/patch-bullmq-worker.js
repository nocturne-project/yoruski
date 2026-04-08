/**
 * BullMQ Worker mainLoop パッチ
 *
 * キュー専用コンテナでBullMQのポーリングがCPUを占有する問題の対策。
 * mainLoopの内側whileループに10ms delayを追加し、イベントループにyieldさせる。
 *
 * 仕様: BullMQのmainLoop内で、ジョブフェッチ後に
 *   `await new Promise(r => setTimeout(r, 10));`
 * を挿入する。
 */
const fs = require('fs');
const path = require('path');

// BullMQ workerファイルを探す
const patterns = [
	'node_modules/.pnpm/bullmq@*/node_modules/bullmq/dist/cjs/classes/worker.js',
];

const { globSync } = require('fs');
let workerFile = null;

// globが使えない場合の代替
const nodeModulesDir = path.resolve(__dirname, '..', 'node_modules', '.pnpm');
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

// 既にパッチ済みかチェック
if (content.includes('YORUSKI_YIELD_PATCH')) {
	console.log('[patch-bullmq] Already patched, skipping');
	process.exit(0);
}

// パッチ: "const job = await fetchedJob;" の後に yield を追加
const target = 'const job = await fetchedJob;';
const replacement = `const job = await fetchedJob;
                // YORUSKI_YIELD_PATCH: キュー専用プロセスのCPUスピン対策
                await new Promise(r => setTimeout(r, 10));`;

if (!content.includes(target)) {
	console.error('[patch-bullmq] Target string not found in worker.js');
	process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(workerFile, content);
console.log('[patch-bullmq] Patch applied successfully');
