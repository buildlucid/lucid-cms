import type { Component, JSXElement } from "solid-js";

export const ModalFooter: Component<{
	children?: JSXElement;
}> = (props) => {
	if (!props.children) return null;

	return (
		<div
			class={
				"px-4 md:px-6 py-4 md:py-6 flex flex-wrap items-center gap-2 justify-between bg-card-base border-t border-border"
			}
		>
			{props.children}
		</div>
	);
};
