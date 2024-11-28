import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface ClearProcessedImagesProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ClearProcessedImages: Component<ClearProcessedImagesProps> = (props) => {
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: clearProcessed.action.isPending,
				isError: clearProcessed.action.isError,
			}}
			copy={{
				title: T()("clear_processed_images_modal_title"),
				description: T()("clear_processed_images_modal_description"),
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

export default ClearProcessedImages;
