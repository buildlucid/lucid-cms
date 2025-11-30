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
	const collectionQuery = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () => !!collectionKey(),
		refetchOnWindowFocus: false,
	});

	// Revision document query
	const revisionDocumentQuery = api.documents.useGetSingleVersion({
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
	const revisionVersionsQuery = api.documents.useGetMultipleRevisions({
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

	const collection = createMemo(() => collectionQuery.data?.data);

	// Fallback document logic
	const canFetchFallbackDocument = createMemo(() => {
		if (versionId() !== undefined) return false;
		if (collectionQuery.isFetched === false) return false;

		return contentLocale() !== undefined && documentId() !== undefined;
	});

	const fallbackDocumentQuery = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				version: "latest",
			},
			include: {
				bricks: true,
			},
		},
		enabled: () => canFetchFallbackDocument(),
		refetchOnWindowFocus: false,
	});

	// Derive which document to use
	const documentQuery = createMemo(() => {
		return canFetchRevisionDocument()
			? revisionDocumentQuery
			: fallbackDocumentQuery;
	});
	const document = createMemo(() => documentQuery().data?.data);
	const revisionDocument = createMemo(() => revisionDocumentQuery.data?.data);
	const fallbackDocument = createMemo(() => fallbackDocumentQuery.data?.data);

	// Loading and success states
	const documentIsLoading = createMemo(() => {
		if (versionIdParam() === "latest") {
			return collectionQuery.isLoading || revisionVersionsQuery.isLoading;
		}
		return collectionQuery.isLoading || documentQuery().isLoading;
	});

	const documentIsSuccess = createMemo(() => {
		if (versionIdParam() === "latest") {
			return collectionQuery.isSuccess && revisionVersionsQuery.isSuccess;
		}
		return collectionQuery.isSuccess && documentQuery().isSuccess;
	});

	const revisionsIsLoading = createMemo(() => {
		return revisionVersionsQuery.isLoading;
	});

	const revisionsIsSuccess = createMemo(() => {
		return revisionVersionsQuery.isSuccess;
	});

	const anyIsError = createMemo(() => {
		return (
			revisionVersionsQuery.isError ||
			collectionQuery.isError ||
			documentQuery().isError
		);
	});

	const isPublished = createMemo(() => {
		return (
			document()?.version?.published?.id !== null &&
			document()?.version?.published?.id !== undefined
		);
	});

	// Navigate to latest revision if needed
	createEffect(() => {
		if (versionIdParam() === "latest") {
			const latestVersion = revisionVersionsQuery.data?.data[0];
			if (latestVersion) {
				navigate(
					`/admin/collections/${collectionKey()}/revision/${documentId()}/${latestVersion.id}`,
				);
			}
		}
	});

	// ------------------------------------------
	// Collection translations
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

	// ------------------------------------------
	// Return
	return {
		collectionQuery,
		documentQuery,
		document,
		revisionDocument,
		fallbackDocument,
		collection,
		revisionDocumentQuery,
		fallbackDocumentQuery,
		revisionVersionsQuery,
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
