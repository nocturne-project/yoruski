/**
 * ioredis Promiseスロットル
 *
 * BullMQのPromiseスピンによるCPU占有を防ぐ。
 * ioredisのsendCommandメソッドをパッチし、Redis応答のPromise解決後に
 * 短いsetTimeout遅延を挿入する。これにより全Workerの全Redis通信が
 * 自然にスロットルされる。
 *
 * entry.js（Misskeyメインプロセス）でのみ有効化。
 */

if (process.argv[1] && process.argv[1].includes('entry.js')) {
	// ioredisのロード後にパッチを適用するため、遅延実行
	setTimeout(() => {
		try {
			const Redis = require('ioredis');
			const originalSendCommand = Redis.prototype.sendCommand;

			// コマンドカウンタ（全Redis接続で共有）
			let commandCount = 0;
			// N回に1回だけ遅延を入れる（全コマンドに入れるとジョブ処理が遅くなりすぎる）
			const THROTTLE_EVERY = 20;
			const DELAY_MS = 1;

			Redis.prototype.sendCommand = function(command, stream) {
				const result = originalSendCommand.call(this, command, stream);

				commandCount++;
				if (commandCount % THROTTLE_EVERY === 0) {
					// N回に1回、Promise解決後に1ms遅延を挿入
					return result.then(val => {
						return new Promise(resolve => setTimeout(() => resolve(val), DELAY_MS));
					}, err => {
						return new Promise((_, reject) => setTimeout(() => reject(err), DELAY_MS));
					});
				}

				return result;
			};
		} catch (e) {
			// ioredisが見つからない場合は何もしない
		}
	}, 3000); // NestJS初期化後にパッチ
}
