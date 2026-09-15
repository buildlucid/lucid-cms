import type { Role } from "@types";
import type { Component } from "solid-js";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import TablePillCell from "@/components/TablePillCell/TablePillCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableTextCell from "@/components/TableTextCell/TableTextCell";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";

interface RoleRowProps extends TableRowProps {
	role: Role;
	include: boolean[];
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
		<TableRow
			index={props.index}
			selected={props.selected}
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
							},
						]
			}
			options={props.options}
			callbacks={props.callbacks}
		>
			<TableTextCell
				text={props.role.name}
				options={{ include: props?.include[0] }}
			/>
			<TablePillCell
				text={
					props.role.locked
						? T()("common.status.locked")
						: T()("common.status.unlocked")
				}
				theme={props.role.locked ? "warning-opaque" : "outline"}
				options={{ include: props?.include[1] }}
			/>
			<TableDateCell
				date={props.role.createdAt}
				options={{ include: props?.include[2] }}
			/>
			<TableDateCell
				date={props.role.updatedAt}
				options={{ include: props?.include[3] }}
			/>
		</TableRow>
	);
};

export default RoleTableRow;
