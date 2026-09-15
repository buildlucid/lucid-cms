import type { Accessor, Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
import api from "@/services/api";
import T from "@/translations";

interface DeleteEmailProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteEmailModal: Component<DeleteEmailProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteEmail = api.email.useDeleteSingle({
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
				isLoading: deleteEmail.action.isPending,
				isError: deleteEmail.action.isError,
			}}
			copy={{
				title: T()("modals.common.delete.email.title"),
				description: T()("modals.common.delete.email.description"),
				error: deleteEmail.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					deleteEmail.action.mutate({
						id: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteEmail.reset();
				},
			}}
		/>
	);
};

export default DeleteEmailModal;
