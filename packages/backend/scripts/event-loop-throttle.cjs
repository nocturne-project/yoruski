/**
 * NestJS InterceptorsConsumer パッチ (CJS)
 *
 * NestJS 11.xのInterceptorsConsumerがasync_hooks.AsyncResourceを使用し、
 * 全Promise解決でpopAsyncContextが呼ばれてCPU 97%を消費する問題の対策。
 *
 * Module._resolveFilenameをフックし、NestJSが`async_hooks`をrequireした時に
 * AsyncResource.bindをno-opに差し替えたモジュールを返す。
 *
 * entry.js（Misskeyメインプロセス）でのみ有効化。
 */

'use strict';

if (process.argv[1] && process.argv[1].includes('entry.js')) {
	const Module = require('module');
	const originalRequire = Module.prototype.require;

	Module.prototype.require = function(id) {
		const result = originalRequire.apply(this, arguments);

		// async_hooksモジュールが読み込まれたら、AsyncResource.bindをno-opに
		if (id === 'async_hooks') {
			if (result.AsyncResource && result.AsyncResource.bind !== noopBind) {
				result.AsyncResource.bind = noopBind;
			}
		}

		return result;
	};

	function noopBind(fn) {
		return fn;
	}
}
