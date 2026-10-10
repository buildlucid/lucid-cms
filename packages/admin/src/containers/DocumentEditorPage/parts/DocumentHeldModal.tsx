import type { DocumentEditors } from "@types";
import { type Component, createMemo, createSignal } from "solid-js";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import T from "@/translations";
import helpers from "@/utils/helpers";

/** Warns when another tab holds the document, with dismissal keeping this tab read only until the hold changes. */
const DocumentHeldModal: Component<{
	holder: DocumentEditors["holder"];
	takingOver: boolean;
	onLeave: () => void;
	onTakeOver: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	//* the hold that was dismissed, so the modal opens again when someone else takes hold
	const [dismissed, setDismissed] = createSignal<string>();

	// ----------------------------------------
	// Memos
	const holdKey = createMemo(() =>
		props.holder ? `${props.holder.user.id}:${props.holder.since}` : undefined,
	);
	const open = createMemo(
		() => holdKey() !== undefined && holdKey() !== dismissed(),
	);

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={open()}
			onOpenChange={(value) => {
				if (!value) setDismissed(holdKey());
			}}
		>
			<Modal.Header>
				<Modal.Title>
					{props.holder?.self
						? T()("documents.held.self.title")
						: T()("documents.held.title")}
				</Modal.Title>
				<Modal.Description>
					{props.holder?.self
						? T()("documents.held.self.message")
						: T()("documents.held.message", {
								name: props.holder
									? helpers.formatUserName(props.holder.user, "name")
									: "",
							})}
				</Modal.Description>
			</Modal.Header>
			<Modal.Footer>
				<Modal.Actions>
					<Button
						variant="outline"
						size="md"
						disabled={props.takingOver}
						onClick={() => props.onLeave()}
					>
						{T()("documents.held.leave")}
					</Button>
					<Button
						variant="primary"
						size="md"
						loading={props.takingOver}
						onClick={() => props.onTakeOver()}
					>
						{T()("documents.held.take.over")}
					</Button>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default DocumentHeldModal;
