import type { Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore/mediaStore";
import T from "@/translations";

interface DeleteMediaBatchPermanentlyProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMediaBatchPermanentlyModal: Component<
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
		<ConfirmationModal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteMediaPermanently.action.isPending,
				isError: deleteMediaPermanently.action.isError,
			}}
			copy={{
				title: T()("modals.common.delete.items.permanently.title"),
				description: T()("modals.common.delete.items.permanently.description"),
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

export default DeleteMediaBatchPermanentlyModal;
