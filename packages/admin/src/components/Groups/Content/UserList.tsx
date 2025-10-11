import T from "@/translations";
import { type Accessor, type Component, createMemo, Index } from "solid-js";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import {
	FaSolidT,
	FaSolidCalendar,
	FaSolidEnvelope,
	FaSolidUserTie,
	FaSolidIdCard,
} from "solid-icons/fa";
import api from "@/services/api";
import useRowTarget from "@/hooks/useRowTarget";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import ViewUserPanel from "@/components/Panels/User/ViewUserPanel";
import UpdateUserPanel from "@/components/Panels/User/UpdateUserPanel";
import DeleteUser from "@/components/Modals/User/DeleteUser";
import TriggerPasswordReset from "@/components/Modals/User/TriggerPasswordReset";
import { Table } from "@/components/Groups/Table";
import UserRow from "@/components/Tables/Rows/UserRow";
import RestoreUsers from "@/components/Modals/User/RestoreUser";
import DeleteUserPermanently from "@/components/Modals/User/DeleteUserPermanently";

export const UserList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
		setOpenCreateUserPanel: (state: boolean) => void;
		showingDeleted: Accessor<boolean>;
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			view: false,
			update: false,
			delete: false,
			passwordReset: false,
			restore: false,
			deletePermanently: false,
		},
	});

	// ----------------------------------
	// Functions
	const openCreateUserPanel = () => {
		props.state.setOpenCreateUserPanel(true);
	};

	// ----------------------------------
	// Memos
	const isDeletedFilter = createMemo(() =>
		props.state.showingDeleted() ? 1 : 0,
	);
	const noEntriesCopy = createMemo(() => {
		if (props.state.showingDeleted()) {
			return {
				title: T()("no_deleted_users"),
				description: T()("no_deleted_users_description"),
			};
		}
		return {
			title: T()("no_users"),
			description: T()("no_users_description"),
			button: T()("create_user"),
		};
	});
	const createEntryCallback = createMemo(() => {
		if (props.state.showingDeleted()) {
			return undefined;
		}
		return openCreateUserPanel;
	});

	// ----------------------------------
	// Queries
	const users = api.users.useGetMultiple({
		queryParams: {
			queryString: props.state?.searchParams.getQueryString,
			filters: {
				isDeleted: isDeletedFilter,
			},
		},
		enabled: () => props.state?.searchParams.getSettled(),
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: users.isError,
				isSuccess: users.isSuccess,
				isEmpty: users.data?.data.length === 0,
				searchParams: props.state.searchParams,
			}}
			slot={{
				footer: (
					<Paginated
						state={{
							searchParams: props.state.searchParams,
							meta: users.data?.meta,
						}}
						options={{
							padding: "24",
						}}
					/>
				),
			}}
			copy={{
				noEntries: noEntriesCopy(),
			}}
			callback={{
				createEntry: createEntryCallback(),
			}}
		>
			<Table
				key={"users.list"}
				rows={users.data?.data.length || 0}
				searchParams={props.state.searchParams}
				head={[
					{
						label: T()("username"),
						key: "username",
						icon: <FaSolidIdCard />,
					},
					{
						label: T()("first_name"),
						key: "firstName",
						icon: <FaSolidT />,
					},
					{
						label: T()("last_name"),
						key: "lastName",
						icon: <FaSolidT />,
					},
					{
						label: T()("super_admin"),
						key: "superAdmin",
						icon: <FaSolidUserTie />,
					},
					{
						label: T()("email"),
						key: "email",
						icon: <FaSolidEnvelope />,
					},
					{
						label: T()("created_at"),
						key: "createdAt",
						icon: <FaSolidCalendar />,
						sortable: true,
					},
				]}
				state={{
					isLoading: users.isFetching,
					isSuccess: users.isSuccess,
				}}
				options={{
					isSelectable: false,
				}}
			>
				{({ include, isSelectable, selected, setSelected }) => (
					<Index each={users.data?.data || []}>
						{(user, i) => (
							<UserRow
								index={i}
								user={user()}
								include={include}
								selected={selected[i]}
								rowTarget={rowTarget}
								options={{
									isSelectable,
								}}
								callbacks={{
									setSelected: setSelected,
								}}
								showingDeleted={props.state.showingDeleted}
							/>
						)}
					</Index>
				)}
			</Table>
			<ViewUserPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().view,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("view", state);
					},
				}}
			/>
			<UpdateUserPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
			/>
			<DeleteUser
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<TriggerPasswordReset
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().passwordReset,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("passwordReset", state);
					},
				}}
			/>
			<RestoreUsers
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().restore,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("restore", state);
					},
				}}
			/>
			<DeleteUserPermanently
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().deletePermanently,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deletePermanently", state);
					},
				}}
			/>
		</DynamicContent>
	);
};
