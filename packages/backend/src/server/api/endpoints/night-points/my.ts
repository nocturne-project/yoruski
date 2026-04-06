/*
 * SPDX-FileCopyrightText: yoruski project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NightPointService } from '@/core/NightPointService.js';

// 自分の夜間ポイント・順位取得API
export const meta = {
	requireCredential: true,

	tags: ['night-points'],

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			totalPoints: {
				type: 'number',
				optional: false, nullable: false,
			},
			rank: {
				type: 'number',
				optional: false, nullable: false,
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private nightPointService: NightPointService,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.nightPointService.getMyPoints(me.id);
		});
	}
}
