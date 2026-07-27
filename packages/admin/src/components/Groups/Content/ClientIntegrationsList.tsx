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
import CopyAPIKey from "@/components/Modals/ClientIntegrations/CopyAPIKey";
import DeleteClientIntegration from "@/components/Modals/ClientIntegrations/DeleteClientIntegration";
import RegenerateAPIKey from "@/components/Modals/ClientIntegrations/RegenerateAPIKey";
import UpsertClientIntegrationPanel from "@/components/Panels/ClientIntegrations/UpsertClientIntegrationPanel";
import LucidConnection from "@/components/Partials/LucidConnection";
import ClientIntegrationTableRow from "@/components/Tables/Rows/ClientIntegrationTableRow";
import { Permissions } from "@/constants/permissions";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import useRowTarget from "@/hooks/useRowTarget";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

export const ClientIntegrationsList: Component<{
	state: {
		searchParams: QueryStateResponse;
		openCreateClientIntegrationPanel: Accessor<boolean>;
		setOpenCreateClientIntegrationPanel: (state: boolean) => void;
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
	const clientIntegrations = api.clientIntegrations.useGetAll({
		queryParams: {
			queryString: props.state.searchParams.queryString,
		},
		enabled: () => props.state.searchParams.ready(),
	});
	const scopes = api.clientIntegrations.useGetScopes({
		queryParams: {},
		enabled: () =>
			userStore.get.hasPermission([Permissions.IntegrationsRead]).all,
	});

	// ----------------------------------------
	// Memos
	const canReadClientIntegrations = createMemo(
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
					label: T()("client.scopes.option.label", {
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
			{/* Lucid Connection */}
			<InfoRow.Root
				title={T()("connection.manage.title")}
				description={T()("connection.manage.description")}
			>
				<LucidConnection />
			</InfoRow.Root>

			{/* Client Integrations */}
			<Show when={canReadClientIntegrations()}>
				<InfoRow.Root
					title={T()("client.integrations.manage.title")}
					description={T()("routes.system.client.integrations.description")}
				>
					<InfoRow.Content>
						<div class="-mx-4 overflow-hidden">
							<QueryRow
								searchParams={props.state.searchParams}
								onRefresh={() => {
									queryClient.invalidateQueries({
										queryKey: ["clientIntegrations.getAll"],
									});
								}}
								filterSection={{
									subject: T()("client.integrations.manage.title"),
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
											label: T()("client.integrations.last.used.ip"),
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
								state={{
									isError: clientIntegrations.isError,
									isSuccess: clientIntegrations.isSuccess,
									isEmpty: clientIntegrations.data?.data.length === 0,
									searchParams: props.state.searchParams,
								}}
								slot={{
									footer: (
										<Paginated
											state={{
												searchParams: props.state.searchParams,
												meta: clientIntegrations.data?.meta,
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
										title: T()("empty.states.client.integrations.title"),
										description: T()(
											"empty.states.client.integrations.description",
										),
										button: T()("client.integrations.create.action"),
									},
								}}
								callback={{
									createEntry: () => {
										props.state.setOpenCreateClientIntegrationPanel(true);
									},
								}}
								permissions={{
									create: hasCreatePermission(),
								}}
								options={{
									inline: true,
								}}
							>
								<Table
									key={"client-integrations.list"}
									rows={clientIntegrations.data?.data.length || 0}
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
										isLoading: clientIntegrations.isFetching,
										isSuccess: clientIntegrations.isSuccess,
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
										<Index each={clientIntegrations.data?.data || []}>
											{(clientIntegration, i) => (
												<ClientIntegrationTableRow
													index={i}
													clientIntegration={clientIntegration()}
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
				</InfoRow.Root>
			</Show>

			{/* Panels & Modals */}
			<DeleteClientIntegration
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<UpsertClientIntegrationPanel
				state={{
					open: props.state.openCreateClientIntegrationPanel(),
					setOpen: props.state.setOpenCreateClientIntegrationPanel,
				}}
				callbacks={{
					onCreateSuccess: (key) => {
						setAPIKey(key);
						setOpenCopyAPIKey(true);
					},
				}}
			/>
			<UpsertClientIntegrationPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
				callbacks={{
					onCreateSuccess: (key) => {
						setAPIKey(key);
						setOpenCopyAPIKey(true);
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
