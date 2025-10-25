import T from "@/translations";
import type { Component } from "solid-js";
import { createMemo, createSignal, Show } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore";
import { CheckboxInput } from "@/components/Groups/Form/Checkbox";

interface DeleteMediaBatchProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMediaBatch: Component<DeleteMediaBatchProps> = (props) => {
	// ----------------------------------------
	// State
	const [recursiveMedia, setRecursiveMedia] = createSignal<boolean>(false);

	// ----------------------------------------
	// Mutations
	const deleteMediaBatch = api.media.useDeleteBatch({
		onSuccess: () => {
			props.state.setOpen(false);
			mediaStore.get.reset();
		},
	});
	// ---------------------------------------
	// Memos
	const noFolderItemsSelected = createMemo(
		() => mediaStore.get.selectedFolders.length === 0,
	);

	// ------------------------------
	// Render
	return (
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteMediaBatch.action.isPending,
				isError: deleteMediaBatch.action.isError,
			}}
			copy={{
				title: T()("delete_media_batch_modal_title"),
				description: T()("delete_media_batch_modal_description"),
				error: deleteMediaBatch.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					deleteMediaBatch.action.mutate({
						body: {
							folderIds: mediaStore.get.selectedFolders,
							mediaIds: mediaStore.get.selectedMedia,
							recursiveMedia: recursiveMedia(),
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteMediaBatch.reset();
				},
			}}
			options={{
				noContent: noFolderItemsSelected(),
			}}
		>
			<Show when={!noFolderItemsSelected()}>
				<div class="bg-card-base p-4 rounded-md border border-border">
					<CheckboxInput
						id="recursiveMedia"
						value={recursiveMedia()}
						onChange={(value) => {
							setRecursiveMedia(value);
						}}
						name="recursiveMedia"
						copy={{
							label: T()("recursive_media_deletion"),
							describedBy: T()("recursive_media_deletion_description"),
						}}
						theme="fit"
						noMargin={true}
					/>
				</div>
			</Show>
		</Confirmation>
	);
};

export default DeleteMediaBatch;
