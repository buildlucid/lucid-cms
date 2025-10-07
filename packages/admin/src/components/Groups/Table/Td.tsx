import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

interface TdProps {
	classes?: string;
	options?: {
		include?: boolean;
		width?: number;
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
			}}
		>
			<div
				class={classNames(
					"min-h-[56.5px] py-2 text-base text-title flex items-center",
					{
						"w-full min-w-[150px]":
							props.options?.width === undefined && !props.options?.noMinWidth,
					},
				)}
			>
				{props.children}
			</div>
		</td>
	);
};
