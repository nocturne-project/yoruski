/**
 * async_hooks無効化パッチ (ESM版)
 *
 * NestJS 11.xのInterceptorsConsumerがasync_hooks.AsyncResourceを使用し、
 * 全Promise解決でpopAsyncContextが呼ばれてCPU 97%を消費する問題の対策。
 *
 * AsyncResourceをno-opクラスに置換することで、async_hooksの有効化を防止する。
 * キュー処理にNestJSのインターセプターコンテキスト伝搬は不要なため安全。
 *
 * workerコンテナ（MK_ONLY_QUEUE=1）でのみ有効化。
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

if (process.env.MK_ONLY_QUEUE === '1') {
	const async_hooks = require('async_hooks');

	class NoopAsyncResource {
		constructor() {}
		runInAsyncScope(fn, thisArg, ...args) { return fn.apply(thisArg, args); }
		emitBefore() {}
		emitAfter() {}
		emitDestroy() { return this; }
		asyncId() { return -1; }
		triggerAsyncId() { return -1; }
		static bind(fn) { return fn; }
	}

	class NoopAsyncLocalStorage {
		disable() {}
		getStore() { return undefined; }
		run(store, fn, ...args) { return fn(...args); }
		exit(fn, ...args) { return fn(...args); }
		enterWith() {}
	}

	async_hooks.AsyncResource = NoopAsyncResource;
	async_hooks.AsyncLocalStorage = NoopAsyncLocalStorage;
	async_hooks.createHook = () => ({ enable() {}, disable() {} });
	async_hooks.executionAsyncId = () => -1;
	async_hooks.triggerAsyncId = () => -1;
	async_hooks.executionAsyncResource = () => ({});

	console.log('[event-loop-throttle] async_hooks disabled for queue worker');
}
