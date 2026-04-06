/*
 * SPDX-FileCopyrightText: yoruski project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class CreateNightPoint1775100000000 {
	name = 'CreateNightPoint1775100000000';

	async up(queryRunner) {
		await queryRunner.query(`
			CREATE TABLE "night_point" (
				"id" character varying(32) NOT NULL,
				"userId" character varying(32) NOT NULL,
				"noteId" character varying(32) NOT NULL,
				"points" integer NOT NULL,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				CONSTRAINT "PK_night_point" PRIMARY KEY ("id")
			)
		`);
		await queryRunner.query(`CREATE INDEX "IDX_night_point_userId" ON "night_point" ("userId")`);
		await queryRunner.query(`CREATE INDEX "IDX_night_point_createdAt" ON "night_point" ("createdAt")`);
		await queryRunner.query(`ALTER TABLE "night_point" ADD CONSTRAINT "FK_night_point_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
		await queryRunner.query(`ALTER TABLE "night_point" ADD CONSTRAINT "FK_night_point_noteId" FOREIGN KEY ("noteId") REFERENCES "note"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "night_point" DROP CONSTRAINT "FK_night_point_noteId"`);
		await queryRunner.query(`ALTER TABLE "night_point" DROP CONSTRAINT "FK_night_point_userId"`);
		await queryRunner.query(`DROP INDEX "IDX_night_point_createdAt"`);
		await queryRunner.query(`DROP INDEX "IDX_night_point_userId"`);
		await queryRunner.query(`DROP TABLE "night_point"`);
	}
}
