import T from "@/translations";
import {
	type Component,
	type Accessor,
	createMemo,
	Show,
	For,
	Index,
} from "solid-js";
import {
	FaSolidT,
	FaSolidCalendar,
	FaSolidShield,
	FaSolidGlobe,
} from "solid-icons/fa";
import api from "@/services/api";
import dateHelpers from "@/utils/date-helpers";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import { Panel } from "@/components/Groups/Panel";
import SectionHeading from "@/components/Blocks/SectionHeading";
import DetailsList from "@/components/Partials/DetailsList";
import { Table } from "@/components/Groups/Table";
import { DynamicContent } from "@/components/Groups/Layout";
import { Paginated } from "@/components/Groups/Footers";
import { Filter, Sort, PerPage } from "@/components/Groups/Query";
import UserLoginRow from "@/components/Tables/Rows/UserLoginRow";

interface ViewUserPanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewUserPanel: Component<ViewUserPanelProps> = (props) => {
	// ---------------------------------
	// Hooks
	const loginsSearchParams = useSearchParamsState(
		{
			filters: {
				authMethod: {
					value: "",
					type: "text",
				},
				ipAddress: {
					value: "",
					type: "text",
				},
			},
			sorts: {
				createdAt: "desc",
			},
			pagination: {
				perPage: 5,
			},
		},
		{
			singleSort: true,
		},
	);

	// ---------------------------------
	// Memos
	const canFetch = createMemo(() => {
		return (
			props.state.open &&
			props.id !== undefined &&
			loginsSearchParams.getSettled()
		);
	});

	// ---------------------------------
	// Queries
	const user = api.users.useGetSingle({
		queryParams: {
			location: {
				userId: props.id as Accessor<number | undefined>,
			},
		},
		enabled: () => props.state.open && props.id !== undefined,
	});

	const userLogins = api.userLogins.useGetMultiple({
		queryParams: {
			queryString: loginsSearchParams.getQueryString,
			location: {
				userId: props.id as Accessor<number | undefined>,
			},
		},
		enabled: canFetch,
	});

	// ---------------------------------
	// Memos
	const panelContent = createMemo(() => {
		return {
			title: T()("view_user_panel_title"),
			description: T()("view_user_panel_description"),
		};
	});
	const panelFetchState = createMemo(() => {
		return {
			isLoading: user.isLoading,
			isError: user.isError,
		};
	});
	const userRoles = createMemo(() => {
		return user.data?.data.roles?.map((r) => r.name).join(", ") || "-";
	});

	// ---------------------------------
	// Render
	return (
		<Panel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={panelFetchState()}
			options={{
				padding: "24",
				hideFooter: true,
			}}
			callbacks={{
				reset: () => {
					loginsSearchParams.resetFilters();
				},
			}}
			copy={panelContent()}
		>
			{() => (
				<>
					<SectionHeading title={T()("details")} />
					<DetailsList
						type="text"
						items={[
							{
								label: T()("username"),
								value: user.data?.data.username,
							},
							{
								label: T()("email"),
								value: user.data?.data.email,
							},
							{
								label: T()("first_name"),
								value: user.data?.data.firstName || "-",
							},
							{
								label: T()("last_name"),
								value: user.data?.data.lastName || "-",
							},
							{
								label: T()("user_type"),
								value: user.data?.data.superAdmin
									? T()("super_admin")
									: T()("standard"),
							},
							{
								label: T()("roles"),
								value: userRoles(),
							},
						]}
					/>
					<SectionHeading title={T()("meta")} />
					<DetailsList
						type="text"
						items={[
							{
								label: T()("created_at"),
								value: dateHelpers.formatDate(user.data?.data.createdAt),
							},
							{
								label: T()("updated_at"),
								value: dateHelpers.formatDate(user.data?.data.updatedAt),
							},
						]}
					/>
					<Show when={props.id !== undefined}>
						<SectionHeading
							title={T()("user_logins")}
							description={T()("user_logins_description")}
						/>
						<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
							<div class="flex gap-2.5">
								<Filter
									filters={[
										{
											label: T()("auth_method"),
											key: "authMethod",
											type: "text",
										},
										{
											label: T()("ip_address"),
											key: "ipAddress",
											type: "text",
										},
									]}
									searchParams={loginsSearchParams}
								/>
								<Sort
									sorts={[
										{
											label: T()("created_at"),
											key: "createdAt",
										},
									]}
									searchParams={loginsSearchParams}
								/>
							</div>
							<PerPage
								options={[5, 10, 20]}
								searchParams={loginsSearchParams}
							/>
						</div>
						<DynamicContent
							class="bg-card-base border border-border rounded-md"
							state={{
								isError: userLogins.isError,
								isSuccess: userLogins.isSuccess,
								isEmpty: userLogins.data?.data.length === 0,
								searchParams: loginsSearchParams,
							}}
							slot={{
								footer: (
									<Paginated
										state={{
											searchParams: loginsSearchParams,
											meta: userLogins.data?.meta,
										}}
										options={{
											embedded: true,
										}}
									/>
								),
							}}
							copy={{
								noEntries: {
									title: T()("no_user_logins"),
									description: T()("no_user_logins_description"),
								},
							}}
							options={{
								inline: true,
							}}
						>
							<Table
								key={"user.logins"}
								rows={userLogins.data?.data.length || 0}
								searchParams={loginsSearchParams}
								head={[
									{
										label: T()("auth_method"),
										key: "authMethod",
										icon: <FaSolidShield />,
									},
									{
										label: T()("ip_address"),
										key: "ipAddress",
										icon: <FaSolidGlobe />,
									},
									{
										label: T()("user_agent"),
										key: "userAgent",
										icon: <FaSolidT />,
									},
									{
										label: T()("created_at"),
										key: "createdAt",
										icon: <FaSolidCalendar />,
										sortable: true,
									},
								]}
								state={{
									isLoading: userLogins.isFetching,
									isSuccess: userLogins.isSuccess,
								}}
								options={{
									isSelectable: false,
									padding: "16",
									totalLoadingRows: 5,
								}}
								theme="secondary"
							>
								{({ include, isSelectable, selected, setSelected }) => (
									<Index each={userLogins.data?.data || []}>
										{(login, i) => (
											<UserLoginRow
												index={i}
												login={login()}
												include={include}
												selected={selected[i]}
												options={{
													isSelectable,
													padding: "16",
												}}
												callbacks={{
													setSelected: setSelected,
												}}
												theme="secondary"
											/>
										)}
									</Index>
								)}
							</Table>
						</DynamicContent>
					</Show>
				</>
			)}
		</Panel>
	);
};

export default ViewUserPanel;
