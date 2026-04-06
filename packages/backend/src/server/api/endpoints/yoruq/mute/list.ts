/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { UsersRepository, YoruqMutedUsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { YoruQuestionService } from '@/core/YoruQuestionService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

/**
 * yoruq/mute/list
 * 質問箱用のミュートリストを取得
 */
export const meta = {
	tags: ['yoruq'],

	requireCredential: true,

	kind: 'read:yoruq',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				id: {
					type: 'string',
					optional: false, nullable: false,
					format: 'id',
				},
				mutedUser: {
					type: 'object',
					optional: false, nullable: false,
				},
				createdAt: {
					type: 'string',
					optional: false, nullable: false,
					format: 'date-time',
				},
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
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.yoruqMutedUsersRepository)
		private yoruqMutedUsersRepository: YoruqMutedUsersRepository,

		private yoruQuestionService: YoruQuestionService,
		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const mutedUsers = await this.yoruQuestionService.getMutedUsers(me.id);

			const result = [];
			for (const mute of mutedUsers) {
				const mutedUser = await this.usersRepository.findOneBy({ id: mute.mutedUserId });
				if (mutedUser) {
					result.push({
						id: mute.id,
						mutedUser: await this.userEntityService.pack(mutedUser, me, { schema: 'UserLite' }),
						createdAt: mute.createdAt.toISOString(),
					});
				}
			}

			return result;
		});
	}
}
