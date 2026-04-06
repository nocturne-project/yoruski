<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="src" :actions="headerActions" :tabs="$i ? headerTabs : headerTabsWhenNotLogin" :swipable="true" :displayMyAvatar="true" :canOmitTitle="true">
	<!-- 夜間限定ローカルTL: カウントダウン（タブ直下に密着表示） -->
	<div v-if="src === 'local' && nightStatus.loaded.value" :class="[nightStatus.isNight.value ? $style.nightBarNight : $style.nightBarDay]">
		<i :class="nightStatus.isNight.value ? 'ti ti-moon-stars' : 'ti ti-sun'"></i>
		<span v-if="nightStatus.isNight.value">{{ i18n.ts._yoruski?.sunriseCountdown ?? '日の出まで' }} {{ nightStatus.countdown.value }}</span>
		<span v-else>{{ i18n.ts._yoruski?.sunsetCountdown ?? '日没まで' }} {{ nightStatus.countdown.value }}</span>
	</div>
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<MkTip v-if="isBasicTimeline(src)" :k="`tl.${src}`" style="margin-bottom: var(--MI-margin);">
			{{ i18n.ts._timelineDescription[src] }}
		</MkTip>
		<MkPostForm v-if="prefer.r.showFixedPostForm.value" :class="$style.postForm" class="_panel" fixed style="margin-bottom: var(--MI-margin);"/>
		<MkStreamingNotesTimeline
			ref="tlComponent"
			:key="src + withRenotes + withReplies + onlyFiles + withSensitive"
			:class="$style.tl"
			:src="(src.split(':')[0] as (BasicTimelineType | 'list' | 'role'))"
			:list="src.split(':')[1]"
			:role="src.split(':')[0] === 'role' ? src.split(':')[1] : undefined"
			:withRenotes="withRenotes"
			:withReplies="withReplies"
			:withSensitive="withSensitive"
			:onlyFiles="onlyFiles"
			:sound="true"
		/>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, watch, provide, useTemplateRef, ref, onMounted, onActivated } from 'vue';
import { useRouter } from '@/router.js';
import type { Tab } from '@/components/global/MkPageHeader.tabs.vue';
import type { MenuItem } from '@/types/menu.js';
import type { BasicTimelineType } from '@/timelines.js';
import type { PageHeaderItem } from '@/types/page-header.js';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkPostForm from '@/components/MkPostForm.vue';
import { useNightStatus } from '@/scripts/use-night-status.js';
import * as os from '@/os.js';
import { store } from '@/store.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { definePage } from '@/page.js';
import { userListsCache, favoritedChannelsCache } from '@/cache.js';
import { deviceKind } from '@/utility/device-kind.js';
import { deepMerge } from '@/utility/merge.js';
import { miLocalStorage } from '@/local-storage.js';
import { availableBasicTimelines, hasWithReplies, isAvailableBasicTimeline, isBasicTimeline, basicTimelineIconClass } from '@/timelines.js';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const tlComponent = useTemplateRef('tlComponent');
const router = useRouter();
const nightStatus = useNightStatus();

const props = defineProps<{
	roleId?: string;
	listId?: string;
}>();

type TimelinePageSrc = BasicTimelineType | `list:${string}` | `role:${string}`;

const srcWhenNotSignin = ref<'local' | 'global'>(isAvailableBasicTimeline('local') ? 'local' : 'global');
const src = computed<TimelinePageSrc>({
	get: (): TimelinePageSrc => {
		// URLパラメータから優先的に取得
		if (props.roleId) return `role:${props.roleId}` as TimelinePageSrc;
		if (props.listId) return `list:${props.listId}` as TimelinePageSrc;

		// ストアから取得
		return $i ? (store.r.tl.value.src as TimelinePageSrc) : srcWhenNotSignin.value;
	},
	set: (x: TimelinePageSrc) => saveSrc(x),
});
const withRenotes = computed<boolean>({
	get: () => store.r.tl.value.filter.withRenotes,
	set: (x) => saveTlFilter('withRenotes', x),
});

// computed内での無限ループを防ぐためのフラグ
const localSocialTLFilterSwitchStore = ref<'withReplies' | 'onlyFiles' | false>(
	store.r.tl.value.filter.withReplies ? 'withReplies' :
	store.r.tl.value.filter.onlyFiles ? 'onlyFiles' :
	false,
);

