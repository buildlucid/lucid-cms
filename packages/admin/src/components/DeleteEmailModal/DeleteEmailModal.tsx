import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.email.title")}
			description={T()("modals.common.delete.email.description")}
			loading={deleteEmail.action.isPending}
			error={deleteEmail.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				deleteEmail.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteEmail.reset();
			}}
		/>
	);
};

export default DeleteEmailModal;
