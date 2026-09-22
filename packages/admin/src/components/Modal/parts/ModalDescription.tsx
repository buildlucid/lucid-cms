import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface ModalDescriptionProps {
	class?: string;
	children: JSXElement;
}

/** The modal's description, announced by screen readers with the title. */
export const ModalDescription: Component<ModalDescriptionProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Dialog.Description
			data-modal-description
			class={classNames("text-sm text-body", props.class)}
		>
			{props.children}
		</Dialog.Description>
	);
};
