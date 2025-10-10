import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface RestoreUserProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RestoreUser: Component<RestoreUserProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const restoreUsers = api.users.useRestore({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ------------------------------
	// Render
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: restoreUsers.action.isPending,
				isError: restoreUsers.action.isError,
			}}
			copy={{
				title: T()("restore_users_modal_title"),
				description: T()("restore_users_modal_description"),
				error: restoreUsers.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) {
						console.log("No user ID supplied!");
						props.state.setOpen(false);
						restoreUsers.reset();
						return;
					}
					restoreUsers.action.mutate({
						body: {
							ids: [id],
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					restoreUsers.reset();
				},
			}}
		/>
	);
};

export default RestoreUser;
