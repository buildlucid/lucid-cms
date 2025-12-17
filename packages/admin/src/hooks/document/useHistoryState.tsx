import { useParams } from "@solidjs/router";
import { createMemo, createSignal, createEffect } from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";
import api from "@/services/api";
import helpers from "@/utils/helpers";
import T from "@/translations";
import type { DocumentVersionResponse } from "@types";
import useSearchParamsState from "../useSearchParamsState";
import type { DocumentResponse } from "../../../../core/dist/types/response";

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
	const searchParams = useSearchParamsState(
		{
			sorts: {
				createdAt: "desc",
			},
			pagination: {
				perPage: PER_PAGE,
			},
		},
		{
			singleSort: true,
		},
	);

	const [accumulatedRevisions, setAccumulatedRevisions] = createSignal<
		DocumentVersionResponse[]
	>([]);
	const [revisionName, setRevisionName] = createSignal("");
	const [selectedItem, setSelectedItem] = createSignal<TimelineItem | null>(
		null,
	);

	// ------------------------------------------
	// Memos
	const collectionKey = createMemo(() => params.collectionKey);
	const documentId = createMemo(
		() => Number.parseInt(params.documentId) || undefined,
	);
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const canFetchRevisions = createMemo(() => {
		return (
			contentLocale() !== undefined &&
			documentId() !== undefined &&
			searchParams.getSettled()
		);
	});

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
			queryString: searchParams.getQueryString,
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
	const collectionName = createMemo(() =>
		helpers.getLocaleValue({
			value: collection()?.details.name,
		}),
	);
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: collection()?.details.singularName,
			}) || T()("collection"),
	);
	const groupedRevisions = createMemo(() => {
		const revisions = accumulatedRevisions();
		const groups: Map<string, DocumentVersionResponse[]> = new Map();

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

	const timelineData = createMemo((): TimelineGroup[] => {
		const documentData = document();
		const revisions = accumulatedRevisions();
		const allItems: TimelineItem[] = [];
		const latestContentId = documentData?.version?.latest?.contentId ?? null;
		let latestItem: TimelineItem | undefined;

		const isInSyncWithPromotedFrom = (
			item:
				| DocumentVersionResponse
				| NonNullable<DocumentResponse["version"]["latest"]>,
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

		//* add revisions
		for (const revision of revisions) {
			allItems.push({
				type: "revision",
				version: "revision",
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

		//* track which timeline item ids are currently loaded (latest + fetched revisions)
		const loadedItemIds = new Set(allItems.map((i) => i.id));

		//* collect environment versions
		const environmentVersions: TimelineItem[] = [];
		if (documentData?.version) {
			let unreleasedEnvCounter = 0;
			for (const [key, version] of Object.entries(documentData.version)) {
				if (key === "latest") continue;

				if (version) {
					if (
						!version.promotedFrom ||
						!loadedItemIds.has(version.promotedFrom)
					) {
						continue;
					}
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
				if (!sourceItem.environmentVersions) {
					sourceItem.environmentVersions = [];
				}
				sourceItem.environmentVersions.push(envVersion);
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

		//* sort all items by date
		allItems.sort((a, b) => {
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
		const currentPage = searchParams.getPagination().page;

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
			const currentPage = searchParams.getPagination().page;
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
		// TODO: Implement restore revision functionality
		console.log("Restore revision:", selectedItem());
	};
	const handlePromoteToEnvironment = () => {
		// TODO: Implement promote to environment functionality
		console.log("Promote to environment:", selectedItem());
	};

	// ------------------------------------------
	// Return
	return {
		collectionQuery,
		revisionsQuery,
		collection,
		document,
		documentQuery,
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
		handleSelectItem,
		handleRestoreRevision,
		handlePromoteToEnvironment,
		isItemSelected,
		timelineData,
		setRevisionName,
	};
}

export type UseHistoryState = ReturnType<typeof useHistoryState>;

export type TimelineCardType = "latest" | "revision" | "environment";

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
	bricks?: DocumentVersionResponse["bricks"];
	environmentVersions?: TimelineItem[];
};

export type TimelineGroup = {
	dateLabel: string;
	items: TimelineItem[];
};
