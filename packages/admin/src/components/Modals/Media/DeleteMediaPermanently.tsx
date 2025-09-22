import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface DeleteMediaPermanentlyProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMediaPermanently: Component<DeleteMediaPermanentlyProps> = (
	props,
) => {
	// ----------------------------------------
	// Mutations
	const deleteMediaPermanently = api.media.useDeleteSinglePermanently({
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
				isLoading: deleteMediaPermanently.action.isPending,
				isError: deleteMediaPermanently.action.isError,
			}}
			copy={{
				title: T()("delete_media_permanently_modal_title"),
				description: T()("delete_media_permanently_modal_description"),
				error: deleteMediaPermanently.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					deleteMediaPermanently.action.mutate({
						id: id,
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

export default DeleteMediaPermanently;
