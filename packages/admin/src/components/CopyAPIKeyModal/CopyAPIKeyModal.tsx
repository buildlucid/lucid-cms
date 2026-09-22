import type { Component } from "solid-js";
import ConfirmActionButton from "@/components/ConfirmActionButton/ConfirmActionButton";
import Copy from "@/components/Copy/Copy";
import Modal from "@/components/Modal/Modal";
import T from "@/translations";

interface CopyAPIKeyProps {
	apiKey: string | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const CopyAPIKeyModal: Component<CopyAPIKeyProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			role="alertdialog"
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			dismissible={false}
		>
			<Modal.Header>
				<Modal.Title>{T()("modals.common.copy.api.key.title")}</Modal.Title>
				<Modal.Description>
					{T()("modals.common.copy.api.key.description")}
				</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<p class="mb-1.5 text-xs font-medium text-subtitle">
					{T()("common.api.key")}
				</p>
				<Copy.Input value={props.apiKey || ""} label={T()("common.api.key")} />
			</Modal.Body>
			<Modal.Footer>
				<Modal.Actions>
					<ConfirmActionButton
						onConfirm={() => props.state.setOpen(false)}
						confirmationText={T()("common.confirmations.click.again.to.close")}
					>
						{T()("oauth.clients.credentials.saved.action")}
					</ConfirmActionButton>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default CopyAPIKeyModal;
