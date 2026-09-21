import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface DeleteUserProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteUserModal: Component<DeleteUserProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteUser = api.users.useDeleteSingle({
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
			title={T()("modals.common.delete.user.title")}
			description={T()("modals.common.delete.user.description")}
			loading={deleteUser.action.isPending}
			error={deleteUser.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				deleteUser.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteUser.reset();
			}}
		/>
	);
};

export default DeleteUserModal;
