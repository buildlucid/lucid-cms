import {
	FaSolidCalendar,
	FaSolidEnvelope,
	FaSolidIdCard,
	FaSolidLock,
	FaSolidT,
	FaSolidUserTie,
} from "solid-icons/fa";
import { type Accessor, type Component, createMemo, Index } from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Table } from "@/components/Groups/Table";
import DeleteUser from "@/components/Modals/User/DeleteUser";
import DeleteUserPermanently from "@/components/Modals/User/DeleteUserPermanently";
import ResendInvitation from "@/components/Modals/User/ResendInvitation";
import RestoreUsers from "@/components/Modals/User/RestoreUser";
import RevokeRefreshTokens from "@/components/Modals/User/RevokeRefreshTokens";
import TriggerPasswordReset from "@/components/Modals/User/TriggerPasswordReset";
import UpdateUserPanel from "@/components/Panels/User/UpdateUserPanel";
import ViewUserLoginsPanel from "@/components/Panels/User/ViewUserLoginsPanel";
import ViewUserPanel from "@/components/Panels/User/ViewUserPanel";
import UserRow from "@/components/Tables/Rows/UserRow";
import useRowTarget from "@/hooks/useRowTarget";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";

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
			viewLogins: false,
			update: false,
			delete: false,
			passwordReset: false,
			revokeRefreshTokens: false,
			restore: false,
			deletePermanently: false,
			resendInvitation: false,
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
	const rowsAreSelectable = createMemo(() => {
		if (props.state.showingDeleted()) {
			return userStore.get.hasPermission(["update_user", "delete_user"]).some;
		}
		return false;
	});
	const canRestoreUsers = createMemo(
		() => userStore.get.hasPermission(["update_user"]).some,
	);
	const canDeleteUsersPermanently = createMemo(
		() => userStore.get.hasPermission(["delete_user"]).some,
	);

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
	const providers = api.auth.useGetProviders({
		queryParams: {},
	});

	// ----------------------------------
	// Mutations
	const deleteUsersPermanently = api.users.useDeleteMultiplePermanently();
	const restoreUsers = api.users.useRestore();

	// ----------------------------------------
	// Effects
	const isLoading = createMemo(() => {
		return users.isLoading || providers.isLoading;
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
						label: T()("email"),
						key: "email",
						icon: <FaSolidEnvelope />,
					},
					{
						label: T()("user_type"),
						key: "superAdmin",
						icon: <FaSolidUserTie />,
					},
					{
						label: T()("is_locked"),
						key: "isLocked",
						icon: <FaSolidLock />,
						sortable: true,
					},
					{
						label: T()("invitation_status"),
						key: "invitationAccepted",
						icon: <FaSolidEnvelope />,
					},
					{
						label: T()("password_reset_status"),
						key: "triggerPasswordReset",
						icon: <FaSolidLock />,
					},
					{
						label: T()("created_at"),
						key: "createdAt",
						icon: <FaSolidCalendar />,
						sortable: true,
					},
				]}
				state={{
					isLoading: isLoading(),
					isSuccess: users.isSuccess,
				}}
				options={{
					isSelectable: rowsAreSelectable(),
					allowRestore: props.state.showingDeleted() && canRestoreUsers(),
					allowDeletePermanently:
						props.state.showingDeleted() && canDeleteUsersPermanently(),
				}}
				callbacks={{
					deletePermanentlyRows: async (selected) => {
						const ids: number[] = [];
						for (const i in selected) {
							if (selected[i] && users.data?.data[i].id) {
								ids.push(users.data?.data[i].id);
							}
						}
						await deleteUsersPermanently.action.mutateAsync({
							body: {
								ids: ids,
							},
						});
					},
					restoreRows: async (selected) => {
						const ids: number[] = [];
						for (const i in selected) {
							if (selected[i] && users.data?.data[i].id) {
								ids.push(users.data?.data[i].id);
							}
						}
						await restoreUsers.action.mutateAsync({
							body: {
								ids: ids,
							},
						});
					},
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
								passwordAuthEnabled={!providers.data?.data.disablePassword}
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
			<ViewUserLoginsPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().viewLogins,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("viewLogins", state);
					},
				}}
			/>
			<ResendInvitation
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().resendInvitation,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("resendInvitation", state);
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
			<RevokeRefreshTokens
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().revokeRefreshTokens,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("revokeRefreshTokens", state);
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
