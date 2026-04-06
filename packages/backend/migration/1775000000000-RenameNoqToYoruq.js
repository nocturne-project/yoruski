/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * NoQ → YoruQ テーブル・カラム改名マイグレーション
 * - noq_question → yoruq_question
 * - noq_user_setting → yoruq_user_setting
 * - noq_muted_user → yoruq_muted_user
 * - noq_reported_question → yoruq_reported_question
 * - meta.noqBotAccountId → meta.yoruqBotAccountId
 */
export class RenameNoqToYoruq1775000000000 {
	name = 'RenameNoqToYoruq1775000000000';

	async up(queryRunner) {
		// テーブルリネーム
		await queryRunner.query(`ALTER TABLE "noq_question" RENAME TO "yoruq_question"`);
		await queryRunner.query(`ALTER TABLE "noq_user_setting" RENAME TO "yoruq_user_setting"`);
		await queryRunner.query(`ALTER TABLE "noq_muted_user" RENAME TO "yoruq_muted_user"`);
		await queryRunner.query(`ALTER TABLE "noq_reported_question" RENAME TO "yoruq_reported_question"`);

		// metaテーブルのカラムリネーム
		await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "noqBotAccountId" TO "yoruqBotAccountId"`);

		// インデックスのリネーム（TypeORMが自動生成したインデックス名を更新）
		// noq_question のインデックス
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_noq_question_recipientId_status" RENAME TO "IDX_yoruq_question_recipientId_status"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_noq_question_senderId" RENAME TO "IDX_yoruq_question_senderId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_noq_question_createdAt" RENAME TO "IDX_yoruq_question_createdAt"`);

		// noq_muted_user のインデックス
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_noq_muted_user_userId_mutedUserId" RENAME TO "IDX_yoruq_muted_user_userId_mutedUserId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_noq_muted_user_userId" RENAME TO "IDX_yoruq_muted_user_userId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_noq_muted_user_mutedUserId" RENAME TO "IDX_yoruq_muted_user_mutedUserId"`);

		// noq_reported_question のインデックス
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_noq_reported_question_questionId_reportId" RENAME TO "IDX_yoruq_reported_question_questionId_reportId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_noq_reported_question_questionId" RENAME TO "IDX_yoruq_reported_question_questionId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_noq_reported_question_reportId" RENAME TO "IDX_yoruq_reported_question_reportId"`);
	}

	async down(queryRunner) {
		// インデックスのリネーム（元に戻す）
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_yoruq_reported_question_reportId" RENAME TO "IDX_noq_reported_question_reportId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_yoruq_reported_question_questionId" RENAME TO "IDX_noq_reported_question_questionId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_yoruq_reported_question_questionId_reportId" RENAME TO "IDX_noq_reported_question_questionId_reportId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_yoruq_muted_user_mutedUserId" RENAME TO "IDX_noq_muted_user_mutedUserId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_yoruq_muted_user_userId" RENAME TO "IDX_noq_muted_user_userId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_yoruq_muted_user_userId_mutedUserId" RENAME TO "IDX_noq_muted_user_userId_mutedUserId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_yoruq_question_createdAt" RENAME TO "IDX_noq_question_createdAt"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_yoruq_question_senderId" RENAME TO "IDX_noq_question_senderId"`);
		await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_yoruq_question_recipientId_status" RENAME TO "IDX_noq_question_recipientId_status"`);

		// metaテーブルのカラムリネーム（元に戻す）
		await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "yoruqBotAccountId" TO "noqBotAccountId"`);

		// テーブルリネーム（元に戻す）
		await queryRunner.query(`ALTER TABLE "yoruq_reported_question" RENAME TO "noq_reported_question"`);
		await queryRunner.query(`ALTER TABLE "yoruq_muted_user" RENAME TO "noq_muted_user"`);
		await queryRunner.query(`ALTER TABLE "yoruq_user_setting" RENAME TO "noq_user_setting"`);
		await queryRunner.query(`ALTER TABLE "yoruq_question" RENAME TO "noq_question"`);
	}
}
