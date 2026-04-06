/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { YoruQuestionService } from '@/core/YoruQuestionService.js';
import { ApiError } from '@/server/api/error.js';
import { GetterService } from '@/server/api/GetterService.js';

/**
 * yoruq/mute/create
 * 質問箱用のミュートを追加
 */
export const meta = {
	tags: ['yoruq'],

	requireCredential: true,

	kind: 'write:yoruq',

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: 'c3d2c6f1-0001-4001-8001-000000000001',
		},
		cannotMuteSelf: {
			message: 'Cannot mute yourself.',
			code: 'CANNOT_MUTE_SELF',
			id: 'c3d2c6f1-0001-4001-8001-000000000002',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		userId: { type: 'string', format: 'misskey:id' },
	},
	required: ['userId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private yoruQuestionService: YoruQuestionService,
		private getterService: GetterService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// ユーザーの存在確認
			const targetUser = await this.getterService.getUser(ps.userId).catch(() => null);
			if (targetUser == null) {
				throw new ApiError(meta.errors.noSuchUser);
			}

			try {
				await this.yoruQuestionService.muteUser(me.id, ps.userId);
			} catch (err) {
				if (err instanceof Error) {
					if (err.message === 'CANNOT_MUTE_SELF') {
						throw new ApiError(meta.errors.cannotMuteSelf);
					}
				}
				throw err;
			}
		});
	}
}
