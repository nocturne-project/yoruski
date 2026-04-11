/**
 * async context tracking 無効化パッチ (CJS)
 *
 * Node.js 22では全てのPromise解決時にC++レベルでpopAsyncContextが呼ばれる。
 * これはasync_hook_fields[kStackLength]が1以上の時に有効化される。
 *
 * このパッチはprocess.binding('async_wrap')経由でasync_hook_fieldsに直接アクセスし、
 * kStackLength=0にすることでpopAsyncContextの呼び出し自体を抑止する。
 *
 * これにより、Promiseの解決コストが大幅に下がり、CPUスピンが解消される。
 *
 * workerコンテナ（MK_ONLY_QUEUE=1）でのみ使用。
 * キュー処理にasync contextトラッキングは不要なため安全。
 * webコンテナでは--requireされないため影響なし。
 */

'use strict';

if (process.env.MK_ONLY_QUEUE === '1') {
	// === 核心: async context tracking をC++レベルで無効化 ===
	// Node.jsの内部binding経由でasync_hook_fieldsを直接操作
	// kStackLength (index 6) = 0 にすると、popAsyncContext/pushAsyncContextが
	// Promise解決時に呼ばれなくなる
	try {
		const binding = process.binding('async_wrap');
		binding.async_hook_fields[6] = 0;  // kStackLength
		binding.async_hook_fields[7] = 0;  // kDefaultTriggerAsyncId
		console.log('[event-loop-throttle] async context tracking disabled via async_hook_fields');
	} catch (e) {
		console.error('[event-loop-throttle] Failed to disable async context tracking:', e.message);
	}

	// === 補助: async_hooksモジュールをフェイクに差し替え ===
	// NestJS等がasync_hooks APIを使おうとした場合のフォールバック
	const Module = require('module');
	const fakeAsyncHooks = {
		createHook: () => ({ enable() {}, disable() {} }),
		executionAsyncId: () => -1,
		triggerAsyncId: () => -1,
		executionAsyncResource: () => ({}),
		AsyncResource: class NoopAsyncResource {
			constructor() {}
			runInAsyncScope(fn, thisArg, ...args) { return fn.apply(thisArg, args); }
			emitBefore() {}
			emitAfter() {}
			emitDestroy() { return this; }
			asyncId() { return -1; }
			triggerAsyncId() { return -1; }
			static bind(fn) { return fn; }
		},
		AsyncLocalStorage: class NoopAsyncLocalStorage {
			disable() {}
			getStore() { return undefined; }
			run(store, fn, ...args) { return fn(...args); }
			exit(fn, ...args) { return fn(...args); }
			enterWith() {}
		},
	};

	const originalRequire = Module.prototype.require;
	Module.prototype.require = function(id) {
		if (id === 'async_hooks' || id === 'node:async_hooks') {
			return fakeAsyncHooks;
		}
		return originalRequire.apply(this, arguments);
	};

	try {
		const realAsyncHooks = originalRequire.call(module, 'async_hooks');
		Object.keys(fakeAsyncHooks).forEach(key => {
			realAsyncHooks[key] = fakeAsyncHooks[key];
		});
	} catch (e) {
		// 無視
	}
}
