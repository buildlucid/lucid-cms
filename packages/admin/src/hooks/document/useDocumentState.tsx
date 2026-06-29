import { useNavigate, useParams } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { DocumentVersionType } from "@types";
import objectHash from "object-hash";
import { type Accessor, createMemo } from "solid-js";
import api from "@/services/api";
import brickStore from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import { isInaccessibleError } from "@/utils/error-handling";
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
		if (contentLocale() === undefined || documentId() === undefined) {
			return false;
		}
		if (props.version() === "revision" || props.version() === "snapshot") {
			return props.versionId() !== undefined;
		}
		return true;
	});
	const versionUrlParam = createMemo(() => {
		if (props.version() === "revision" || props.version() === "snapshot") {
			return props.versionId();
		}
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
				refs: true,
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
			}) || T()("common.collection"),
	);
	const document = createMemo(() => documentQuery.data?.data, undefined, {
		equals: (prev, next) => {
			if (!prev || !next) return prev === next;
			return objectHash(prev) === objectHash(next);
		},
	});
	const isDocumentMutated = createMemo(() => brickStore.getDocumentMutated());
	const collectionAccessError = createMemo(
		() => collectionQuery.isError && isInaccessibleError(collectionQuery.error),
	);
	const documentAccessError = createMemo(
		() => documentQuery.isError && isInaccessibleError(documentQuery.error),
	);
	const shouldBlockNavigation = createMemo(() => {
		//* nothing to guard when the document can't be loaded for the active tenant
		if (documentAccessError()) return false;
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
		collectionAccessError,
		documentAccessError,
	};
}

export type UseDocumentState = ReturnType<typeof useDocumentState>;
