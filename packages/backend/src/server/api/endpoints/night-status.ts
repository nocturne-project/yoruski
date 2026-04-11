/*
 * SPDX-FileCopyrightText: yoruski project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NightTimeService } from '@/core/NightTimeService.js';

// 夜間状態API: 現在の夜間/昼間状態、日没/日の出時刻を返す
export const meta = {
	requireCredential: false,

	tags: ['meta'],

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			isNight: {
				type: 'boolean',
				optional: false, nullable: false,
			},
			sunset: {
				type: 'string',
				optional: false, nullable: false,
				format: 'date-time',
			},
			sunrise: {
				type: 'string',
				optional: false, nullable: false,
				format: 'date-time',
			},
			nextSunset: {
				type: 'string',
				optional: false, nullable: false,
				format: 'date-time',
			},
			nextSunrise: {
				type: 'string',
				optional: false, nullable: false,
				format: 'date-time',
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
		private nightTimeService: NightTimeService,
	) {
		super(meta, paramDef, async () => {
			return this.nightTimeService.getNightStatus();
		});
	}
}
