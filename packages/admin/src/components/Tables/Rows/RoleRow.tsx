import T from "@/translations";
import type { Component } from "solid-js";
import type useRowTarget from "@/hooks/useRowTarget";
import type { TableRowProps } from "@/types/components";
import type { RoleResponse } from "@types";
import userStore from "@/store/userStore";
import { Tr } from "@/components/Groups/Table";
import TextCol from "@/components/Tables/Columns/TextCol";
import DateCol from "../Columns/DateCol";

interface RoleRowProps extends TableRowProps {
	role: RoleResponse;
	include: boolean[];
	rowTarget: ReturnType<typeof useRowTarget<"update" | "delete">>;
}

const RoleRow: Component<RoleRowProps> = (props) => {
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
						props.rowTarget.setTargetId(props.role.id);
						props.rowTarget.setTrigger("update", true);
					},
					permission: userStore.get.hasPermission(["update_role"]).all,
				},
				{
					label: T()("delete"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.role.id);
						props.rowTarget.setTrigger("delete", true);
					},
					permission: userStore.get.hasPermission(["delete_role"]).all,
					actionExclude: true,
				},
			]}
			options={props.options}
			callbacks={props.callbacks}
		>
			<TextCol
				text={props.role.name}
				options={{ include: props?.include[0] }}
			/>
			<DateCol
				date={props.role.createdAt}
				options={{ include: props?.include[1] }}
			/>
			<DateCol
				date={props.role.updatedAt}
				options={{ include: props?.include[2] }}
			/>
		</Tr>
	);
};

export default RoleRow;
