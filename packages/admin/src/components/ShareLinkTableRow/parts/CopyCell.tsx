import { FaSolidCopy } from "solid-icons/fa";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

interface CopyCellProps {
	column?: string;
	text?: string | number | null;
	value: string;
}

const CopyCell: Component<CopyCellProps> = (props) => {
	// ----------------------------------
	// Functions
	const copyToClipboard = (e: Event) => {
		e.stopPropagation();

		navigator.clipboard.writeText(props.value);
		spawnToast({
			title: T()("toasts.common.copy.to.clipboard.title"),
			status: "success",
		});
	};

	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column}>
			<button
				type="button"
				onClick={copyToClipboard}
				class="flex items-center gap-2 ring-offset-4 ring-offset-card rounded-sm line-clamp-1"
			>
				<FaSolidCopy />
				<span class="text-sm">{props.text || "-"}</span>
			</button>
		</Table.Cell>
	);
};

export default CopyCell;
