import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface ClearProcessedImagesProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ClearProcessedImagesModal: Component<ClearProcessedImagesProps> = (
	props,
) => {
	// ----------------------------------------
	// Mutations
	const clearProcessed = api.media.useDeleteProcessedImages({
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
			title={T()("modals.common.clear.processed.images.title")}
			description={T()("modals.common.clear.processed.images.description")}
			loading={clearProcessed.action.isPending}
			error={clearProcessed.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				clearProcessed.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				clearProcessed.reset();
			}}
		/>
	);
};

export default ClearProcessedImagesModal;
