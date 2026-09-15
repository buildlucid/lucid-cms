import classNames from "classnames";
import type { Component } from "solid-js";
import { TableCell } from "@/components/TableCell/TableCell";

interface TextColProps {
	text?: string | number | null;
	options?: {
		include?: boolean;
		maxLines?: number;
		padding?: "16" | "24";
		width?: number;
		minWidth?: number;
		noMinWidth?: boolean;
		classes?: string;
	};
}

const TableTextCell: Component<TextColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableCell
			options={{
				include: props?.options?.include,
				padding: props?.options?.padding,
				width: props?.options?.width,
				minWidth: props?.options?.minWidth,
				noMinWidth: props?.options?.noMinWidth,
			}}
		>
			<span
				class={classNames(
					"text-sm",
					{
						"line-clamp-1": props?.options?.maxLines === 1,
						"line-clamp-2": props?.options?.maxLines === 2,
						"line-clamp-3": props?.options?.maxLines === 3,
						"line-clamp-4": props?.options?.maxLines === 4,
					},
					props?.options?.classes,
				)}
				title={String(props.text ?? "-")}
			>
				{props.text || "-"}
			</span>
		</TableCell>
	);
};

export default TableTextCell;
