import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface ModalActionsProps {
	class?: string;
	children: JSXElement;
}

/** Groups the footer's buttons, aligned to the end. */
export const ModalActions: Component<ModalActionsProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-modal-actions
			class={classNames(
				"ml-auto flex min-w-max items-center gap-2",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};
