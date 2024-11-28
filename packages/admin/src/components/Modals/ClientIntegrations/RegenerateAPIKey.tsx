import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface RegenerateAPIKeyProps {
	id: Accessor<number | undefined> | number | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: (apiKey: string) => void;
	};
}

const RegenerateAPIKey: Component<RegenerateAPIKeyProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const regenerateAPIKey = api.clientIntegrations.useRegenerateAPIKey({
		onSuccess: (data) => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess)
				props.callbacks.onSuccess(data.data.apiKey);
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
				isLoading: regenerateAPIKey.action.isPending,
				isError: regenerateAPIKey.action.isError,
			}}
			copy={{
				title: T()("regenerate_api_key_modal_title"),
				description: T()("regenerate_api_key_modal_description"),
				error: regenerateAPIKey.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = typeof props.id === "function" ? props.id() : props.id;
					if (!id) return console.error("No id provided");
					regenerateAPIKey.action.mutate({
						id: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					regenerateAPIKey.reset();
				},
			}}
		/>
	);
};

export default RegenerateAPIKey;
