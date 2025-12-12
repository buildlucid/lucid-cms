import T from "@/translations";
import { useParams, useNavigate } from "@solidjs/router";
import { type Accessor, createMemo } from "solid-js";
import { useQueryClient } from "@tanstack/solid-query";
import contentLocaleStore from "@/store/contentLocaleStore";
import helpers from "@/utils/helpers";
import api from "@/services/api";
import type { DocumentVersionType } from "@types";
import brickStore from "@/store/brickStore";

export function useDocumentState(props: {
	mode: "create" | "edit";
	version: Accessor<DocumentVersionType>;
	versionId: Accessor<number | undefined>;
}) {
	const params = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// ------------------------------------------
	// Memos
	const collectionKey = createMemo(() => params.collectionKey);
	const documentId = createMemo(
		() => Number.parseInt(params.documentId) || undefined,
	);
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const canFetchDocument = createMemo(() => {
		return contentLocale() !== undefined && documentId() !== undefined;
	});
	const versionUrlParam = createMemo(() => {
		if (props.version() === "revision") return props.versionId();
		return props.version();
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
	const documentQuery = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				version: versionUrlParam,
			},
			include: {
				bricks: true,
			},
		},
		enabled: () => canFetchDocument(),
		refetchOnWindowFocus: false,
	});

	// ------------------------------------------
	// Memos
	const collection = createMemo(() => collectionQuery.data?.data);
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
	const document = createMemo(() => documentQuery.data?.data);
	const isDocumentMutated = createMemo(() => brickStore.getDocumentMutated());
	const shouldBlockNavigation = createMemo(() => {
		if (props.version() !== "latest") return false;
		return isDocumentMutated();
	});

	// ------------------------------------------
	// Return
	return {
		collectionQuery,
		documentQuery,
		collectionKey,
		documentId,
		collectionName,
		collectionSingularName,
		contentLocale,
		navigate,
		queryClient,
		collection,
		document,
		isDocumentMutated,
		shouldBlockNavigation,
	};
}

export type UseDocumentState = ReturnType<typeof useDocumentState>;
