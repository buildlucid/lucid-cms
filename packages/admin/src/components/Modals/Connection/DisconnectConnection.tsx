import type { Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import T from "@/translations";

const DisconnectConnection: Component<{
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const disconnect = api.connection.useDisconnect({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Render
	return (
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: disconnect.action.isPending,
				isError: disconnect.action.isError,
			}}
			copy={{
				title: T()("connection.disconnect.title"),
				description: T()("connection.disconnect.description"),
				error: disconnect.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => disconnect.action.mutate({}),
				onCancel: () => {
					props.state.setOpen(false);
					disconnect.reset();
				},
			}}
		/>
	);
};

export default DisconnectConnection;
