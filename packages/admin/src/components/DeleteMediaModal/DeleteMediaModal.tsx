import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.media.title")}
			description={T()("modals.common.delete.media.description")}
			loading={deleteMedia.action.isPending}
			error={deleteMedia.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				deleteMedia.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteMedia.reset();
			}}
		/>
	);
};

export default DeleteMediaModal;
