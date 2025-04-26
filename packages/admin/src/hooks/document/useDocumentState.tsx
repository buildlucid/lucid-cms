import T from "@/translations";
import { useParams, useNavigate } from "@solidjs/router";
import { createMemo } from "solid-js";
import { useQueryClient } from "@tanstack/solid-query";
import contentLocaleStore from "@/store/contentLocaleStore";
import helpers from "@/utils/helpers";
import api from "@/services/api";

export function useDocumentState(props: {
	mode: "create" | "edit";
	version: "draft" | "published";
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
	const collection = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () => !!collectionKey(),
		refetchOnWindowFocus: false,
	});
	const doc = api.documents.useGetSingle({
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
		collectionKey,
		documentId,
		collectionName,
		collectionSingularName,
		contentLocale,
		navigate,
		queryClient,
	};
}

export type UseDocumentState = ReturnType<typeof useDocumentState>;
