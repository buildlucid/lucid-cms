import { useNavigate } from "@solidjs/router";
import type { Collection } from "@types";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import CreatePublishRequestModal from "@/components/CreatePublishRequestModal/CreatePublishRequestModal";
import CreateUpdateMediaPanel from "@/components/CreateUpdateMediaPanel/CreateUpdateMediaPanel";
import DeleteDocumentModal from "@/components/DeleteDocumentModal/DeleteDocumentModal";
import DocumentSelectPanel from "@/components/DocumentSelectPanel/DocumentSelectPanel";
import DuplicateDocumentModal from "@/components/DuplicateDocumentModal/DuplicateDocumentModal";
import EmbeddedBrickEditPanel from "@/components/EmbeddedBrickEditPanel/EmbeddedBrickEditPanel";
import LinkSelectModal from "@/components/LinkSelectModal/LinkSelectModal";
import MediaSelectPanel from "@/components/MediaSelectPanel/MediaSelectPanel";
import NavigationGuardModal from "@/components/NavigationGuardModal/NavigationGuardModal";
import ReleaseEnvironmentModal from "@/components/ReleaseEnvironmentModal/ReleaseEnvironmentModal";
import RestoreRevisionModal from "@/components/RestoreRevisionModal/RestoreRevisionModal";
import RichTextVariableSelectPanel from "@/components/RichTextVariableSelectPanel/RichTextVariableSelectPanel";
import UserSelectPanel from "@/components/UserSelectPanel/UserSelectPanel";
import type { UseDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
import type { UseDocumentState } from "@/hooks/useDocumentState/useDocumentState";
import type { UseDocumentUIState } from "@/hooks/useDocumentUIState/useDocumentUIState";
import type { UseNavigationGuard } from "@/hooks/useNavigationGuard/useNavigationGuard";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore/pageBuilderModalsStore";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

export const PageBuilderModals: Component<{
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
		const environments =
			props.hooks.state.collection()?.publishing.targets ?? [];
		const env = environments.find((e) => e.key === target);
		return helpers.getLocaleValue({ value: env?.label }) || target;
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
				{(navigationGuard) => (
					<NavigationGuardModal state={navigationGuard()} />
				)}
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
			<DeleteDocumentModal
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
			<DuplicateDocumentModal
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
			<RestoreRevisionModal
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
			<ReleaseEnvironmentModal
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
						resetReleaseState();
					},
					onCancel: () => {
						resetReleaseState();
						props.hooks.mutations.createPublishOperationMutation.reset();
					},
				}}
			/>
			<CreatePublishRequestModal
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
