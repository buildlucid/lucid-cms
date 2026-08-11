import { useNavigate } from "@solidjs/router";
import type { Collection } from "@types";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import LinkSelectModal from "@/components/Modals/CustomField/LinkSelect";
import CreatePublishRequest from "@/components/Modals/Documents/CreatePublishRequest";
import DeleteDocument from "@/components/Modals/Documents/DeleteDocument";
import DuplicateDocument from "@/components/Modals/Documents/DuplicateDocument";
import ReleaseEnvironment from "@/components/Modals/Documents/ReleaseEnvironment";
import RestoreRevision from "@/components/Modals/Documents/RestoreRevision";
import NavigationGuard from "@/components/Modals/NavigationGuard";
import DocumentSelectPanel from "@/components/Panels/Documents/DocumentSelect";
import EmbeddedBrickEditPanel from "@/components/Panels/Documents/EmbeddedBrickEdit";
import CreateUpdateMediaPanel from "@/components/Panels/Media/CreateUpdateMediaPanel";
import MediaSelectPanel from "@/components/Panels/Media/MediaSelect";
import RichTextVariableSelectPanel from "@/components/Panels/RichText/RichTextVariableSelect";
import UserSelectPanel from "@/components/Panels/User/UserSelect";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentState } from "@/hooks/document/useDocumentState";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import type { UseNavigationGuard } from "@/hooks/document/useNavigationGuard";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

