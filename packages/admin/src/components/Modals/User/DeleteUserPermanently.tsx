import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface DeleteUserPermanentlyProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteUserPermanently: Component<DeleteUserPermanentlyProps> = (
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: permaDelete.action.isPending,
				isError: permaDelete.action.isError,
			}}
			copy={{
				title: T()("delete_user_permanently_modal_title"),
				description: T()("delete_user_permanently_modal_description"),
				error: permaDelete.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					permaDelete.action.mutate({
						id: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					permaDelete.reset();
				},
			}}
		/>
	);
};

export default DeleteUserPermanently;
