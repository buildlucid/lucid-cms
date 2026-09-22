import { type Component, Match, Switch } from "solid-js";
import Pill, { type PillProps } from "@/components/Pill/Pill";
import TableCell from "@/components/Table/parts/TableCell";

export interface TablePillCellProps {
	/** The key of the column this cell belongs to. */
	column?: string;
	text?: string | number | null;
	/** @default "neutral" */
	variant?: PillProps["variant"];
	class?: string;
}

/** A table cell showing a pill. */
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
