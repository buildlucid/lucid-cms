import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface ModalTitleProps {
	class?: string;
	children: JSXElement;
}

/** The modal's title, announced by screen readers. */
export const ModalTitle: Component<ModalTitleProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Dialog.Title
			data-modal-title
			class={classNames("text-base font-semibold text-title", props.class)}
		>
			{props.children}
		</Dialog.Title>
	);
};
