import type { OAuthClient, OAuthClientCreateResponse } from "@types";
import { FaSolidArrowRightArrowLeft, FaSolidKey } from "solid-icons/fa";
import { type Component, createSignal, Show } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import OAuthClientCredentials from "@/components/Modals/OAuth/OAuthClientCredentials";
import UpsertOAuthClientPanel from "@/components/Panels/Integrations/UpsertOAuthClientPanel";
import ActionDropdown from "@/components/Partials/ActionDropdown";
import IconContainer from "@/components/Partials/IconContainer";
import api from "@/services/api";
import T from "@/translations";
import { getProcessedImageUrl } from "@/utils/media-url";

const OAuthClientRow: Component<{
	client: OAuthClient;
	canUpdate: boolean;
	canDelete: boolean;
	canRegenerate: boolean;
}> = (props) => {
	// ----------------------------------------
	// State
	const [updateOpen, setUpdateOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
	const [regenerateOpen, setRegenerateOpen] = createSignal(false);
	const [credentialsOpen, setCredentialsOpen] = createSignal(false);
	const [credentials, setCredentials] =
		createSignal<OAuthClientCreateResponse>();

	// ----------------------------------------
	// Mutations
	const deleteClient = api.oauthClients.useDeleteSingle({
		onSuccess: () => setDeleteOpen(false),
	});
	const regenerateSecret = api.oauthClients.useRegenerateSecret({
		onSuccess: (response) => {
			setRegenerateOpen(false);
			setCredentials({
				client: props.client,
				clientSecret: response.data.clientSecret,
			});
			setCredentialsOpen(true);
		},
	});

	// ----------------------------------------
	// Functions
	const cancelDelete = () => {
		setDeleteOpen(false);
		deleteClient.reset();
	};
	const cancelRegenerate = () => {
		setRegenerateOpen(false);
		regenerateSecret.reset();
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<article class="border-b border-border p-4 last:border-b-0">
				<div class="flex min-w-0 items-start justify-between gap-3">
					<div class="flex min-w-0 items-start gap-3">
						<IconContainer class="overflow-hidden">
							<Show
								when={props.client.logo}
								fallback={<FaSolidKey class="size-3.5 text-primary-base" />}
							>
								{(logo) => (
									<img
										src={getProcessedImageUrl(logo().file.url, {
											preset: "thumbnail-small",
											format: "webp",
										})}
										alt=""
										class="size-full object-contain bg-white p-1"
									/>
								)}
							</Show>
						</IconContainer>
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
								<h3 class="truncate text-sm font-semibold text-title">
									{props.client.name}
								</h3>
								<span
									class={
										props.client.enabled
											? "inline-flex items-center gap-1.5 text-xs font-medium text-primary-base"
											: "inline-flex items-center gap-1.5 text-xs font-medium text-unfocused"
									}
								>
									<span
										class={
											props.client.enabled
												? "size-1.5 rounded-full bg-primary-base"
												: "size-1.5 rounded-full bg-icon-faded"
										}
										aria-hidden="true"
									/>
									{props.client.enabled
										? T()("common.status.active")
										: T()("common.status.inactive")}
								</span>
							</div>
							<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-body">
								<span>
									{props.client.authMethod === "client_secret_basic"
										? T()("oauth.clients.auth.confidential.short")
										: T()("oauth.clients.auth.public.short")}
								</span>
								<span class="text-unfocused" aria-hidden="true">
									·
								</span>
								<span class="flex items-center gap-1.5">
									<FaSolidArrowRightArrowLeft class="size-2.5 text-icon-faded" />
									{T()(
										props.client.redirectUris.length === 1
											? "oauth.clients.redirect.count"
											: "oauth.clients.redirects.count",
										{ count: props.client.redirectUris.length },
									)}
								</span>
							</div>
							<p
								class="mt-1.5 max-w-xl truncate font-mono text-[11px] text-unfocused"
								title={props.client.clientId}
							>
								{props.client.clientId}
							</p>
						</div>
					</div>
					<ActionDropdown
						actions={[
							{
								type: "button",
								label: T()("common.update"),
								icon: "pen",
								onClick: () => setUpdateOpen(true),
								hide: !props.canUpdate,
							},
							{
								type: "button",
								label: T()("oauth.clients.secret.regenerate.action"),
								icon: "rotate",
								onClick: () => setRegenerateOpen(true),
								hide:
									!props.canRegenerate ||
									props.client.authMethod !== "client_secret_basic",
							},
							{
								type: "button",
								label: T()("common.delete"),
								icon: "trash",
								onClick: () => setDeleteOpen(true),
								hide: !props.canDelete,
							},
						]}
						options={{ raised: true }}
					/>
				</div>
			</article>

			{/* Panels */}
			<UpsertOAuthClientPanel
				id={() => props.client.id}
				state={{ open: updateOpen(), setOpen: setUpdateOpen }}
			/>

			{/* Modals */}
			<Confirmation
				theme="danger"
				state={{
					open: deleteOpen(),
					setOpen: setDeleteOpen,
					isLoading: deleteClient.action.isPending,
					isError: deleteClient.action.isError,
				}}
				copy={{
					title: T()("oauth.clients.delete.title"),
					description: T()("oauth.clients.delete.description", {
						name: props.client.name,
					}),
					error: deleteClient.errors()?.message,
					confirm: T()("common.delete"),
				}}
				callbacks={{
					onConfirm: () => deleteClient.action.mutate({ id: props.client.id }),
					onCancel: cancelDelete,
				}}
			/>
			<Confirmation
				theme="danger"
				state={{
					open: regenerateOpen(),
					setOpen: setRegenerateOpen,
					isLoading: regenerateSecret.action.isPending,
					isError: regenerateSecret.action.isError,
				}}
				copy={{
					title: T()("oauth.clients.secret.regenerate.title"),
					description: T()("oauth.clients.secret.regenerate.description", {
						name: props.client.name,
					}),
					error: regenerateSecret.errors()?.message,
					confirm: T()("oauth.clients.secret.regenerate.action"),
				}}
				callbacks={{
					onConfirm: () =>
						regenerateSecret.action.mutate({ id: props.client.id }),
					onCancel: cancelRegenerate,
				}}
			/>
			<OAuthClientCredentials
				credentials={credentials()}
				state={{
					open: credentialsOpen(),
					setOpen: (open) => {
						setCredentialsOpen(open);
						if (!open) setCredentials(undefined);
					},
				}}
			/>
		</>
	);
};

export default OAuthClientRow;
