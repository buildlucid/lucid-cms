import type { Role } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

interface RoleRowProps {
	index: number;
	role: Role;
	rowTarget: ReturnType<typeof useRowTarget<"view" | "update" | "delete">>;
}

const RoleTableRow: Component<RoleRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const canUpdate = () =>
		userStore.get.hasPermission([Permissions.RolesUpdate]).all;
	const canRead = () =>
		userStore.get.hasPermission([Permissions.RolesRead]).all;

	// ----------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={
				props.role.locked
					? [
							{
								label: T()("common.details"),
								type: "button",
								icon: "info",
								onClick: () => {
									props.rowTarget.setTargetId(props.role.id);
									props.rowTarget.setTrigger("view", true);
								},
								permission: canRead(),
								sortOrder: 0,
							},
						]
					: [
							{
								label: T()("common.edit"),
								type: "button",
								icon: "pen",
								onClick: () => {
									props.rowTarget.setTargetId(props.role.id);
									props.rowTarget.setTrigger("update", true);
								},
								permission: canUpdate(),
								sortOrder: 0,
							},
						]
			}
		>
			<Table.Text column="name" text={props.role.name} />
			<Table.Pill
				column="locked"
				text={
					props.role.locked
						? T()("common.status.locked")
						: T()("common.status.unlocked")
				}
				variant={props.role.locked ? "warning-subtle" : "outline"}
			/>
			<Table.Date column="createdAt" date={props.role.createdAt} />
			<Table.Date column="updatedAt" date={props.role.updatedAt} />
		</Table.Row>
	);
};

export default RoleTableRow;
