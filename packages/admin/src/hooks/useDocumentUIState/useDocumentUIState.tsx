import type {
	Collection,
	DocumentVersionType,
	InternalCollectionDocument,
} from "@types";
import { type Accessor, createMemo, createSignal } from "solid-js";
import { Permissions } from "@/constants/permissions";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import type api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import userStore from "@/store/userStore/userStore";
import brickHelpers from "@/utils/brick-helpers";
import { getDocumentCreateActions } from "@/utils/requests";
import { createDocumentLocalization } from "../useDocumentLocalization/useDocumentLocalization";
import useUserPreference from "../useUserPreference/useUserPreference";

export function useDocumentUIState(props: {
	collectionQuery: ReturnType<typeof api.collections.useGetSingle>;
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentQuery: ReturnType<typeof api.documents.useGetSingle>;
	document: Accessor<InternalCollectionDocument | undefined>;
	mode: "create" | "edit" | "history";
	version: Accessor<"latest" | string>;
	versionId: Accessor<number | undefined>;
	proposalEditable?: Accessor<boolean>;
	createDocumentMutation?: ReturnType<typeof api.documents.useCreateSingle>;
	requestCreationMutation?: ReturnType<typeof api.documents.useRequestCreation>;
	createSingleVersionMutation?: ReturnType<
		typeof api.documents.useCreateSingleVersion
	>;
	updateSingleVersionMutation?: ReturnType<
		typeof api.documents.useUpdateSingleVersion
	>;
	publishMutation?: ReturnType<typeof api.documents.usePublishSingle>;
}) {
	const brickStore = useBrickStore();
	const { contentLocale } = createDocumentLocalization(props.collection);
	const [getDeleteOpen, setDeleteOpen] = createSignal(false);
	const [getUnpublishOpen, setUnpublishOpen] = createSignal(false);
	const [getDuplicateOpen, setDuplicateOpen] = createSignal(false);
	const [getRestoreRevisionOpen, setRestoreRevisionOpen] = createSignal(false);
	const [getRestoreRevisionVersionId, setRestoreRevisionVersionId] =
		createSignal<number | null>(null);
	const [autoSaveUserEnabled] = useUserPreference({
		value: userPreferencesStore.getAutoSaveEnabled,
		setValue: userPreferencesStore.setAutoSaveEnabled,
		defaultValue: true,
	});
	const [getPreferredPreviewOpen, setPreviewOpen] = useUserPreference({
		value: () =>
			props.collectionKey()
				? userPreferencesStore.getCollectionPreviewOpen(props.collectionKey())
				: undefined,
		setValue: (open) => {
			if (props.collectionKey()) {
				userPreferencesStore.setCollectionPreviewOpen(
					props.collectionKey(),
					open,
				);
			}
		},
		defaultValue: false,
	});

	const [getRequestCreationOpen, setRequestCreationOpen] = createSignal(false);
	const [getReleaseEnvironmentOpen, setReleaseEnvironmentOpen] =
		createSignal(false);
	const [getReleaseEnvironmentTarget, setReleaseEnvironmentTarget] =
		createSignal<Exclude<DocumentVersionType, "revision"> | null>(null);
	const [getReleaseEnvironmentAction, setReleaseEnvironmentAction] =
		createSignal<"publish" | "compose" | null>(null);

	const isLoading = createMemo(() => {
		return props.collectionQuery.isLoading || props.documentQuery.isLoading;
	});

	const isSuccess = createMemo(() => {
		if (props.mode === "create") {
			return props.collectionQuery.isSuccess;
		}
		return props.collectionQuery.isSuccess && props.documentQuery.isSuccess;
	});

	const isSaving = createMemo(() => {
		return (
			props.createSingleVersionMutation?.action.isPending ||
			props.createDocumentMutation?.action.isPending ||
			props.requestCreationMutation?.action.isPending
		);
	});

	const isAutoSaving = createMemo(() => {
		return props.updateSingleVersionMutation?.action.isPending || false;
	});

	const isPublishing = createMemo(() => {
		return props.publishMutation?.action.isPending || false;
	});

	const mutateErrors = createMemo(() => {
		return (
			props.updateSingleVersionMutation?.errors() ||
			props.createSingleVersionMutation?.errors() ||
			props.createDocumentMutation?.errors() ||
			props.requestCreationMutation?.errors()
		);
	});

	const brickTranslationErrors = createMemo(() => {
		return brickHelpers.hasErrorsOnOtherLocale({
			fieldErrors: brickStore.get.fieldsErrors,
			brickErrors: brickStore.get.brickErrors,
			currentLocale: contentLocale() || "",
		});
	});

	const collectionNeedsMigrating = createMemo(() => {
		return props.collection()?.migrationStatus?.requiresMigration === true;
	});

	const autoSave = createMemo(() => {
		return props.collection()?.autoSave;
	});

	/** Proposals follow their request's edit access, which also covers people requesting a document. */
	const hasUpdateAccess = createMemo(() => {
		if (props.version() === "proposal")
			return props.proposalEditable?.() === true;

		const permission = props.collection()?.permissions.update;
		if (!permission) return false;

		return userStore.get.hasPermission([permission]).all;
	});

	const isAutoSaveActive = createMemo(() => {
		if (props.version() === "proposal" && props.proposalEditable?.() !== true) {
			return false;
		}
		if (props.mode === "create") return false;
		if (props.mode === "history") return false;
		if (props.version() !== "latest" && props.version() !== "proposal") {
			return false;
		}
		if (props.document()?.isDeleted) return false;

		return hasUpdateAccess() && autoSave() && autoSaveUserEnabled();
	});

	const saveDisabled = createMemo(() => {
		if (isAutoSaveActive()) {
			return isSaving() || isAutoSaving() || brickStore.getDocumentMutated();
		}
		return !brickStore.getDocumentMutated() || isSaving();
	});

	const canPublishDocument = createMemo(() => {
		// Fallback, if the document has been mutated and not saved
		return !brickStore.getDocumentMutated() && !isSaving() && !mutateErrors();
	});

	const isBuilderLocked = createMemo(() => {
		if (props.mode === "history") return true;
		if (props.version() === "proposal" && props.proposalEditable?.() !== true) {
			return true;
		}

		if (props.collection()?.locked === true) {
			return true;
		}

		if (props.document()?.isDeleted === true) {
			return true;
		}

		if (props.version() !== "latest" && props.version() !== "proposal") {
			return true;
		}

		return false;
	});

	const isPublished = createMemo(() => {
		return (
			props.document()?.versions?.published?.id !== null &&
			props.document()?.versions?.published?.id !== undefined
		);
	});

	const showRevisionNavigation = createMemo(() => {
		return Boolean(props.collection()?.revisions.enabled);
	});

	const showUpsertButton = createMemo(() => {
		if (isBuilderLocked()) return false;

		if (props.mode === "create") return true;
		if (props.version() === "latest" || props.version() === "proposal") {
			return true;
		}

		return false;
	});

	const showPublishButton = createMemo(() => {
		if (props.mode === "create" || isBuilderLocked()) return false;
		if (props.version() !== "latest" && props.version() !== "proposal") {
			return false;
		}
		return true;
	});

	const showDeleteButton = createMemo(() => {
		if (props.version() === "proposal" || props.version() === "snapshot") {
			return false;
		}
		if (props.document()?.isDeleted) return false;
		return props.mode === "edit" && props.collection()?.mode === "multiple";
	});

	/** The environment being viewed, when the document is published to it. */
	const unpublishTarget = createMemo(() => {
		const version = props.version();
		if (props.mode !== "edit" || props.document()?.isDeleted) return undefined;
		if (props.collection()?.locked) return undefined;

		const isEnvironment = props
			.collection()
			?.publishing.targets.some((environment) => environment.key === version);
		return isEnvironment && props.document()?.versions[version]
			? version
			: undefined;
	});

	/** Unpublishing directly needs publish access, while requesting it needs update or unpublish request access. */
	const hasUnpublishPermission = createMemo(() => {
		const permissions = props.collection()?.permissions;
		if (!permissions) return false;

		return (
			userStore.get.hasPermission([permissions.publish]).all ||
			(userStore.get.hasPermission([Permissions.RequestsRead]).all &&
				userStore.get.hasPermission([
					permissions.update,
					permissions["unpublish-request"],
				]).some)
		);
	});

	const showDuplicateButton = createMemo(() => {
		if (props.mode !== "edit") return false;
		if (props.version() !== "latest") return false;
		if (props.document()?.isDeleted) return false;
		if (props.collection()?.locked) return false;
		return props.collection()?.mode === "multiple";
	});

	/**
	 * Prevents duplication until the latest local changes have been persisted
	 */
	const duplicateDisabled = createMemo(
		() => brickStore.getDocumentMutated() || isSaving() || isAutoSaving(),
	);

	/** How the create screen can add the document, default first: create it or request it. */
	const createActions = createMemo(() =>
		getDocumentCreateActions(props.collection()),
	);

	const hasSavePermission = createMemo(() => {
		if (props.mode === "create") return createActions().length > 0;
		return hasUpdateAccess();
	});

	const hasAutoSavePermission = createMemo(() => {
		if (props.version() === "proposal" && props.proposalEditable?.() !== true) {
			return false;
		}
		if (props.mode === "create") return false;
		if (props.mode === "history") return false;
		if (props.version() !== "latest" && props.version() !== "proposal") {
			return false;
		}
		if (props.document()?.isDeleted) return false;

		return hasUpdateAccess() && props.collection()?.autoSave;
	});

	const hasPublishPermission = createMemo(() => {
		const target = getReleaseEnvironmentTarget();

		const environmentPermission = props
			.collection()
			?.publishing.targets.find((environment) => environment.key === target)
			?.permissions.publish;

		const permission =
			target !== null
				? environmentPermission
				: props.collection()?.permissions.publish;
		if (!permission) return false;

		return userStore.get.hasPermission([permission]).all;
	});

	/** Deleting directly or requesting deletion, the modal offers whichever is allowed. */
	const hasDeletePermission = createMemo(() => {
		const permissions = props.collection()?.permissions;
		if (!permissions) return false;

		return (
			userStore.get.hasPermission([permissions.delete]).all ||
			(userStore.get.hasPermission([Permissions.RequestsRead]).all &&
				userStore.get.hasPermission([permissions["delete-request"]]).all)
		);
	});

	/**
	 * Duplicating reads the source and creates a new document
	 */
	const hasDuplicatePermission = createMemo(() => {
		const permissions = props.collection()?.permissions;
		if (!permissions) return false;

		return userStore.get.hasPermission([permissions.read, permissions.create])
			.all;
	});

	const showRestoreRevisionButton = createMemo(() => {
		if (props.mode === "create") return false;
		if (props.mode === "history") return false;
		if (props.version() !== "revision") return false;
		if (props.document()?.isDeleted) return false;
		if (props.collection()?.revisions.enabled === false) return false;
		if (props.versionId() === undefined) return false;
		return true;
	});

	const showPreview = createMemo(() => {
		const version = props.version();
		const requiresVersionId =
			version === "revision" ||
			version === "snapshot" ||
			version === "proposal";

		return (
			props.mode === "edit" &&
			props.document()?.id !== undefined &&
			(!requiresVersionId || props.versionId() !== undefined) &&
			props.document()?.isDeleted !== true &&
			props.collection()?.capabilities.preview === true
		);
	});
	const getPreviewOpen = createMemo(
		() => showPreview() && getPreferredPreviewOpen(),
	);

	const restorePermission = createMemo(
		() => props.collection()?.permissions.restore,
	);

	// ------------------------------------------
	// Return
	return {
		getDeleteOpen,
		setDeleteOpen,
		getUnpublishOpen,
		setUnpublishOpen,
		getDuplicateOpen,
		setDuplicateOpen,
		getRestoreRevisionOpen,
		setRestoreRevisionOpen,
		getRestoreRevisionVersionId,
		setRestoreRevisionVersionId,
		getPreviewOpen,
		setPreviewOpen,
		getRequestCreationOpen,
		setRequestCreationOpen,
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
		createActions,
		hasSavePermission,
		hasPublishPermission,
		showPublishButton,
		showDeleteButton,
		hasDeletePermission,
		unpublishTarget,
		hasUnpublishPermission,
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
export type UseDocumentUIState = ReturnType<typeof useDocumentUIState>;
