import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface ModalFooterProps {
	class?: string;
	children: JSXElement;
}

/** The bottom of the modal, for messages and `Modal.Actions`. */
export const ModalFooter: Component<ModalFooterProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-modal-footer
			class={classNames(
				"flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 md:px-6 py-4 md:py-6",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};
