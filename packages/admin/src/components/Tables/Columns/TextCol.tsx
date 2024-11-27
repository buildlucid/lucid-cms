import type { Component } from "solid-js";
import classNames from "classnames";
import Table from "@/components/Groups/Table";

interface TextColProps {
	text?: string | number | null;
	options?: {
		include?: boolean;
		maxLines?: number;
	};
}

const TextCol: Component<TextColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Td
			options={{
				include: props?.options?.include,
			}}
		>
			<span
				class={classNames("text-sm", {
					"line-clamp-1": props?.options?.maxLines === 1,
					"line-clamp-2": props?.options?.maxLines === 2,
					"line-clamp-3": props?.options?.maxLines === 3,
					"line-clamp-4": props?.options?.maxLines === 4,
				})}
			>
				{props.text || "-"}
			</span>
		</Table.Td>
	);
};

export default TextCol;
