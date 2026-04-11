/*
 * SPDX-FileCopyrightText: yoruski project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NightPointService } from '@/core/NightPointService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

// 夜間ポイントランキングAPI: 30日間の上位100名を返す
export const meta = {
	requireCredential: false,

	tags: ['night-points'],

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				rank: {
					type: 'number',
					optional: false, nullable: false,
				},
				userId: {
					type: 'string',
					optional: false, nullable: false,
				},
				totalPoints: {
					type: 'number',
					optional: false, nullable: false,
				},
				user: {
					type: 'object',
					optional: false, nullable: false,
					ref: 'UserLite',
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 100 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private nightPointService: NightPointService,
		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps) => {
			const ranking = await this.nightPointService.getRanking(ps.limit);

			return await Promise.all(ranking.map(async (entry) => ({
				rank: entry.rank,
				userId: entry.userId,
				totalPoints: entry.totalPoints,
				user: await this.userEntityService.pack(entry.userId),
			})));
		});
	}
}
