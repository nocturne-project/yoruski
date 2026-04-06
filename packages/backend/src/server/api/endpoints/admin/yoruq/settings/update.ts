/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { MetaService } from '@/core/MetaService.js';
import type { UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../../error.js';

/**
 * admin/yoruq/settings/update
 * Noqestion（匿名質問箱）の管理者設定を更新
 */
export const meta = {
	tags: ['admin', 'yoruq'],

	requireCredential: true,
	requireAdmin: true,
	secure: true,
	kind: 'write:admin:yoruq',

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: 'c8f3f8c0-1a1f-4c0d-9b8e-f75c1a1f4c0d',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			success: {
				type: 'boolean',
				optional: false, nullable: false,
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		yoruqBotAccountUsername: { type: 'string', nullable: true },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private metaService: MetaService,
	) {
		super(meta, paramDef, async (ps, me) => {
			let yoruqBotAccountId: string | null = null;

			if (ps.yoruqBotAccountUsername !== undefined) {
				if (ps.yoruqBotAccountUsername === null || ps.yoruqBotAccountUsername === '') {
					yoruqBotAccountId = null;
				} else {
					// usernameからユーザーを検索（ローカルユーザーのみ）
					const botAccount = await this.usersRepository.findOneBy({
						usernameLower: ps.yoruqBotAccountUsername.toLowerCase(),
						host: IsNull(),
					});

					if (botAccount == null) {
						throw new ApiError(meta.errors.noSuchUser);
					}

					yoruqBotAccountId = botAccount.id;
				}

				await this.metaService.update({
					yoruqBotAccountId,
				});
			}

			return {
				success: true,
			};
		});
	}
}
