import type {
	BrickError,
	CollectionResponse,
	DocumentResponse,
	FieldError,
} from "@types";
import api from "@/services/api";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getBodyError } from "@/utils/error-helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import { useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";

export function useDocumentMutations({
	collection,
	collectionKey,
	documentId,
	collectionSingularName,
	version,
	mode,
}: {
	collection: CollectionResponse | undefined;
	collectionKey: () => string;
	documentId: () => number | undefined;
	collectionSingularName: () => string;
	version: "draft" | "published";
	mode: "create" | "edit" | "revisions";
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const createDocument = api.documents.useCreateSingle({
		onSuccess: (data) => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
			navigate(
				getDocumentRoute("edit", {
					collectionKey: collectionKey(),
					useDrafts: collection?.config.useDrafts,
					documentId: data.data.id,
					statusOverride: version,
				}),
			);
			queryClient.invalidateQueries({
				queryKey: ["collections.getAll"],
			});
			return;
		},
		onError: (errors) => {
			brickStore.set(
				"fieldsErrors",
				getBodyError<FieldError[]>("fields", errors) || [],
			);
			brickStore.set(
				"brickErrors",
				getBodyError<BrickError[]>("bricks", errors) || [],
			);
		},
		getCollectionName: collectionSingularName,
	});

	const updateSingle = api.documents.useUpdateSingle({
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
			brickStore.set("documentMutated", false);
		},
		onError: (errors) => {
			brickStore.set(
				"fieldsErrors",
				getBodyError<FieldError[]>("fields", errors) || [],
			);
			brickStore.set(
				"brickErrors",
				getBodyError<BrickError[]>("bricks", errors) || [],
			);
			brickStore.set("documentMutated", false);
		},
		getCollectionName: collectionSingularName,
	});

	const promoteToPublished = api.documents.usePromoteSingle({
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("documentMutated", false);
		},
		onError: (errors) => {
			brickStore.set(
				"fieldsErrors",
				getBodyError<FieldError[]>("fields", errors) || [],
			);
			brickStore.set("documentMutated", false);
		},
		getCollectionName: collectionSingularName,
		getVersionType: () => "published",
	});

	const upsertDocumentAction = async () => {
		if (mode === "create") {
			createDocument.action.mutate({
				collectionKey: collectionKey(),
				body: {
					publish: version === "published",
					bricks: brickHelpers.getUpsertBricks(),
					fields: brickHelpers.getCollectionPseudoBrickFields(),
				},
			});
		} else {
			updateSingle.action.mutate({
				collectionKey: collectionKey(),
				documentId: documentId() as number,
				body: {
					publish: version === "published",
					bricks: brickHelpers.getUpsertBricks(),
					fields: brickHelpers.getCollectionPseudoBrickFields(),
				},
			});
		}
	};

	const publishDocumentAction = async (
		docData: DocumentResponse | undefined,
	) => {
		if (!docData?.version?.draft?.id) {
			console.error("No draft version ID found.");
			return;
		}

		promoteToPublished.action.mutate({
			collectionKey: collectionKey(),
			id: documentId() as number,
			versionId: docData.version.draft.id,
			body: {
				versionType: "published",
			},
		});
	};

	return {
		createDocument,
		updateSingle,
		promoteToPublished,
		upsertDocumentAction,
		publishDocumentAction,
	};
}

export type UseDocumentMutations = ReturnType<typeof useDocumentMutations>;