export const Modals: Component<{
	hooks: {
		mutations: UseDocumentMutations;
		state: UseDocumentState;
		uiState: UseDocumentUIState;
		navigationGuard?: UseNavigationGuard;
	};
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [mediaUploadParentFolderId] = createSignal<number | undefined>(
		undefined,
	);

	// ----------------------------------
	// Memos
	const environmentLabel = createMemo(() => {
		const target = props.hooks.uiState.getReleaseEnvironmentTarget();
		if (!target) return "";
		const environments = props.hooks.state.collection()?.environments ?? [];
		const env = environments.find((e) => e.key === target);
		return helpers.getLocaleValue({ value: env?.name }) || target;
	});
	const releaseEnvironmentIsOpen = createMemo(
		() =>
			props.hooks.uiState.getReleaseEnvironmentOpen() &&
			props.hooks.uiState.getReleaseEnvironmentAction() === "publish",
	);
	const publishRequestIsOpen = createMemo(
		() =>
			props.hooks.uiState.getReleaseEnvironmentOpen() &&
			props.hooks.uiState.getReleaseEnvironmentAction() === "request",
	);
	const mediaSelectModal = createMemo(() =>
		pageBuilderModalsStore.getModal("mediaSelect"),
	);
	const mediaUploadModal = createMemo(() =>
		pageBuilderModalsStore.getModal("mediaUpload"),
	);
	const documentSelectModal = createMemo(() =>
		pageBuilderModalsStore.getModal("documentSelect"),
	);
	const richTextVariableSelectModal = createMemo(() =>
		pageBuilderModalsStore.getModal("richTextVariableSelect"),
	);
	const embeddedBrickEditModal = createMemo(() =>
		pageBuilderModalsStore.getModal("embeddedBrickEdit"),
	);
	const nestedPanelZIndex = createMemo(() =>
		pageBuilderModalsStore.get.parent
			? (() => {
					const data = pageBuilderModalsStore.get.parent?.data;
					return data && "zIndex" in data && typeof data.zIndex === "number"
						? data.zIndex + 4
						: 44;
				})()
			: undefined,
	);
	const mediaUploadAccept = createMemo(() => {
		const data = mediaUploadModal()?.data;
		if (!data) return undefined;
		const extensions = data.extensions
			?.split(",")
			.map((extension) => extension.trim().replace(/^\./, ""))
			.filter(Boolean);
		if (extensions?.length) {
			return extensions.map((extension) => `.${extension}`).join(",");
		}
		const types = data.types?.length
			? data.types
			: data.type
				? [data.type]
				: [];
		return types.length
			? Array.from(new Set(types))
					.map((type) => `${type}/*`)
					.join(",")
			: undefined;
	});
	const userSelectModal = createMemo(() =>
		pageBuilderModalsStore.getModal("userSelect"),
	);
	const linkSelectModal = createMemo(() =>
		pageBuilderModalsStore.getModal("linkSelect"),
	);

	// ----------------------------------
	// Functions
	const resetReleaseState = () => {
		props.hooks.uiState.setReleaseEnvironmentOpen(false);
		props.hooks.uiState.setReleaseEnvironmentTarget(null);
		props.hooks.uiState.setReleaseEnvironmentAction(null);
	};

	// ----------------------------------
	// Render
	return (
		<>
			<Show when={props.hooks.navigationGuard}>
				{(navigationGuard) => <NavigationGuard state={navigationGuard()} />}
			</Show>
			<MediaSelectPanel
				state={{
					open: mediaSelectModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close("mediaSelect"),
					zIndex: mediaSelectModal()?.data.zIndex ?? nestedPanelZIndex(),
					extensions: mediaSelectModal()?.data.extensions,
					type: mediaSelectModal()?.data.type,
					types: mediaSelectModal()?.data.types,
					width: mediaSelectModal()?.data.width,
					height: mediaSelectModal()?.data.height,
					multiple: mediaSelectModal()?.data.multiple,
					selected: mediaSelectModal()?.data.selected,
					selectedRefs: mediaSelectModal()?.data.selectedRefs,
				}}
				callbacks={{
					onSelect: (selection) =>
						pageBuilderModalsStore.triggerAndClose("mediaSelect", selection),
				}}
			/>
			<DocumentSelectPanel
				state={{
					open: documentSelectModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close("documentSelect"),
					collectionKeys: documentSelectModal()?.data.collectionKeys,
					multiple: documentSelectModal()?.data.multiple,
					selected: documentSelectModal()?.data.selected,
					selectedRefs: documentSelectModal()?.data.selectedRefs,
					excludeDocument: documentSelectModal()?.data.excludeDocument,
					zIndex: documentSelectModal()?.data.zIndex ?? nestedPanelZIndex(),
				}}
				callbacks={{
					onSelect: (selection) =>
						pageBuilderModalsStore.triggerAndClose("documentSelect", selection),
				}}
			/>
			<RichTextVariableSelectPanel
				state={{
					open: richTextVariableSelectModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close("richTextVariableSelect"),
					zIndex:
						richTextVariableSelectModal()?.data.zIndex ?? nestedPanelZIndex(),
					collectionKeys:
						richTextVariableSelectModal()?.data.collectionKeys ?? [],
					userFields: richTextVariableSelectModal()?.data.userFields ?? [],
					selected: richTextVariableSelectModal()?.data.selected,
					selectedDocumentRef:
						richTextVariableSelectModal()?.data.selectedDocumentRef,
					selectedUserRef: richTextVariableSelectModal()?.data.selectedUserRef,
				}}
				callbacks={{
					onSelect: (selection) =>
						pageBuilderModalsStore.triggerAndClose(
							"richTextVariableSelect",
							selection,
						),
				}}
			/>
			<EmbeddedBrickEditPanel
				state={{
					open: embeddedBrickEditModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close("embeddedBrickEdit"),
					brickRef: embeddedBrickEditModal()?.data.brickRef,
					zIndex: embeddedBrickEditModal()?.data.zIndex ?? nestedPanelZIndex(),
				}}
				collection={props.hooks.state.collection()}
				documentId={props.hooks.state.document()?.id}
			/>
			<UserSelectPanel
				state={{
					open: userSelectModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close("userSelect"),
					zIndex: nestedPanelZIndex(),
					multiple: userSelectModal()?.data.multiple,
					selected: userSelectModal()?.data.selected,
					selectedRefs: userSelectModal()?.data.selectedRefs,
				}}
				callbacks={{
					onSelect: (selection) =>
						pageBuilderModalsStore.triggerAndClose("userSelect", selection),
				}}
			/>
			<LinkSelectModal
				state={{
					open: linkSelectModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close("linkSelect"),
					selectedLink: linkSelectModal()?.data.selectedLink ?? null,
				}}
				callbacks={{
					onSelect: (link) =>
						pageBuilderModalsStore.triggerAndClose("linkSelect", link),
				}}
			/>
			<CreateUpdateMediaPanel
				state={{
					open: mediaUploadModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close("mediaUpload"),
					parentFolderId: mediaUploadParentFolderId,
					accept: mediaUploadAccept(),
					zIndex: mediaUploadModal()?.data.zIndex ?? nestedPanelZIndex(),
				}}
				callbacks={{
					onSuccess: (media) =>
						pageBuilderModalsStore.triggerAndClose("mediaUpload", media),
				}}
			/>
			<DeleteDocument
				id={props.hooks.state.document()?.id}
				state={{
					open: props.hooks.uiState.getDeleteOpen(),
					setOpen: props.hooks.uiState.setDeleteOpen,
				}}
				collection={props.hooks.state.collectionQuery?.data?.data as Collection}
				callbacks={{
					onSuccess: () => {
						navigate(
							`/lucid/collections/${props.hooks.state.collectionQuery.data?.data.key}`,
						);
					},
				}}
			/>
			<DuplicateDocument
				id={props.hooks.state.document()?.id}
				state={{
					open: props.hooks.uiState.getDuplicateOpen(),
					setOpen: props.hooks.uiState.setDuplicateOpen,
				}}
				collection={props.hooks.state.collectionQuery?.data?.data as Collection}
				callbacks={{
					onSuccess: (documentId) => {
						navigate(
							getDocumentRoute("edit", {
								collectionKey: props.hooks.state.collectionKey(),
								documentId,
							}),
						);
					},
				}}
			/>
			<RestoreRevision
				versionId={props.hooks.uiState.getRestoreRevisionVersionId}
				state={{
					open: props.hooks.uiState.getRestoreRevisionOpen(),
					setOpen: props.hooks.uiState.setRestoreRevisionOpen,
				}}
				loading={props.hooks.mutations.restoreRevision.action.isPending}
				error={props.hooks.mutations.restoreRevision.errors()?.message}
				callbacks={{
					onConfirm: async (versionId) => {
						await props.hooks.mutations.restoreRevisionAction(versionId);
						props.hooks.uiState.setRestoreRevisionOpen(false);
						props.hooks.uiState.setRestoreRevisionVersionId(null);
					},
					onCancel: () => {
						props.hooks.uiState.setRestoreRevisionOpen(false);
						props.hooks.uiState.setRestoreRevisionVersionId(null);
						props.hooks.mutations.restoreRevision.reset();
					},
				}}
			/>
			<ReleaseEnvironment
				target={props.hooks.uiState.getReleaseEnvironmentTarget}
				environmentLabel={environmentLabel}
				scheduling={() =>
					props.hooks.state.collection()?.capabilities.scheduling === true
				}
				state={{
					open: releaseEnvironmentIsOpen(),
					setOpen: props.hooks.uiState.setReleaseEnvironmentOpen,
				}}
				loading={
					props.hooks.mutations.createPublishOperationMutation.action.isPending
				}
				error={
					props.hooks.mutations.createPublishOperationMutation.errors()?.message
				}
				callbacks={{
					onConfirm: async (target, scheduledAt, scheduledTimezone) => {
						await props.hooks.mutations.publishDocumentAction(
							target,
							scheduledAt,
							scheduledTimezone,
						);
						if (!scheduledAt) {
							navigate(
								getDocumentRoute("edit", {
									collectionKey: props.hooks.state.collectionKey(),
									documentId: props.hooks.state.documentId(),
									version: target,
								}),
							);
						}
						resetReleaseState();
					},
					onCancel: () => {
						resetReleaseState();
						props.hooks.mutations.createPublishOperationMutation.reset();
					},
				}}
			/>
			<CreatePublishRequest
				target={props.hooks.uiState.getReleaseEnvironmentTarget}
				environmentLabel={environmentLabel}
				collection={props.hooks.state.collection}
				collectionKey={props.hooks.state.collectionKey}
				state={{
					open: publishRequestIsOpen(),
					setOpen: props.hooks.uiState.setReleaseEnvironmentOpen,
				}}
				loading={
					props.hooks.mutations.createPublishOperationMutation.action.isPending
				}
				error={
					props.hooks.mutations.createPublishOperationMutation.errors()?.message
				}
				callbacks={{
					onConfirm: async (
						target,
						comment,
						assigneeIds,
						autoAccept,
						scheduledAt,
						scheduledTimezone,
					) => {
						await props.hooks.mutations.createPublishOperationAction(
							target,
							comment,
							assigneeIds,
							autoAccept,
							scheduledAt,
							scheduledTimezone,
						);
						if (autoAccept && !scheduledAt) {
							navigate(
								getDocumentRoute("edit", {
									collectionKey: props.hooks.state.collectionKey(),
									documentId: props.hooks.state.documentId(),
									version: target,
								}),
							);
						}
						resetReleaseState();
					},
					onCancel: () => {
						resetReleaseState();
						props.hooks.mutations.createPublishOperationMutation.reset();
					},
				}}
			/>
		</>
	);
};
