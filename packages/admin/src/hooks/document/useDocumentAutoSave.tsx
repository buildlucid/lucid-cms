import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { debounce } from "@solid-primitives/scheduled";
import type { CollectionResponse, DocumentResponse } from "@types";
import type api from "@/services/api";
import { type Accessor, createEffect, onCleanup } from "solid-js";

export function useDocumentAutoSave(props: {
	updateSingleVersionMutation: ReturnType<
		typeof api.documents.useUpdateSingleVersion
	>;
	document: Accessor<DocumentResponse | undefined>;
	collection: Accessor<CollectionResponse | undefined>;
	hasAutoSavePermission: Accessor<boolean | undefined>;
}) {
	const debouncedAutoSave = debounce(() => {
		const collectionKey = props.collection()?.key;
		const documentId = props.document()?.id;
		const versionId = props.document()?.versionId;

		if (!collectionKey || !documentId || !versionId) return;

		props.updateSingleVersionMutation.action.mutate({
			collectionKey: collectionKey,
			documentId: documentId,
			versionId: versionId,
			body: {
				bricks: brickHelpers.getUpsertBricks(),
				fields: brickHelpers.getCollectionPseudoBrickFields(),
			},
		});
	}, 500);

	createEffect(() => {
		if (!brickStore.get.documentMutated) return;
		if (brickStore.get.autoSaveCounter === 0) return;
		if (!props.hasAutoSavePermission()) return;

		debouncedAutoSave();
	});

	onCleanup(() => {
		debouncedAutoSave.clear();
	});

	return {
		debouncedAutoSave,
	};
}

export type UseDocumentAutoSave = ReturnType<typeof useDocumentAutoSave>;
