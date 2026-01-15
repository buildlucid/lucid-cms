import { useNavigate } from "@solidjs/router";
import type { CollectionResponse } from "@types";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import BrickImagePreview from "@/components/Modals/Bricks/ImagePreview";
import LinkSelectModal from "@/components/Modals/CustomField/LinkSelect";
import DeleteDocument from "@/components/Modals/Documents/DeleteDocument";
import ReleaseEnvironment from "@/components/Modals/Documents/ReleaseEnvironment";
import RestoreRevision from "@/components/Modals/Documents/RestoreRevision";
import NavigationGuard from "@/components/Modals/NavigationGuard";
import DocumentSelectPanel from "@/components/Panels/Documents/DocumentSelect";
import CreateUpdateMediaPanel from "@/components/Panels/Media/CreateUpdateMediaPanel";
import MediaSelectPanel from "@/components/Panels/Media/MediaSelect";
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
		const environments =
			props.hooks.state.collection()?.config.environments ?? [];
		const env = environments.find((e) => e.key === target);
		return helpers.getLocaleValue({ value: env?.name }) || target;
	});

	// ----------------------------------
	// Modal State Helpers
	const mediaSelectModal = createMemo(() =>
		pageBuilderModalsStore.getModal("mediaSelect"),
	);
	const mediaUploadModal = createMemo(() =>
		pageBuilderModalsStore.getModal("mediaUpload"),
	);
	const documentSelectModal = createMemo(() =>
		pageBuilderModalsStore.getModal("documentSelect"),
	);
	const linkSelectModal = createMemo(() =>
		pageBuilderModalsStore.getModal("linkSelect"),
	);

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
					setOpen: () => pageBuilderModalsStore.close(),
					extensions: mediaSelectModal()?.data.extensions,
					type: mediaSelectModal()?.data.type,
					selected: mediaSelectModal()?.data.selected,
				}}
				callbacks={{
					onSelect: (media) =>
						pageBuilderModalsStore.triggerAndClose("mediaSelect", media),
				}}
			/>
			<DocumentSelectPanel
				state={{
					open: documentSelectModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close(),
					collectionKey: documentSelectModal()?.data.collectionKey,
					selected: documentSelectModal()?.data.selected,
				}}
				callbacks={{
					onSelect: (document) =>
						pageBuilderModalsStore.triggerAndClose("documentSelect", document),
				}}
			/>
			<LinkSelectModal
				state={{
					open: linkSelectModal() !== undefined,
					setOpen: () => pageBuilderModalsStore.close(),
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
					setOpen: () => pageBuilderModalsStore.close(),
					parentFolderId: mediaUploadParentFolderId,
				}}
				callbacks={{
					onSuccess: (media) =>
						pageBuilderModalsStore.triggerAndClose("mediaUpload", media),
				}}
			/>
			<BrickImagePreview />
			<DeleteDocument
				id={props.hooks.state.document()?.id}
				state={{
					open: props.hooks.uiState.getDeleteOpen(),
					setOpen: props.hooks.uiState.setDeleteOpen,
				}}
				collection={
					props.hooks.state.collectionQuery?.data?.data as CollectionResponse
				}
				callbacks={{
					onSuccess: () => {
						navigate(
							`/admin/collections/${props.hooks.state.collectionQuery.data?.data.key}`,
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
				state={{
					open: props.hooks.uiState.getReleaseEnvironmentOpen(),
					setOpen: props.hooks.uiState.setReleaseEnvironmentOpen,
				}}
				loading={
					props.hooks.mutations.promoteToPublishedMutation.action.isPending
				}
				error={
					props.hooks.mutations.promoteToPublishedMutation.errors()?.message
				}
				callbacks={{
					onConfirm: async (target) => {
						await props.hooks.mutations.publishDocumentAction(target);
						navigate(
							getDocumentRoute("edit", {
								collectionKey: props.hooks.state.collectionKey(),
								documentId: props.hooks.state.documentId(),
								status: target,
							}),
						);
						props.hooks.uiState.setReleaseEnvironmentOpen(false);
						props.hooks.uiState.setReleaseEnvironmentTarget(null);
					},
					onCancel: () => {
						props.hooks.uiState.setReleaseEnvironmentOpen(false);
						props.hooks.uiState.setReleaseEnvironmentTarget(null);
						props.hooks.mutations.promoteToPublishedMutation.reset();
					},
				}}
			/>
		</>
	);
};
