/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// よるすきー: iOS 15.7.9 Safari (Safari 15.6) 対応
// lookbehind assertion `(?<=...)` は Safari 16.4 (2023年3月) 以降でのみサポートされる。
// iOS 15.7.x の Safari (= Safari 15.6) はモジュール評価時に正規表現リテラルを
// パースしようとして SyntaxError を投げ、bootバンドル全体のロードが失敗し白画面になる。
// esbuild/Vite は正規表現の機能変換を行わないため、build.target を下げても解決しない。
// そのため lookbehind を使わず「先行文字を含めて捕捉し replace 関数で部分置換する」
// 形に書き換えてある。lookahead `(?=...)` は Safari 9 から対応しているのでそのまま使ってよい。
// 修正前: const enRegex1 = /(?<=n)a/gi;  → 修正後: const enRegex1 = /n([aA])/g;
// 修正前: const enRegex2 = /(?<=morn)ing/gi; → 修正後: const enRegex2 = /(morn)(ing)/gi;
// 修正前: const enRegex3 = /(?<=every)one/gi; → 修正後: const enRegex3 = /(every)(one)/gi;

// en-US: lookbehind フリーで「n/N の直後の a/A」を捕捉。先行する n/N は変更しない。
const enRegex1 = /([nN])([aA])/g;
// en-US: 「morn」と「ing」を別グループで捕捉し、ing 部分のみ置換する。
const enRegex2 = /(morn)(ing)/gi;
// en-US: 「every」と「one」を別グループで捕捉し、one 部分のみ置換する。
const enRegex3 = /(every)(one)/gi;

// ko-KR: 元から lookahead のみ使用しており lookbehind を含まないのでそのまま維持。
const koRegex1 = /[나-낳]/g;
const koRegex2 = /(다$)|(다(?=\.))|(다(?= ))|(다(?=!))|(다(?=\?))/gm;
const koRegex3 = /(야(?=\?))|(야$)|(야(?= ))/gm;

export function nyaize(text: string): string {
	return text
		// ja-JP
		.replaceAll('な', 'にゃ').replaceAll('ナ', 'ニャ').replaceAll('ﾅ', 'ﾆｬ')
		// en-US
		// 旧: .replace(/(?<=n)a/gi, x => x === 'A' ? 'YA' : 'ya')
		// 新: 「n/N + a/A」 を捕捉し、先行 n/N は残して a/A 部分のみ ya/YA に置換
		.replace(enRegex1, (_, n: string, c: string) => n + (c === 'A' ? 'YA' : 'ya'))
		// 旧: .replace(/(?<=morn)ing/gi, x => x === 'ING' ? 'YAN' : 'yan')
		// 新: 「morn + ing」 を捕捉し、morn は残して ing 部分のみ yan/YAN に置換
		.replace(enRegex2, (_, m1: string, m2: string) => m1 + (m2 === 'ING' ? 'YAN' : 'yan'))
		// 旧: .replace(/(?<=every)one/gi, x => x === 'ONE' ? 'NYAN' : 'nyan')
		// 新: 「every + one」 を捕捉し、every は残して one 部分のみ nyan/NYAN に置換
		.replace(enRegex3, (_, m1: string, m2: string) => m1 + (m2 === 'ONE' ? 'NYAN' : 'nyan'))
		// ko-KR
		.replace(koRegex1, match => !isNaN(match.charCodeAt(0)) ? String.fromCharCode(
			match.charCodeAt(0) + '냐'.charCodeAt(0) - '나'.charCodeAt(0),
		) : match)
		.replace(koRegex2, '다냥')
		.replace(koRegex3, '냥');
}
