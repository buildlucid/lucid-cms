import type { PublishOperation } from "@types";
import { createMemo } from "solid-js";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getAgentAccess, getAgentName } from "@/utils/agent-access";
import { formatTargetName } from "@/utils/document-sidebar";
import helpers from "@/utils/helpers";

export type NeedsYouKind = "failed" | "review" | "chat" | "system";

export type NeedsYouItem = {
	key: string;
	kind: NeedsYouKind;
	title: string;
	detail: string;
	href: string;
	date?: string | null;
};

/** How many of one kind there are in all, and where to see every one of them. */
export type NeedsYouGroup = {
	kind: Exclude<NeedsYouKind, "system">;
	count: number;
	href: string;
};

const kindOrder: Record<NeedsYouKind, number> = {
	failed: 0,
	review: 1,
	chat: 2,
	system: 3,
};

/**
 * The things waiting on the current user: release requests to review, failed
 * releases, agent chats waiting for an answer and system warnings. Each source
 * only loads when the user has access to it.
 *
 * @example
 * ```tsx
 * const needsYou = useNeedsYou({ limit: 5 });
 *
 * return <NeedsYouList items={needsYou.items()} />;
 * ```
 */
export const useNeedsYou = (props: { limit: number }) => {
	// ----------------------------------------
	// Memos
	const canReadPublishing = createMemo(
		() => userStore.get.hasPermission([Permissions.PublishOperationsRead]).all,
	);
	const canReadSettings = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canChat = createMemo(() => getAgentAccess().use.length > 0);

	// ----------------------------------------
	// Queries
	const collections = api.collections.useGetAll({ queryParams: {} });
	const reviews = api.publishOperations.useGetMultiple({
		queryParams: {
			filters: { assignedToMe: () => "true", status: () => "pending" },
			perPage: props.limit,
		},
		enabled: canReadPublishing,
	});
	const failed = api.publishOperations.useGetMultiple({
		queryParams: {
			filters: { executionStatus: () => "failed" },
			perPage: props.limit,
		},
		enabled: canReadPublishing,
	});
	const chats = api.agent.useGetConversations({
		queryParams: { filters: { status: "waiting" }, perPage: props.limit },
		enabled: canChat,
	});
	const settings = api.settings.useGetSettings({
		queryParams: { include: { media: true } },
		enabled: canReadSettings,
	});

	// ----------------------------------------
	// Functions
	const documentName = (operation: PublishOperation) => {
		if (operation.documentLabel) return operation.documentLabel;
		const collection = collections.data?.data.find(
			(collection) => collection.key === operation.collectionKey,
		);
		const name =
			helpers.getLocaleValue({
				value: collection?.details.labels.singular,
				fallback: operation.collectionKey,
			}) || operation.collectionKey;
		return `${name} #${operation.documentId}`;
	};
	const targetName = (operation: PublishOperation) =>
		formatTargetName({
			collection: collections.data?.data.find(
				(collection) => collection.key === operation.collectionKey,
			),
			target: operation.target,
		});
	const requestHref = (operation: PublishOperation) =>
		`/lucid/collections/${operation.collectionKey}/${operation.documentId}/release-requests/${operation.id}`;

	// ----------------------------------------
	// Memos
	const systemItems = createMemo<NeedsYouItem[]>(() => {
		const media = settings.data?.data.media;
		if (!canReadSettings() || !media) return [];

		if (media.enabled === false) {
			return [
				{
					key: "system:media",
					kind: "system",
					title: T()("dashboard.attention.media.disabled.title"),
					detail: T()("media.storage.adapter.missing.message"),
					href: "/lucid/system/overview",
				},
			];
		}

		const { total, used, remaining } = media.storage;
		if (total === null || used === null || total <= 0) return [];
		const percent = Math.min(100, Math.floor((used / total) * 100));
		if (percent < 90) return [];

		return [
			{
				key: "system:storage",
				kind: "system",
				title: T()("dashboard.attention.storage.title", { percent }),
				detail: T()("dashboard.attention.storage.description", {
					remaining: helpers.bytesToSize(remaining),
				}),
				href: "/lucid/system/overview",
			},
		];
	});
	const allItems = createMemo<NeedsYouItem[]>(() =>
		[
			...(failed.data?.data ?? []).map(
				(operation): NeedsYouItem => ({
					key: `failed:${operation.id}`,
					kind: "failed",
					title: documentName(operation),
					detail: T()("home.needs.you.failed.detail", {
						target: targetName(operation),
					}),
					href: requestHref(operation),
					date: operation.failedAt ?? operation.updatedAt,
				}),
			),
			...(reviews.data?.data ?? []).map(
				(operation): NeedsYouItem => ({
					key: `review:${operation.id}`,
					kind: "review",
					title: documentName(operation),
					detail: T()("home.needs.you.review.detail", {
						target: targetName(operation),
						name:
							helpers.formatUserName(operation.requestedBy, "name") ||
							T()("common.unknown"),
					}),
					href: requestHref(operation),
					date: operation.createdAt,
				}),
			),
			...(chats.data?.data ?? []).map(
				(conversation): NeedsYouItem => ({
					key: `chat:${conversation.id}`,
					kind: "chat",
					title: conversation.title,
					detail: T()("home.needs.you.chat.detail", {
						agent: getAgentName(conversation.agentKey),
					}),
					href: `/lucid/agent/chats/${conversation.id}`,
					date: conversation.updatedAt,
				}),
			),
			...systemItems(),
		].toSorted(
			(a, b) =>
				kindOrder[a.kind] - kindOrder[b.kind] ||
				(b.date ?? "").localeCompare(a.date ?? ""),
		),
	);
	const groups = createMemo<NeedsYouGroup[]>(() =>
		[
			{
				kind: "failed" as const,
				count: failed.data?.meta.total ?? 0,
				href: "/lucid/publishing/requests?filter[executionStatus]=failed",
			},
			{
				kind: "review" as const,
				count: reviews.data?.meta.total ?? 0,
				href: "/lucid/publishing/requests?filter[assignedToMe]=true&filter[status]=pending",
			},
			{
				kind: "chat" as const,
				count: chats.data?.meta.total ?? 0,
				href: "/lucid/agent/history?filter[status]=waiting",
			},
		].filter((group) => group.count > 0),
	);
	const total = createMemo(
		() =>
			groups().reduce((sum, group) => sum + group.count, 0) +
			systemItems().length,
	);
	const loading = createMemo(
		() =>
			(canReadPublishing() && (reviews.isLoading || failed.isLoading)) ||
			(canChat() && chats.isLoading),
	);

	return {
		items: createMemo(() => allItems().slice(0, props.limit)),
		groups,
		total,
		loading,
	};
};

export default useNeedsYou;
