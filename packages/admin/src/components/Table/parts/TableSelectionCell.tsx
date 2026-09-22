import { type Component, createUniqueId, Match, Switch } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import TableCell from "@/components/Table/parts/TableCell";
import TableHeaderCell from "@/components/Table/parts/TableHeaderCell";

interface TableSelectionCellProps {
	/** Head key this cell belongs to, when the table declares one for it. */
	column?: string;
	type?: "th" | "td";
	value: boolean;
	onChange: (_value: boolean) => void;
}

const TableSelectionCell: Component<TableSelectionCellProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const id = createUniqueId();

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.type === "th"}>
				<TableHeaderCell column={props.column} width={65}>
					<Checkbox
						id={`table-select-${id}`}
						value={props.value}
						onChange={props.onChange}
					/>
				</TableHeaderCell>
			</Match>
			<Match when={props.type === "td"}>
				<TableCell column={props.column} width={65}>
					<Checkbox
						id={`table-select-${id}`}
						value={props.value}
						onChange={props.onChange}
					/>
				</TableCell>
			</Match>
		</Switch>
	);
};

export default TableSelectionCell;
