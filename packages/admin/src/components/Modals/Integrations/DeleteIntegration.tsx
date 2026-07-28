import type { Accessor, Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
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

const DeleteIntegration: Component<DeleteIntegrationProps> = (props) => {
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteIntegration.action.isPending,
				isError: deleteIntegration.action.isError,
			}}
			copy={{
				title: T()("modals.common.delete.integration.title"),
				description: T()("modals.common.delete.integration.description"),
				error: deleteIntegration.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = typeof props.id === "function" ? props.id() : props.id;
					if (!id) return console.error("No id provided");
					deleteIntegration.action.mutate({
						id: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteIntegration.reset();
				},
			}}
		/>
	);
};

export default DeleteIntegration;
