import type { Accessor, Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
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
		<ConfirmationModal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteUser.action.isPending,
				isError: deleteUser.action.isError,
			}}
			copy={{
				title: T()("modals.common.delete.user.title"),
				description: T()("modals.common.delete.user.description"),
				error: deleteUser.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					deleteUser.action.mutate({
						id: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteUser.reset();
				},
			}}
		/>
	);
};

export default DeleteUserModal;
