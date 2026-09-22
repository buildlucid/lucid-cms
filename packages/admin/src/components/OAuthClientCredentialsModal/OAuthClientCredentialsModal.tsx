import type { OAuthClientCreateResponse } from "@types";
import type { Component } from "solid-js";
import ConfirmActionButton from "@/components/ConfirmActionButton/ConfirmActionButton";
import Copy from "@/components/Copy/Copy";
import Modal from "@/components/Modal/Modal";
import T from "@/translations";

const OAuthClientCredentialsModal: Component<{
	credentials: OAuthClientCreateResponse | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
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
				<Modal.Title>{T()("oauth.clients.credentials.title")}</Modal.Title>
				<Modal.Description>
					{props.credentials?.clientSecret
						? T()("oauth.clients.credentials.description")
						: T()("oauth.clients.credentials.public.description")}
				</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<div class="space-y-4">
					<div>
						<p class="mb-1.5 text-xs font-medium text-subtitle">
							{T()("oauth.consent.client.id")}
						</p>
						<Copy.Input
							value={props.credentials?.client.clientId ?? ""}
							label={T()("oauth.consent.client.id")}
						/>
					</div>
					{props.credentials?.clientSecret ? (
						<div>
							<p class="mb-1.5 text-xs font-medium text-subtitle">
								{T()("oauth.clients.client.secret")}
							</p>
							<Copy.Input
								value={props.credentials.clientSecret}
								label={T()("oauth.clients.client.secret")}
							/>
						</div>
					) : null}
				</div>
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

export default OAuthClientCredentialsModal;
