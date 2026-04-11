/*
 * SPDX-FileCopyrightText: yoruski project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';
import { MiNote } from './Note.js';

// 夜間ポイント: 夜間のpublic投稿に対してポイントを付与（深夜ほど高ポイント）
@Entity('night_point')
export class MiNightPoint {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column(id())
	public userId: MiUser['id'];

	@ManyToOne(type => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public user: MiUser | null;

	@Column(id())
	public noteId: MiNote['id'];

	@ManyToOne(type => MiNote, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public note: MiNote | null;

	// 付��ポイント（sin曲線: 午前2時がピーク）
	@Column('integer')
	public points: number;

	// 投稿日時（ポイント計算の根拠）
	@Index()
	@Column('timestamp with time zone')
	public createdAt: Date;
}
