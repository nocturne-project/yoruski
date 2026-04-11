/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import type { PredictionType } from 'nsfwjs';

// NSFW判定を無効化: TensorFlow/nsfwjsを読み込まず、常にnullを返す（メモリ削減）
@Injectable()
export class AiService {
	constructor(
	) {
	}

	@bindThis
	public async detectSensitive(_source: string | Buffer): Promise<PredictionType[] | null> {
		return null;
	}
}
