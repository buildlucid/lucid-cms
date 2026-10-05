import type { Collection, DocumentVersionType } from "@types";
import { type Accessor, createMemo, createSignal } from "solid-js";
import type api from "@/services/api";
import type { UseDocumentUIState } from "../useDocumentUIState/useDocumentUIState";

export function useDocumentHistoryUIState(props: {
	collectionQuery: ReturnType<typeof api.collections.useGetSingle>;
	collection: Accessor<Collection | undefined>;
}): UseDocumentUIState {
	const [getDeleteOpen, setDeleteOpen] = createSignal(false);
	const [getDuplicateOpen, setDuplicateOpen] = createSignal(false);
	const [getRestoreRevisionOpen, setRestoreRevisionOpen] = createSignal(false);
	const [getRestoreRevisionVersionId, setRestoreRevisionVersionId] =
		createSignal<number | null>(null);
	const [getPreviewOpen, setPreviewOpen] = createSignal(false);

	const [getReleaseEnvironmentOpen, setReleaseEnvironmentOpen] =
		createSignal(false);
	const [getReleaseEnvironmentTarget, setReleaseEnvironmentTarget] =
		createSignal<Exclude<DocumentVersionType, "revision"> | null>(null);
	const [getReleaseEnvironmentAction, setReleaseEnvironmentAction] =
		createSignal<"publish" | "compose" | null>(null);

	const isLoading = createMemo(() => {
		return props.collectionQuery.isLoading;
	});

	const isSuccess = createMemo(() => {
		return props.collectionQuery.isSuccess;
	});

	const isSaving = createMemo(() => false);

	const isAutoSaving = createMemo(() => false);

	const isPublishing = createMemo(() => false);

	const brickTranslationErrors = createMemo(() => false);

	const collectionNeedsMigrating = createMemo(() => {
		return props.collection()?.migrationStatus?.requiresMigration === true;
	});

	const autoSave = createMemo(() => {
		return props.collection()?.autoSave;
	});

	const isAutoSaveActive = createMemo(() => false);

	const saveDisabled = createMemo(() => true);

	const canPublishDocument = createMemo(() => false);

	const isBuilderLocked = createMemo(() => true);

	const isPublished = createMemo(() => false);

	const showRevisionNavigation = createMemo(() => true);

	const showUpsertButton = createMemo(() => false);

	const showPublishButton = createMemo(() => false);

	const showDeleteButton = createMemo(() => false);
	const showDuplicateButton = createMemo(() => false);
	const duplicateDisabled = createMemo(() => true);

	const hasSavePermission = createMemo(() => false);

	const hasAutoSavePermission = createMemo(() => false);

	const hasPublishPermission = createMemo(() => false);

	const hasDeletePermission = createMemo(() => false);
	const hasDuplicatePermission = createMemo(() => false);

	const showRestoreRevisionButton = createMemo(() => false);
	const showPreview = createMemo(() => false);

	const restorePermission = createMemo(() => undefined);

	const autoSaveUserEnabled = createMemo(() => false);

	// ------------------------------------------
	// Return
	return {
		getDeleteOpen,
		setDeleteOpen,
		getDuplicateOpen,
		setDuplicateOpen,
		getRestoreRevisionOpen,
		setRestoreRevisionOpen,
		getRestoreRevisionVersionId,
		setRestoreRevisionVersionId,
		getPreviewOpen,
		setPreviewOpen,
		getReleaseEnvironmentOpen,
		setReleaseEnvironmentOpen,
		getReleaseEnvironmentTarget,
		setReleaseEnvironmentTarget,
		getReleaseEnvironmentAction,
		setReleaseEnvironmentAction,
		isLoading,
		isSuccess,
		isSaving,
		isAutoSaving,
		brickTranslationErrors,
		saveDisabled,
		canPublishDocument,
		isBuilderLocked,
		isPublished,
		showRevisionNavigation,
		showUpsertButton,
		hasSavePermission,
		hasPublishPermission,
		showPublishButton,
		showDeleteButton,
		hasDeletePermission,
		showDuplicateButton,
		duplicateDisabled,
		hasDuplicatePermission,
		collectionNeedsMigrating,
		autoSave,
		hasAutoSavePermission,
		isPublishing,
		isAutoSaveActive,
		showRestoreRevisionButton,
		showPreview,
		restorePermission,
		autoSaveUserEnabled,
	};
}

export type UseDocumentHistoryUIState = ReturnType<
	typeof useDocumentHistoryUIState
>;
