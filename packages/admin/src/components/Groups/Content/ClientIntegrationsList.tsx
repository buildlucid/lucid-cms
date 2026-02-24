import { FaSolidCalendar, FaSolidIdCard, FaSolidT } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Index,
} from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Table } from "@/components/Groups/Table";
import CopyAPIKey from "@/components/Modals/ClientIntegrations/CopyAPIKey";
import DeleteClientIntegration from "@/components/Modals/ClientIntegrations/DeleteClientIntegration";
import RegenerateAPIKey from "@/components/Modals/ClientIntegrations/RegenerateAPIKey";
import UpsertClientIntegrationPanel from "@/components/Panels/ClientIntegrations/UpsertClientIntegrationPanel";
import ClientIntegrationTableRow from "@/components/Tables/Rows/ClientIntegrationTableRow";
import useRowTarget from "@/hooks/useRowTarget";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";

export const ClientIntegrationsList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
		openCreateClientIntegrationPanel: Accessor<boolean>;
		setOpenCreateClientIntegrationPanel: (state: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	const rowTarget = useRowTarget({
		triggers: {
			delete: false,
			regenerateAPIKey: false,
			update: false,
		},
	});
	const [getAPIKey, setAPIKey] = createSignal<string | undefined>();
	const [getOpenCopyAPIKey, setOpenCopyAPIKey] = createSignal(false);

	// ----------------------------------
	// Queries
	const clientIntegrations = api.clientIntegrations.useGetAll({
		queryParams: {
			queryString: props.state.searchParams.getQueryString,
		},
		enabled: () => props.state.searchParams.getSettled(),
	});

	// ----------------------------------
	// Memos
	const hasCreatePermission = createMemo(() => {
		return userStore.get.hasPermission(["create_client_integration"]).all;
	});

	// ----------------------------------
	// Render
	return (
		<>
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
								padding: "24",
							}}
						/>
					),
				}}
				copy={{
					noEntries: {
						title: T()("no_client_integrations_found_title"),
						description: T()("no_client_integrations_found_descriptions"),
						button: T()("create_integration"),
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
			>
				<Table
					key={"client-integrations.list"}
					rows={clientIntegrations.data?.data.length || 0}
					searchParams={props.state.searchParams}
					head={[
						{
							label: T()("status"),
							key: "enabled",
							icon: <FaSolidT />,
							sortable: true,
						},
						{
							label: T()("name"),
							key: "name",
							icon: <FaSolidT />,
							sortable: true,
						},
						{
							label: T()("key"),
							key: "key",
							icon: <FaSolidIdCard />,
						},
						{
							label: T()("description"),
							key: "description",
							icon: <FaSolidT />,
							sortable: true,
						},
						{
							label: T()("created_at"),
							key: "createdAt",
							icon: <FaSolidCalendar />,
							sortable: true,
						},
						{
							label: T()("updated_at"),
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
					}}
				>
					{({ include, isSelectable, selected, setSelected }) => (
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
									}}
									callbacks={{
										setSelected: setSelected,
									}}
								/>
							)}
						</Index>
					)}
				</Table>
			</DynamicContent>

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
		</>
	);
};
