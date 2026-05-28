import type { User } from "@types";
import { type Accessor, type Component, createMemo } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import { Tr } from "@/components/Groups/Table/Tr";
import UserDisplay from "@/components/Partials/UserDisplay";
import TextCol from "@/components/Tables/Columns/TextCol";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget";
import userStore from "@/store/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import DateCol from "../Columns/DateCol";
import PillCol from "../Columns/PillCol";

interface UserRowProps extends TableRowProps {
	user: User;
	include: boolean[];
	rowTarget: ReturnType<
		typeof useRowTarget<
			| "view"
			| "viewLogins"
			| "update"
			| "delete"
			| "passwordReset"
			| "revokeRefreshTokens"
			| "restore"
			| "deletePermanently"
			| "resendInvitation"
		>
	>;
	showingDeleted?: Accessor<boolean>;
	passwordAuthEnabled?: boolean;
}

const UserRow: Component<UserRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const currentUser = createMemo(() => {
		return props.user.id === userStore.get.user?.id;
	});
	const username = createMemo(() => {
		return currentUser() ? `${props.user.username} (you)` : props.user.username;
	});
	const canUpdateNotSelf = createMemo(() => {
		return (
			userStore.get.hasPermission([Permissions.UsersUpdate]).all &&
			!currentUser()
		);
	});
	const canDeleteNotSelf = createMemo(() => {
		return (
			userStore.get.hasPermission([Permissions.UsersDelete]).all &&
			!currentUser()
		);
	});
	const canRevokeRefreshTokens = createMemo(() => {
		return userStore.get.hasPermission([Permissions.UsersUpdate]).all;
	});

	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			actions={[
				{
					label: T()("common.edit"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("update", true);
					},
					permission: canUpdateNotSelf(),
					hide: props.showingDeleted?.() || currentUser(),
				},
				{
					label: T()("common.details"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("view", true);
					},
					permission: true,
				},
				{
					label: T()("common.logins"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("viewLogins", true);
					},
					permission: true,
					hide: props.showingDeleted?.(),
				},
				{
					label: T()("common.restore"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("restore", true);
					},
					permission: canUpdateNotSelf(),
					hide: props.showingDeleted?.() === false,
					theme: "primary",
				},
				{
					label: T()("actions.reset.password"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("passwordReset", true);
					},
					permission: canUpdateNotSelf(),
					actionExclude: true,
					hide:
						props.showingDeleted?.() ||
						!props.passwordAuthEnabled ||
						currentUser(),
					theme: "primary",
				},
				{
					label: T()("users.invitations.resend.action"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("resendInvitation", true);
					},
					permission: canUpdateNotSelf(),
					hide:
						props.showingDeleted?.() || props.user.invitationAccepted !== false,
					actionExclude: true,
					theme: "primary",
				},
				{
					label: T()("users.sessions.revoke.action"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("revokeRefreshTokens", true);
					},
					permission: canRevokeRefreshTokens(),
					actionExclude: true,
					hide: props.showingDeleted?.() || currentUser(),
					theme: "error",
				},
				{
					label: T()("common.delete"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("delete", true);
					},
					permission: canDeleteNotSelf(),
					actionExclude: true,
					hide: props.showingDeleted?.() || currentUser(),
					theme: "error",
				},
				{
					label: T()("actions.delete.permanently"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("deletePermanently", true);
					},
					permission: canDeleteNotSelf(),
					hide: props.showingDeleted?.() === false || currentUser(),
					theme: "error",
					actionExclude: true,
				},
			]}
			options={props.options}
			callbacks={props.callbacks}
		>
			<Td options={{ include: props?.include[0] }}>
				<UserDisplay
					user={{
						username: username(),
						firstName: props.user.firstName,
						lastName: props.user.lastName,
						profilePicture: props.user.profilePicture,
					}}
					mode="short"
					size="x-small"
				/>
			</Td>
			<TextCol
				text={props.user.firstName}
				options={{ include: props?.include[1] }}
			/>
			<TextCol
				text={props.user.lastName}
				options={{ include: props?.include[2] }}
			/>
			<TextCol
				text={props.user.email}
				options={{ include: props?.include[3] }}
			/>
			<TextCol
				text={
					props.user.superAdmin
						? T()("users.super.admin.title")
						: T()("common.standard")
				}
				options={{ include: props?.include[4] }}
			/>
			<TextCol
				text={
					props.user.isLocked
						? T()("common.status.locked")
						: T()("common.status.unlocked")
				}
				options={{ include: props?.include[5] }}
			/>
			<PillCol
				text={
					props.user.invitationAccepted == null
						? undefined
						: props.user.invitationAccepted
							? T()("users.invitations.status.accepted")
							: T()("common.status.pending")
				}
				theme={props.user.invitationAccepted ? "outline" : "warning-opaque"}
				options={{ include: props?.include[6] }}
			/>
			<PillCol
				options={{ include: props?.include[7] }}
				text={
					props.user.triggerPasswordReset == null
						? undefined
						: props.user.triggerPasswordReset
							? T()("auth.password.reset.required.title")
							: T()("users.password.reset.status.not.required")
				}
				theme={"outline"}
			/>
			<DateCol
				date={props.user.createdAt}
				options={{ include: props?.include[8] }}
			/>
		</Tr>
	);
};

export default UserRow;
