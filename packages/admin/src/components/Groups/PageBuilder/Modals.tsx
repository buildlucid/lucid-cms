import { Show, type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import NavigationGuard from "@/components/Modals/NavigationGuard";
import MediaSelectModal from "@/components/Modals/Media/MediaSelect";
import DocumentSelectModal from "@/components/Modals/Documents/DocumentSelect";
import LinkSelectModal from "@/components/Modals/CustomField/LinkSelect";
import BrickImagePreview from "@/components/Modals/Bricks/ImagePreview";
import DeleteDocument from "@/components/Modals/Documents/DeleteDocument";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentState } from "@/hooks/document/useDocumentState";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import type { UseNavigationGuard } from "@/hooks/document/useNavigationGuard";
import type { CollectionResponse } from "@types";

export const Modals: Component<{
	hooks: {
		mutations: UseDocumentMutations;
		state: UseDocumentState;
		uiState: UseDocumentUIState;
		navigationGuard?: UseNavigationGuard;
	};
}> = (props) => {
	const navigate = useNavigate();

	// ----------------------------------
	// Render
	return (
		<>
			<Show when={props.hooks.navigationGuard}>
				{/* @ts-expect-error  */}
				<NavigationGuard state={props.hooks.navigationGuard} />
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
		</>
	);
};
