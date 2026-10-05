import { useNavigate } from "@solidjs/router";
import type { Collection } from "@types";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import CreateUpdateMediaDrawer from "@/components/CreateUpdateMediaDrawer/CreateUpdateMediaDrawer";
import DeleteDocumentModal from "@/components/DeleteDocumentModal/DeleteDocumentModal";
import DocumentSelectDrawer from "@/components/DocumentSelectDrawer/DocumentSelectDrawer";
import DuplicateDocumentModal from "@/components/DuplicateDocumentModal/DuplicateDocumentModal";
import EmbeddedBrickEditDrawer from "@/components/EmbeddedBrickEditDrawer/EmbeddedBrickEditDrawer";
import LinkSelectModal from "@/components/LinkSelectModal/LinkSelectModal";
import MediaSelectDrawer from "@/components/MediaSelectDrawer/MediaSelectDrawer";
import NavigationGuardModal from "@/components/NavigationGuardModal/NavigationGuardModal";
import ReleaseEnvironmentModal from "@/components/ReleaseEnvironmentModal/ReleaseEnvironmentModal";
import RestoreRevisionModal from "@/components/RestoreRevisionModal/RestoreRevisionModal";
import RichTextVariableSelectDrawer from "@/components/RichTextVariableSelectDrawer/RichTextVariableSelectDrawer";
import UserSelectDrawer from "@/components/UserSelectDrawer/UserSelectDrawer";
import type { UseDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
import type { UseDocumentState } from "@/hooks/useDocumentState/useDocumentState";
import type { UseDocumentUIState } from "@/hooks/useDocumentUIState/useDocumentUIState";
import type { UseNavigationGuard } from "@/hooks/useNavigationGuard/useNavigationGuard";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore/pageBuilderModalsStore";
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
			<MediaSelectDrawer
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
			<DocumentSelectDrawer
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
			<RichTextVariableSelectDrawer
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
			<EmbeddedBrickEditDrawer
				state={{
					open: embeddedBrickEditModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close("embeddedBrickEdit"),
					brickRef: embeddedBrickEditModal()?.data.brickRef,
					zIndex: embeddedBrickEditModal()?.data.zIndex ?? nestedPanelZIndex(),
				}}
				collection={props.hooks.state.collection()}
				documentId={props.hooks.state.document()?.id}
			/>
			<UserSelectDrawer
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
			<CreateUpdateMediaDrawer
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
			<Show when={props.hooks.state.documentId()}>
				{(documentId) => (
					<ReleaseEnvironmentModal
						open={props.hooks.uiState.getReleaseEnvironmentOpen()}
						setOpen={(open) => {
							if (open) return;
							resetReleaseState();
							props.hooks.mutations.publishMutation.reset();
						}}
						target={props.hooks.uiState.getReleaseEnvironmentTarget()}
						action={
							props.hooks.uiState.getReleaseEnvironmentAction() ?? "compose"
						}
						collection={props.hooks.state.collection()}
						document={{
							collectionKey: props.hooks.state.collectionKey(),
							documentId: documentId(),
						}}
						source="latest"
						publish={{
							loading: props.hooks.mutations.publishMutation.action.isPending,
							error: props.hooks.mutations.publishMutation.errors()?.message,
							onConfirm: async (target) => {
								await props.hooks.mutations.publishDocumentAction(target);
								resetReleaseState();
							},
						}}
					/>
				)}
			</Show>
		</>
	);
};
