/**
 * 適応型イベントループスロットル
 *
 * BullMQのPromiseスピンによるCPU占有を防ぐ。
 * イベントループの応答時間を監視し、状態に応じてスロットル強度を変える:
 * - アイドル（スピン中）: setTimeoutが即座に発火する → 強くスロットル
 * - ジョブ処理中: setTimeoutが遅延する → スロットルを弱める
 *
 * entry.js（Misskeyメインプロセス）でのみ有効化。
 */

if (process.argv[1] && process.argv[1].includes('entry.js')) {
	const buf = new SharedArrayBuffer(4);
	const arr = new Int32Array(buf);

	let idleCount = 0; // 連続アイドル検出回数

	function adaptiveThrottle() {
		const start = Date.now();

		setTimeout(() => {
			const lag = Date.now() - start;

			if (lag < 2) {
				// イベントループが高速に回っている = アイドルスピン中
				// スロットルを強化
				idleCount = Math.min(idleCount + 1, 50);
				const blockMs = Math.min(1 + Math.floor(idleCount / 5), 5);
				Atomics.wait(arr, 0, 0, blockMs);
				setTimeout(adaptiveThrottle, 100);
			} else {
				// イベントループが遅延している = ジョブ処理中
				// スロットルを弱める
				idleCount = Math.max(idleCount - 10, 0);
				setTimeout(adaptiveThrottle, 500);
			}
		}, 0);
	}

	// 起動5秒後に開始（初期化完了を待つ）
	setTimeout(adaptiveThrottle, 5000);
}
