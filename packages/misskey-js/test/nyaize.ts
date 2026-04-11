import { describe, test, expect } from 'vitest';
import { nyaize } from '../src/nyaize.js';

// よるすきー: nyaize の回帰テスト。
// iOS 15.7.9 Safari (Safari 15.6) 対応のため、lookbehind 正規表現 (?<=...) を排除した。
// ここでは「修正前」と「修正後」で挙動が一致することを保証する。

describe('nyaize', () => {
	describe('ja-JP', () => {
		test('hiragana な → にゃ', () => {
			expect(nyaize('な')).toBe('にゃ');
			expect(nyaize('かなた')).toBe('かにゃた');
			expect(nyaize('ななな')).toBe('にゃにゃにゃ');
		});

		test('katakana ナ → ニャ', () => {
			expect(nyaize('ナ')).toBe('ニャ');
			expect(nyaize('カナタ')).toBe('カニャタ');
		});

		test('halfwidth katakana ﾅ → ﾆｬ', () => {
			expect(nyaize('ﾅ')).toBe('ﾆｬ');
		});
	});

	describe('en-US', () => {
		test('lowercase n+a → n+ya (banana → banyanya)', () => {
			expect(nyaize('na')).toBe('nya');
			expect(nyaize('banana')).toBe('banyanya');
		});

		test('uppercase N+A → N+YA', () => {
			expect(nyaize('NA')).toBe('NYA');
		});

		test('mixed case Na → Nya / nA → nYA', () => {
			expect(nyaize('Na')).toBe('Nya');
			expect(nyaize('nA')).toBe('nYA');
		});

		test('morn+ing → morn+yan (the trailing g is dropped, original behavior)', () => {
			expect(nyaize('morning')).toBe('mornyan');
			expect(nyaize('Morning')).toBe('Mornyan');
			expect(nyaize('MORNING')).toBe('MORNYAN');
		});

		test('every+one → every+nyan', () => {
			expect(nyaize('everyone')).toBe('everynyan');
			expect(nyaize('Everyone')).toBe('Everynyan');
			expect(nyaize('EVERYONE')).toBe('EVERYNYAN');
		});

		test('does not nya-ize a not preceded by n', () => {
			// "ana" は a の前が a なので変換されない（最初の a）が、二文字目の na は変換される
			expect(nyaize('ana')).toBe('anya');
			// "ba" は変換されない
			expect(nyaize('ba')).toBe('ba');
		});

		test('does not nya-ize ing not preceded by morn', () => {
			expect(nyaize('singing')).toBe('singing');
		});

		test('does not nya-ize one not preceded by every', () => {
			expect(nyaize('phone')).toBe('phone');
			expect(nyaize('alone')).toBe('alone');
		});
	});

	describe('ko-KR', () => {
		test('나 → 냐 (range substitution)', () => {
			expect(nyaize('나')).toBe('냐');
			expect(nyaize('낮')).toBe('냦');
		});

		test('다 at end of line → 다냥', () => {
			expect(nyaize('안녕하다')).toBe('안녕하다냥');
		});

		test('다 followed by punctuation → 다냥', () => {
			expect(nyaize('안녕하다.')).toBe('안녕하다냥.');
			expect(nyaize('안녕하다!')).toBe('안녕하다냥!');
			expect(nyaize('안녕하다?')).toBe('안녕하다냥?');
			expect(nyaize('안녕하다 친구')).toBe('안녕하다냥 친구');
		});

		test('야 → 냥 (replaced, original behavior; the 야 itself is dropped)', () => {
			expect(nyaize('이거야')).toBe('이거냥');
			expect(nyaize('이거야?')).toBe('이거냥?');
			expect(nyaize('이거야 친구')).toBe('이거냥 친구');
		});

		test('does not append 냥 to 다 or 야 in middle of sentence', () => {
			// 다 followed by other Hangul (not punctuation/space/end) should not be transformed
			expect(nyaize('다른')).toBe('다른');
			expect(nyaize('야구')).toBe('야구');
		});
	});

	describe('mixed', () => {
		test('multi-language string', () => {
			expect(nyaize('ハロー banana morning 안녕하다')).toBe('ハロー banyanya mornyan 안녕하다냥');
		});
	});
});
