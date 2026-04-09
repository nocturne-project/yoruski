/**
 * BullMQ Worker パッチ: drained強制 + 古いyieldパッチ除去
 *
 * _getNextJob()のelse分岐（drained=false時）で、moveToActive()がnullを返したら
 * 強制的にdrained=trueに設定し、次のイテレーションでwaitForJob(XREAD BLOCK)に入るようにする。
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

	// 古いYORUSKI_YIELDパッチを除去
	if (content.includes('YORUSKI_YIELD')) {
		content = content.replaceAll('await new Promise(r => setTimeout(r, 100)); /* YORUSKI_YIELD */\n', '');
		content = content.replaceAll('await new Promise(r => setTimeout(r, 100)); /* YORUSKI_YIELD */', '');
	}

	if (content.includes('YORUSKI_DRAIN_PATCH')) {
		console.log(`[patch-bullmq] Already patched: ${file}`);
		continue;
	}

	// _getNextJob()のelse分岐でmoveToActiveの結果をチェックし、nullならdrained=trueを強制
	const target = 'return this.moveToActive(client, token, this.opts.name);';
	const replacement = `{
                // YORUSKI_DRAIN_PATCH: moveToActiveがnullならdrained=trueを強制
                const job = await this.moveToActive(client, token, this.opts.name);
                if (!job) { this.drained = true; }
                return job;
            }`;

	if (content.includes(target)) {
		content = content.replaceAll(target, replacement);
		fs.writeFileSync(file, content);
		console.log(`[patch-bullmq] Patched: ${file}`);
		patched++;
	} else {
		console.log(`[patch-bullmq] Target not found: ${file}`);
	}
}

console.log(`[patch-bullmq] Done: ${patched} files patched`);
