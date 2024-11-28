import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface DeleteClientIntegrationProps {
	id: Accessor<number | undefined> | number | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}

const DeleteClientIntegration: Component<DeleteClientIntegrationProps> = (
	props,
) => {
	// ----------------------------------------
	// Mutations
	const deleteIntegration = api.clientIntegrations.useDeleteSingle({
		onSuccess: () => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess) props.callbacks.onSuccess();
		},
	});

	// ------------------------------
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
				title: T()("delete_client_integration_modal_title"),
				description: T()("delete_client_integration_modal_description"),
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

export default DeleteClientIntegration;
