import api from "@/services/api";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getBodyError } from "@/utils/error-helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import { useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { Accessor } from "solid-js";
import type {
	BrickError,
	CollectionResponse,
	DocumentResponse,
	FieldError,
} from "@types";

export function useDocumentMutations(props: {
	collection: Accessor<CollectionResponse | undefined>;
	collectionKey: () => string;
	documentId: () => number | undefined;
	collectionSingularName: () => string;
	version: "draft" | "published";
	mode: "create" | "edit" | "revisions";
	document?: () => DocumentResponse | undefined;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const createDocumentMutation = api.documents.useCreateSingle({
		onSuccess: (data) => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
			navigate(
				getDocumentRoute("edit", {
					collectionKey: props.collectionKey(),
					useDrafts: props.collection()?.config.useDrafts,
					documentId: data.data.id,
					statusOverride: props.version,
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
		getCollectionName: props.collectionSingularName,
	});

	const createSingleVersionMutation = api.documents.useCreateSingleVersion({
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
		getCollectionName: props.collectionSingularName,
	});

	const updateSingleVersionMutation = api.documents.useUpdateSingleVersion({
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
			brickStore.set("documentMutated", false);
		},
		getCollectionName: props.collectionSingularName,
	});

	const promoteToPublishedMutation = api.documents.usePromoteSingle({
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
		getCollectionName: props.collectionSingularName,
		getVersionType: () => "published",
	});

	const autoSaveDocument = async (versionId: number) => {
		updateSingleVersionMutation.action.mutate({
			collectionKey: props.collectionKey(),
			documentId: props.documentId() as number,
			versionId: versionId,
			body: {
				bricks: brickHelpers.getUpsertBricks(),
				fields: brickHelpers.getCollectionPseudoBrickFields(),
			},
		});
	};

	const upsertDocumentAction = async () => {
		if (props.mode === "create") {
			createDocumentMutation.action.mutate({
				collectionKey: props.collectionKey(),
				body: {
					publish: props.version === "published",
					bricks: brickHelpers.getUpsertBricks(),
					fields: brickHelpers.getCollectionPseudoBrickFields(),
				},
			});
		} else {
			createSingleVersionMutation.action.mutate({
				collectionKey: props.collectionKey(),
				documentId: props.documentId() as number,
				body: {
					publish: props.version === "published",
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

		promoteToPublishedMutation.action.mutate({
			collectionKey: props.collectionKey(),
			id: props.documentId() as number,
			versionId: docData.version.draft.id,
			body: {
				versionType: "published",
			},
		});
	};

	return {
		createDocumentMutation,
		createSingleVersionMutation,
		updateSingleVersionMutation,
		promoteToPublishedMutation,
		upsertDocumentAction,
		publishDocumentAction,
		autoSaveDocument,
	};
}

export type UseDocumentMutations = ReturnType<typeof useDocumentMutations>;
