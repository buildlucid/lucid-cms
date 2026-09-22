import { type Component, Match, Switch } from "solid-js";
import Pill, { type PillProps } from "@/components/Pill/Pill";
import TableCell from "@/components/Table/parts/TableCell";

export interface TablePillCellProps {
	/** Head key this cell belongs to. It hides when that column is toggled off. */
	column?: string;
	text?: string | number | null;
	/** @default "neutral" */
	variant?: PillProps["variant"];
	/** Applied to the cell. */
	class?: string;
}

/** A cell showing a status or label as a pill. */
const TablePillCell: Component<TablePillCellProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableCell column={props.column} class={props.class}>
			<Switch>
				<Match when={props.text !== undefined}>
					<Pill variant={props.variant || "neutral"}>{props.text}</Pill>
				</Match>
				<Match when={props.text === undefined}>{"-"}</Match>
			</Switch>
		</TableCell>
	);
};

export default TablePillCell;
