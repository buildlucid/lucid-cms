import { createMemo, createSignal, createEffect, on } from "solid-js";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getBodyError } from "@/utils/error-helpers";
import contentLocaleStore from "@/store/contentLocaleStore";
import userStore from "@/store/userStore";
import type api from "@/services/api";
import type { BrickError, FieldError } from "@types";

export function useDocumentUIState({
	collection,
	doc,
	mode,
	version,
	createDocument,
	updateSingle,
}: {
	collection: ReturnType<typeof api.collections.useGetSingle>;
	doc: ReturnType<typeof api.documents.useGetSingle>;
	mode: "create" | "edit" | "revisions";
	version: "draft" | "published";
	createDocument: ReturnType<typeof api.documents.useCreateSingle>;
	updateSingle: ReturnType<typeof api.documents.useUpdateSingle>;
}) {
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const [getDeleteOpen, setDeleteOpen] = createSignal(false);
	const [getPanelOpen, setPanelOpen] = createSignal(false);

	// ------------------------------------------
	// Memos
	const isLoading = createMemo(() => {
		return collection.isLoading || doc.isLoading;
	});

	const isSuccess = createMemo(() => {
		if (mode === "create") {
			return collection.isSuccess;
		}
		return collection.isSuccess && doc.isSuccess;
	});

	const isSaving = createMemo(() => {
		return (
			updateSingle.action.isPending ||
			createDocument.action.isPending ||
			doc.isRefetching ||
			doc.isLoading
		);
	});

	const mutateErrors = createMemo(() => {
		return updateSingle.errors() || createDocument.errors();
	});

	const brickTranslationErrors = createMemo(() => {
		return brickHelpers.hasErrorsOnOtherLocale({
			fieldErrors: getBodyError<FieldError[]>("fields", mutateErrors()) || [],
			brickErrors: getBodyError<BrickError[]>("bricks", mutateErrors()) || [],
			currentLocale: contentLocale() || "",
		});
	});

	const canSaveDocument = createMemo(() => {
		return !brickStore.get.documentMutated && !isSaving();
	});

	const canPublishDocument = createMemo(() => {
		// If published promotedFrom is equal to the current draft versionId, then its already published
		if (
			doc.data?.data.version.published?.promotedFrom ===
			doc.data?.data.versionId
		)
			return false;

		// Fallback, if the document has been mutated and not saved
		return !brickStore.get.documentMutated && !isSaving() && !mutateErrors();
	});

	const isBuilderLocked = createMemo(() => {
		// lock builder if collection is locked
		if (collection.data?.data.config.isLocked === true) {
			return true;
		}

		// lock published version, if in edit mode and the collection supports drafts
		if (version === "published") {
			if (mode === "edit") {
				return collection.data?.data.config.useDrafts ?? false;
			}
		}

		// builder not locked
		return false;
	});

	const isPublished = createMemo(() => {
		return (
			doc.data?.data.version?.published?.id !== null &&
			doc.data?.data.version?.published?.id !== undefined
		);
	});

	const setDocumentState = () => {
		brickStore.get.reset();
		brickStore.set(
			"collectionTranslations",
			collection.data?.data.config.useTranslations || false,
		);
		brickStore.get.setBricks(doc.data?.data, collection.data?.data);
		brickStore.set("locked", isBuilderLocked());
	};

	/**
	 * Determines if users should be able to navigate to the published version
	 */
	const canNavigateToPublished = createMemo(() => {
		if (collection.data?.data?.config.useDrafts) {
			return isPublished();
		}
		if (mode === "revisions") return true;
		return isPublished();
	});

	/**
	 * Determines if the revision navigation should show
	 */
	const showRevisionNavigation = createMemo(() => {
		if (mode === "create") return false;
		return collection?.data?.data.config.useRevisions ?? false;
	});

	/**
	 * Determines when the upsert button should be visible
	 */
	const showUpsertButton = createMemo(() => {
		if (isBuilderLocked()) return false;

		if (mode === "create") return true;
		if (version === "draft") return true;
		if (
			version === "published" &&
			collection.data?.data?.config.useDrafts === false
		)
			return true;
		return false;
	});

	/**
	 * Determines if the publish button should be visible
	 */
	const showPublishButton = createMemo(() => {
		if (mode === "create" || isBuilderLocked()) return false;
		if (version === "published") return false;
		return true;
	});

	/**
	 * Determines if the delete document button should be visible
	 */
	const showDeleteButton = createMemo(() => {
		return mode === "edit" && collection.data?.data?.mode === "multiple";
	});

	/**
	 * Determines if the user should be able to save (update/create) documents
	 */
	const hasSavePermission = createMemo(() => {
		if (mode === "create") {
			return userStore.get.hasPermission(["create_content"]).all;
		}
		return userStore.get.hasPermission(["update_content"]).all;
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

	// ------------------------------------------
	// Effects to setup document state
	createEffect(
		on(
			() => doc.data,
			() => {
				setDocumentState();
			},
		),
	);
	createEffect(
		on(
			() => collection.isSuccess,
			() => {
				setDocumentState();
			},
		),
	);

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
		brickTranslationErrors,
		canSaveDocument,
		canPublishDocument,
		isBuilderLocked,
		isPublished,
		canNavigateToPublished,
		showRevisionNavigation,
		showUpsertButton,
		hasSavePermission,
		hasPublishPermission,
		showPublishButton,
		showDeleteButton,
		hasDeletePermission,
	};
}
export type UseDocumentUIState = ReturnType<typeof useDocumentUIState>;
