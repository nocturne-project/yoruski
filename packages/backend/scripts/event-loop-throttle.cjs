/**
 * async_hooks無効化パッチ (CJS)
 *
 * NestJS 11.xのInterceptorsConsumerがasync_hooks.AsyncResourceを使用し、
 * 全Promise解決でpopAsyncContextが呼ばれてCPU 97%を消費する問題の対策。
 *
 * AsyncResourceをno-opクラスに置換することで、async_hooksの有効化を防止する。
 * キュー処理にNestJSのインターセプターコンテキスト伝搬は不要なため安全。
 *
 * entry.js（Misskeyメインプロセス）でのみ有効化。
 */

'use strict';

if (process.argv[1] && process.argv[1].includes('entry.js')) {
	const async_hooks = require('async_hooks');

	class NoopAsyncResource {
		constructor() {}
		runInAsyncScope(fn, thisArg, ...args) { return fn.apply(thisArg, args); }
		emitBefore() {}
		emitAfter() {}
		emitDestroy() {}
		asyncId() { return -1; }
		triggerAsyncId() { return -1; }
		static bind(fn) { return fn; }
	}

	async_hooks.AsyncResource = NoopAsyncResource;
}
