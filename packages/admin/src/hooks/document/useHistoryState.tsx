import { useNavigate, useParams } from "@solidjs/router";
import type { DocumentVersion, InternalCollectionDocument } from "@types";
import { createEffect, createMemo, createSignal } from "solid-js";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import { isInaccessibleError } from "@/utils/error-handling";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import useQueryState, { pagination, sort } from "../useQueryState";

const PER_PAGE = 20;

const getDateGroupKey = (dateStr: string | null): string => {
	if (!dateStr) return "Unknown";

	const date = new Date(dateStr);
	const now = new Date();
	const getStartOfDay = (source: Date) =>
		new Date(
			source.getFullYear(),
			source.getMonth(),
			source.getDate(),
		).getTime();
	const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
	const diffDays = Math.max(
		0,
		Math.round(
			(getStartOfDay(now) - getStartOfDay(date)) / MILLISECONDS_IN_DAY,
		),
	);

	if (diffDays === 0) {
		return "Today";
	}
	if (diffDays === 1) {
		return "Yesterday";
	}
	if (diffDays < 7) {
		return `${diffDays} days ago`;
	}

	return date.toLocaleDateString("en-gb", {
		day: "numeric",
		month: "long",
	});
};

export function useHistoryState() {
	const params = useParams();
	const navigate = useNavigate();
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
			},
			pagination: pagination({ defaultPerPage: PER_PAGE }),
		},
		options: {
			singleSort: true,
		},
	});

	const [accumulatedRevisions, setAccumulatedRevisions] = createSignal<
		DocumentVersion[]
	>([]);
	const [revisionName, setRevisionName] = createSignal("");
	const [selectedItem, setSelectedItem] = createSignal<TimelineItem | null>(
		null,
	);
	const [restoreRevisionOpen, setRestoreRevisionOpen] = createSignal(false);

	// ------------------------------------------
	// Memos
	const collectionKey = createMemo(() => params.collectionKey || "");
	const documentId = createMemo(() =>
		params.documentId ? Number.parseInt(params.documentId, 10) : undefined,
	);
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const canFetchRevisions = createMemo(() => {
		return (
			contentLocale() !== undefined &&
			documentId() !== undefined &&
			searchParams.ready()
		);
	});
	const selectedVersion = createMemo(() => {
		const item = selectedItem();
		if (!item) return undefined;
		if (item.type === "latest") return "latest";
		if (item.type === "revision") return item.id;
		if (item.type === "snapshot") return item.id;
		if (item.type === "environment") return item.version;
		return undefined;
	});
	const selectedReleaseTarget = createMemo(() => {
		const item = selectedItem();
		return item?.type === "environment" ? item.version : undefined;
	});
	const canReadPublishOperations = createMemo(
		() => userStore.get.hasPermission([Permissions.DocumentsReview]).all,
	);

	// ------------------------------------------
	// Queries
	const collectionQuery = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () => !!collectionKey(),
		refetchOnWindowFocus: false,
	});
	const revisionsQuery = api.documents.useGetMultipleRevisions({
		queryParams: {
			queryString: searchParams.queryString,
			location: {
				collectionKey: collectionKey,
				documentId: documentId,
			},
		},
		enabled: () => canFetchRevisions(),
		refetchOnWindowFocus: false,
	});
	const documentQuery = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				version: "latest",
			},
			include: {
				bricks: false,
			},
		},
		enabled: () => canFetchRevisions(),
		refetchOnWindowFocus: false,
	});
	const selectedVersionDocumentQuery = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				version: selectedVersion,
			},
			include: {
				bricks: true,
				refs: true,
			},
		},
		enabled: () => canFetchRevisions() && selectedVersion() !== undefined,
		refetchOnWindowFocus: false,
	});
	const releaseOperationsQuery = api.publishOperations.useGetMultiple({
		queryParams: {
			filters: {
				collectionKey: collectionKey,
				documentId: documentId,
				target: selectedReleaseTarget,
				status: () => ["pending", "approved"],
				executionStatus: () => ["awaiting_approval", "scheduled", "executing"],
			},
			perPage: 6,
		},
		enabled: () =>
			canFetchRevisions() &&
			selectedReleaseTarget() !== undefined &&
			canReadPublishOperations(),
	});

	// ------------------------------------------
	// Memos
	const collection = createMemo(() => collectionQuery.data?.data);
	const isLoading = createMemo(() => {
		return (
			collectionQuery.isLoading ||
			revisionsQuery.isLoading ||
			documentQuery.isLoading
		);
	});
	const isSuccess = createMemo(() => {
		return (
			collectionQuery.isSuccess &&
			revisionsQuery.isSuccess &&
			documentQuery.isSuccess
		);
	});
	const isError = createMemo(
		() =>
			collectionQuery.isError ||
			revisionsQuery.isError ||
			documentQuery.isError,
	);
	const isEmpty = createMemo(
		() => isSuccess() && accumulatedRevisions().length === 0,
	);
	const meta = createMemo(() => revisionsQuery.data?.meta);
	const hasMore = createMemo(() => {
		const m = meta();
		if (!m || m.currentPage === null || m.lastPage === null) return false;
		return m.currentPage < m.lastPage;
	});
	const collectionName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: collection()?.details.name,
			}) || T()("common.collection"),
	);
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: collection()?.details.singularName,
			}) || T()("common.collection"),
	);
	const groupedRevisions = createMemo(() => {
		const revisions = accumulatedRevisions();
		const groups: Map<string, DocumentVersion[]> = new Map();

		for (const revision of revisions) {
			const dateKey = getDateGroupKey(revision.createdAt);
			const existing = groups.get(dateKey) || [];
			groups.set(dateKey, [...existing, revision]);
		}

		return Array.from(groups.entries()).map(([dateLabel, items]) => ({
			dateLabel,
			revisions: items,
		}));
	});
	const document = createMemo(() => documentQuery.data?.data);
	const collectionAccessError = createMemo(
		() => collectionQuery.isError && isInaccessibleError(collectionQuery.error),
	);
	const documentAccessError = createMemo(
		() => documentQuery.isError && isInaccessibleError(documentQuery.error),
	);

	const timelineData = createMemo((): TimelineGroup[] => {
		const documentData = document();
		const revisions = accumulatedRevisions();
		const allItems: TimelineItem[] = [];
		let latestItem: TimelineItem | undefined;

		const isInSyncWithPromotedFrom = (
			item:
				| DocumentVersion
				| NonNullable<InternalCollectionDocument["version"]["latest"]>,
		): boolean => {
			const promotedFromItem = allItems.find((i) => i.id === item.promotedFrom);
			if (!promotedFromItem) return false;
			return promotedFromItem.contentId === item.contentId;
		};

		//* add latest version
		if (documentData?.version?.latest) {
			const latest = documentData.version.latest;
			latestItem = {
				type: "latest",
				id: latest.id,
				version: "latest",
				createdAt: latest.createdAt,
				createdBy: latest.createdBy,
				promotedFrom: latest.promotedFrom,
				contentId: latest.contentId,
				isReleased: true,
				promotedFromLatest: true,
				inSyncWithPromotedFrom: isInSyncWithPromotedFrom(latest),
			};
			allItems.push(latestItem);
		}

		//* add revisions and visible snapshots
		for (const revision of revisions) {
			const versionType =
				revision.versionType === "snapshot" ? "snapshot" : "revision";

			allItems.push({
				type: versionType,
				version: versionType,
				id: revision.id,
				createdAt: revision.createdAt,
				createdBy: revision.createdBy,
				promotedFrom: revision.promotedFrom,
				contentId: revision.contentId,
				bricks: revision.bricks,
				isReleased: false,
				promotedFromLatest:
					documentData?.version?.latest?.id === revision.promotedFrom,
				inSyncWithPromotedFrom: isInSyncWithPromotedFrom(revision),
			});
		}

		//* collect environment versions
		const environmentVersions: TimelineItem[] = [];
		if (documentData?.version) {
			let unreleasedEnvCounter = 0;
			for (const [key, version] of Object.entries(documentData.version)) {
				if (key === "latest") continue;

				if (version) {
					environmentVersions.push({
						type: "environment",
						id: version.id,
						version: key,
						createdAt: version.createdAt,
						createdBy: version.createdBy,
						promotedFrom: version.promotedFrom,
						contentId: version.contentId,
						isReleased: true,
						promotedFromLatest:
							documentData?.version?.latest?.id === version.promotedFrom,
						inSyncWithPromotedFrom: isInSyncWithPromotedFrom(version),
					});
				}

				if (version === null) {
					if (latestItem) {
						if (!latestItem.environmentVersions)
							latestItem.environmentVersions = [];
						latestItem.environmentVersions.push({
							type: "environment",
							id: -1 * (1000 + unreleasedEnvCounter++),
							version: key,
							createdAt: null,
							createdBy: null,
							promotedFrom: null,
							contentId: null,
							isReleased: false,
							promotedFromLatest: false,
							inSyncWithPromotedFrom: false,
						});
					}
				}
			}
		}

		//* link environment versions to their source
		const contentIdMap = new Map<string, TimelineItem>();
		const idMap = new Map<number, TimelineItem>();

		for (const item of allItems) {
			if (item.contentId) contentIdMap.set(item.contentId, item);
			idMap.set(item.id, item);
		}

		//* attach environment versions to their sources
		for (const envVersion of environmentVersions) {
			let sourceItem: TimelineItem | undefined;

			if (envVersion.promotedFrom) {
				sourceItem = idMap.get(envVersion.promotedFrom);
			}

			if (!sourceItem && envVersion.contentId) {
				sourceItem = contentIdMap.get(envVersion.contentId);
			}

			if (sourceItem) {
				envVersion.inSyncWithPromotedFrom =
					sourceItem.contentId === envVersion.contentId;
				envVersion.promotedFromLatest = sourceItem.type === "latest";
				if (!sourceItem.environmentVersions) {
					sourceItem.environmentVersions = [];
				}
				sourceItem.environmentVersions.push(envVersion);
			} else {
				allItems.push(envVersion);
			}
		}

		//* ensure unreleased env cards are always last within environmentVersions
		for (const item of allItems) {
			if (!item.environmentVersions || item.environmentVersions.length === 0)
				continue;

			const decorated = item.environmentVersions.map((v, idx) => ({ v, idx }));
			decorated.sort((a, b) => {
				const aIsUnreleased = a.v.type === "environment" && !a.v.isReleased;
				const bIsUnreleased = b.v.type === "environment" && !b.v.isReleased;

				if (aIsUnreleased !== bIsUnreleased) {
					return aIsUnreleased ? 1 : -1;
				}
				return a.idx - b.idx;
			});

			item.environmentVersions = decorated.map((d) => d.v);
		}

		//* sort all items, keeping latest pinned as the current version anchor
		allItems.sort((a, b) => {
			if (a.type === "latest") return -1;
			if (b.type === "latest") return 1;
			if (!a.createdAt) return 1;
			if (!b.createdAt) return -1;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});

		//* group by date
		const groups: Map<string, TimelineItem[]> = new Map();

		for (const item of allItems) {
			const dateKey = getDateGroupKey(item.createdAt);
			const existing = groups.get(dateKey) || [];
			groups.set(dateKey, [...existing, item]);
		}

		return Array.from(groups.entries()).map(([dateLabel, items]) => ({
			dateLabel,
			items,
		}));
	});
	const selectedCreatedByUser = createMemo(() => {
		return selectedVersionDocumentQuery.data?.data.createdBy ?? undefined;
	});
	const selectedRetention = createMemo((): RetentionInfo => {
		const item = selectedItem();
		const retentionDays = collection()?.revisionRetentionDays;

		if (item?.type !== "revision") {
			return {
				state: "protected",
				label: T()("documents.revisions.retention.current.version.title"),
				description: T()(
					"documents.revisions.retention.current.version.description",
				),
			};
		}

		const referencedBy = Object.entries(document()?.version ?? {})
			.filter(
				([key, version]) =>
					key !== "revision" && version?.promotedFrom === item.id,
			)
			.map(([key]) => key);

		if (referencedBy.length > 0) {
			return {
				state: "protected",
				label: T()("documents.revisions.retention.protected.title"),
				description: T()(
					"documents.revisions.retention.protected.description",
					{
						versions: referencedBy.join(", "),
					},
				),
			};
		}

		if (retentionDays === false) {
			return {
				state: "retained",
				label: T()("documents.revisions.retention.indefinite.title"),
				description: T()(
					"documents.revisions.retention.indefinite.description",
				),
			};
		}

		if (retentionDays === undefined || !item.createdAt) {
			return {
				state: "unknown",
				label: T()("documents.revisions.retention.unknown.title"),
				description: T()("documents.revisions.retention.unknown.description"),
			};
		}

		const expiresAt = new Date(item.createdAt);
		expiresAt.setDate(expiresAt.getDate() + retentionDays);

		const millisecondsRemaining = expiresAt.getTime() - Date.now();
		const daysRemaining = Math.ceil(
			millisecondsRemaining / (1000 * 60 * 60 * 24),
		);

		if (daysRemaining <= 0) {
			return {
				state: "expired",
				label: T()("documents.revisions.retention.cleanup.eligible.title"),
				description: T()(
					"documents.revisions.retention.cleanup.eligible.description",
				),
				expiresAt: expiresAt.toISOString(),
				daysRemaining,
			};
		}

		if (daysRemaining <= 7) {
			return {
				state: "expiring",
				label: T()("documents.revisions.retention.expiring.title"),
				description: T()("documents.revisions.retention.expiring.description", {
					count: daysRemaining,
				}),
				expiresAt: expiresAt.toISOString(),
				daysRemaining,
			};
		}

		return {
			state: "retained",
			label: T()("documents.revisions.retention.retained.title"),
			description: T()("documents.revisions.retention.retained.description", {
				count: daysRemaining,
			}),
			expiresAt: expiresAt.toISOString(),
			daysRemaining,
		};
	});
	const canRestoreSelectedItem = createMemo(() => {
		const permission = collection()?.permissions.restore;
		const item = selectedItem();
		if (!permission || !item) return false;
		if (item.type !== "revision") return false;
		if (document()?.isDeleted) return false;
		return userStore.get.hasPermission([permission]).all;
	});
	const restoreRevision = api.documents.useRestoreRevision({
		getCollectionName: collectionSingularName,
		onSuccess: () => {
			setRestoreRevisionOpen(false);
			setSelectedItem(null);
			void documentQuery.refetch();
			void revisionsQuery.refetch();
		},
	});

	const isItemSelected = (item: TimelineItem): boolean => {
		const selected = selectedItem();
		if (!selected) return false;
		return selected.id === item.id && selected.type === item.type;
	};

	createEffect(() => {
		const data = timelineData();
		if (data.length > 0 && data[0].items.length > 0 && !selectedItem()) {
			setSelectedItem(data[0].items[0]);
		}
	});

	// ------------------------------------------
	// Effects
	createEffect(() => {
		const data = revisionsQuery.data?.data;
		const currentPage = searchParams.pagination().page;

		if (data) {
			if (currentPage === 1) {
				setAccumulatedRevisions(data);
			} else {
				setAccumulatedRevisions((prev) => {
					const existingIds = new Set(prev.map((r) => r.id));
					const newRevisions = data.filter((r) => !existingIds.has(r.id));
					return [...prev, ...newRevisions];
				});
			}
		}
	});

	// ------------------------------------------
	// Handlers
	const loadMore = () => {
		if (hasMore() && !isLoading()) {
			const currentPage = searchParams.pagination().page;
			searchParams.setParams({
				pagination: {
					page: currentPage + 1,
					perPage: PER_PAGE,
				},
			});
		}
	};
	const handleSelectItem = (item: TimelineItem) => {
		setSelectedItem(item);
		setRevisionName("");
	};
	const handleRestoreRevision = () => {
		if (!canRestoreSelectedItem()) return;
		setRestoreRevisionOpen(true);
	};
	const confirmRestoreRevision = async (versionId: number) => {
		const id = documentId();
		if (!id) return;

		await restoreRevision.action.mutateAsync({
			collectionKey: collectionKey(),
			id,
			versionId,
		});
		navigate(
			getDocumentRoute("edit", {
				collectionKey: collectionKey(),
				documentId: id,
				status: "latest",
			}),
		);
	};
	const cancelRestoreRevision = () => {
		setRestoreRevisionOpen(false);
		restoreRevision.reset();
	};

	// ------------------------------------------
	// Return
	return {
		collectionQuery,
		revisionsQuery,
		selectedVersionDocumentQuery,
		releaseOperationsQuery,
		collection,
		document,
		documentQuery,
		collectionAccessError,
		documentAccessError,
		selectedVersionDocument: () => selectedVersionDocumentQuery.data?.data,
		collectionKey,
		documentId,
		searchParams,
		isLoading,
		isSuccess,
		isError,
		isEmpty,
		collectionName,
		collectionSingularName,
		accumulatedRevisions,
		groupedRevisions,
		hasMore,
		loadMore,
		meta,
		revisionName,
		selectedItem,
		selectedCreatedByUser,
		selectedRetention,
		canRestoreSelectedItem,
		handleSelectItem,
		handleRestoreRevision,
		confirmRestoreRevision,
		cancelRestoreRevision,
		restoreRevisionOpen,
		setRestoreRevisionOpen,
		restoreRevision,
		isItemSelected,
		timelineData,
		setRevisionName,
	};
}

export type UseHistoryState = ReturnType<typeof useHistoryState>;

export type TimelineCardType =
	| "latest"
	| "revision"
	| "snapshot"
	| "environment";

export type TimelineItem = {
	type: TimelineCardType;
	id: number;
	version: string;
	createdAt: string | null;
	createdBy: number | null;
	promotedFrom: number | null;
	contentId: string | null;
	isReleased: boolean;
	inSyncWithPromotedFrom: boolean;
	promotedFromLatest: boolean;
	bricks?: DocumentVersion["bricks"];
	environmentVersions?: TimelineItem[];
};

export type TimelineGroup = {
	dateLabel: string;
	items: TimelineItem[];
};

export type RetentionInfo = {
	state: "protected" | "retained" | "expiring" | "expired" | "unknown";
	label: string;
	description: string;
	expiresAt?: string;
	daysRemaining?: number;
};
