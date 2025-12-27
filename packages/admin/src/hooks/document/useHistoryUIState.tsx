import type { CollectionResponse, DocumentVersionType } from "@types";
import { type Accessor, createMemo, createSignal } from "solid-js";
import type api from "@/services/api";
import type { UseDocumentUIState } from "./useDocumentUIState";

export function useHistoryUIState(props: {
	collectionQuery: ReturnType<typeof api.collections.useGetSingle>;
	collection: Accessor<CollectionResponse | undefined>;
}): UseDocumentUIState {
	const [getDeleteOpen, setDeleteOpen] = createSignal(false);
	const [getRestoreRevisionOpen, setRestoreRevisionOpen] = createSignal(false);
	const [getRestoreRevisionVersionId, setRestoreRevisionVersionId] =
		createSignal<number | null>(null);

	const [getReleaseEnvironmentOpen, setReleaseEnvironmentOpen] =
		createSignal(false);
	const [getReleaseEnvironmentTarget, setReleaseEnvironmentTarget] =
		createSignal<Exclude<DocumentVersionType, "revision"> | null>(null);

	/**
	 * Checks if services requests are loading or not
	 */
	const isLoading = createMemo(() => {
		return props.collectionQuery.isLoading;
	});

	/**
	 * Checks if loading the required resources was successful
	 */
	const isSuccess = createMemo(() => {
		return props.collectionQuery.isSuccess;
	});

	/**
	 * Checks if the document is saving - always false for history
	 */
	const isSaving = createMemo(() => false);

	/**
	 * Checks if auto save is currently running - always false for history
	 */
	const isAutoSaving = createMemo(() => false);

	/**
	 * Checks if the promote to published mutation is currently running - always false for history
	 */
	const isPromotingToPublished = createMemo(() => false);

	/**
	 * Checks for any translations errors - always false for history
	 */
	const brickTranslationErrors = createMemo(() => false);

	/**
	 * Determines if the collection needs migrating
	 */
	const collectionNeedsMigrating = createMemo(() => {
		return props.collection()?.migrationStatus?.requiresMigration === true;
	});

	/**
	 * Determines if the auto save is enabled on the collection
	 */
	const useAutoSave = createMemo(() => {
		return props.collection()?.config.useAutoSave;
	});

	/**
	 * Determines if auto-save is actively running - always false for history
	 */
	const isAutoSaveActive = createMemo(() => false);

	/**
	 * Determines if the save button should be disabled - always true for history
	 */
	const saveDisabled = createMemo(() => true);

	/**
	 * Determines if you can publish the document - always false for history
	 */
	const canPublishDocument = createMemo(() => false);

	/**
	 * Determines if the builder should be locked - always true for history
	 */
	const isBuilderLocked = createMemo(() => true);

	/**
	 * Checks if there is a published version of the document - always false for history
	 */
	const isPublished = createMemo(() => false);

	/**
	 * Determines if the revision navigation should show
	 */
	const showRevisionNavigation = createMemo(() => true);

	/**
	 * Determines when the upsert button should be visible - always false for history
	 */
	const showUpsertButton = createMemo(() => false);

	/**
	 * Determines if the publish button should be visible - always false for history
	 */
	const showPublishButton = createMemo(() => false);

	/**
	 * Determines if the delete document button should be visible - always false for history
	 */
	const showDeleteButton = createMemo(() => false);

	/**
	 * Determines if the user should be able to save - always false for history
	 */
	const hasSavePermission = createMemo(() => false);

	/**
	 * Determines if the auto save should be enabled - always false for history
	 */
	const hasAutoSavePermission = createMemo(() => false);

	/**
	 * Determines if the user has publish permission - always false for history
	 */
	const hasPublishPermission = createMemo(() => false);

	/**
	 * Determines if the user has delete permission - always false for history
	 */
	const hasDeletePermission = createMemo(() => false);

	/**
	 * Determines if the restore revision button should be visible - always false for history
	 */
	const showRestoreRevisionButton = createMemo(() => false);

	/**
	 * Determines if the user has permission to restore documents - always false for history
	 */
	const hasRestorePermission = createMemo(() => false);

	/**
	 * Determines if the auto save user is enabled - always false for history
	 */
	const autoSaveUserEnabled = createMemo(() => false);

	// ------------------------------------------
	// Return
	return {
		getDeleteOpen,
		setDeleteOpen,
		getRestoreRevisionOpen,
		setRestoreRevisionOpen,
		getRestoreRevisionVersionId,
		setRestoreRevisionVersionId,
		getReleaseEnvironmentOpen,
		setReleaseEnvironmentOpen,
		getReleaseEnvironmentTarget,
		setReleaseEnvironmentTarget,
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
		collectionNeedsMigrating,
		useAutoSave,
		hasAutoSavePermission,
		isPromotingToPublished,
		isAutoSaveActive,
		showRestoreRevisionButton,
		hasRestorePermission,
		autoSaveUserEnabled,
	};
}

export type UseHistoryUIState = ReturnType<typeof useHistoryUIState>;
