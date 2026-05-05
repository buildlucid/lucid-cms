import { useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type {
	BrickError,
	Collection,
	DocumentVersionType,
	FieldError,
	InternalCollectionDocument,
} from "@types";
import type { Accessor } from "solid-js";
import api from "@/services/api";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getBodyError } from "@/utils/error-helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

export function useDocumentMutations(props: {
	collection: Accessor<Collection | undefined>;
	collectionKey: () => string;
	documentId: () => number | undefined;
	collectionSingularName: () => string;
	version: Accessor<"latest" | string>;
	mode: "create" | "edit" | "revisions";
	document?: () => InternalCollectionDocument | undefined;
	versionId: () => number | undefined;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	let latestAutoSaveRequestCounter: number | null = null;

	const createDocumentMutation = api.documents.useCreateSingle({
		onSuccess: (data) => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
			brickStore.get.captureInitialSnapshot();
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
			brickStore.get.captureInitialSnapshot();
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

	const updateSingleVersionMutation = api.documents.useUpdateSingleVersion({
		onMutate: () => {
			latestAutoSaveRequestCounter = brickStore.get.autoSaveCounter;
		},
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
			const requestCounter = latestAutoSaveRequestCounter;
			latestAutoSaveRequestCounter = null;

			// If new edits landed after this autosave started, keep the current
			// baseline so the refetch doesn't reconcile stale server state over
			// newer local changes. The next autosave will pick up those edits.
			if (requestCounter === null) return;
			if (brickStore.get.autoSaveCounter !== requestCounter) return;

			brickStore.set("autoSaveCounter", 0);
			brickStore.get.captureInitialSnapshot();
		},
		onError: (errors) => {
			latestAutoSaveRequestCounter = null;
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

	const createPublishOperationMutation =
		api.documents.useCreatePublishOperation({
			onSuccess: () => {
				brickStore.set("fieldsErrors", []);
				brickStore.set("brickErrors", []);
				brickStore.get.captureInitialSnapshot();
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

	const restoreRevision = api.documents.useRestoreRevision({
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
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
			brickStore.set("brickErrors", []);
		},
		getCollectionName: props.collectionSingularName,
	});

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
		if (props.documentId() === undefined) {
			console.error("No document ID found.");
			return;
		}

		await createPublishOperationMutation.action.mutateAsync({
			collectionKey: props.collectionKey(),
			id: props.documentId() as number,
			body: {
				target: targetVersionType,
			},
		});
	};

	const createPublishOperationAction = async (
		targetVersionType: Exclude<DocumentVersionType, "revision">,
		comment?: string,
		assigneeIds?: number[],
		autoAccept?: boolean,
	) => {
		if (props.documentId() === undefined) {
			console.error("No document ID found.");
			return;
		}

		return await createPublishOperationMutation.action.mutateAsync({
			collectionKey: props.collectionKey(),
			id: props.documentId() as number,
			body: {
				target: targetVersionType,
				comment,
				assigneeIds,
				autoAccept,
			},
		});
	};

	const restoreRevisionAction = async (versionIdOverride?: number) => {
		const versionId = versionIdOverride ?? props.versionId();
		if (versionId === undefined) {
			console.error("No version ID found.");
			return;
		}

		return await restoreRevision.action.mutateAsync({
			collectionKey: props.collectionKey(),
			id: props.documentId() as number,
			versionId: versionId,
		});
	};

	return {
		createDocumentMutation,
		createSingleVersionMutation,
		updateSingleVersionMutation,
		createPublishOperationMutation,
		upsertDocumentAction,
		publishDocumentAction,
		createPublishOperationAction,
		autoSaveDocument,
		restoreRevision,
		restoreRevisionAction,
	};
}

export type UseDocumentMutations = ReturnType<typeof useDocumentMutations>;
