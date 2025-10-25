import T from "@/translations";
import {
	type Component,
	type Accessor,
	createMemo,
	Show,
	Index,
} from "solid-js";
import {
	FaSolidT,
	FaSolidCalendar,
	FaSolidShield,
	FaSolidGlobe,
} from "solid-icons/fa";
import api from "@/services/api";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import { Table } from "@/components/Groups/Table";
import { DynamicContent } from "@/components/Groups/Layout";
import { Paginated } from "@/components/Groups/Footers";
import { Filter, Sort, PerPage } from "@/components/Groups/Query";
import UserLoginRow from "@/components/Tables/Rows/UserLoginRow";

const ViewUserLoginsPanel: Component<{
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}> = (props) => {
	// ---------------------------------
	// Render
	return (
		<BottomPanel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: false,
				isError: false,
			}}
			options={{
				padding: "24",
				hideFooter: true,
				growContent: true,
			}}
			copy={{
				title: T()("view_user_logins_panel_title"),
				description: T()("view_user_logins_panel_description"),
			}}
		>
			{() => (
				<ViewUserLoginsPanelContent
					id={props.id}
					state={{
						open: props.state.open,
						setOpen: props.state.setOpen,
					}}
				/>
			)}
		</BottomPanel>
	);
};

const ViewUserLoginsPanelContent: Component<{
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}> = (props) => {
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
				perPage: 10,
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
	// Render
	return (
		<div class="flex flex-col h-full pb-4">
			<Show when={props.id !== undefined}>
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
					<PerPage options={[5, 10, 20]} searchParams={loginsSearchParams} />
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
		</div>
	);
};

export default ViewUserLoginsPanel;
