import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const DeleteAgentConversationModal: Component<{
	id: Accessor<string | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	onDeleted?: () => void;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteConversation = api.agent.useDeleteConversation({
		onSuccess: () => {
			props.state.setOpen(false);
			props.onDeleted?.();
		},
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.agent.conversation.delete.title")}
			description={T()("modals.agent.conversation.delete.description")}
			loading={deleteConversation.action.isPending}
			error={deleteConversation.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (id) deleteConversation.action.mutate({ id });
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteConversation.reset();
			}}
		/>
	);
};

export default DeleteAgentConversationModal;
