/**
 * イベントループスロットル
 * キュー専用プロセスでioredis/BullMQのPromiseサイクルがCPUを占有する問題の対策。
 * Atomics.wait()でメインスレッドを定期的にブロックし、Promiseの高速ポーリングを中断する。
 *
 * MK_ONLY_QUEUE環境変数がセットされているプロセスでのみ有効化。
 * マイグレーションやビルド等のプロセスでは動作しない。
 */

if (process.env.MK_ONLY_QUEUE) {
	const BLOCK_DURATION_MS = 1;
	const INTERVAL_MS = 200;

	const buf = new SharedArrayBuffer(4);
	const arr = new Int32Array(buf);

	setInterval(() => {
		Atomics.wait(arr, 0, 0, BLOCK_DURATION_MS);
	}, INTERVAL_MS);
}
