import { useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type {
	BrickError,
	Collection,
	DocumentVersionType,
	DocumentVersionUpdateResponse,
	FieldError,
	InternalCollectionDocument,
} from "@types";
import { type Accessor, createEffect, createSignal, on } from "solid-js";
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
	let latestAutoSaveSnapshot: ReturnType<
		typeof brickStore.get.createSnapshotFromPayload
	> | null = null;
	const [autoSaveMetadata, setAutoSaveMetadata] =
		createSignal<DocumentVersionUpdateResponse | null>(null);

	createEffect(
		on(
			() => [props.documentId(), props.versionId()],
			() => setAutoSaveMetadata(null),
		),
	);

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
		onMutate: (params) => {
			latestAutoSaveRequestCounter = brickStore.get.autoSaveCounter;
			latestAutoSaveSnapshot = brickStore.get.createSnapshotFromPayload(
				params.body,
			);
		},
		onSuccess: (data, params) => {
			const requestCounter = latestAutoSaveRequestCounter;
			const requestSnapshot = latestAutoSaveSnapshot;
			latestAutoSaveRequestCounter = null;
			latestAutoSaveSnapshot = null;

			if (
				params.collectionKey !== props.collectionKey() ||
				params.documentId !== props.documentId() ||
				params.versionId !== props.document?.()?.versionId
			) {
				return;
			}

			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
			setAutoSaveMetadata(data.data);

			// If new edits landed after this autosave started, keep the current
			// edit counter active, but advance the saved baseline to the payload
			// that reached the server. This catches add-then-remove races where
			// local state returns to the old baseline while the server saved the
			// in-flight payload.
			if (requestCounter === null) return;
			if (brickStore.get.autoSaveCounter !== requestCounter) {
				if (requestSnapshot) {
					brickStore.get.captureInitialSnapshot(requestSnapshot);
				}
				return;
			}

			// autoSaveCounter is a monotonic edit version for the active editor
			// session. The dirty snapshot, not a counter reset, represents saved.
			brickStore.get.captureInitialSnapshot();
		},
		onError: (errors) => {
			latestAutoSaveRequestCounter = null;
			latestAutoSaveSnapshot = null;
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

	const checkSingleVersionMutation = api.documents.useCheckSingleVersion({
		onSuccess: (data, params) => {
			if (
				params.requestCounter !== undefined &&
				brickStore.get.autoSaveCounter !== params.requestCounter
			) {
				return;
			}

			brickStore.set("fieldsErrors", []);
			brickStore.set("brickErrors", []);
			brickStore.get.mergeDraftCheckResponse(data.data);
		},
		onError: (errors, params) => {
			if (
				params.requestCounter !== undefined &&
				brickStore.get.autoSaveCounter !== params.requestCounter
			) {
				return;
			}

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

	const updateWorkflowMutation = api.documents.useUpdateWorkflow({
		silent: true,
	});

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
		scheduledAt?: string,
		scheduledTimezone?: string,
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
				scheduledAt,
				scheduledTimezone,
			},
		});
	};

	const createPublishOperationAction = async (
		targetVersionType: Exclude<DocumentVersionType, "revision">,
		comment?: string,
		assigneeIds?: number[],
		autoAccept?: boolean,
		scheduledAt?: string,
		scheduledTimezone?: string,
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
				scheduledAt,
				scheduledTimezone,
			},
		});
	};

	const restoreRevisionAction = async (versionIdOverride?: number) => {
		const versionId = versionIdOverride ?? props.versionId();
		const documentId = props.documentId();
		if (versionId === undefined) {
			console.error("No version ID found.");
			return;
		}
		if (documentId === undefined) {
			console.error("No document ID found.");
			return;
		}

		const res = await restoreRevision.action.mutateAsync({
			collectionKey: props.collectionKey(),
			id: documentId,
			versionId: versionId,
		});

		navigate(
			getDocumentRoute("edit", {
				collectionKey: props.collectionKey(),
				documentId,
				status: "latest",
			}),
		);

		return res;
	};

	const updateWorkflowAction = async (body: {
		stage?: string;
		assigneeIds?: number[];
	}) => {
		if (props.documentId() === undefined) {
			console.error("No document ID found.");
			return;
		}

		return await updateWorkflowMutation.action.mutateAsync({
			collectionKey: props.collectionKey(),
			id: props.documentId() as number,
			body,
		});
	};

	return {
		createDocumentMutation,
		createSingleVersionMutation,
		updateSingleVersionMutation,
		checkSingleVersionMutation,
		createPublishOperationMutation,
		updateWorkflowMutation,
		upsertDocumentAction,
		publishDocumentAction,
		createPublishOperationAction,
		autoSaveDocument,
		autoSaveMetadata,
		restoreRevision,
		restoreRevisionAction,
		updateWorkflowAction,
	};
}

export type UseDocumentMutations = ReturnType<typeof useDocumentMutations>;
