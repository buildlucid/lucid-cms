import classNames from "classnames";
import type { Component } from "solid-js";
import TableCell from "@/components/Table/parts/TableCell";

export interface TableTextCellProps {
	/** The key of the column this cell belongs to. */
	column?: string;
	text?: string | number | null;
	/** Truncates the text after this many lines. */
	maxLines?: 1 | 2 | 3 | 4;
	width?: number;
	/** Pass `false` to remove the default minimum width. */
	minWidth?: number | false;
	class?: string;
}

/** A table cell showing text. */
const TableTextCell: Component<TableTextCellProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableCell
			column={props.column}
			width={props.width}
			minWidth={props.minWidth}
			class={props.class}
		>
			<span
				class={classNames("text-sm", {
					"line-clamp-1": props.maxLines === 1,
					"line-clamp-2": props.maxLines === 2,
					"line-clamp-3": props.maxLines === 3,
					"line-clamp-4": props.maxLines === 4,
				})}
				title={String(props.text ?? "-")}
			>
				{props.text || "-"}
			</span>
		</TableCell>
	);
};

export default TableTextCell;
