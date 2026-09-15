import type { Component } from "solid-js";
import { AlertModal } from "@/components/AlertModal/AlertModal";
import ConfirmActionButton from "@/components/ConfirmActionButton/ConfirmActionButton";
import CopyInput from "@/components/CopyInput/CopyInput";
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
		<AlertModal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			copy={{
				title: T()("modals.common.copy.api.key.title"),
				description: T()("modals.common.copy.api.key.description"),
			}}
			options={{ preventDismiss: true }}
			footer={
				<div class="ml-auto">
					<ConfirmActionButton
						onConfirm={() => props.state.setOpen(false)}
						confirmationText={T()("common.confirmations.click.again.to.close")}
					>
						{T()("oauth.clients.credentials.saved.action")}
					</ConfirmActionButton>
				</div>
			}
		>
			<div>
				<p class="mb-1.5 text-xs font-medium text-subtitle">
					{T()("common.api.key")}
				</p>
				<CopyInput value={props.apiKey || ""} label={T()("common.api.key")} />
			</div>
		</AlertModal>
	);
};

export default CopyAPIKeyModal;
