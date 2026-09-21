import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import type { IntegrationServices } from "@/services/api/integrations";
import T from "@/translations";

interface RegenerateAPIKeyProps {
	id: Accessor<number | undefined> | number | undefined;
	services: IntegrationServices;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: (apiKey: string) => void;
	};
}

const RegenerateAPIKeyModal: Component<RegenerateAPIKeyProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const regenerateAPIKey = props.services.useRegenerateAPIKey({
		onSuccess: (data) => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess)
				props.callbacks.onSuccess(data.data.apiKey);
		},
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.integrations.api.keys.regenerate.title")}
			description={T()("modals.integrations.api.keys.regenerate.description")}
			confirmVariant="primary"
			loading={regenerateAPIKey.action.isPending}
			error={regenerateAPIKey.errors()?.message}
			onConfirm={() => {
				const id = typeof props.id === "function" ? props.id() : props.id;
				if (!id) return console.error("No id provided");
				regenerateAPIKey.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				regenerateAPIKey.reset();
			}}
		/>
	);
};

export default RegenerateAPIKeyModal;
