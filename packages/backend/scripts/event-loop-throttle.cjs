/**
 * async_hooksモジュール全体をフェイクに差し替え (CJS)
 *
 * NestJS 11.xのInterceptorsConsumerがrequire('async_hooks')した時に
 * フェイクモジュールを返すことで、async_hooksの有効化自体を防止する。
 *
 * entry.js（Misskeyメインプロセス）でのみ有効化。
 */

'use strict';

if (process.argv[1] && process.argv[1].includes('entry.js')) {
	const Module = require('module');
	const originalResolveFilename = Module._resolveFilename;

	// async_hooksのフェイクモジュール
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

	// require('async_hooks')をフックしてフェイクを返す
	// ただしNode.js内部のモジュール解決は迂回できないため、Module._cacheに直接注入
	const originalRequire = Module.prototype.require;
	Module.prototype.require = function(id) {
		if (id === 'async_hooks' || id === 'node:async_hooks') {
			return fakeAsyncHooks;
		}
		return originalRequire.apply(this, arguments);
	};
}
