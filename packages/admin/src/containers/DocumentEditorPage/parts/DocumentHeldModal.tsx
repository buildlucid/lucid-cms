import type { DocumentEditors } from "@types";
import type { Component } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import T from "@/translations";
import helpers from "@/utils/helpers";

/** Warns when another tab holds the document, with dismissal keeping this tab read only until the hold changes. */
const DocumentHeldModal: Component<{
	open: boolean;
	holder: DocumentEditors["holder"];
	takingOver: boolean;
	/** Why the last take over failed. */
	error?: string;
	onDismiss: () => void;
	onLeave: () => void;
	onTakeOver: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={props.open}
			onOpenChange={(open) => {
				if (!open) props.onDismiss();
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
				<ErrorMessage theme="basic" message={props.error} />
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
