import type { Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface ClearAllProcessedImagesProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ClearAllProcessedImagesModal: Component<ClearAllProcessedImagesProps> = (
	props,
) => {
	// ----------------------------------------
	// Mutations
	const clearAllProcessedImages = api.media.useDeleteAllProcessedImages({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.clear.all.processed.images.title")}
			description={T()("modals.common.clear.all.processed.images.description")}
			loading={clearAllProcessedImages.action.isPending}
			error={clearAllProcessedImages.errors()?.message}
			onConfirm={() => {
				clearAllProcessedImages.action.mutate({});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				clearAllProcessedImages.reset();
			}}
		/>
	);
};

export default ClearAllProcessedImagesModal;
