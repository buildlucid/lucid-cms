import T from "@/translations";
import type { Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface ClearAllProcessedImagesProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ClearAllProcessedImages: Component<ClearAllProcessedImagesProps> = (
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: clearAllProcessedImages.action.isPending,
				isError: clearAllProcessedImages.action.isError,
			}}
			copy={{
				title: T()("clear_all_processed_images_modal_title"),
				description: T()("clear_all_processed_images_modal_description"),
				error: clearAllProcessedImages.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					clearAllProcessedImages.action.mutate({});
				},
				onCancel: () => {
					props.state.setOpen(false);
					clearAllProcessedImages.reset();
				},
			}}
		/>
	);
};

export default ClearAllProcessedImages;
