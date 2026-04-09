/**
 * Promise.prototype.then スロットル
 *
 * BullMQ/ioredisのPromiseスピンを防止するため、
 * Promise.prototype.thenをパッチし、N回に1回setTimeoutでyieldを挿入する。
 * これによりprocessTicksAndRejectionsの高速ループが中断される。
 *
 * entry.js（Misskeyメインプロセス）でのみ有効化。
 */

if (process.argv[1] && process.argv[1].includes('entry.js')) {
	const originalThen = Promise.prototype.then;
	let callCount = 0;
	const THROTTLE_EVERY = 1000; // 1000回に1回yield

	Promise.prototype.then = function(onFulfilled, onRejected) {
		callCount++;
		if (callCount % THROTTLE_EVERY === 0) {
			// N回に1回、解決前にsetTimeoutでイベントループにyield
			return originalThen.call(this, (val) => {
				return new Promise(resolve => {
					setTimeout(() => resolve(onFulfilled ? onFulfilled(val) : val), 0);
				});
			}, onRejected);
		}
		return originalThen.call(this, onFulfilled, onRejected);
	};
}
