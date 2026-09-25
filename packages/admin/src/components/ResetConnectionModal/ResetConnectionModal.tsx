import type { Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const ResetConnectionModal: Component<{
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const reset = api.connection.useReset({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("connection.reset.title")}
			confirmLabel={T()("connection.reset.action")}
			description={T()("connection.reset.description")}
			loading={reset.action.isPending}
			error={reset.errors()?.message}
			onConfirm={() => reset.action.mutate({})}
			onCancel={() => {
				props.state.setOpen(false);
				reset.reset();
			}}
		/>
	);
};

export default ResetConnectionModal;
