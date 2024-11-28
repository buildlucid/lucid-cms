import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface DeleteMediaProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMedia: Component<DeleteMediaProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteMedia = api.media.useDeleteSingle({
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
				isLoading: deleteMedia.action.isPending,
				isError: deleteMedia.action.isError,
			}}
			copy={{
				title: T()("delete_media_modal_title"),
				description: T()("delete_media_modal_description"),
				error: deleteMedia.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					deleteMedia.action.mutate({
						id: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteMedia.reset();
				},
			}}
		/>
	);
};

export default DeleteMedia;
