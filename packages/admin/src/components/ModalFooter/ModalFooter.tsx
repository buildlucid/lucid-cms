import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export const ModalFooter: Component<{
	options?: {
		/** Draws the footer's own side and bottom borders. Use when the parent Modal sets `noBorder`, so the footer keeps a complete outline. */
		border?: boolean;
	};
	children?: JSXElement;
}> = (props) => {
	if (!props.children) return null;

	return (
		<div
			class={classNames(
				"rounded-b-xl px-4 md:px-6 py-4 md:py-6 flex flex-wrap items-center gap-2 justify-between bg-card-base border-t border-border",
				{
					"border-x border-b": props.options?.border,
				},
			)}
		>
			{props.children}
		</div>
	);
};
