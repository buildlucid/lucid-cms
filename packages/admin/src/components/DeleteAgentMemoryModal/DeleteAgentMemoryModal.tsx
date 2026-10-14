import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const DeleteAgentMemoryModal: Component<{
	id: Accessor<string | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteMemories = api.agent.useDeleteMemories({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.agent.memory.delete.title")}
			description={T()("modals.agent.memory.delete.description")}
			loading={deleteMemories.action.isPending}
			error={deleteMemories.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (id) deleteMemories.action.mutate({ ids: [id] });
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteMemories.reset();
			}}
		/>
	);
};

export default DeleteAgentMemoryModal;
