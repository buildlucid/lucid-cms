import { useQueryClient } from "@tanstack/solid-query";
import { FaSolidCalendar, FaSolidIdCard, FaSolidT } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Index,
	Show,
} from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import { Table } from "@/components/Groups/Table/Table";
import CopyAPIKey from "@/components/Modals/Integrations/CopyAPIKey";
import DeleteIntegration from "@/components/Modals/Integrations/DeleteIntegration";
import RegenerateAPIKey from "@/components/Modals/Integrations/RegenerateAPIKey";
import UpsertIntegrationPanel from "@/components/Panels/Integrations/UpsertIntegrationPanel";
import Button from "@/components/Partials/Button";
import IntegrationTableRow from "@/components/Tables/Rows/IntegrationTableRow";
import { Permissions } from "@/constants/permissions";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import useRowTarget from "@/hooks/useRowTarget";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { OAuthClientsList } from "./OAuthClientsList";
import { OAuthConnectionsList } from "./OAuthConnectionsList";

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
		<DynamicContent options={{ padding: "24" }}>
			{/* OAuth Applications */}
			<Show when={canReadIntegrations()}>
				<OAuthClientsList
					canCreate={hasCreatePermission()}
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
				/>
			</Show>

			{/* OAuth Connections */}
			<Show when={canReadIntegrations()}>
				<OAuthConnectionsList
					owner={{ type: "system" }}
					canUpdate={
						userStore.get.hasPermission([Permissions.IntegrationsUpdate]).all
					}
					canRevoke={
						userStore.get.hasPermission([Permissions.IntegrationsDelete]).all
					}
				/>
			</Show>

			{/* Integrations */}
			<Show when={canReadIntegrations()}>
				<InfoRow.Root
					title={T()("integrations.manage.title")}
					description={T()("routes.system.integrations.description")}
				>
					<InfoRow.Content>
						<div class="-mx-4 overflow-hidden">
							<QueryRow
								searchParams={props.state.searchParams}
								onRefresh={() => {
									queryClient.invalidateQueries({
										queryKey: ["integrations.getAll"],
									});
								}}
								filterSection={{
									subject: T()("integrations.manage.title"),
									fields: [
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
									],
								}}
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
								perPage={[]}
								options={{
									padding: "16",
								}}
							/>
							<DynamicContent
								class={
									integrations.isError || integrations.data?.data.length === 0
										? "-mb-4"
										: undefined
								}
								state={{
									isError: integrations.isError,
									isSuccess: integrations.isSuccess,
									isEmpty: integrations.data?.data.length === 0,
									searchParams: props.state.searchParams,
								}}
								slot={{
									footer: (
										<Paginated
											state={{
												searchParams: props.state.searchParams,
												meta: integrations.data?.meta,
											}}
											options={{
												embedded: true,
												padding: "16",
												hideEmptyMessage: true,
											}}
										/>
									),
								}}
								copy={{
									noEntries: {
										title: T()("empty.states.integrations.title"),
										description: T()("empty.states.integrations.description"),
										button: T()("integrations.create.action"),
									},
								}}
								callback={{
									createEntry: () => {
										props.state.setOpenCreateIntegrationPanel(true);
									},
								}}
								permissions={{
									create: hasCreatePermission(),
								}}
								options={{
									inline: true,
									dividerTop: true,
								}}
							>
								<Table
									key={"integrations.list"}
									rows={integrations.data?.data.length || 0}
									searchParams={props.state.searchParams}
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
									state={{
										isLoading: integrations.isFetching,
										isSuccess: integrations.isSuccess,
									}}
									options={{
										isSelectable: false,
										padding: "16",
									}}
									theme="contained"
								>
									{({
										include,
										isSelectable,
										selected,
										setSelected,
										theme,
									}) => (
										<Index each={integrations.data?.data || []}>
											{(integration, i) => (
												<IntegrationTableRow
													index={i}
													integration={integration()}
													include={include}
													selected={selected[i]}
													rowTarget={rowTarget}
													options={{
														isSelectable,
														padding: "16",
													}}
													callbacks={{
														setSelected: setSelected,
													}}
													theme={theme}
												/>
											)}
										</Index>
									)}
								</Table>
							</DynamicContent>
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
								size="small"
								theme="primary"
								onClick={() => props.state.setOpenCreateIntegrationPanel(true)}
							>
								{T()("integrations.create.action")}
							</Button>
						</div>
					</Show>
				</InfoRow.Root>
			</Show>

			{/* Panels & Modals */}
			<DeleteIntegration
				id={rowTarget.getTargetId}
				services={api.integrations}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<UpsertIntegrationPanel
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
			<UpsertIntegrationPanel
				id={rowTarget.getTargetId}
				services={api.integrations}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
			/>
			<CopyAPIKey
				apiKey={getAPIKey()}
				state={{
					open: getOpenCopyAPIKey(),
					setOpen: (state: boolean) => {
						setOpenCopyAPIKey(state);
						if (!state) setAPIKey(undefined);
					},
				}}
			/>
			<RegenerateAPIKey
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
		</DynamicContent>
	);
};
