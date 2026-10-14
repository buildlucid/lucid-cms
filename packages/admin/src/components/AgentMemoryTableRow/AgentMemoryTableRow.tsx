import type { AgentMemory } from "@types";
import type { Component } from "solid-js";
import ActorDisplay from "@/components/ActorDisplay/ActorDisplay";
import Table from "@/components/Table/Table";
import T from "@/translations";

const AgentMemoryTableRow: Component<{
	index: number;
	memory: AgentMemory;
	editable: boolean;
	onEdit: () => void;
	onDelete: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("common.edit"),
					type: "button",
					icon: "pen",
					show: props.editable,
					onClick: props.onEdit,
				},
				{
					label: T()("common.delete"),
					type: "button",
					icon: "trash",
					variant: "danger",
					show: props.editable,
					onClick: props.onDelete,
					excludeFromRowClick: true,
				},
			]}
		>
			<Table.Text
				column="content"
				text={props.memory.content}
				minWidth={360}
				maxLines={2}
			/>
			<Table.Cell column="updatedBy" minWidth={180}>
				<ActorDisplay
					user={props.memory.updatedBy}
					agent={props.memory.updatedByAgent}
				/>
			</Table.Cell>
			<Table.Date column="updatedAt" date={props.memory.updatedAt} />
		</Table.Row>
	);
};

export default AgentMemoryTableRow;
