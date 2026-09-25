import type { AgentConversation } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createSignal,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

const RenameAgentConversationModal: Component<{
	conversation: Accessor<AgentConversation | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Mutations
	const [title, setTitle] = createSignal("");
	const update = api.agent.useUpdateConversation({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.state.open) setTitle(props.conversation()?.title ?? "");
		else {
			update.reset();
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.state.open} onOpenChange={props.state.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					const id = props.conversation()?.id;
					if (!id) return;
					update.action.mutate({ id, body: { title: title() } });
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{T()("modals.agent.conversation.rename.title")}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Input
						id="agent-conversation-title"
						name="title"
						type="text"
						value={title()}
						onChange={setTitle}
						required={true}
						label={T()("common.title")}
						errors={getBodyError("title", update.errors)}
					/>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={update.errors()?.message} />
					<Modal.Actions>
						<Button
							variant="outline"
							onClick={() => props.state.setOpen(false)}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							loading={update.action.isPending}
							disabled={!title().trim()}
						>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default RenameAgentConversationModal;
