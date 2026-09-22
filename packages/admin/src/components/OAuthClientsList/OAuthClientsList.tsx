import type { OAuthClientCreateResponse, Permission } from "@types";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import EmptyState from "@/components/EmptyState/EmptyState";
import InfoRow from "@/components/InfoRow/InfoRow";
import OAuthClientCredentialsModal from "@/components/OAuthClientCredentialsModal/OAuthClientCredentialsModal";
import OAuthClientRow from "@/components/OAuthClientRow/OAuthClientRow";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import UpsertOAuthClientDrawer from "@/components/UpsertOAuthClientDrawer/UpsertOAuthClientDrawer";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

export const OAuthClientsList: Component<{
	createPermission: Permission | undefined;
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
	// Memos
	const canCreate = createMemo(
		() => userStore.get.hasPermission([props.createPermission]).all,
	);

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
						<QueryBoundary
							loading={clients.isLoading}
							error={clients.isError}
							empty={clients.isSuccess && clients.data.data.length === 0}
							emptyFallback={
								<EmptyState
									title={T()("oauth.clients.empty.title")}
									description={T()("oauth.clients.empty.description")}
									actions={
										<Button
											size="sm"
											onClick={() => setCreateOpen(true)}
											permission={props.createPermission}
										>
											{T()("oauth.clients.create.action")}
										</Button>
									}
								/>
							}
							class="overflow-hidden rounded-md border border-border bg-card-base"
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
						</QueryBoundary>
						<Show
							when={
								canCreate() && clients.isSuccess && clients.data.data.length > 0
							}
						>
							<div class="mt-3 flex justify-start">
								<Button
									type="button"
									variant="primary"
									size="sm"
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
								<QueryBoundary
									loading={clients.isLoading}
									error={clients.isError}
									empty={clients.isSuccess && clients.data.data.length === 0}
									emptyFallback={
										<EmptyState
											title={T()("oauth.clients.empty.title")}
											description={T()("oauth.clients.empty.description")}
											actions={
												<Button
													size="sm"
													onClick={() => setCreateOpen(true)}
													permission={props.createPermission}
												>
													{T()("oauth.clients.create.action")}
												</Button>
											}
										/>
									}
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
								</QueryBoundary>
							</div>
						</InfoRow.Content>
						<Show
							when={
								canCreate() && clients.isSuccess && clients.data.data.length > 0
							}
						>
							<div class="-mt-1 flex justify-start">
								<Button
									type="button"
									variant="primary"
									size="sm"
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
			<UpsertOAuthClientDrawer
				state={{ open: createOpen(), setOpen: setCreateOpen }}
				onCreate={(value) => {
					setCredentials(value);
					setCredentialsOpen(true);
				}}
			/>

			{/* Modals */}
			<OAuthClientCredentialsModal
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
