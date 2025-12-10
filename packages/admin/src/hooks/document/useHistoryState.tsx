import { useParams } from "@solidjs/router";
import { createMemo, createSignal, createEffect } from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";
import api from "@/services/api";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import helpers from "@/utils/helpers";
import T from "@/translations";
import type { DocumentVersionResponse } from "@types";

const PER_PAGE = 20;

const getDateGroupKey = (dateStr: string | null): string => {
	if (!dateStr) return "Unknown";

	const date = new Date(dateStr);
	const now = new Date();
	const diffTime = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

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
	const searchParams = useSearchParamsLocation(
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
	};
}

export type UseHistoryState = ReturnType<typeof useHistoryState>;
