import type { Role } from "@types";
import type { Component } from "solid-js";
import { Tr } from "@/components/Groups/Table/Tr";
import TextCol from "@/components/Tables/Columns/TextCol";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget";
import userStore from "@/store/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import DateCol from "../Columns/DateCol";
import PillCol from "../Columns/PillCol";

interface RoleRowProps extends TableRowProps {
	role: Role;
	include: boolean[];
	rowTarget: ReturnType<typeof useRowTarget<"view" | "update" | "delete">>;
}

const RoleRow: Component<RoleRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const canUpdate = () =>
		userStore.get.hasPermission([Permissions.RolesUpdate]).all;
	const canRead = () =>
		userStore.get.hasPermission([Permissions.RolesRead]).all;

	// ----------------------------------
	// Render
	return (
		<Tr
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
			<TextCol
				text={props.role.name}
				options={{ include: props?.include[0] }}
			/>
			<PillCol
				text={
					props.role.locked
						? T()("common.status.locked")
						: T()("common.status.unlocked")
				}
				theme={props.role.locked ? "warning-opaque" : "outline"}
				options={{ include: props?.include[1] }}
			/>
			<DateCol
				date={props.role.createdAt}
				options={{ include: props?.include[2] }}
			/>
			<DateCol
				date={props.role.updatedAt}
				options={{ include: props?.include[3] }}
			/>
		</Tr>
	);
};

export default RoleRow;
