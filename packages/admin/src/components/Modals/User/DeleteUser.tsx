import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface DeleteUserProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteUser: Component<DeleteUserProps> = (props) => {
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteUser.action.isPending,
				isError: deleteUser.action.isError,
			}}
			copy={{
				title: T()("delete_user_modal_title"),
				description: T()("delete_user_modal_description"),
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

export default DeleteUser;
