import classNames from "classnames";
import type { Component } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";

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

const TextCol: Component<TextColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Td
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
		</Td>
	);
};

export default TextCol;
