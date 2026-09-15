import type { Accessor, Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
import api from "@/services/api";
import T from "@/translations";

interface DeleteMediaProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMediaModal: Component<DeleteMediaProps> = (props) => {
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
		<ConfirmationModal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteMedia.action.isPending,
				isError: deleteMedia.action.isError,
			}}
			copy={{
				title: T()("modals.common.delete.media.title"),
				description: T()("modals.common.delete.media.description"),
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

export default DeleteMediaModal;
