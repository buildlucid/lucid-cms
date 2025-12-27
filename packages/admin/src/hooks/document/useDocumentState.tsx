import { useNavigate, useParams } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { DocumentVersionType } from "@types";
import objectHash from "object-hash";
import { type Accessor, createMemo } from "solid-js";
import api from "@/services/api";
import brickStore from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

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
	const collectionKey = createMemo(() => params.collectionKey || "");
	const documentId = createMemo(() =>
		params.documentId ? Number.parseInt(params.documentId, 10) : undefined,
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
	const document = createMemo(() => documentQuery.data?.data, undefined, {
		equals: (prev, next) => {
			if (!prev || !next) return prev === next;
			return objectHash(prev) === objectHash(next);
		},
	});
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
