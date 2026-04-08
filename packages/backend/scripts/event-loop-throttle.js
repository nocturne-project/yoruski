/**
 * 適応型イベントループスロットル
 *
 * BullMQのPromiseスピンによるCPU占有を防ぐ。
 * setTimeout(0)のlagでイベントループ状態を判定し、
 * アイドルスピン中はsetImmediateチェーンでCPUを一定量消費させる
 * （Promiseのmicrotask処理を相対的に遅くする効果）。
 *
 * Atomics.waitと違いメインスレッドをブロックしないため、
 * ジョブ処理を阻害しない。
 *
 * entry.js（Misskeyメインプロセス）でのみ有効化。
 */

if (process.argv[1] && process.argv[1].includes('entry.js')) {
	let throttling = false;

	function checkLoop() {
		const start = Date.now();
		setTimeout(() => {
			const lag = Date.now() - start;
			if (lag < 2 && !throttling) {
				// アイドルスピン検出 → スロットル開始
				throttling = true;
				slowDown();
			}
			setTimeout(checkLoop, throttling ? 200 : 500);
		}, 0);
	}

	// setImmediateチェーンでイベントループのcheckフェーズを占有し
	// Promiseのmicrotask処理を遅くする
	let slowDownCount = 0;
	function slowDown() {
		if (slowDownCount > 100) {
			// 100回setImmediateした後、一旦停止して状態を再チェック
			slowDownCount = 0;
			throttling = false;
			return;
		}
		slowDownCount++;
		setImmediate(slowDown);
	}

	setTimeout(checkLoop, 5000);
}
