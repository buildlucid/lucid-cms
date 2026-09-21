import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface DeleteUserPermanentlyProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteUserPermanentlyModal: Component<DeleteUserPermanentlyProps> = (
	props,
) => {
	// ----------------------------------------
	// Mutations
	const permaDelete = api.users.useDeleteSinglePermanently({
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
			title={T()("modals.common.delete.user.permanently.title")}
			description={T()("modals.common.delete.user.permanently.description")}
			loading={permaDelete.action.isPending}
			error={permaDelete.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				permaDelete.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				permaDelete.reset();
			}}
		/>
	);
};

export default DeleteUserPermanentlyModal;
