/**
 * イベントループスロットル
 * キュー専用プロセスでioredis/BullMQのPromiseサイクルがCPUを占有する問題の対策。
 * Atomics.wait()でメインスレッドを定期的にブロックし、Promiseの高速ポーリングを中断する。
 *
 * 注意: ブロック中はジョブ処理も止まるため、ブロック時間は最小限にする。
 * 1ms/200ms = 0.5%のブロック率。CPUスピンを防ぎつつジョブ処理を維持する。
 */

const BLOCK_DURATION_MS = 1;   // 1回あたり1msブロック
const INTERVAL_MS = 200;       // 200ms間隔

const buf = new SharedArrayBuffer(4);
const arr = new Int32Array(buf);

setInterval(() => {
	Atomics.wait(arr, 0, 0, BLOCK_DURATION_MS);
}, INTERVAL_MS);
