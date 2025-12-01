import api from "@/services/api";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getBodyError } from "@/utils/error-helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import { useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import { useFocusPreservation } from "@/hooks/useFocusPreservation";
import { createSignal, type Accessor } from "solid-js";
import type {
	BrickError,
	CollectionResponse,
	DocumentResponse,
	FieldError,
	DocumentVersionType,
} from "@types";

export function useDocumentMutations(props: {
	collection: Accessor<CollectionResponse | undefined>;
	collectionKey: () => string;
	documentId: () => number | undefined;
	collectionSingularName: () => string;
	version: Accessor<"latest" | string>;
	mode: "create" | "edit" | "revisions";
	document?: () => DocumentResponse | undefined;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { captureFocus, restoreFocus } = useFocusPreservation();
	const [releaseVersionType, setReleaseVersionType] =
		createSignal<DocumentVersionType>();

	const createDocumentMutation = api.documents.useCreateSingle({
		onSuccess: (data) => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
			navigate(
				getDocumentRoute("edit", {
					collectionKey: props.collectionKey(),
					documentId: data.data.id,
					status: props.version(),
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
		onMutate: () => {
			const focusState = captureFocus();
			brickStore.set("focusState", focusState);
		},
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
			brickStore.set("documentMutated", false);

			restoreFocus(brickStore.get.focusState);
			brickStore.set("focusState", null);
		},
		onError: (errors) => {
			brickStore.set(
				"fieldsErrors",
				getBodyError<FieldError[]>("fields", errors) || [],
			);
			brickStore.set("documentMutated", false);

			restoreFocus(brickStore.get.focusState);
			brickStore.set("focusState", null);
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
		getVersionType: releaseVersionType,
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
					bricks: brickHelpers.getUpsertBricks(),
					fields: brickHelpers.getCollectionPseudoBrickFields(),
				},
			});
		} else {
			createSingleVersionMutation.action.mutate({
				collectionKey: props.collectionKey(),
				documentId: props.documentId() as number,
				body: {
					bricks: brickHelpers.getUpsertBricks(),
					fields: brickHelpers.getCollectionPseudoBrickFields(),
				},
			});
		}
	};

	const publishDocumentAction = async (
		targetVersionType: DocumentVersionType,
	) => {
		const versionId = props.document?.()?.versionId;
		if (!versionId) {
			console.error("No version ID found.");
			return;
		}
		setReleaseVersionType(targetVersionType);

		promoteToPublishedMutation.action.mutate({
			collectionKey: props.collectionKey(),
			id: props.documentId() as number,
			versionId: versionId,
			body: {
				versionType: targetVersionType,
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
