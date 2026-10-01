import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const RunAgentRoutineModal: Component<{
	id: Accessor<string | undefined>;
	disabled: boolean;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	onRun: (conversationId: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const runRoutine = api.agent.useRunRoutine({
		onSuccess: (response) => {
			props.state.setOpen(false);
			props.onRun(response.data.conversationId);
		},
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.agent.routine.run.title")}
			description={T()("modals.agent.routine.run.description")}
			confirmLabel={T()("agent.routine.run.now")}
			confirmVariant="primary"
			loading={runRoutine.action.isPending}
			error={runRoutine.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (id && !runRoutine.action.isPending && !props.disabled) {
					runRoutine.action.mutate({ id });
				}
			}}
			onCancel={() => {
				props.state.setOpen(false);
				runRoutine.reset();
			}}
		/>
	);
};

export default RunAgentRoutineModal;
