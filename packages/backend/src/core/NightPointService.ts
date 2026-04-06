/*
 * SPDX-FileCopyrightText: yoruski project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import type { NightPointsRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import type { MiNote } from '@/models/Note.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import { IdService } from '@/core/IdService.js';
import { NightTimeService } from '@/core/NightTimeService.js';

// 夜間ポイントサービス: 夜間のpublic投稿にsin曲線でポイント付与
// 午前2時が最大10ポイント、日没/日の出付近が最小1ポイント
// 1時間あたり5投稿まで（スパム対策）
// 30日間ローリング集計でランキング
@Injectable()
export class NightPointService {
	constructor(
		@Inject(DI.nightPointsRepository)
		private nightPointsRepository: NightPointsRepository,

		private idService: IdService,
		private nightTimeService: NightTimeService,
	) {}

	// ポイント計算: sin曲線ベース、午前2時がピーク（10pt）、日没/日の出付近が1pt
	@bindThis
	public calculatePoints(date: Date): number {
		const hour = date.getHours() + date.getMinutes() / 60;
		// 午前2時をピークとするsin曲線: sin((hour - 20) * PI / 12) で20時〜8時をカバー
		// 20時 = 0, 2時 = PI/2(ピーク), 8時 = PI
		const normalizedHour = hour < 12 ? hour + 24 : hour; // 0-12を24-36に変換
		const phase = ((normalizedHour - 20) / 12) * Math.PI;
		const sinValue = Math.sin(phase);
		// 1〜10の範囲にマッピング
		return Math.max(1, Math.round(sinValue * 9 + 1));
	}

	// ポイント付与: 夜間のpublic投稿時に呼び出し
	@bindThis
	public async awardPoints(user: MiUser, note: MiNote): Promise<number | null> {
		const now = new Date();

		// 夜間でなければポイント付与しない
		if (!this.nightTimeService.isNightTime(now)) return null;

		// 1時間あたり5投稿制限チェック
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
		const recentCount = await this.nightPointsRepository.count({
			where: {
				userId: user.id,
				createdAt: MoreThan(oneHourAgo),
			},
		});
		if (recentCount >= 5) return null;

		const points = this.calculatePoints(now);

		await this.nightPointsRepository.insert({
			id: this.idService.gen(),
			userId: user.id,
			noteId: note.id,
			points,
			createdAt: now,
		});

		return points;
	}

	// 30日間ランキング取得（上位100名）
	@bindThis
	public async getRanking(limit = 100): Promise<{ userId: string; totalPoints: number; rank: number }[]> {
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		const results = await this.nightPointsRepository
			.createQueryBuilder('np')
			.select('np."userId"', 'userId')
			.addSelect('SUM(np.points)', 'totalPoints')
			.where('np."createdAt" > :since', { since: thirtyDaysAgo })
			.groupBy('np."userId"')
			.orderBy('"totalPoints"', 'DESC')
			.limit(limit)
			.getRawMany();

		return results.map((r, i) => ({
			userId: r.userId,
			totalPoints: parseInt(r.totalPoints, 10),
			rank: i + 1,
		}));
	}

	// 個人のポイント・順位取得
	@bindThis
	public async getMyPoints(userId: string): Promise<{ totalPoints: number; rank: number }> {
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		const result = await this.nightPointsRepository
			.createQueryBuilder('np')
			.select('SUM(np.points)', 'totalPoints')
			.where('np."userId" = :userId', { userId })
			.andWhere('np."createdAt" > :since', { since: thirtyDaysAgo })
			.getRawOne();

		const totalPoints = parseInt(result?.totalPoints ?? '0', 10);

		// 順位計算
		const rankResult = await this.nightPointsRepository
			.createQueryBuilder('np')
			.select('np."userId"')
			.addSelect('SUM(np.points)', 'tp')
			.where('np."createdAt" > :since', { since: thirtyDaysAgo })
			.groupBy('np."userId"')
			.having('SUM(np.points) > :points', { points: totalPoints })
			.getRawMany();

		return {
			totalPoints,
			rank: rankResult.length + 1,
		};
	}
}
