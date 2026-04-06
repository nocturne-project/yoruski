/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { YoruqQuestion } from './YoruqQuestion.js';
import { MiAbuseUserReport } from './AbuseUserReport.js';

/**
 * YoruQuestion 通報質問中間テーブル
 * - Misskey標準の通報機能（AbuseUserReport）と質問を紐付ける
 * - 通報の詳細（通報者、理由、日時）はAbuseUserReportテーブルで管理
 */
@Entity('yoruq_reported_question')
@Index(['questionId', 'reportId'], { unique: true })
export class YoruqReportedQuestion {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column({
		...id(),
		comment: '対象質問ID',
	})
	public questionId: YoruqQuestion['id'];

	@ManyToOne(type => YoruqQuestion, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public question: YoruqQuestion | null;

	@Index()
	@Column({
		...id(),
		comment: 'Misskey通報ID',
	})
	public reportId: MiAbuseUserReport['id'];

	@ManyToOne(type => MiAbuseUserReport, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public report: MiAbuseUserReport | null;

	@Column('timestamp with time zone', {
		default: () => 'CURRENT_TIMESTAMP',
		comment: '作成日時',
	})
	public createdAt: Date;

	constructor(data: Partial<YoruqReportedQuestion>) {
		if (data == null) return;

		for (const [k, v] of Object.entries(data)) {
			(this as any)[k] = v;
		}
	}
}
