import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface TriggerPasswordResetProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const TriggerPasswordReset: Component<TriggerPasswordResetProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const updateUser = api.users.useUpdateSingle({
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
				isLoading: updateUser.action.isPending,
				isError: updateUser.action.isError,
			}}
			copy={{
				title: T()("user_password_reset_modal_title"),
				description: T()("user_password_reset_modal_description"),
				error: updateUser.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					updateUser.action.mutate({
						id: id,
						body: {
							triggerPasswordReset: true,
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					updateUser.reset();
				},
			}}
		/>
	);
};

export default TriggerPasswordReset;
