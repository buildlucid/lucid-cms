import T from "@/translations";
import { type Accessor, createMemo, type Component } from "solid-js";
import type { TableRowProps } from "@/types/components";
import type { UserResponse } from "@types";
import userStore from "@/store/userStore";
import type useRowTarget from "@/hooks/useRowTarget";
import { Tr } from "@/components/Groups/Table";
import TextCol from "@/components/Tables/Columns/TextCol";
import DateCol from "../Columns/DateCol";
import PillCol from "../Columns/PillCol";

interface UserRowProps extends TableRowProps {
	user: UserResponse;
	include: boolean[];
	rowTarget: ReturnType<
		typeof useRowTarget<
			| "view"
			| "viewLogins"
			| "update"
			| "delete"
			| "passwordReset"
			| "restore"
			| "deletePermanently"
		>
	>;
	showingDeleted?: Accessor<boolean>;
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

	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			actions={[
				{
					label: T()("edit"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("update", true);
					},
					permission:
						userStore.get.hasPermission(["update_user"]).all && !currentUser(),
					hide: props.showingDeleted?.(),
				},
				{
					label: T()("view_details"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("view", true);
					},
					permission: true,
				},
				{
					label: T()("view_logins"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("viewLogins", true);
					},
					permission: true,
					hide: props.showingDeleted?.(),
				},
				{
					label: T()("restore"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("restore", true);
					},
					permission: userStore.get.hasPermission(["update_user"]).all,
					hide: props.showingDeleted?.() === false,
					theme: "primary",
				},
				{
					label: T()("delete"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("delete", true);
					},
					permission:
						userStore.get.hasPermission(["delete_user"]).all && !currentUser(),
					actionExclude: true,
					hide: props.showingDeleted?.(),
					theme: "error",
				},
				{
					label: T()("delete_permanently"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("deletePermanently", true);
					},
					permission: userStore.get.hasPermission(["delete_user"]).all,
					hide: props.showingDeleted?.() === false,
					theme: "error",
					actionExclude: true,
				},
				{
					label: T()("reset_password"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.user.id);
						props.rowTarget.setTrigger("passwordReset", true);
					},
					permission:
						userStore.get.hasPermission(["update_user"]).all && !currentUser(),
					actionExclude: true,
					hide: props.showingDeleted?.(),
					theme: "primary",
				},
			]}
			options={props.options}
			callbacks={props.callbacks}
		>
			<TextCol text={username()} options={{ include: props?.include[0] }} />
			<TextCol
				text={props.user.firstName}
				options={{ include: props?.include[1] }}
			/>
			<TextCol
				text={props.user.lastName}
				options={{ include: props?.include[2] }}
			/>
			<PillCol
				text={props.user.superAdmin ? T()("super_admin") : T()("standard")}
				options={{ include: props?.include[3] }}
			/>
			<TextCol
				text={props.user.email}
				options={{ include: props?.include[4] }}
			/>
			<DateCol
				date={props.user.createdAt}
				options={{ include: props?.include[5] }}
			/>
		</Tr>
	);
};

export default UserRow;
