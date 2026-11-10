import type { OAuthClientCreateResponse, Permission } from "@types";
import { TbOutlineKey } from "solid-icons/tb";
import { type Component, createMemo, createSignal, For } from "solid-js";
import Button from "@/components/Button/Button";
import CardState from "@/components/CardState/CardState";
import InfoRow from "@/components/InfoRow/InfoRow";
import OAuthClientCredentialsModal from "@/components/OAuthClientCredentialsModal/OAuthClientCredentialsModal";
import OAuthClientRow from "@/components/OAuthClientRow/OAuthClientRow";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import SkeletonCardRows from "@/components/SkeletonCardRows/SkeletonCardRows";
import UpsertOAuthClientDrawer from "@/components/UpsertOAuthClientDrawer/UpsertOAuthClientDrawer";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

/** The OAuth Applications section: registered applications in a card of divided rows, with the register action under the section's description. */
export const OAuthClientsList: Component<{
	createPermission: Permission | undefined;
	canUpdate: boolean;
	canDelete: boolean;
	canRegenerate: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
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
	// Memos
	const canCreate = createMemo(
		() => userStore.get.hasPermission([props.createPermission]).all,
	);

	// ----------------------------------------
	// Render
	return (
		<>
			<InfoRow.Root
				title={T()("oauth.clients.manage.title")}
				description={T()("oauth.clients.manage.description")}
				aside={
					canCreate() ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setCreateOpen(true)}
						>
							{T()("oauth.clients.create.action")}
						</Button>
					) : undefined
				}
			>
				<InfoRow.Content padding="none">
					<QueryBoundary
						appearance="contained"
						loading={clients.isLoading}
						loadingFallback={<SkeletonCardRows variant="row" />}
						error={clients.isLoadingError}
						onRetry={() => clients.refetch()}
						empty={clients.isSuccess && clients.data.data.length === 0}
						emptyFallback={
							<CardState
								icon={<TbOutlineKey />}
								title={T()("oauth.clients.empty.title")}
								description={T()("oauth.clients.empty.description")}
							/>
						}
					>
						<ul class="divide-y divide-border">
							<For each={clients.data?.data ?? []}>
								{(client) => (
									<li>
										<OAuthClientRow
											client={client}
											canUpdate={props.canUpdate}
											canDelete={props.canDelete}
											canRegenerate={props.canRegenerate}
										/>
									</li>
								)}
							</For>
						</ul>
					</QueryBoundary>
				</InfoRow.Content>
			</InfoRow.Root>

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
