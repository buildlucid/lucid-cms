import { useParams, useNavigate } from "@solidjs/router";
import { createMemo, createEffect } from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";
import api from "@/services/api";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import helpers from "@/utils/helpers";
import T from "@/translations";

export function useRevisionsState() {
	const params = useParams();
	const navigate = useNavigate();

	// Search params for revisions listing
	const revisionsSearchParams = useSearchParamsState(
		{
			sorts: {
				createdAt: "desc",
			},
			pagination: {
				perPage: 6,
			},
		},
		{
			singleSort: true,
		},
	);

	// Memos for route params
	const collectionKey = createMemo(() => params.collectionKey);
	const documentId = createMemo(
		() => Number.parseInt(params.documentId) || undefined,
	);
	const versionIdParam = createMemo(() => params.versionId);
	const versionId = createMemo(() => {
		if (versionIdParam() !== "latest") return Number.parseInt(versionIdParam());
		return undefined;
	});

	// Content locale
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);

	// Enable flags for queries
	const canFetchRevisions = createMemo(() => {
		return (
			contentLocale() !== undefined &&
			documentId() !== undefined &&
			revisionsSearchParams.getSettled()
		);
	});

	const canFetchRevisionDocument = createMemo(() => {
		return (
			contentLocale() !== undefined &&
			documentId() !== undefined &&
			versionId() !== undefined
		);
	});

	// Collection query
	const collection = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () => !!collectionKey(),
		refetchOnWindowFocus: false,
	});

	// Revision document query
	const revisionDoc = api.documents.useGetSingleVersion({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				versionId: versionId,
			},
			include: {
				bricks: true,
			},
		},
		enabled: () => canFetchRevisionDocument(),
		refetchOnWindowFocus: false,
	});

	// Revisions list query
	const revisionVersions = api.documents.useGetMultipleRevisions({
		queryParams: {
			queryString: revisionsSearchParams.getQueryString,
			location: {
				collectionKey: collectionKey,
				documentId: documentId,
			},
		},
		enabled: () => canFetchRevisions(),
		refetchOnWindowFocus: false,
	});

	// Fallback document logic
	const canFetchFallbackDocument = createMemo(() => {
		if (versionId() !== undefined) return false;
		if (collection.isFetched === false) return false;

		return (
			contentLocale() !== undefined &&
			documentId() !== undefined &&
			collection.data?.data.config.useDrafts !== undefined
		);
	});

	const fallbackVersionType = createMemo(() => {
		return collection.data?.data.config.useDrafts ? "draft" : "published";
	});

	const fallbackDoc = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				version: fallbackVersionType,
			},
			include: {
				bricks: true,
			},
		},
		enabled: () => canFetchFallbackDocument(),
		refetchOnWindowFocus: false,
	});

	// Derive which document to use
	const doc = createMemo(() => {
		return canFetchRevisionDocument() ? revisionDoc : fallbackDoc;
	});

	// Loading and success states
	const documentIsLoading = createMemo(() => {
		if (versionIdParam() === "latest") {
			return collection.isLoading || revisionVersions.isLoading;
		}
		return collection.isLoading || doc().isLoading;
	});

	const documentIsSuccess = createMemo(() => {
		if (versionIdParam() === "latest") {
			return collection.isSuccess && revisionVersions.isSuccess;
		}
		return collection.isSuccess && doc().isSuccess;
	});

	const revisionsIsLoading = createMemo(() => {
		return revisionVersions.isLoading;
	});

	const revisionsIsSuccess = createMemo(() => {
		return revisionVersions.isSuccess;
	});

	const anyIsError = createMemo(() => {
		return revisionVersions.isError || collection.isError || doc().isError;
	});

	const isPublished = createMemo(() => {
		return (
			doc().data?.data.version?.published?.id !== null &&
			doc().data?.data.version?.published?.id !== undefined
		);
	});

	// Navigate to latest revision if needed
	createEffect(() => {
		if (versionIdParam() === "latest") {
			const latestVersion = revisionVersions.data?.data[0];
			if (latestVersion) {
				navigate(
					`/admin/collections/${collectionKey()}/revisions/${documentId()}/${latestVersion.id}`,
				);
			}
		}
	});

	// ------------------------------------------
	// Collection translations
	const collectionName = createMemo(() =>
		helpers.getLocaleValue({
			value: collection.data?.data.details.name,
		}),
	);
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: collection.data?.data.details.singularName,
			}) || T()("collection"),
	);

	// ------------------------------------------
	// Return
	return {
		collection,
		doc,
		revisionDoc,
		fallbackDoc,
		revisionVersions,
		collectionKey,
		documentId,
		versionId,
		versionIdParam,
		revisionsSearchParams,
		documentIsLoading,
		documentIsSuccess,
		revisionsIsLoading,
		revisionsIsSuccess,
		anyIsError,
		isPublished,
		collectionName,
		collectionSingularName,
	};
}

export type UseRevisionsState = ReturnType<typeof useRevisionsState>;
