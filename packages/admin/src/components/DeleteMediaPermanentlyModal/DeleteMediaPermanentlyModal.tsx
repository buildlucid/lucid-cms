import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface DeleteMediaPermanentlyProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMediaPermanentlyModal: Component<DeleteMediaPermanentlyProps> = (
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.media.permanently.title")}
			description={T()("modals.common.delete.media.permanently.description")}
			loading={deleteMediaPermanently.action.isPending}
			error={deleteMediaPermanently.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				deleteMediaPermanently.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteMediaPermanently.reset();
			}}
		/>
	);
};

export default DeleteMediaPermanentlyModal;
