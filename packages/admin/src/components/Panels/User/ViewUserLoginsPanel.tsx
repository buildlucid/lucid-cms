import {
	FaSolidCalendar,
	FaSolidGlobe,
	FaSolidShield,
	FaSolidT,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	Index,
	Show,
} from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import { Filter } from "@/components/Groups/Query/Filter";
import { PerPage } from "@/components/Groups/Query/PerPage";
import { Sort } from "@/components/Groups/Query/Sort";
import { Table } from "@/components/Groups/Table/Table";
import UserLoginRow from "@/components/Tables/Rows/UserLoginRow";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import api from "@/services/api";
import T from "@/translations";

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
				growContent: true,
			}}
			copy={{
				title: T()("panels.users.logins.title"),
				description: T()("panels.users.logins.description"),
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
	const loginsSearchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				authMethod: textFilter(),
				ipAddress: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
			},
			pagination: pagination({ defaultPerPage: 10 }),
		},
		options: {
			singleSort: true,
		},
	});

	// ---------------------------------
	// Memos
	const canFetch = createMemo(() => {
		return (
			props.state.open && props.id !== undefined && loginsSearchParams.ready()
		);
	});

	// ---------------------------------
	// Queries
	const userLogins = api.userLogins.useGetMultiple({
		queryParams: {
			queryString: loginsSearchParams.queryString,
			location: {
				userId: props.id as Accessor<number | undefined>,
			},
		},
		enabled: canFetch,
	});

	// ---------------------------------
	// Render
	return (
		<div class="flex flex-col h-full">
			<Show when={props.id !== undefined}>
				<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
					<div class="flex gap-2.5">
						<Filter
							filters={[
								{
									label: T()("common.auth.method"),
									key: "authMethod",
									type: "text",
								},
								{
									label: T()("common.ip.address"),
									key: "ipAddress",
									type: "text",
								},
							]}
							searchParams={loginsSearchParams}
						/>
						<Sort
							sorts={[
								{
									label: T()("common.created.at"),
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
							title: T()("empty.states.user.logins.title"),
							description: T()("empty.states.user.logins.description"),
						},
					}}
				>
					<Table
						key={"user.logins"}
						rows={userLogins.data?.data.length || 0}
						searchParams={loginsSearchParams}
						head={[
							{
								label: T()("common.auth.method"),
								key: "authMethod",
								icon: <FaSolidShield />,
							},
							{
								label: T()("common.ip.address"),
								key: "ipAddress",
								icon: <FaSolidGlobe />,
							},
							{
								label: T()("users.agent"),
								key: "userAgent",
								icon: <FaSolidT />,
							},
							{
								label: T()("common.created.at"),
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
