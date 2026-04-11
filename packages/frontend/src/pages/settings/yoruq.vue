<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
	<FormSection>
		<template #label>{{ i18n.ts._yoruq.questionBox }}</template>
		<YoruqSettings />
	</FormSection>

	<FormSection>
		<template #label>{{ i18n.ts._yoruq.mutedUsers }}</template>
		<YoruqMutedUsers />
	</FormSection>
</div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
import FormSection from '@/components/form/section.vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

const YoruqSettings = defineAsyncComponent(() => import('@/components/yoruq/YoruqSettings.vue'));
const YoruqMutedUsers = defineAsyncComponent(() => import('@/components/yoruq/YoruqMutedUsers.vue'));

definePage(() => ({
	title: i18n.ts._yoruq.settings,
	icon: 'ti ti-message-question',
}));
</script>
