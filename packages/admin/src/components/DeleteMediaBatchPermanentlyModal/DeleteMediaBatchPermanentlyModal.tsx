import type { Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.items.permanently.title")}
			description={T()("modals.common.delete.items.permanently.description")}
			loading={deleteMediaPermanently.action.isPending}
			error={deleteMediaPermanently.errors()?.message}
			onConfirm={() => {
				deleteMediaPermanently.action.mutate({
					body: {
						ids: mediaStore.get.selectedMedia,
					},
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteMediaPermanently.reset();
			}}
		/>
	);
};

export default DeleteMediaBatchPermanentlyModal;
