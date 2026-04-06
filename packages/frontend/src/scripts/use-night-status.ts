/*
 * SPDX-FileCopyrightText: yoruski project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { misskeyApi } from '@/utility/misskey-api.js';

// 夜間状態のリアクティブ管理: night-status APIを呼び出し、カウントダウンを提供
export function useNightStatus() {
	const isNight = ref(false);
	const sunset = ref<Date | null>(null);
	const sunrise = ref<Date | null>(null);
	const nextSunset = ref<Date | null>(null);
	const nextSunrise = ref<Date | null>(null);
	const countdown = ref('');
	const loaded = ref(false);

	let countdownTimer: ReturnType<typeof setInterval> | null = null;

	async function fetchStatus() {
		try {
			const res = await misskeyApi('night-status', {});
			isNight.value = res.isNight;
			sunset.value = new Date(res.sunset);
			sunrise.value = new Date(res.sunrise);
			nextSunset.value = new Date(res.nextSunset);
			nextSunrise.value = new Date(res.nextSunrise);
			loaded.value = true;
		} catch (err) {
			console.error('Failed to fetch night status:', err);
		}
	}

	// カウントダウン文字列を更新（HH:MM:SS形式）
	function updateCountdown() {
		const now = Date.now();
		let target: Date | null;

		if (isNight.value) {
			// 夜間: 日の出までカウントダウン
			target = nextSunrise.value;
		} else {
			// 昼間: 日没までカウントダウン
			target = nextSunset.value;
		}

		if (!target) {
			countdown.value = '';
			return;
		}

		const diff = target.getTime() - now;
		if (diff <= 0) {
			// カウントダウン到達: 状態を再取得
			fetchStatus();
			countdown.value = '00:00:00';
			return;
		}

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diff % (1000 * 60)) / 1000);
		countdown.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	onMounted(async () => {
		await fetchStatus();
		updateCountdown();
		countdownTimer = setInterval(updateCountdown, 1000);
	});

	onUnmounted(() => {
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
	});

	return {
		isNight,
		sunset,
		sunrise,
		nextSunset,
		nextSunrise,
		countdown,
		loaded,
		refresh: fetchStatus,
	};
}
