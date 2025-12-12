import { Show, type Component, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import NavigationGuard from "@/components/Modals/NavigationGuard";
import MediaSelectModal from "@/components/Modals/Media/MediaSelect";
import DocumentSelectModal from "@/components/Modals/Documents/DocumentSelect";
import LinkSelectModal from "@/components/Modals/CustomField/LinkSelect";
import BrickImagePreview from "@/components/Modals/Bricks/ImagePreview";
import DeleteDocument from "@/components/Modals/Documents/DeleteDocument";
import ReleaseEnvironment from "@/components/Modals/Documents/ReleaseEnvironment";
import RestoreRevision from "@/components/Modals/Documents/RestoreRevision";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentState } from "@/hooks/document/useDocumentState";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import type { UseNavigationGuard } from "@/hooks/document/useNavigationGuard";
import type { CollectionResponse } from "@types";
import { getDocumentRoute } from "@/utils/route-helpers";
import helpers from "@/utils/helpers";

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
	// Render
	return (
		<>
			<Show when={props.hooks.navigationGuard}>
				{(navigationGuard) => <NavigationGuard state={navigationGuard()} />}
			</Show>
			<MediaSelectModal />
			<DocumentSelectModal />
			<LinkSelectModal />
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
