import { useQueryClient } from "@tanstack/solid-query";
import classnames from "classnames";
import { FaSolidCalendar, FaSolidIdCard, FaSolidT } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Index,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import CopyAPIKeyModal from "@/components/CopyAPIKeyModal/CopyAPIKeyModal";
import DeleteIntegrationModal from "@/components/DeleteIntegrationModal/DeleteIntegrationModal";
import EmptyState from "@/components/EmptyState/EmptyState";
import InfoRow from "@/components/InfoRow/InfoRow";
import IntegrationTableRow from "@/components/IntegrationTableRow/IntegrationTableRow";
import { OAuthClientsList } from "@/components/OAuthClientsList/OAuthClientsList";
import { OAuthConnectionsList } from "@/components/OAuthConnectionsList/OAuthConnectionsList";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import RegenerateAPIKeyModal from "@/components/RegenerateAPIKeyModal/RegenerateAPIKeyModal";
import Table from "@/components/Table/Table";
import UpsertIntegrationDrawer from "@/components/UpsertIntegrationDrawer/UpsertIntegrationDrawer";
import { Permissions } from "@/constants/permissions";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

export const IntegrationsList: Component<{
	state: {
		searchParams: QueryStateResponse;
		openCreateIntegrationPanel: Accessor<boolean>;
		setOpenCreateIntegrationPanel: (state: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const rowTarget = useRowTarget({
		triggers: {
			delete: false,
			regenerateAPIKey: false,
			update: false,
		},
	});
	const [getAPIKey, setAPIKey] = createSignal<string | undefined>();
	const [getOpenCopyAPIKey, setOpenCopyAPIKey] = createSignal(false);

	// ----------------------------------------
	// Queries
	const integrations = api.integrations.useGetAll({
		queryParams: {
			queryString: props.state.searchParams.queryString,
		},
		enabled: () => props.state.searchParams.ready(),
	});
	const scopes = api.integrations.useGetScopes({
		queryParams: {},
		enabled: () =>
			userStore.get.hasPermission([Permissions.IntegrationsRead]).all,
	});

	// ----------------------------------------
	// Memos
	const canReadIntegrations = createMemo(
		() => userStore.get.hasPermission([Permissions.IntegrationsRead]).all,
	);
	const hasCreatePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.IntegrationsCreate]).all;
	});
	const scopeOptions = createMemo(() => {
		return (scopes.data?.data ?? []).flatMap((group) =>
			group.scopes.map((scope) => {
				const groupLabel = helpers.getLocaleValue({
					value: group.details.name,
				});
				const scopeLabel = helpers.getLocaleValue({
					value: scope.details.name,
				});

				return {
					value: scope.key,
					label: T()("integrations.scopes.option.label", {
						group: groupLabel,
						scope: scopeLabel,
					}),
				};
			}),
		);
	});

	// ----------------------------------------
	// Render
	return (
		<div class="flex-1 h-full p-4 md:p-6">
			{/* OAuth Access */}
			<Show when={canReadIntegrations()}>
				<InfoRow.Root
					title={T()("oauth.access.manage.title")}
					description={T()("oauth.access.manage.description")}
				>
					<InfoRow.Content
						title={T()("oauth.connections.manage.title")}
						description={T()("oauth.connections.manage.description")}
					>
						<div class="-mx-4 -mb-4 overflow-hidden border-t border-border">
							<OAuthConnectionsList
								owner={{ type: "system" }}
								canUpdate={
									userStore.get.hasPermission([Permissions.IntegrationsUpdate])
										.all
								}
								canRevoke={
									userStore.get.hasPermission([Permissions.IntegrationsDelete])
										.all
								}
								embedded={true}
								contained={false}
							/>
						</div>
					</InfoRow.Content>
					<OAuthClientsList
						createPermission={Permissions.IntegrationsCreate}
						canUpdate={
							userStore.get.hasPermission([Permissions.IntegrationsUpdate]).all
						}
						canDelete={
							userStore.get.hasPermission([Permissions.IntegrationsDelete]).all
						}
						canRegenerate={
							userStore.get.hasPermission([Permissions.IntegrationsRegenerate])
								.all
						}
						contentRow={{
							title: T()("oauth.clients.manage.title"),
							description: T()("oauth.clients.manage.description"),
						}}
					/>
				</InfoRow.Root>
			</Show>

			{/* Integrations */}
			<Show when={canReadIntegrations()}>
				<InfoRow.Root
					title={T()("integrations.manage.title")}
					description={T()("routes.system.integrations.description")}
				>
					<InfoRow.Content>
						<div class="-mx-4 overflow-hidden">
							<QueryToolbar
								queryState={props.state.searchParams}
								onRefresh={() => {
									queryClient.invalidateQueries({
										queryKey: queryKeys.integrations.list(),
									});
								}}
								filterSubject={T()("integrations.manage.title")}
								filterFields={[
									{
										label: T()("common.name"),
										key: "name",
										type: "text",
									},
									{
										label: T()("common.key"),
										key: "key",
										type: "text",
									},
									{
										label: T()("common.description"),
										key: "description",
										type: "text",
									},
									{
										label: T()("common.status.active"),
										key: "enabled",
										type: "checkbox",
										trueLabel: T()("common.status.active"),
										falseLabel: T()("common.status.inactive"),
									},
									{
										label: T()("common.scopes"),
										key: "scope",
										type: "select",
										options: scopeOptions(),
										operators: ["="],
									},
									{
										label: T()("common.last.used.at"),
										key: "lastUsedAt",
										type: "datetime",
									},
									{
										label: T()("common.expires.at"),
										key: "expiresAt",
										type: "datetime",
									},
									{
										label: T()("integrations.last.used.ip"),
										key: "lastUsedIp",
										type: "text",
									},
									{
										label: T()("common.created.at"),
										key: "createdAt",
										type: "datetime",
									},
									{
										label: T()("common.updated.at"),
										key: "updatedAt",
										type: "datetime",
									},
								]}
								sorts={[
									{
										label: T()("common.name"),
										key: "name",
									},
									{
										label: T()("common.description"),
										key: "description",
									},
									{
										label: T()("common.status.active"),
										key: "enabled",
									},
									{
										label: T()("common.created.at"),
										key: "createdAt",
									},
								]}
								perPage
								padding="sm"
							/>
							<QueryBoundary
								isError={integrations.isError}
								isEmpty={integrations.data?.data.length === 0}
								queryState={props.state.searchParams}
								empty={
									<EmptyState
										title={T()("empty.states.integrations.title")}
										description={T()("empty.states.integrations.description")}
										actions={
											<Button
												size="sm"
												permission={Permissions.IntegrationsCreate}
												onClick={() =>
													props.state.setOpenCreateIntegrationPanel(true)
												}
											>
												{T()("integrations.create.action")}
											</Button>
										}
									/>
								}
								class={classnames(
									"border-t border-border",
									integrations.isError || integrations.data?.data.length === 0
										? "-mb-4"
										: undefined,
								)}
							>
								<Table.Root
									id="integrations.list"
									rowCount={integrations.data?.data.length || 0}
									queryState={props.state.searchParams}
									head={[
										{
											label: T()("common.status"),
											key: "enabled",
											icon: <FaSolidT />,
											sortable: true,
										},
										{
											label: T()("common.name"),
											key: "name",
											icon: <FaSolidT />,
											sortable: true,
										},
										{
											label: T()("common.key"),
											key: "key",
											icon: <FaSolidIdCard />,
										},
										{
											label: T()("common.description"),
											key: "description",
											icon: <FaSolidT />,
											sortable: true,
										},
										{
											label: T()("common.last.used.at"),
											key: "lastUsed",
											icon: <FaSolidCalendar />,
											minWidth: 280,
										},
										{
											label: T()("common.expires.at"),
											key: "expiresAt",
											icon: <FaSolidCalendar />,
										},
										{
											label: T()("common.created.at"),
											key: "createdAt",
											icon: <FaSolidCalendar />,
											sortable: true,
										},
										{
											label: T()("common.updated.at"),
											key: "updatedAt",
											icon: <FaSolidCalendar />,
										},
									]}
									isLoading={integrations.isFetching}
									padding="sm"
									variant="contained"
								>
									<Index each={integrations.data?.data || []}>
										{(integration, i) => (
											<IntegrationTableRow
												index={i}
												integration={integration()}
												rowTarget={rowTarget}
											/>
										)}
									</Index>
								</Table.Root>
							</QueryBoundary>
							<Pagination
								queryState={props.state.searchParams}
								meta={integrations.data?.meta}
								variant="inline"
								padding="sm"
								hideWhenEmpty
							/>
						</div>
					</InfoRow.Content>
					<Show
						when={
							hasCreatePermission() &&
							integrations.isSuccess &&
							integrations.data.data.length > 0
						}
					>
						<div class="-mt-1 flex justify-start">
							<Button
								type="button"
								size="sm"
								variant="primary"
								onClick={() => props.state.setOpenCreateIntegrationPanel(true)}
							>
								{T()("integrations.create.action")}
							</Button>
						</div>
					</Show>
				</InfoRow.Root>
			</Show>

			{/* Panels & Modals */}
			<DeleteIntegrationModal
				id={rowTarget.getTargetId}
				services={api.integrations}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<UpsertIntegrationDrawer
				services={api.integrations}
				state={{
					open: props.state.openCreateIntegrationPanel(),
					setOpen: props.state.setOpenCreateIntegrationPanel,
				}}
				callbacks={{
					onCreateSuccess: (key) => {
						setAPIKey(key);
						setOpenCopyAPIKey(true);
					},
				}}
			/>
			<UpsertIntegrationDrawer
				id={rowTarget.getTargetId}
				services={api.integrations}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
			/>
			<CopyAPIKeyModal
				apiKey={getAPIKey()}
				state={{
					open: getOpenCopyAPIKey(),
					setOpen: (state: boolean) => {
						setOpenCopyAPIKey(state);
						if (!state) setAPIKey(undefined);
					},
				}}
			/>
			<RegenerateAPIKeyModal
				id={rowTarget.getTargetId}
				services={api.integrations}
				state={{
					open: rowTarget.getTriggers().regenerateAPIKey,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("regenerateAPIKey", state);
					},
				}}
				callbacks={{
					onSuccess: (key) => {
						setAPIKey(key);
						setOpenCopyAPIKey(true);
					},
				}}
			/>
		</div>
	);
};