const withReplies = computed<boolean>({
	get: () => {
		if (!$i) return false;
		if (['local', 'social'].includes(src.value) && localSocialTLFilterSwitchStore.value === 'onlyFiles') {
			return false;
		} else {
			return store.r.tl.value.filter.withReplies;
		}
	},
	set: (x) => saveTlFilter('withReplies', x),
});
const onlyFiles = computed<boolean>({
	get: () => {
		if (['local', 'social'].includes(src.value) && localSocialTLFilterSwitchStore.value === 'withReplies') {
			return false;
		} else {
			return store.r.tl.value.filter.onlyFiles;
		}
	},
	set: (x) => saveTlFilter('onlyFiles', x),
});

watch([withReplies, onlyFiles], ([withRepliesTo, onlyFilesTo]) => {
	if (withRepliesTo) {
		localSocialTLFilterSwitchStore.value = 'withReplies';
	} else if (onlyFilesTo) {
		localSocialTLFilterSwitchStore.value = 'onlyFiles';
	} else {
		localSocialTLFilterSwitchStore.value = false;
	}
});

const withSensitive = computed<boolean>({
	get: () => store.r.tl.value.filter.withSensitive,
	set: (x) => saveTlFilter('withSensitive', x),
});

const showFixedPostForm = prefer.model('showFixedPostForm');

async function chooseList(ev: PointerEvent): Promise<void> {
	const lists = await userListsCache.fetch();
	const items: (MenuItem | undefined)[] = [
		...lists.map(list => ({
			type: 'link' as const,
			text: list.name,
			to: `/timeline/list/${list.id}`,
		})),
		(lists.length === 0 ? undefined : { type: 'divider' }),
		{
			type: 'link' as const,
			icon: 'ti ti-plus',
			text: i18n.ts.createNew,
			to: '/my/lists',
		},
	];
	os.popupMenu(items.filter(i => i != null), ev.currentTarget ?? ev.target);
}

async function chooseChannel(ev: PointerEvent): Promise<void> {
	const channels = await favoritedChannelsCache.fetch();
	const items: (MenuItem | undefined)[] = [
		...channels.map(channel => {
			const lastReadedAt = miLocalStorage.getItemAsJson(`channelLastReadedAt:${channel.id}`) ?? null;
			const hasUnreadNote = (lastReadedAt && channel.lastNotedAt) ? Date.parse(channel.lastNotedAt) > lastReadedAt : !!(!lastReadedAt && channel.lastNotedAt);

			return {
				type: 'link' as const,
				text: channel.name,
				indicate: hasUnreadNote,
				to: `/channels/${channel.id}`,
			};
		}),
		(channels.length === 0 ? undefined : { type: 'divider' }),
		{
			type: 'link',
			icon: 'ti ti-plus',
			text: i18n.ts.createNew,
			to: '/channels/new',
		},
	];
	os.popupMenu(items.filter(i => i != null), ev.currentTarget ?? ev.target);
}

async function chooseRole(ev: MouseEvent): Promise<void> {
	const roles = await misskeyApi('roles/list', { canPublicNote: true });
	const items: (MenuItem | undefined)[] = [
		...roles
			.filter(x => x.isExplorable)
			.sort((a, b) => b.usersCount - a.usersCount)
			.map(role => ({
				type: 'link' as const,
				text: role.name,
				to: `/timeline/role/${role.id}`,
			})),
		(roles.filter(x => x.isExplorable).length === 0 ? undefined : { type: 'divider' }),
		{
			type: 'link' as const,
			icon: 'ti ti-badges',
			text: i18n.ts.roles,
			to: '/roles',
		},
	];
	os.popupMenu(items.filter(i => i != null), ev.currentTarget ?? ev.target);
}

function saveSrc(newSrc: TimelinePageSrc): void {
	// URLパラメータ経由でも、ロールから別のタイムラインへ切り替える場合は許可
	if (props.roleId && newSrc === `role:${props.roleId}`) return;
	if (props.listId && newSrc === `list:${props.listId}`) return;
	
	// ナビゲーションでURLを更新
	if (newSrc.startsWith('role:')) {
		// ロールタイムラインへ遷移
		router.push(`/timeline/role/${newSrc.split(':')[1]}` as '/timeline');
	} else {
		// 基本タイムラインへ遷移
		router.push('/timeline');

		// ストアに状態を保存
		const out = deepMerge({ src: newSrc as typeof store.s.tl.src }, store.s.tl);

		if (newSrc.startsWith('userList:')) {
			const id = newSrc.substring('userList:'.length);
			out.userList = prefer.r.pinnedUserLists.value.find(l => l.id === id) ?? null;
		}

		store.set('tl', out);
		if (['local', 'global'].includes(newSrc)) {
			srcWhenNotSignin.value = newSrc as 'local' | 'global';
		}
	}
}

function saveTlFilter(key: keyof typeof store.s.tl.filter, newValue: boolean) {
	if (key !== 'withReplies' || $i) {
		const out = deepMerge({ filter: { [key]: newValue } }, store.s.tl);
		store.set('tl', out);
	}
}

