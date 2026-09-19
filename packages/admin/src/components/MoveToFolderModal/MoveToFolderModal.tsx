import { type Component, createMemo } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

export type MoveToFolderParams = {
	mode: "media" | "folder";
	itemId: number | null;
	target: number | null;
};

const MoveToFolderModal: Component<{
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
		params: MoveToFolderParams;
	};
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const moveMedia = api.media.useMoveFolder({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});
	const updateFolder = api.mediaFolders.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Memos
	const isMedia = createMemo(() => props.state.params.mode === "media");
	const isLoading = createMemo(
		() => moveMedia.action.isPending || updateFolder.action.isPending,
	);
	const errorMessage = createMemo(
		() => moveMedia.errors()?.message || updateFolder.errors()?.message,
	);

	// ----------------------------------------
	// Handlers
	const onConfirm = () => {
		if (props.state.params.mode === "media") {
			if (!props.state.params.itemId)
				return console.error("No media id provided");
			moveMedia.action.mutate({
				id: props.state.params.itemId,
				body: { folderId: props.state.params.target ?? null },
			});
			return;
		}

		if (!props.state.params.itemId)
			return console.error("No folder id provided");
		updateFolder.action.mutate({
			id: props.state.params.itemId,
			body: { parentFolderId: props.state.params.target ?? null },
		});
	};

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={
				isMedia()
					? T()("modals.common.move.media.title")
					: T()("modals.common.move.folder.title")
			}
			description={
				isMedia()
					? T()("modals.common.move.media.description")
					: T()("modals.common.move.folder.description")
			}
			confirmVariant="primary"
			loading={isLoading()}
			error={errorMessage()}
			onConfirm={onConfirm}
			onCancel={() => {
				props.state.setOpen(false);
				moveMedia.reset();
				updateFolder.reset();
			}}
		/>
	);
};

export default MoveToFolderModal;
