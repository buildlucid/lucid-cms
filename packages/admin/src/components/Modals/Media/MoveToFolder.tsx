import T from "@/translations";
import { createMemo, type Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

export type MoveToFolderParams = {
	mode: "media" | "folder";
	itemId: number | null;
	target: number | null;
};

const MoveToFolder: Component<{
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
	const isError = createMemo(
		() => moveMedia.action.isError || updateFolder.action.isError,
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
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: isLoading(),
				isError: isError(),
			}}
			copy={{
				title: isMedia()
					? T()("move_media_modal_title")
					: T()("move_folder_modal_title"),
				description: isMedia()
					? T()("move_media_modal_description")
					: T()("move_folder_modal_description"),
				error: errorMessage(),
			}}
			callbacks={{
				onConfirm: onConfirm,
				onCancel: () => {
					props.state.setOpen(false);
					moveMedia.reset();
					updateFolder.reset();
				},
			}}
		/>
	);
};

export default MoveToFolder;
