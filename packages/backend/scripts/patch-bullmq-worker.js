/**
 * BullMQ Worker パッチ: _getNextJobを書き換えて常にwaitForJobを経由させる
 *
 * オリジナルの_getNextJob()はdrained=trueの時だけwaitForJob(XREAD BLOCK)を呼ぶ。
 * drained=falseの時はmoveToActive()を直接呼び、ブロッキングなしの高速ループになる。
 *
 * パッチ後: drained状態に関係なく、常にwaitForJob()を呼んでからmoveToActive()する。
 * これによりキューにジョブがあってもXREAD BLOCKで最小限のスリープが入る。
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

let patched = 0;
for (const file of workerFiles) {
	let content = fs.readFileSync(file, 'utf-8');

	// 古いパッチを除去
	content = content.replace(/\/\/ YORUSKI_[A-Z_]+:.*\n/g, '');
	content = content.replace(/await new Promise\(r => setTimeout\(r, \d+\)\);[^\n]*\n/g, '');

	if (content.includes('YORUSKI_FORCE_WAIT')) {
		console.log(`[patch-bullmq] Already patched: ${file}`);
		continue;
	}

	// _getNextJob()のif-else構造を書き換え
	// 元: if (this.drained && ...) { waitForJob } else { moveToActive }
	// 新: 常にwaitForJob→moveToActive
	const oldCode = `if (this.drained && block && !this.limitUntil && !this.waiting) {
            this.waiting = this.waitForJob(bclient, this.blockUntil);
            try {
                this.blockUntil = await this.waiting;
                if (this.blockUntil <= 0 || this.blockUntil - Date.now() < 1) {
                    return await this.moveToActive(client, token, this.opts.name);
                }
            }
            finally {
                this.waiting = null;
            }
        }
        else {
            if (!this.isRateLimited()) {
                return this.moveToActive(client, token, this.opts.name);
            }
        }`;

	const newCode = `// YORUSKI_FORCE_WAIT: 常にwaitForJobを経由してCPUスピンを防止
        if (!this.waiting && block) {
            this.waiting = this.waitForJob(bclient, this.blockUntil);
            try {
                this.blockUntil = await this.waiting;
            }
            finally {
                this.waiting = null;
            }
        }
        if (!this.isRateLimited()) {
            return this.moveToActive(client, token, this.opts.name);
        }`;

	if (content.includes(oldCode)) {
		content = content.replace(oldCode, newCode);
		fs.writeFileSync(file, content);
		console.log(`[patch-bullmq] Patched: ${file}`);
		patched++;
	} else {
		console.log(`[patch-bullmq] Target not found (may have old patches): ${file}`);
	}
}

console.log(`[patch-bullmq] Done: ${patched} files patched`);
