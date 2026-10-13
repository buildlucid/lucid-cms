import { type Accessor, type Component, createEffect, untrack } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

/** Confirms copying a chat up to a reply into a new chat, then opens it. */
const BranchAgentConversationModal: Component<{
	id: Accessor<string>;
	messageId: Accessor<string | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	onBranched: (conversationId: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const branchConversation = api.agent.useBranchConversation({
		onSuccess: (response) => {
			props.state.setOpen(false);
			props.onBranched(response.data.id);
		},
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.state.open) untrack(branchConversation.reset);
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.agent.conversation.branch.title")}
			description={T()("modals.agent.conversation.branch.description")}
			confirmLabel={T()("agent.message.branch.confirm")}
			confirmVariant="primary"
			loading={branchConversation.action.isPending}
			error={branchConversation.errors()?.message}
			onConfirm={() => {
				const messageId = props.messageId();
				if (messageId && !branchConversation.action.isPending) {
					branchConversation.action.mutate({ id: props.id(), messageId });
				}
			}}
		/>
	);
};

export default BranchAgentConversationModal;
