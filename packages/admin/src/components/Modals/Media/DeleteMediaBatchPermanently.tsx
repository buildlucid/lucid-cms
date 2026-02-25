import type { Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore";
import T from "@/translations";

interface DeleteMediaBatchPermanentlyProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMediaBatchPermanently: Component<
	DeleteMediaBatchPermanentlyProps
> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteMediaPermanently = api.media.useDeleteMultiplePermanently({
		onSuccess: () => {
			props.state.setOpen(false);
			mediaStore.get.reset();
		},
	});

	// ------------------------------
	// Render
	return (
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteMediaPermanently.action.isPending,
				isError: deleteMediaPermanently.action.isError,
			}}
			copy={{
				title: T()("delete_items_permanently_modal_title"),
				description: T()("delete_items_permanently_modal_description"),
				error: deleteMediaPermanently.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					deleteMediaPermanently.action.mutate({
						body: {
							ids: mediaStore.get.selectedMedia,
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteMediaPermanently.reset();
				},
			}}
		/>
	);
};

export default DeleteMediaBatchPermanently;
