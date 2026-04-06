/*
 * SPDX-FileCopyrightText: yoruski project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
// CJS→ESMインターオペ: suncalcはCJSモジュールのため、defaultエクスポートを使用
import SunCalcModule from 'suncalc';
const SunCalc = SunCalcModule as typeof import('suncalc');
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';

// 夜間判定サービス: 日没〜日の出をnight timeとし、昼間はpublic投稿をhomeに強制変換
// 緯度・経度はdefault.ymlのnightTime設定から取得。未設定時は東京(35.6762, 139.6503)をデフォルト使用
@Injectable()
export class NightTimeService {
	private latitude: number;
	private longitude: number;
	// 日次キャッシュ: 同日中は再計算しない
	private cachedDate: string | null = null;
	private cachedSunset: Date | null = null;
	private cachedSunrise: Date | null = null;
	private cachedNextSunset: Date | null = null;
	private cachedNextSunrise: Date | null = null;

	constructor(
		@Inject(DI.config)
		private config: Config,
	) {
		this.latitude = this.config.nightTime?.latitude ?? 35.6762;
		this.longitude = this.config.nightTime?.longitude ?? 139.6503;
	}

	// 日没・日の出時刻を計算し、日次キャッシュを更新
	@bindThis
	private updateCache(now: Date): void {
		const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
		if (this.cachedDate === dateKey) return;

		const today = SunCalc.getTimes(now, this.latitude, this.longitude);
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const tomorrowTimes = SunCalc.getTimes(tomorrow, this.latitude, this.longitude);
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayTimes = SunCalc.getTimes(yesterday, this.latitude, this.longitude);

		this.cachedSunset = today.sunset;
		this.cachedSunrise = today.sunrise;

		// 次の日没/日の出を計算（現在時刻に応じて今日or明日の値を使用）
		if (now < today.sunset) {
			this.cachedNextSunset = today.sunset;
		} else {
			this.cachedNextSunset = tomorrowTimes.sunset;
		}

		if (now < today.sunrise) {
			this.cachedNextSunrise = today.sunrise;
		} else {
			this.cachedNextSunrise = tomorrowTimes.sunrise;
		}

		this.cachedDate = dateKey;
	}

	// 現在が夜間（日没〜日の出）かどうか判定
	@bindThis
	public isNightTime(now?: Date): boolean {
		const current = now ?? new Date();
		this.updateCache(current);

		const times = SunCalc.getTimes(current, this.latitude, this.longitude);

		// 日没後 or 日の出前 = 夜間
		return current >= times.sunset || current < times.sunrise;
	}

	// 夜間状態の詳細情報を返す（APIレスポンス用）
	@bindThis
	public getNightStatus(now?: Date): {
		isNight: boolean;
		sunset: string;
		sunrise: string;
		nextSunset: string;
		nextSunrise: string;
	} {
		const current = now ?? new Date();
		this.updateCache(current);

		return {
			isNight: this.isNightTime(current),
			sunset: this.cachedSunset!.toISOString(),
			sunrise: this.cachedSunrise!.toISOString(),
			nextSunset: this.cachedNextSunset!.toISOString(),
			nextSunrise: this.cachedNextSunrise!.toISOString(),
		};
	}
}
