import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface TriggerPasswordResetProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const TriggerPasswordResetModal: Component<TriggerPasswordResetProps> = (
	props,
) => {
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.users.password.reset.title")}
			description={T()("modals.users.password.reset.description")}
			confirmVariant="primary"
			loading={updateUser.action.isPending}
			error={updateUser.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				updateUser.action.mutate({
					id: id,
					body: {
						triggerPasswordReset: true,
					},
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				updateUser.reset();
			}}
		/>
	);
};

export default TriggerPasswordResetModal;
