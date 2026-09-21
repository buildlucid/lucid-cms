import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface DeleteRoleProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteRoleModal: Component<DeleteRoleProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteRole = api.roles.useDeleteSingle({
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
			title={T()("modals.common.delete.role.title")}
			description={T()("modals.common.delete.role.description")}
			loading={deleteRole.action.isPending}
			error={deleteRole.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				deleteRole.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteRole.reset();
			}}
		/>
	);
};

export default DeleteRoleModal;
