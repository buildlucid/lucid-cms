import { createMemo, createSignal, type Accessor } from "solid-js";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getBodyError } from "@/utils/error-helpers";
import contentLocaleStore from "@/store/contentLocaleStore";
import userStore from "@/store/userStore";
import type api from "@/services/api";
import type {
	BrickError,
	CollectionResponse,
	DocumentResponse,
	FieldError,
} from "@types";
import type { UseRevisionMutations } from "./useRevisionMutations";

export function useDocumentUIState(props: {
	collectionQuery: ReturnType<typeof api.collections.useGetSingle>;
	collection: Accessor<CollectionResponse | undefined>;
	documentQuery: ReturnType<typeof api.documents.useGetSingle>;
	document: Accessor<DocumentResponse | undefined>;
	mode: "create" | "edit" | "revisions";
	version: Accessor<"latest" | string>;
	createDocumentMutation?: ReturnType<typeof api.documents.useCreateSingle>;
	createSingleVersionMutation?: ReturnType<
		typeof api.documents.useCreateSingleVersion
	>;
	updateSingleVersionMutation?: ReturnType<
		typeof api.documents.useUpdateSingleVersion
	>;
	promoteToPublishedMutation?: ReturnType<
		typeof api.documents.usePromoteSingle
	>;
	selectedRevision?: Accessor<number | undefined>;
	restoreRevisionAction?: UseRevisionMutations["restoreRevisionAction"];
}) {
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const [getDeleteOpen, setDeleteOpen] = createSignal(false);
	const [getPanelOpen, setPanelOpen] = createSignal(false);

	/**
	 * Checkss if services requests are loading or not
	 */
	const isLoading = createMemo(() => {
		return props.collectionQuery.isLoading || props.documentQuery.isLoading;
	});

	/**
	 * Checks if loading the required resources was successful
	 */
	const isSuccess = createMemo(() => {
		if (props.mode === "create") {
			return props.collectionQuery.isSuccess;
		}
		return props.collectionQuery.isSuccess && props.documentQuery.isSuccess;
	});

	/**
	 * Checks if the documnet is saving
	 */
	const isSaving = createMemo(() => {
		return (
			props.createSingleVersionMutation?.action.isPending ||
			props.createDocumentMutation?.action.isPending
			// props.updateSingleVersionMutation?.action.isPending
		);
	});

	/**
	 * Checks if auto save is currently running
	 */
	const isAutoSaving = createMemo(() => {
		return props.updateSingleVersionMutation?.action.isPending || false;
	});

	/**
	 * Checks if the promote to published mutation is currently running
	 */
	const isPromotingToPublished = createMemo(() => {
		return props.promoteToPublishedMutation?.action.isPending || false;
	});

	/**
	 * Collates mutation errors for the update and create doc services
	 */
	const mutateErrors = createMemo(() => {
		return (
			props.createSingleVersionMutation?.errors() ||
			props.createDocumentMutation?.errors()
		);
	});

	/**
	 * Checks for any translations errors
	 */
	const brickTranslationErrors = createMemo(() => {
		return brickHelpers.hasErrorsOnOtherLocale({
			fieldErrors: getBodyError<FieldError[]>("fields", mutateErrors()) || [],
			brickErrors: getBodyError<BrickError[]>("bricks", mutateErrors()) || [],
			currentLocale: contentLocale() || "",
		});
	});

	/**
	 * Determines if the collection needs migrating
	 */
	const collectionNeedsMigrating = createMemo(() => {
		return props.collection()?.migrationStatus?.requiresMigration === true;
	});

	/**
	 * Determines if the auto save is enabled
	 */
	const useAutoSave = createMemo(() => {
		return props.collection()?.config.useAutoSave;
	});

	/**
	 * Determines if you can save the document
	 * - dont disabled the save button when auto-save is enabled. This allows users to create revisions.
	 */
	const canSaveDocument = createMemo(() => {
		if (useAutoSave()) return false;

		return !brickStore.get.documentMutated && !isSaving();
	});

	/**
	 * Determines if you can publish the document
	 */
	const canPublishDocument = createMemo(() => {
		// Fallback, if the document has been mutated and not saved
		return !brickStore.get.documentMutated && !isSaving() && !mutateErrors();
	});

	/**
	 * Determines if the builder should be locked
	 */
	const isBuilderLocked = createMemo(() => {
		if (props.mode === "revisions") return true;

		// lock builder if collection is locked
		if (props.collection()?.config.isLocked === true) {
			return true;
		}

		// lock builder if document is deleted
		if (props.document()?.isDeleted === true) {
			return true;
		}

		// lock version, if not the latest version
		if (props.version() !== "latest") {
			return true;
		}

		// builder not locked
		return false;
	});

	/**
	 * Checks if there is a published version of the document
	 */
	const isPublished = createMemo(() => {
		return (
			props.document()?.version?.published?.id !== null &&
			props.document()?.version?.published?.id !== undefined
		);
	});

	/**
	 * Determines if the revision navigation should show
	 */
	const showRevisionNavigation = createMemo(() => {
		// if (props.mode === "create") return false;
		return props.collection()?.config.useRevisions ?? false;
	});

	/**
	 * Determines when the upsert button should be visible
	 */
	const showUpsertButton = createMemo(() => {
		if (isBuilderLocked()) return false;

		if (props.mode === "create") return true;
		if (props.version() === "latest") return true;

		return false;
	});

	/**
	 * Determines if the publish button should be visible
	 */
	const showPublishButton = createMemo(() => {
		if (props.mode === "create" || isBuilderLocked()) return false;
		if (props.version() !== "latest") return false;
		return true;
	});

	/**
	 * Determines if the delete document button should be visible
	 */
	const showDeleteButton = createMemo(() => {
		if (props.document()?.isDeleted) return false;
		return props.mode === "edit" && props.collection()?.mode === "multiple";
	});

	/**
	 * Determines if the user should be able to save (update/create) documents
	 */
	const hasSavePermission = createMemo(() => {
		if (props.mode === "create") {
			return userStore.get.hasPermission(["create_content"]).all;
		}
		return userStore.get.hasPermission(["update_content"]).all;
	});

	/**
	 * Determines if the auto save should be enabled
	 */
	const hasAutoSavePermission = createMemo(() => {
		if (props.mode === "create") return false;
		if (props.mode === "revisions") return false;
		if (props.version() !== "latest") return false;
		if (props.document()?.isDeleted) return false;

		return (
			userStore.get.hasPermission(["update_content"]).all &&
			props.collection()?.config.useAutoSave
		);
	});

	/**
	 * Determines if the user has publish permission
	 */
	const hasPublishPermission = createMemo(() => {
		return userStore.get.hasPermission(["publish_content"]).all;
	});

	/**
	 * Determines if the user has delete permission
	 */
	const hasDeletePermission = createMemo(() => {
		return userStore.get.hasPermission(["delete_content"]).all;
	});

	/**
	 * Determines if the restore reviision button should be visible
	 */
	const showRestoreRevisionButton = createMemo(() => {
		if (props.document()?.isDeleted) return false;
		if (props.mode !== "revisions") return false;
		if (props.selectedRevision?.() === undefined) return false;
		if (!props.restoreRevisionAction) return false;
		return true;
	});

	/**
	 * Determines if the user has permission to restore documents
	 */
	const hasRestorePermission = createMemo(() => {
		return userStore.get.hasPermission(["restore_content"]).all;
	});

	// ------------------------------------------
	// Return
	return {
		getDeleteOpen,
		setDeleteOpen,
		getPanelOpen,
		setPanelOpen,
		isLoading,
		isSuccess,
		isSaving,
		isAutoSaving,
		brickTranslationErrors,
		canSaveDocument,
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
		showRestoreRevisionButton,
		hasRestorePermission,
		collectionNeedsMigrating,
		useAutoSave,
		hasAutoSavePermission,
		isPromotingToPublished,
	};
}
export type UseDocumentUIState = ReturnType<typeof useDocumentUIState>;
