import T from "@/translations";
import { type Component, Index } from "solid-js";
import { FaSolidT, FaSolidCalendar } from "solid-icons/fa";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import useRowTarget from "@/hooks/useRowTarget";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Table } from "@/components/Groups/Table";
import RoleRow from "@/components/Tables/Rows/RoleRow";
import UpsertRolePanel from "@/components/Panels/Role/UpsertRolePanel";
import DeleteRole from "@/components/Modals/Role/DeleteRole";

export const RolesList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
		setOpenCreateRolePanel: (state: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			update: false,
			delete: false,
		},
	});

	// ----------------------------------
	// Queries
	const roles = api.roles.useGetMultiple({
		queryParams: {
			queryString: props.state.searchParams.getQueryString,
			include: {
				permissions: false,
			},
		},
		enabled: () => props.state.searchParams.getSettled(),
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: roles.isError,
				isSuccess: roles.isSuccess,
				isEmpty: roles.data?.data.length === 0,
				searchParams: props.state.searchParams,
			}}
			slot={{
				footer: (
					<Paginated
						state={{
							searchParams: props.state.searchParams,
							meta: roles.data?.meta,
						}}
						options={{
							padding: "24",
						}}
					/>
				),
			}}
			copy={{
				noEntries: {
					title: T()("no_roles"),
					description: T()("no_roles_description"),
					button: T()("create_role"),
				},
			}}
			callback={{
				createEntry: () => {
					props.state.setOpenCreateRolePanel(true);
				},
			}}
		>
			<Table
				key={"roles.list"}
				rows={roles.data?.data.length || 0}
				searchParams={props.state.searchParams}
				head={[
					{
						label: T()("name"),
						key: "name",
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
							<RoleRow
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
			<UpsertRolePanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
			/>
			<DeleteRole
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
		</DynamicContent>
	);
};
