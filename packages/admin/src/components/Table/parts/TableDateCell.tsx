import type { Component } from "solid-js";
import DateText from "@/components/DateText/DateText";
import TableCell from "@/components/Table/parts/TableCell";

export interface TableDateCellProps {
	/** The key of the column this cell belongs to. */
	column?: string;
	date?: string | null;
	includeTime?: boolean;
	/** Treats the value as a calendar date, without converting timezones. */
	dateOnly?: boolean;
	class?: string;
}

/** A table cell showing a formatted date. */
const TableDateCell: Component<TableDateCellProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableCell column={props.column} class={props.class}>
			<DateText
				date={props.date}
				includeTime={props.includeTime}
				dateOnly={props.dateOnly}
			/>
		</TableCell>
	);
};

export default TableDateCell;
