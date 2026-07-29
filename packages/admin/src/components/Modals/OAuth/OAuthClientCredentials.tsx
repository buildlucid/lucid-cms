import type { OAuthClientCreateResponse } from "@types";
import type { Component } from "solid-js";
import { Alert } from "@/components/Groups/Modal";
import ConfirmActionButton from "@/components/Partials/ConfirmActionButton";
import CopyInput from "@/components/Partials/CopyInput";
import T from "@/translations";

const OAuthClientCredentials: Component<{
	credentials: OAuthClientCreateResponse | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Alert
			state={props.state}
			copy={{
				title: T()("oauth.clients.credentials.title"),
				description: props.credentials?.clientSecret
					? T()("oauth.clients.credentials.description")
					: T()("oauth.clients.credentials.public.description"),
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
			<div class="space-y-4">
				<div>
					<p class="mb-1.5 text-xs font-medium text-subtitle">
						{T()("oauth.consent.client.id")}
					</p>
					<CopyInput
						value={props.credentials?.client.clientId ?? ""}
						label={T()("oauth.consent.client.id")}
					/>
				</div>
				{props.credentials?.clientSecret ? (
					<div>
						<p class="mb-1.5 text-xs font-medium text-subtitle">
							{T()("oauth.clients.client.secret")}
						</p>
						<CopyInput
							value={props.credentials.clientSecret}
							label={T()("oauth.clients.client.secret")}
						/>
					</div>
				) : null}
			</div>
		</Alert>
	);
};

export default OAuthClientCredentials;
