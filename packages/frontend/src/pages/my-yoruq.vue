<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<script setup lang="ts">
/**
 * my-yoruq.vue
 * /my/yoruq - 自分の受信した質問一覧ページ
 * - More!メニューやナビバーからアクセス可能
 * - 受信した質問の一覧表示
 * - 質問への回答・削除・通報・ミュート機能
 */
import { ref, computed, onMounted } from 'vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { definePage } from '@/page.js';
import MkInfo from '@/components/MkInfo.vue';
import MkButton from '@/components/MkButton.vue';
import YoruqQuestionList from '@/components/yoruq/YoruqQuestionList.vue';
import YoruqAnswerDialog from '@/components/yoruq/YoruqAnswerDialog.vue';
import YoruqReportDialog from '@/components/yoruq/YoruqReportDialog.vue';
import type { YoruqQuestion } from '@/components/yoruq/YoruqQuestionCard.vue';

interface MyYoruqSettings {
	isEnabled: boolean;
	requireUsernameDisclosure: boolean;
	hideSensitiveQuestions: boolean;
	notice: string | null;
	ngWordList: string[];
	e2ePublicKey: string | null;
}

const myYoruqSettings = ref<MyYoruqSettings | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const questionListRef = ref<InstanceType<typeof YoruqQuestionList>>();

const isEnabled = computed(() => myYoruqSettings.value?.isEnabled ?? false);

async function loadMyYoruqSettings() {
	loading.value = true;
	error.value = null;
	try {
		myYoruqSettings.value = await misskeyApi('yoruq/settings/get', {}) as MyYoruqSettings;
	} catch (err: unknown) {
		console.error('[my-yoruq] Failed to load settings:', err);
		error.value = i18n.ts._yoruq?.loadError ?? '設定の読み込みに失敗しました';
	} finally {
		loading.value = false;
	}
}

function goToSettings() {
	// 質問箱設定ページへ遷移
	window.location.href = '/settings/yoruq';
}

async function handleAnswer(question: YoruqQuestion) {
	// 回答不要リクエストの場合は回答フォームを非表示
	if (question.isNoReplyRequested) {
		await os.alert({
			type: 'warning',
			title: i18n.ts._yoruq.noReplyRequested,
			text: i18n.ts._yoruq.noReplyRequestedMessage ?? 'この質問は回答不要としてマークされています。',
		});
		return;
	}

	// 回答フォームをモーダルで表示
	// disposeは一度だけ呼ばれるようにフラグで管理
	let disposed = false;
	const { dispose } = os.popup(YoruqAnswerDialog, {
		question,
	}, {
		answered: (_noteId: string) => {
			// 回答完了後、質問リストをリロード
			questionListRef.value?.reload();
		},
		close: () => {
			// disposeは一度だけ呼ぶ
			if (!disposed) {
				disposed = true;
				dispose();
			}
		},
	});
}

async function handleDelete(question: YoruqQuestion) {
	// YoruqQuestionList内で削除処理とリロードが行われる
	console.log('[my-yoruq] Question deleted:', question.id);
}

async function handleReport(question: YoruqQuestion) {
	// 通報ダイアログをモーダルで表示
	// disposeは一度だけ呼ばれるようにフラグで管理
	let disposed = false;
	const { dispose } = os.popup(YoruqReportDialog, {
		question,
	}, {
		reported: () => {
			os.toast(String(i18n.ts.reported));
		},
		close: () => {
			// disposeは一度だけ呼ぶ
			if (!disposed) {
				disposed = true;
				dispose();
			}
		},
	});
}

async function handleMute(question: YoruqQuestion) {
	if (!question.senderId) {
		console.error('[my-yoruq] Cannot mute: senderId is undefined');
		return;
	}

	// ミュート確認ダイアログ
	const confirmed = await os.confirm({
		type: 'warning',
		title: i18n.ts._yoruq.muteUser,
		text: i18n.ts._yoruq.muteUserConfirm,
	});

	if (confirmed.canceled) return;

	try {
		await misskeyApi('yoruq/mute/create', {
			userId: question.senderId,
		});
		os.toast(i18n.ts._yoruq.userMuted);
		questionListRef.value?.reload();
	} catch (err) {
		console.error('[my-yoruq] Failed to mute user:', err);
	}
}

onMounted(() => {
	loadMyYoruqSettings();
});

definePage(() => ({
	title: i18n.ts._yoruq?.questionBox ?? '質問箱',
	icon: 'ti ti-message-question',
}));
</script>

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<!-- 読み込み中 -->
		<div v-if="loading" class="loading">
			<i class="ti ti-loader-2 spin"></i>
			{{ i18n.ts.loading ?? '読み込み中...' }}
		</div>

		<!-- エラー -->
		<div v-else-if="error" class="error">
			<i class="ti ti-alert-circle"></i>
			{{ error }}
		</div>

		<template v-else>
			<!-- 質問箱が無効の場合 -->
			<div v-if="!isEnabled" class="disabled-notice">
				<MkInfo warn>
					{{ i18n.ts._yoruq?.questionBoxNotEnabled ?? '質問箱が有効になっていません' }}
				</MkInfo>
				<div class="action">
					<MkButton primary @click="goToSettings">
						<i class="ti ti-settings"></i>
						{{ i18n.ts._yoruq?.enableQuestionBox ?? '質問箱を有効にする' }}
					</MkButton>
				</div>
			</div>

			<!-- 質問箱が有効の場合：受信した質問一覧 -->
			<div v-else class="question-list-container">
				<div class="header">
					<h2>{{ i18n.ts._yoruq?.receivedQuestions ?? '受信した質問' }}</h2>
					<MkButton small @click="goToSettings">
						<i class="ti ti-settings"></i>
						{{ i18n.ts.settings }}
					</MkButton>
				</div>

				<YoruqQuestionList
					ref="questionListRef"
					:showActions="true"
					@answer="handleAnswer"
					@delete="handleDelete"
					@report="handleReport"
					@mute="handleMute"
				/>
			</div>
		</template>
	</div>
</PageWithHeader>
</template>

<style scoped lang="scss">
.loading, .error {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 64px;
	color: var(--fgTransparent);

	.spin {
		animation: spin 1s linear infinite;
	}
}

.error {
	color: var(--error);
}

.disabled-notice {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px;

	.action {
		display: flex;
		justify-content: center;
	}
}

.question-list-container {
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid var(--divider);

		h2 {
			margin: 0;
			font-size: 1.2em;
			font-weight: bold;
		}
	}
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
