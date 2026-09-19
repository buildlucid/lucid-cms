import type { Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const DisconnectConnectionModal: Component<{
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("connection.disconnect.title")}
			description={T()("connection.disconnect.description")}
			loading={disconnect.action.isPending}
			error={disconnect.errors()?.message}
			onConfirm={() => disconnect.action.mutate({})}
			onCancel={() => {
				props.state.setOpen(false);
				disconnect.reset();
			}}
		/>
	);
};

export default DisconnectConnectionModal;
