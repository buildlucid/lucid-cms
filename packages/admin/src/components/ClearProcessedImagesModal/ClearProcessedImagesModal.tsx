import type { Accessor, Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
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
		<ConfirmationModal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: clearProcessed.action.isPending,
				isError: clearProcessed.action.isError,
			}}
			copy={{
				title: T()("modals.common.clear.processed.images.title"),
				description: T()("modals.common.clear.processed.images.description"),
				error: clearProcessed.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					clearProcessed.action.mutate({
						id: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					clearProcessed.reset();
				},
			}}
		/>
	);
};

export default ClearProcessedImagesModal;
