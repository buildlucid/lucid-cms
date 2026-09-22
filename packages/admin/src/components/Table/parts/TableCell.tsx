import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { useTableContext } from "@/components/Table/TableContext";

export interface TableCellProps {
	/** Head key this cell belongs to. It hides when that column is toggled off. */
	column?: string;
	width?: number;
	minWidth?: number;
	/** Drops the default minimum width, for narrow icon or action columns. */
	noMinWidth?: boolean;
	/** Applied to the cell. */
	class?: string;
	children?: JSXElement;
}

/** A body cell. Use it when none of the typed cells fit. */
const TableCell: Component<TableCellProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const table = useTableContext();

	// ----------------------------------------
	// Render
	return (
		<Show when={table.isColumnVisible(props.column)}>
			<td
				data-table-cell
				data-column={props.column}
				class={classNames(
					"relative px-4 w-full after:content-[''] after:border-b after:border-border after:block after:left-0 after:right-0 after:absolute after:bottom-0",
					{
						"first:pl-4 md:first:pl-6 last:pr-4 md:last:pr-6":
							table.padding() === "md",
					},
					props.class,
				)}
				style={{
					width: props.width ? `${props.width}px` : undefined,
					"min-width": props.minWidth ? `${props.minWidth}px` : undefined,
				}}
			>
				<div
					class={classNames(
						"min-h-[56.5px] py-2 text-base text-subtitle flex items-center",
						{
							"w-full":
								props.minWidth !== undefined || props.width !== undefined,
							"w-full min-w-37.5":
								props.width === undefined &&
								props.minWidth === undefined &&
								!props.noMinWidth,
						},
					)}
				>
					{props.children}
				</div>
			</td>
		</Show>
	);
};

export default TableCell;
