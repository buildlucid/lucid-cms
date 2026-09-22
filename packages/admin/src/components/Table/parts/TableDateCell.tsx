import type { Component } from "solid-js";
import DateText from "@/components/DateText/DateText";
import TableCell from "@/components/Table/parts/TableCell";

export interface TableDateCellProps {
	/** Head key this cell belongs to. It hides when that column is toggled off. */
	column?: string;
	date?: string | null;
	includeTime?: boolean;
	localDateOnly?: boolean;
	fullWithTime?: boolean;
	/** Applied to the cell. */
	class?: string;
}

/** A cell showing a date in the viewer's format and timezone. */
const TableDateCell: Component<TableDateCellProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableCell column={props.column} class={props.class}>
			<DateText
				date={props.date}
				includeTime={props.includeTime}
				localDateOnly={props.localDateOnly}
				fullWithTime={props.fullWithTime}
			/>
		</TableCell>
	);
};

export default TableDateCell;
