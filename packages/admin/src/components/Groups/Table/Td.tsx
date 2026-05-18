import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

interface TdProps {
	classes?: string;
	options?: {
		include?: boolean;
		width?: number;
		minWidth?: number;
		noMinWidth?: boolean;
		padding?: "16" | "24";
	};
	children?: JSXElement;
}

// Body Column

export const Td: Component<TdProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<td
			class={classNames(
				"relative px-4 w-full after:content-[''] after:border-b after:border-border after:block after:left-0 after:right-0 after:absolute after:bottom-0",
				{
					hidden: props.options?.include === false,
					"first:pl-4 md:first:pl-6 last:pr-4 md:last:pr-6":
						props.options?.padding === "24" ||
						props.options?.padding === undefined,
				},
				props?.classes,
			)}
			style={{
				width: props.options?.width ? `${props.options.width}px` : undefined,
				"min-width": props.options?.minWidth
					? `${props.options.minWidth}px`
					: undefined,
			}}
		>
			<div
				class={classNames(
					"min-h-[56.5px] py-2 text-base text-subtitle flex items-center",
					{
						"w-full":
							props.options?.minWidth !== undefined ||
							props.options?.width !== undefined,
						"w-full min-w-37.5":
							props.options?.width === undefined &&
							props.options?.minWidth === undefined &&
							!props.options?.noMinWidth,
					},
				)}
			>
				{props.children}
			</div>
		</td>
	);
};
