import type { Component } from "solid-js";
import { createMemo, createSignal, Show } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore/mediaStore";
import T from "@/translations";

interface DeleteMediaBatchProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMediaBatchModal: Component<DeleteMediaBatchProps> = (props) => {
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.media.batch.title")}
			description={T()("modals.common.delete.media.batch.description")}
			loading={deleteMediaBatch.action.isPending}
			error={deleteMediaBatch.errors()?.message}
			onConfirm={() => {
				deleteMediaBatch.action.mutate({
					body: {
						folderIds: mediaStore.get.selectedFolders,
						mediaIds: mediaStore.get.selectedMedia,
						recursiveMedia: recursiveMedia(),
					},
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteMediaBatch.reset();
			}}
		>
			<Show when={!noFolderItemsSelected()}>
				<div class="bg-card p-4 rounded-md border border-border mb-4 md:mb-6">
					<Checkbox
						id="recursiveMedia"
						value={recursiveMedia()}
						onChange={(value) => {
							setRecursiveMedia(value);
						}}
						name="recursiveMedia"
						label={T()("media.folders.delete.recursive.label")}
						description={T()("media.folders.delete.recursive.description")}
					/>
				</div>
			</Show>
		</Modal.Confirm>
	);
};

export default DeleteMediaBatchModal;
