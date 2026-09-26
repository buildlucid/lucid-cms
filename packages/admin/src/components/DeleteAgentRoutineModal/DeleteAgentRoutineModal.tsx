import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const DeleteAgentRoutineModal: Component<{
	id: Accessor<string | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteRoutine = api.agent.useDeleteRoutine({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.agent.routine.delete.title")}
			description={T()("modals.agent.routine.delete.description")}
			loading={deleteRoutine.action.isPending}
			error={deleteRoutine.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (id) deleteRoutine.action.mutate({ id });
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteRoutine.reset();
			}}
		/>
	);
};

export default DeleteAgentRoutineModal;
