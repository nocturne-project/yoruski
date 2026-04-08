/**
 * イベントループスロットル
 * キュー専用プロセスでioredis/BullMQのPromiseサイクルがCPUを占有する問題の対策。
 * Atomics.wait()でメインスレッドを定期的にブロックし、Promiseの高速ポーリングを中断する。
 *
 * 使い方: NODE_OPTIONS="--import ./scripts/event-loop-throttle.js" で起動時にプリロード
 * または require('./scripts/event-loop-throttle.js') で明示的にロード
 */

const BLOCK_DURATION_MS = 1;   // 1回あたり1msブロック
const INTERVAL_MS = 50;        // 50ms間隔

const buf = new SharedArrayBuffer(4);
const arr = new Int32Array(buf);

setInterval(() => {
	// メインスレッドを10ms間ブロック
	// これによりioredisのPromiseサイクルが中断され、CPUが解放される
	Atomics.wait(arr, 0, 0, BLOCK_DURATION_MS);
}, INTERVAL_MS);
