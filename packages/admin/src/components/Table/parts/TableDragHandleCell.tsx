import { FaSolidGripLines } from "solid-icons/fa";
import type { Component } from "solid-js";
import TableCell from "@/components/Table/parts/TableCell";
import T from "@/translations";

interface TableDragHandleCellProps {
	onDragStart: (_e: DragEvent) => void;
	onDragEnd: (_e: DragEvent) => void;
}

const TableDragHandleCell: Component<TableDragHandleCellProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<TableCell width={40} noMinWidth>
			<button
				type="button"
				draggable={true}
				onDragStart={props.onDragStart}
				onDragEnd={props.onDragEnd}
				onClick={(e) => e.stopPropagation()}
				class="flex items-center justify-center size-6 rounded-md cursor-grab active:cursor-grabbing text-icon-faded hover:text-subtitle focus:outline-none focus-visible:ring-1 ring-primary-base"
				aria-label={T()("documents.order.drag.label")}
			>
				<FaSolidGripLines size={12} />
			</button>
		</TableCell>
	);
};

export default TableDragHandleCell;
