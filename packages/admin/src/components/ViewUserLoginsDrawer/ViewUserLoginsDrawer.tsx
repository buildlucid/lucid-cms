import classnames from "classnames";
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
	createSignal,
	Index,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import EmptyState from "@/components/EmptyState/EmptyState";
import FilterPanel from "@/components/FilterPanel/FilterPanel";
import FilterToggle from "@/components/FilterToggle/FilterToggle";
import Pagination from "@/components/Pagination/Pagination";
import PerPageSelect from "@/components/PerPageSelect/PerPageSelect";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QuerySort from "@/components/QuerySort/QuerySort";
import Table from "@/components/Table/Table";
import UserLoginTableRow from "@/components/UserLoginTableRow/UserLoginTableRow";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";

const ViewUserLoginsDrawer: Component<{
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}> = (props) => {
	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
		>
			<Drawer.Header>
				<Drawer.Title>{T()("panels.users.logins.title")}</Drawer.Title>
				<Drawer.Description>
					{T()("panels.users.logins.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Body>
				<ViewUserLoginsPanelContent
					id={props.id}
					state={{
						open: props.state.open,
						setOpen: props.state.setOpen,
					}}
				/>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Actions>
					<Button
						size="md"
						variant="outline"
						onClick={() => props.state.setOpen(false)}
					>
						{T()("common.close")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</Drawer.Root>
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
				userAgent: textFilter(),
				createdAt: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
			},
			pagination: pagination({ defaultPerPage: 10 }),
		},
		singleSort: true,
	});
	const [filterSectionOpen, setFilterPanelOpen] = createSignal(false);

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
						<FilterToggle
							open={filterSectionOpen()}
							onOpenChange={setFilterPanelOpen}
							queryState={loginsSearchParams}
						/>
						<QuerySort
							sorts={[
								{
									label: T()("common.created.at"),
									key: "createdAt",
								},
							]}
							queryState={loginsSearchParams}
						/>
					</div>
					<PerPageSelect
						options={[5, 10, 20]}
						queryState={loginsSearchParams}
					/>
				</div>
				<FilterPanel
					open={filterSectionOpen()}
					onOpenChange={setFilterPanelOpen}
					subject={T()("panels.users.logins.title")}
					fields={[
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
						{
							label: T()("users.agent"),
							key: "userAgent",
							type: "text",
						},
						{
							label: T()("common.created.at"),
							key: "createdAt",
							type: "datetime",
						},
					]}
					queryState={loginsSearchParams}
					embedded={true}
				/>
				<QueryBoundary
					error={userLogins.isError}
					empty={userLogins.data?.data.length === 0}
					queryState={loginsSearchParams}
					emptyFallback={
						<EmptyState
							title={T()("empty.states.user.logins.title")}
							description={T()("empty.states.user.logins.description")}
						/>
					}
					class={classnames(
						"flex-1 h-full",
						"bg-card-base border border-border rounded-md",
					)}
				>
					<Table.Root
						id="user.logins"
						rowCount={userLogins.data?.data.length || 0}
						queryState={loginsSearchParams}
						columns={[
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
						loading={userLogins.isFetching}
						padding="sm"
						variant="secondary"
					>
						<Index each={userLogins.data?.data || []}>
							{(login, i) => <UserLoginTableRow index={i} login={login()} />}
						</Index>
					</Table.Root>
				</QueryBoundary>
				<Pagination
					queryState={loginsSearchParams}
					meta={userLogins.data?.meta}
					variant="inline"
				/>
			</Show>
		</div>
	);
};

export default ViewUserLoginsDrawer;
