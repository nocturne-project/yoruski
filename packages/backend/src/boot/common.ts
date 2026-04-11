/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { NestFactory } from '@nestjs/core';
import { ChartManagementService } from '@/core/chart/ChartManagementService.js';
import { QueueProcessorService } from '@/queue/QueueProcessorService.js';
import { NestLogger } from '@/NestLogger.js';
import { QueueProcessorModule } from '@/queue/QueueProcessorModule.js';
import { QueueStatsService } from '@/daemons/QueueStatsService.js';
import { ServerStatsService } from '@/daemons/ServerStatsService.js';
import { ServerService } from '@/server/ServerService.js';
import { MainModule } from '@/MainModule.js';

export async function server() {
	const app = await NestFactory.createApplicationContext(MainModule, {
		logger: new NestLogger(),
	});

	const serverService = app.get(ServerService);
	await serverService.launch();

	if (process.env.NODE_ENV !== 'test') {
		app.get(ChartManagementService).start();
		app.get(QueueStatsService).start();
		app.get(ServerStatsService).start();
	}

	return app;
}

export async function jobQueue() {
	const jobQueue = await NestFactory.createApplicationContext(QueueProcessorModule, {
		logger: new NestLogger(),
	});

	// よるすきー: workerプロセスにinspectorを開く（port 9230, デバッグ用）
	if (process.env.MK_ONLY_QUEUE === '1') {
		try {
			const inspector = await import('node:inspector');
			inspector.open(9230, '0.0.0.0', false);
			console.log('[jobQueue] Inspector opened on port 9230');
		} catch (e) {
			console.error('[jobQueue] Failed to open inspector:', e);
		}
	}

	jobQueue.get(QueueProcessorService).start();
	jobQueue.get(ChartManagementService).start();

	return jobQueue;
}
