import type { User } from "@types";
import { type Accessor, type Component, createMemo } from "solid-js";
import Table from "@/components/Table/Table";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import UserIdentityCell from "./parts/UserIdentityCell";

interface UserRowProps {
	index: number;
	user: User;
	rowTarget: ReturnType<
		typeof useRowTarget<
			| "view"
			| "createIntegration"
			| "viewLogins"
			| "update"
			| "delete"
			| "passwordReset"
			| "revokeRefreshTokens"
			| "resetTwoFactor"
			| "resetPasskeys"
			| "restore"
			| "deletePermanently"
			| "resendInvitation"
		>
	>;
	showingDeleted?: Accessor<boolean>;
	passwordAuthEnabled?: boolean;
}

const UserTableRow: Component<UserRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const currentUser = createMemo(() => {
		return props.user.id === userStore.get.user?.id;
	});
	const username = createMemo(() => {
		return currentUser() ? `${props.user.username} (you)` : props.user.username;
	});
	const canManage = createMemo(() => {
		return (
			props.user.superAdmin !== true || userStore.get.user?.superAdmin === true
		);
	});
	const canUpdateNotSelf = createMemo(() => {
		return (
			userStore.get.hasPermission([Permissions.UsersUpdate]).all &&
			!currentUser() &&
			canManage()
		);
	});
	const canDeleteNotSelf = createMemo(() => {
		return (
			userStore.get.hasPermission([Permissions.UsersDelete]).all &&
			!currentUser() &&
			canManage()
		);
	});
	const canRevokeRefreshTokens = createMemo(() => {
		return (
			userStore.get.hasPermission([Permissions.UsersUpdate]).all && canManage()
		);
	});

	// ----------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("common.edit"),
					type: "button",
					icon: "pen",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("update", true);
					},
					permission: canUpdateNotSelf(),
					show: !props.showingDeleted?.() && !currentUser(),
					sortOrder: 0,
				},
				{
					label: T()("common.details"),
					type: "button",
					icon: "info",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("view", true);
					},
					permission: true,
					sortOrder: 10,
				},
				{
					label: T()("common.logins"),
					type: "button",
					icon: "user",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("viewLogins", true);
					},
					permission: true,
					show: !props.showingDeleted?.(),
					sortOrder: 20,
				},
				{
					label: T()("integrations.create.action"),
					type: "button",
					icon: "key",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("createIntegration", true);
					},
					permission: userStore.get.user?.superAdmin === true,
					show: !props.showingDeleted?.(),
					excludeFromRowClick: true,
					variant: "primary",
					sortOrder: 30,
				},
				{
					label: T()("common.restore"),
					type: "button",
					icon: "restore",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("restore", true);
					},
					permission: canUpdateNotSelf(),
					show: props.showingDeleted?.() !== false,
					variant: "primary",
					sortOrder: 50,
				},
				{
					label: T()("users.invitations.resend.action"),
					type: "button",
					icon: "email",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("resendInvitation", true);
					},
					permission: canUpdateNotSelf(),
					show:
						!props.showingDeleted?.() &&
						props.user.invitationAccepted === false,
					excludeFromRowClick: true,
					variant: "primary",
					sortOrder: 60,
				},
				{
					label: T()("common.security"),
					type: "group",
					icon: "shield",
					//* your own password, two-factor and sessions are managed from your account
					show: !props.showingDeleted?.() && !currentUser(),
					excludeFromRowClick: true,
					sortOrder: 70,
					actions: [
						{
							label: T()("actions.reset.password"),
							type: "button",
							icon: "lock",
							onClick: () => {
								props.rowTarget.setTargetId(props.user.id);
								props.rowTarget.setTrigger("passwordReset", true);
							},
							permission: canUpdateNotSelf(),
							show: props.passwordAuthEnabled === true,
							variant: "danger",
						},
						{
							label: T()("users.two.factor.reset.action"),
							type: "button",
							icon: "shield-off",
							onClick: () => {
								props.rowTarget.setTargetId(props.user.id);
								props.rowTarget.setTrigger("resetTwoFactor", true);
							},
							permission: canUpdateNotSelf(),
							show: props.user.twoFactor?.enabled === true,
							variant: "danger",
						},
						{
							label: T()("users.passkeys.reset.action"),
							type: "button",
							icon: "fingerprint-off",
							onClick: () => {
								props.rowTarget.setTargetId(props.user.id);
								props.rowTarget.setTrigger("resetPasskeys", true);
							},
							permission: canUpdateNotSelf(),
							show: (props.user.passkeys?.length ?? 0) > 0,
							variant: "danger",
						},
						{
							label: T()("users.sessions.revoke.action"),
							type: "button",
							icon: "ban",
							onClick: () => {
								props.rowTarget.setTargetId(props.user.id);
								props.rowTarget.setTrigger("revokeRefreshTokens", true);
							},
							permission: canRevokeRefreshTokens(),
							variant: "danger",
						},
					],
				},
				{
					label: T()("common.delete"),
					type: "button",
					icon: "trash",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("delete", true);
					},
					permission: canDeleteNotSelf(),
					excludeFromRowClick: true,
					show: !props.showingDeleted?.() && !currentUser(),
					variant: "danger",
					sortOrder: 80,
				},
				{
					label: T()("actions.delete.permanently"),
					type: "button",
					icon: "trash",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("deletePermanently", true);
					},
					permission: canDeleteNotSelf(),
					show: props.showingDeleted?.() !== false && !currentUser(),
					excludeFromRowClick: true,
					variant: "danger",
					sortOrder: 90,
				},
			]}
		>
			<UserIdentityCell column="user" user={props.user} username={username()} />
			<Table.Text
				column="name"
				text={helpers.formatUserName(props.user, "name") || "-"}
			/>
			<Table.Text
				column="superAdmin"
				text={
					props.user.superAdmin
						? T()("users.super.admin.title")
						: T()("common.standard")
				}
			/>
			<Table.Pill
				column="isLocked"
				text={
					props.user.isLocked
						? T()("common.status.locked")
						: T()("common.status.unlocked")
				}
				variant={props.user.isLocked ? "warning-subtle" : "outline"}
			/>
			<Table.Pill
				column="invitationAccepted"
				text={
					props.user.invitationAccepted == null
						? undefined
						: props.user.invitationAccepted
							? T()("users.invitations.status.accepted")
							: T()("common.status.pending")
				}
				variant={props.user.invitationAccepted ? "outline" : "warning-subtle"}
			/>
			<Table.Pill
				column="triggerPasswordReset"
				text={
					props.user.triggerPasswordReset == null
						? undefined
						: props.user.triggerPasswordReset
							? T()("auth.password.reset.required.title")
							: T()("users.password.reset.status.not.required")
				}
				variant={"outline"}
			/>
			<Table.Date column="createdAt" date={props.user.createdAt} />
		</Table.Row>
	);
};

export default UserTableRow;
