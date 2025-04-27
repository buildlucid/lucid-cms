import api from "@/services/api";
import brickStore from "@/store/brickStore";
import { useNavigate } from "@solidjs/router";
import { getDocumentRoute } from "@/utils/route-helpers";

export function useRevisionMutations({
	collectionKey,
	documentId,
	collectionSingularName,
	versionId,
	collection,
}: {
	collectionKey: () => string;
	documentId: () => number | undefined;
	collectionSingularName: () => string;
	versionId: () => number | undefined;
	collection: ReturnType<typeof api.collections.useGetSingle>;
}) {
	const navigate = useNavigate();

	const restoreRevision = api.documents.useRestoreRevision({
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("documentMutated", false);

			navigate(
				getDocumentRoute("edit", {
					collectionKey: collectionKey(),
					useDrafts: collection.data?.data.config.useDrafts,
					documentId: documentId(),
				}),
			);
		},
		onError: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("documentMutated", false);
		},
		getCollectionName: collectionSingularName,
	});

	const restoreRevisionAction = () => {
		const vId = versionId();
		if (vId === undefined) {
			console.error("No version ID found.");
			return;
		}

		restoreRevision.action.mutate({
			collectionKey: collectionKey(),
			id: documentId() as number,
			versionId: vId,
		});
	};

	return {
		restoreRevision,
		restoreRevisionAction,
	};
}

export type UseRevisionMutations = ReturnType<typeof useRevisionMutations>;
