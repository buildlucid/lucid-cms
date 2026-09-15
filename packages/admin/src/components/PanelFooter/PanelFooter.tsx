import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export const PanelFooter: Component<{
	children?: JSXElement;
	class?: string;
	padding?: "16" | "24";
}> = (props) => {
	if (!props.children) return null;

	return (
		<div
			class={classNames(
				"mt-4 md:mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card-base py-4 md:py-6",
				{
					"-mx-4 px-4": props.padding === "16",
					"-mx-4 px-4 md:-mx-6 md:px-6": props.padding === "24",
				},
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};
