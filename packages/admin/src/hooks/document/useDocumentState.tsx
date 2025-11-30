import T from "@/translations";
import { useParams, useNavigate } from "@solidjs/router";
import { type Accessor, createMemo } from "solid-js";
import { useQueryClient } from "@tanstack/solid-query";
import contentLocaleStore from "@/store/contentLocaleStore";
import helpers from "@/utils/helpers";
import api from "@/services/api";
import type { DocumentVersionType } from "@types";

export function useDocumentState(props: {
	mode: "create" | "edit";
	version: Accessor<DocumentVersionType>;
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
				version: props.version,
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
	};
}

export type UseDocumentState = ReturnType<typeof useDocumentState>;
