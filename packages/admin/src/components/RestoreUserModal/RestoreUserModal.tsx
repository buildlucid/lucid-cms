import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface RestoreUserProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RestoreUserModal: Component<RestoreUserProps> = (props) => {
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.restore.users.title")}
			description={T()("modals.common.restore.users.description")}
			confirmVariant="primary"
			loading={restoreUsers.action.isPending}
			error={restoreUsers.errors()?.message}
			onConfirm={() => {
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
			}}
			onCancel={() => {
				props.state.setOpen(false);
				restoreUsers.reset();
			}}
		/>
	);
};

export default RestoreUserModal;
