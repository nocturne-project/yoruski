/**
 * BullMQ Worker パッチ: _getNextJobの先頭にsleepを挿入してCPUスピンを防止
 *
 * 問題: BullMQのWorkerはdrained=false（ジョブあり）の時、moveToActive()を
 * sleepなしで高速ループする。各ループでPromiseが大量生成され、
 * NestJS 11.xのasync_hooks(popAsyncContext)がCPU 97%を消費する。
 *
 * 対策: _getNextJob()の先頭で50msのsetTimeoutを入れ、ループごとに
 * イベントループに制御を返す。これによりGCが動作でき、CPU使用率が下がる。
 *
 * 50ms = 1キューあたり最大20ジョブ/秒。10キュー合計で200ジョブ/秒。
 * yoru.noc.skiの規模では十分な処理能力。
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

// パッチ対象: _getNextJob()の先頭（paused/closingチェックの後）
// 元コード: if (this.drained && block && ...
// 新コード: await sleep(50); if (this.drained && block && ...
const SLEEP_MS = 50;

let patched = 0;
for (const file of workerFiles) {
	let content = fs.readFileSync(file, 'utf-8');

	// 既にパッチ済みならスキップ
	if (content.includes('YORUSKI_LOOP_THROTTLE')) {
		console.log(`[patch-bullmq] Already patched: ${file}`);
		continue;
	}

	// 古いパッチを除去
	content = content.replace(/\/\/ YORUSKI_[A-Z_]+:.*\n/g, '');
	content = content.replace(/await new Promise\(r => setTimeout\(r, \d+\)\);[^\n]*\n/g, '');
	// 古いFORCE_WAITパッチのブロックも除去
	content = content.replace(/\s*\/\/ YORUSKI_FORCE_WAIT[\s\S]*?if \(!this\.isRateLimited\(\)\) \{\s*return this\.moveToActive\(client, token, this\.opts\.name\);\s*\}/g, (match) => {
		// マッチした場合は元のif-else構造に戻す必要があるが、
		// 古いパッチが既に適用されているかもしれないので、元のコードに戻す
		return '';
	});

	// _getNextJob内の drained チェック直前にsleepを挿入
	// ターゲット: "if (this.drained && block && !this.limitUntil && !this.waiting)"
	const target = 'if (this.drained && block && !this.limitUntil && !this.waiting)';

	if (content.includes(target)) {
		content = content.replace(
			target,
			`// YORUSKI_LOOP_THROTTLE: 毎ループ${SLEEP_MS}msスリープでCPUスピン防止\n            await new Promise(r => setTimeout(r, ${SLEEP_MS}));\n            ${target}`,
		);
		fs.writeFileSync(file, content);
		console.log(`[patch-bullmq] Patched (${SLEEP_MS}ms throttle): ${file}`);
		patched++;
	} else {
		console.log(`[patch-bullmq] Target code not found: ${file}`);
		// ファイルの内容をデバッグ出力
		const lines = content.split('\n');
		const getNextJobLine = lines.findIndex(l => l.includes('_getNextJob'));
		if (getNextJobLine >= 0) {
			console.log(`[patch-bullmq] _getNextJob found at line ${getNextJobLine + 1}`);
			console.log(lines.slice(getNextJobLine, getNextJobLine + 30).join('\n'));
		}
	}
}

console.log(`[patch-bullmq] Done: ${patched} files patched`);
