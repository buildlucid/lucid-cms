import type { Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore";
import T from "@/translations";

interface RestoreMediaBatchProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RestoreMediaBatch: Component<RestoreMediaBatchProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const restoreMedia = api.media.useRestore({
		onSuccess: () => {
			props.state.setOpen(false);
			mediaStore.get.reset();
		},
	});

	// ------------------------------
	// Render
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: restoreMedia.action.isPending,
				isError: restoreMedia.action.isError,
			}}
			copy={{
				title: T()("restore_items_modal_title"),
				description: T()("restore_items_modal_description"),
				error: restoreMedia.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					restoreMedia.action.mutate({
						body: {
							ids: mediaStore.get.selectedMedia,
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					restoreMedia.reset();
				},
			}}
		/>
	);
};

export default RestoreMediaBatch;
