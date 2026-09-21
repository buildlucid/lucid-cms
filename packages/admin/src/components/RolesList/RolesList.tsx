import { FaSolidCalendar, FaSolidLock, FaSolidT } from "solid-icons/fa";
import { type Component, Index } from "solid-js";
import Button from "@/components/Button/Button";
import DeleteRoleModal from "@/components/DeleteRoleModal/DeleteRoleModal";
import EmptyState from "@/components/EmptyState/EmptyState";
import { PaginatedFooter } from "@/components/PaginatedFooter/PaginatedFooter";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import RoleTableRow from "@/components/RoleTableRow/RoleTableRow";
import { Table } from "@/components/Table/Table";
import UpsertRoleDrawer from "@/components/UpsertRoleDrawer/UpsertRoleDrawer";
import ViewRoleDrawer from "@/components/ViewRoleDrawer/ViewRoleDrawer";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import T from "@/translations";

export const RolesList: Component<{
	state: {
		searchParams: QueryStateResponse;
		setOpenCreateRolePanel: (state: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			view: false,
			update: false,
			delete: false,
		},
	});

	// ----------------------------------
	// Queries
	const roles = api.roles.useGetMultiple({
		queryParams: {
			queryString: props.state.searchParams.queryString,
			include: {
				permissions: false,
			},
		},
		enabled: () => props.state.searchParams.ready(),
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<QueryBoundary
				isError={roles.isError}
				isEmpty={roles.data?.data.length === 0}
				queryState={props.state.searchParams}
				empty={
					<EmptyState
						title={T()("empty.states.roles.title")}
						description={T()("empty.states.roles.description")}
						actions={
							<Button
								size="sm"
								onClick={() => props.state.setOpenCreateRolePanel(true)}
							>
								{T()("permissions.roles.create")}
							</Button>
						}
					/>
				}
				class="flex-1 h-full"
			>
				<Table
					key={"roles.list"}
					rows={roles.data?.data.length || 0}
					searchParams={props.state.searchParams}
					head={[
						{
							label: T()("common.name"),
							key: "name",
							icon: <FaSolidT />,
							sortable: true,
						},
						{
							label: T()("common.status"),
							key: "locked",
							icon: <FaSolidLock />,
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
						isLoading: roles.isFetching,
						isSuccess: roles.isSuccess,
					}}
					options={{
						isSelectable: false,
					}}
				>
					{({ include, isSelectable, selected, setSelected }) => (
						<Index each={roles.data?.data || []}>
							{(role, i) => (
								<RoleTableRow
									index={i}
									role={role()}
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
				<UpsertRoleDrawer
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().update,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("update", state);
						},
					}}
				/>
				<ViewRoleDrawer
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().view,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("view", state);
						},
					}}
				/>
				<DeleteRoleModal
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().delete,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("delete", state);
						},
					}}
				/>
			</QueryBoundary>
			<PaginatedFooter
				state={{
					searchParams: props.state.searchParams,
					meta: roles.data?.meta,
				}}
				options={{
					padding: "24",
				}}
			/>
		</>
	);
};
