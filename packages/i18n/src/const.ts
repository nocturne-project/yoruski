/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// よるすきー: 日本語・英語のみサポート
export const languages = [
	'en-US',
	'ja-JP',
] as const;

export const primaries = {
	'en': 'US',
	'ja': 'JP',
} as const satisfies Record<string, string>;