function switchTlIfNeeded() {
	if (isBasicTimeline(src.value) && !isAvailableBasicTimeline(src.value)) {
		src.value = availableBasicTimelines()[0] as TimelinePageSrc;
	}
}

onMounted(() => {
	switchTlIfNeeded();
});
onActivated(() => {
	switchTlIfNeeded();
});

const headerActions = computed<PageHeaderItem[]>(() => {
	const items: PageHeaderItem[] = [{
		icon: 'ti ti-dots',
		text: i18n.ts.options,
		handler: (ev) => {
			const menuItems: MenuItem[] = [];

			menuItems.push({
				type: 'switch',
				icon: 'ti ti-repeat',
				text: i18n.ts.showRenotes,
				ref: withRenotes,
			});

			if (isBasicTimeline(src.value) && hasWithReplies(src.value)) {
				menuItems.push({
					type: 'switch',
					icon: 'ti ti-messages',
					text: i18n.ts.showRepliesToOthersInTimeline,
					ref: withReplies,
					disabled: onlyFiles,
				});
			}

			menuItems.push({
				type: 'switch',
				icon: 'ti ti-eye-exclamation',
				text: i18n.ts.withSensitive,
				ref: withSensitive,
			}, {
				type: 'switch',
				icon: 'ti ti-photo',
				text: i18n.ts.fileAttachedOnly,
				ref: onlyFiles,
				disabled: isBasicTimeline(src.value) && hasWithReplies(src.value) ? withReplies : false,
			}, {
				type: 'divider',
			}, {
				type: 'switch',
				text: i18n.ts.showFixedPostForm,
				ref: showFixedPostForm,
			});

			os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
		},
	}];

	if (deviceKind === 'desktop') {
		items.unshift({
			icon: 'ti ti-refresh',
			text: i18n.ts.reload,
			handler: () => {
				tlComponent.value?.reloadTimeline();
			},
		});
	}

	return items;
});

const headerTabs = computed(() => [...(prefer.r.pinnedUserLists.value.map(l => ({
	key: 'list:' + l.id,
	title: l.name,
	icon: 'ti ti-star',
	iconOnly: true,
}))), ...availableBasicTimelines().map(tl => ({
	key: tl,
	title: i18n.ts._timelines[tl],
	icon: basicTimelineIconClass(tl),
	iconOnly: true,
})), {
	icon: 'ti ti-list',
	title: i18n.ts.lists,
	iconOnly: true,
	onClick: chooseList,
}, {
	icon: 'ti ti-device-tv',
	title: i18n.ts.channel,
	iconOnly: true,
	onClick: chooseChannel,
}, {
	icon: 'ti ti-badges',
	title: i18n.ts.role,
	iconOnly: true,
	onClick: chooseRole,
}] as Tab[]);

const headerTabsWhenNotLogin = computed(() => [...availableBasicTimelines().map(tl => ({
	key: tl,
	title: i18n.ts._timelines[tl],
	icon: basicTimelineIconClass(tl),
	iconOnly: true,
}))] as Tab[]);

definePage(() => ({
	title: i18n.ts.timeline,
	icon: isBasicTimeline(src.value) ? basicTimelineIconClass(src.value) : 'ti ti-home',
}));
</script>

<style lang="scss" module>
.new {
	position: sticky;
	top: calc(var(--MI-stickyTop, 0px) + 16px);
	z-index: 1000;
	width: 100%;
	margin: calc(-0.675em - 8px) 0;

	&:first-child {
		margin-top: calc(-0.675em - 8px - var(--MI-margin));
	}
}

.newButton {
	display: block;
	margin: var(--MI-margin) auto 0 auto;
	padding: 8px 16px;
	border-radius: 32px;
}

.postForm {
	border-radius: var(--MI-radius);
}

.tl {
	background: var(--MI_THEME-bg);
	border-radius: var(--MI-radius);
	overflow: clip;
}

/* 夜間カウントダウン: ステータスバー風コンパクト表示 */
.nightBarNight,
.nightBarDay {
	text-align: center;
	padding: 4px 12px;
	font-size: 0.8em;
	opacity: 0.85;

	i {
		margin-right: 6px;
		font-size: 0.9em;
	}
}

.nightBarNight {
	background: var(--MI_THEME-infoWarnBg, var(--MI_THEME-bg));
	color: var(--MI_THEME-infoWarnFg, var(--MI_THEME-fg));
}

.nightBarDay {
	background: var(--MI_THEME-infoWarnBg, var(--MI_THEME-bg));
	color: var(--MI_THEME-infoWarnFg, var(--MI_THEME-fg));
}
</style>
