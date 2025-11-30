import api from "@/services/api";
import brickStore from "@/store/brickStore";
import { useNavigate } from "@solidjs/router";
import { getDocumentRoute } from "@/utils/route-helpers";
import type { CollectionResponse } from "@types";
import type { Accessor } from "solid-js";

export function useRevisionMutations(props: {
	collectionKey: () => string;
	documentId: () => number | undefined;
	collectionSingularName: () => string;
	versionId: () => number | undefined;
	collection: Accessor<CollectionResponse | undefined>;
}) {
	const navigate = useNavigate();

	const restoreRevision = api.documents.useRestoreRevision({
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("documentMutated", false);

			navigate(
				getDocumentRoute("edit", {
					collectionKey: props.collectionKey(),
					documentId: props.documentId(),
					status: "latest",
				}),
			);
		},
		onError: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("documentMutated", false);
		},
		getCollectionName: props.collectionSingularName,
	});

	const restoreRevisionAction = () => {
		const vId = props.versionId();
		if (vId === undefined) {
			console.error("No version ID found.");
			return;
		}

		restoreRevision.action.mutate({
			collectionKey: props.collectionKey(),
			id: props.documentId() as number,
			versionId: vId,
		});
	};

	return {
		restoreRevision,
		restoreRevisionAction,
	};
}

export type UseRevisionMutations = ReturnType<typeof useRevisionMutations>;
