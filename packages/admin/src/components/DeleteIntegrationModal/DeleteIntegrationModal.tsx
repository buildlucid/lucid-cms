import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import type { IntegrationServices } from "@/services/api/integrations";
import T from "@/translations";

interface DeleteIntegrationProps {
	id: Accessor<number | undefined> | number | undefined;
	services: IntegrationServices;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}

const DeleteIntegrationModal: Component<DeleteIntegrationProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteIntegration = props.services.useDeleteSingle({
		onSuccess: () => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess) props.callbacks.onSuccess();
		},
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.integration.title")}
			description={T()("modals.common.delete.integration.description")}
			loading={deleteIntegration.action.isPending}
			error={deleteIntegration.errors()?.message}
			onConfirm={() => {
				const id = typeof props.id === "function" ? props.id() : props.id;
				if (!id) return console.error("No id provided");
				deleteIntegration.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteIntegration.reset();
			}}
		/>
	);
};

export default DeleteIntegrationModal;
