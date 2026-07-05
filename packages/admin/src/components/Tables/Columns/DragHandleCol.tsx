import { FaSolidGripLines } from "solid-icons/fa";
import type { Component } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import T from "@/translations";

interface DragHandleColProps {
	onDragStart: (_e: DragEvent) => void;
	onDragEnd: (_e: DragEvent) => void;
	padding?: "16" | "24";
}

const DragHandleCol: Component<DragHandleColProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Td
			options={{
				width: 40,
				noMinWidth: true,
				padding: props.padding,
			}}
		>
			<button
				type="button"
				draggable={true}
				onDragStart={props.onDragStart}
				onDragEnd={props.onDragEnd}
				onClick={(e) => e.stopPropagation()}
				class="flex items-center justify-center size-6 rounded-md cursor-grab active:cursor-grabbing text-icon-fade hover:text-subtitle focus:outline-none focus-visible:ring-1 ring-primary-base"
				aria-label={T()("documents.order.drag.label")}
			>
				<FaSolidGripLines size={12} />
			</button>
		</Td>
	);
};

export default DragHandleCol;
