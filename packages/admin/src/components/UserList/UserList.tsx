import {
	FaSolidCalendar,
	FaSolidEnvelope,
	FaSolidIdCard,
	FaSolidLock,
	FaSolidUserTie,
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
import CopyAPIKeyModal from "@/components/CopyAPIKeyModal/CopyAPIKeyModal";
import DeleteUserModal from "@/components/DeleteUserModal/DeleteUserModal";
import DeleteUserPermanentlyModal from "@/components/DeleteUserPermanentlyModal/DeleteUserPermanentlyModal";
import EmptyState from "@/components/EmptyState/EmptyState";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import ResendInvitationModal from "@/components/ResendInvitationModal/ResendInvitationModal";
import RestoreUsers from "@/components/RestoreUserModal/RestoreUserModal";
import RevokeRefreshTokensModal from "@/components/RevokeRefreshTokensModal/RevokeRefreshTokensModal";
import Table from "@/components/Table/Table";
import TriggerPasswordResetModal from "@/components/TriggerPasswordResetModal/TriggerPasswordResetModal";
import UpdateUserDrawer from "@/components/UpdateUserDrawer/UpdateUserDrawer";
import UpsertIntegrationDrawer from "@/components/UpsertIntegrationDrawer/UpsertIntegrationDrawer";
import UserTableRow from "@/components/UserTableRow/UserTableRow";
import ViewUserDrawer from "@/components/ViewUserDrawer/ViewUserDrawer";
import ViewUserLoginsDrawer from "@/components/ViewUserLoginsDrawer/ViewUserLoginsDrawer";
import { Permissions } from "@/constants/permissions";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

export const UserList: Component<{
	state: {
		searchParams: QueryStateResponse;
		setOpenCreateUserPanel: (state: boolean) => void;
		showingDeleted: Accessor<boolean>;
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			createIntegration: false,
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
	const [apiKey, setAPIKey] = createSignal<string>();
	const [copyAPIKeyOpen, setCopyAPIKeyOpen] = createSignal(false);

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
				title: T()("empty.states.users.deleted.title"),
				description: T()("empty.states.users.deleted.description"),
			};
		}
		return {
			title: T()("empty.states.users.title"),
			description: T()("empty.states.users.description"),
			button: T()(Permissions.UsersCreate),
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
			return userStore.get.hasPermission([
				Permissions.UsersUpdate,
				Permissions.UsersDelete,
			]).some;
		}
		return false;
	});
	const canRestoreUsers = createMemo(
		() => userStore.get.hasPermission([Permissions.UsersUpdate]).some,
	);
	const canDeleteUsersPermanently = createMemo(
		() => userStore.get.hasPermission([Permissions.UsersDelete]).some,
	);

	// ----------------------------------
	// Queries
	const users = api.users.useGetMultiple({
		queryParams: {
			queryString: props.state?.searchParams.queryString,
			filters: {
				isDeleted: isDeletedFilter,
			},
		},
		enabled: () => props.state?.searchParams.ready(),
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
		<>
			<QueryBoundary
				error={users.isError}
				empty={users.data?.data.length === 0}
				queryState={props.state.searchParams}
				emptyFallback={
					<EmptyState
						title={noEntriesCopy()?.title}
						description={noEntriesCopy()?.description}
						actions={
							createEntryCallback() ? (
								<Button size="sm" onClick={createEntryCallback()}>
									{noEntriesCopy()?.button ?? T()("actions.create.entry")}
								</Button>
							) : undefined
						}
					/>
				}
				class="flex-1 h-full"
			>
				<Table.Root
					id="users.list"
					rowCount={users.data?.data.length || 0}
					queryState={props.state.searchParams}
					columns={[
						{
							label: T()("common.user"),
							key: "user",
							icon: <FaSolidIdCard />,
							minWidth: 260,
						},
						{
							label: T()("common.name"),
							key: "name",
							icon: <FaSolidIdCard />,
						},
						{
							label: T()("users.type"),
							key: "superAdmin",
							icon: <FaSolidUserTie />,
						},
						{
							label: T()("users.status.locked.label"),
							key: "isLocked",
							icon: <FaSolidLock />,
							sortable: true,
						},
						{
							label: T()("users.invitations.status.label"),
							key: "invitationAccepted",
							icon: <FaSolidEnvelope />,
						},
						{
							label: T()("users.password.reset.status.label"),
							key: "triggerPasswordReset",
							icon: <FaSolidLock />,
						},
						{
							label: T()("common.created.at"),
							key: "createdAt",
							icon: <FaSolidCalendar />,
							sortable: true,
						},
					]}
					loading={isLoading()}
					selectable={rowsAreSelectable()}
					allowRestore={props.state.showingDeleted() && canRestoreUsers()}
					allowDeletePermanently={
						props.state.showingDeleted() && canDeleteUsersPermanently()
					}
					onDeletePermanentlyRows={async (selected) => {
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
					}}
					onRestoreRows={async (selected) => {
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
					}}
				>
					<Index each={users.data?.data || []}>
						{(user, i) => (
							<UserTableRow
								index={i}
								user={user()}
								rowTarget={rowTarget}
								showingDeleted={props.state.showingDeleted}
								passwordAuthEnabled={!providers.data?.data.disablePassword}
							/>
						)}
					</Index>
				</Table.Root>
				<ViewUserDrawer
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().view,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("view", state);
						},
					}}
				/>
				<ViewUserLoginsDrawer
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().viewLogins,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("viewLogins", state);
						},
					}}
				/>
				<ResendInvitationModal
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().resendInvitation,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("resendInvitation", state);
						},
					}}
				/>
				<UpdateUserDrawer
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().update,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("update", state);
						},
					}}
				/>
				<Show when={rowTarget.getTargetId()}>
					{(userId) => (
						<UpsertIntegrationDrawer
							services={api.users.integrations(userId)}
							state={{
								open: rowTarget.getTriggers().createIntegration,
								setOpen: (open) =>
									rowTarget.setTrigger("createIntegration", open),
							}}
							callbacks={{
								onCreateSuccess: (key) => {
									setAPIKey(key);
									setCopyAPIKeyOpen(true);
								},
							}}
						/>
					)}
				</Show>
				<CopyAPIKeyModal
					apiKey={apiKey()}
					state={{
						open: copyAPIKeyOpen(),
						setOpen: (open) => {
							setCopyAPIKeyOpen(open);
							if (!open) setAPIKey(undefined);
						},
					}}
				/>
				<DeleteUserModal
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().delete,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("delete", state);
						},
					}}
				/>
				<TriggerPasswordResetModal
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().passwordReset,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("passwordReset", state);
						},
					}}
				/>
				<RevokeRefreshTokensModal
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
				<DeleteUserPermanentlyModal
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().deletePermanently,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("deletePermanently", state);
						},
					}}
				/>
			</QueryBoundary>
			<Pagination
				queryState={props.state.searchParams}
				meta={users.data?.meta}
				padding="md"
			/>
		</>
	);
};
