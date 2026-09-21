import type { Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore/mediaStore";
import T from "@/translations";

interface RestoreMediaBatchProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RestoreMediaBatchModal: Component<RestoreMediaBatchProps> = (props) => {
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.restore.items.title")}
			description={T()("modals.common.restore.items.description")}
			confirmVariant="primary"
			loading={restoreMedia.action.isPending}
			error={restoreMedia.errors()?.message}
			onConfirm={() => {
				restoreMedia.action.mutate({
					body: {
						ids: mediaStore.get.selectedMedia,
					},
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				restoreMedia.reset();
			}}
		/>
	);
};

export default RestoreMediaBatchModal;
