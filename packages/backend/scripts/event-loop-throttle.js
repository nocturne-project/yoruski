/**
 * イベントループスロットル
 * キュー専用プロセスでioredis/BullMQのPromiseサイクルがCPUを占有する問題の対策。
 * Atomics.wait()でメインスレッドを定期的にブロックし、Promiseの高速ポーリングを中断する。
 *
 * entry.js（Misskeyメインプロセス）でのみ有効化。
 * compile_config.js, migration等のサブプロセスでは動作しない。
 */

// Misskeyのメインエントリポイント（entry.js）でのみ有効化
// --requireで全プロセスにロードされるため、エントリポイントで判定
if (process.argv[1] && process.argv[1].includes('entry.js')) {
	const BLOCK_DURATION_MS = 1;
	const INTERVAL_MS = 200;

	const buf = new SharedArrayBuffer(4);
	const arr = new Int32Array(buf);

	setInterval(() => {
		Atomics.wait(arr, 0, 0, BLOCK_DURATION_MS);
	}, INTERVAL_MS);
}
