import type { OAuthClientCreateResponse } from "@types";
import { type Component, createSignal, For, Show } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { DynamicContent } from "@/components/Groups/Layout";
import OAuthClientCredentials from "@/components/Modals/OAuth/OAuthClientCredentials";
import UpsertOAuthClientPanel from "@/components/Panels/Integrations/UpsertOAuthClientPanel";
import Button from "@/components/Partials/Button";
import OAuthClientRow from "@/components/Partials/OAuthClientRow";
import api from "@/services/api";
import T from "@/translations";

export const OAuthClientsList: Component<{
	canCreate: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	canRegenerate: boolean;
	contentRow?: {
		title: string;
		description?: string;
	};
}> = (props) => {
	// ----------------------------------------
	// State
	const [createOpen, setCreateOpen] = createSignal(false);
	const [credentialsOpen, setCredentialsOpen] = createSignal(false);
	const [credentials, setCredentials] =
		createSignal<OAuthClientCreateResponse>();

	// ----------------------------------------
	// Queries
	const clients = api.oauthClients.useGetAll({
		queryParams: {},
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<Show
				when={props.contentRow}
				fallback={
					<InfoRow.Root
						title={T()("oauth.clients.manage.title")}
						description={T()("oauth.clients.manage.description")}
					>
						<DynamicContent
							state={{
								isLoading: clients.isLoading,
								isError: clients.isError,
								isSuccess: clients.isSuccess,
								isEmpty: clients.isSuccess && clients.data.data.length === 0,
							}}
							copy={{
								noEntries: {
									title: T()("oauth.clients.empty.title"),
									description: T()("oauth.clients.empty.description"),
									button: T()("oauth.clients.create.action"),
								},
							}}
							callback={{
								createEntry: () => setCreateOpen(true),
							}}
							permissions={{ create: props.canCreate }}
							options={{
								inline: true,
								contained: true,
							}}
						>
							<div class="flex flex-col">
								<For each={clients.data?.data ?? []}>
									{(client) => (
										<OAuthClientRow
											client={client}
											canUpdate={props.canUpdate}
											canDelete={props.canDelete}
											canRegenerate={props.canRegenerate}
										/>
									)}
								</For>
							</div>
						</DynamicContent>
						<Show
							when={
								props.canCreate &&
								clients.isSuccess &&
								clients.data.data.length > 0
							}
						>
							<div class="mt-3 flex justify-start">
								<Button
									type="button"
									theme="primary"
									size="small"
									onClick={() => setCreateOpen(true)}
								>
									{T()("oauth.clients.create.action")}
								</Button>
							</div>
						</Show>
					</InfoRow.Root>
				}
			>
				{(contentRow) => (
					<>
						<InfoRow.Content
							title={contentRow().title}
							description={contentRow().description}
						>
							<div class="-mx-4 -mb-4 overflow-hidden border-t border-border">
								<DynamicContent
									state={{
										isLoading: clients.isLoading,
										isError: clients.isError,
										isSuccess: clients.isSuccess,
										isEmpty:
											clients.isSuccess && clients.data.data.length === 0,
									}}
									copy={{
										noEntries: {
											title: T()("oauth.clients.empty.title"),
											description: T()("oauth.clients.empty.description"),
											button: T()("oauth.clients.create.action"),
										},
									}}
									callback={{
										createEntry: () => setCreateOpen(true),
									}}
									permissions={{ create: props.canCreate }}
									options={{
										inline: true,
										contained: false,
									}}
								>
									<div class="flex flex-col">
										<For each={clients.data?.data ?? []}>
											{(client) => (
												<OAuthClientRow
													client={client}
													canUpdate={props.canUpdate}
													canDelete={props.canDelete}
													canRegenerate={props.canRegenerate}
												/>
											)}
										</For>
									</div>
								</DynamicContent>
							</div>
						</InfoRow.Content>
						<Show
							when={
								props.canCreate &&
								clients.isSuccess &&
								clients.data.data.length > 0
							}
						>
							<div class="-mt-1 flex justify-start">
								<Button
									type="button"
									theme="primary"
									size="small"
									onClick={() => setCreateOpen(true)}
								>
									{T()("oauth.clients.create.action")}
								</Button>
							</div>
						</Show>
					</>
				)}
			</Show>

			{/* Panels */}
			<UpsertOAuthClientPanel
				state={{ open: createOpen(), setOpen: setCreateOpen }}
				onCreate={(value) => {
					setCredentials(value);
					setCredentialsOpen(true);
				}}
			/>

			{/* Modals */}
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
