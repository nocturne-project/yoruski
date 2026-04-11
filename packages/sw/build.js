// @ts-check

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import locales from 'i18n';
import meta from '../../package.json' with { type: 'json' };

const watch = process.argv[2]?.includes('watch');

const __dirname = fileURLToPath(new URL('.', import.meta.url));

console.log('Starting SW building...');

// よるすきー: Service Worker のビルドターゲットを明示する。
// target 未指定だと esbuild は esnext で出力するため、Safari 15.6 (iOS 15.7.x) で
// パースできない構文（class static blocks 等）が混入する恐れがある。
// フロントエンド本体 (vite.config.ts) と同じ safari15 / chrome116 / firefox116 に揃える。
/** @type {esbuild.BuildOptions} */
const buildOptions = {
	absWorkingDir: __dirname,
	bundle: true,
	target: ['safari15', 'chrome116', 'firefox116'],
	define: {
		_DEV_: JSON.stringify(process.env.NODE_ENV !== 'production'),
		_ENV_: JSON.stringify(process.env.NODE_ENV ?? ''), // `NODE_ENV`が`undefined`なとき`JSON.stringify`が`undefined`を返してエラーになってしまうので`??`を使っている
		_LANGS_: JSON.stringify(Object.entries(locales).map(([k, v]) => [k, v._lang_])),
		_PERF_PREFIX_: JSON.stringify('Misskey:'),
		_VERSION_: JSON.stringify(meta.version),
	},
	entryPoints: [`${__dirname}/src/sw.ts`],
	format: 'esm',
	loader: {
		'.ts': 'ts',
	},
	minify: process.env.NODE_ENV === 'production',
	outbase: `${__dirname}/src`,
	outdir: `${__dirname}/../../built/_sw_dist_`,
	treeShaking: true,
	tsconfig: `${__dirname}/tsconfig.json`,
};

(async () => {
	if (!watch) {
		await esbuild.build(buildOptions);
		console.log('done');
	} else {
		const context = await esbuild.context(buildOptions);
		await context.watch();
		console.log('watching...');
	}
})();
