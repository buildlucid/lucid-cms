import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface ModalDescriptionProps {
	class?: string;
	children: JSXElement;
}

/**
 * A sentence under the title explaining what the modal does. Screen readers
 * announce it alongside the title.
 *
 * @example
 * ```tsx
 * import { Modal } from "@lucidcms/admin/components";
 *
 * return <Modal.Description>This cannot be undone.</Modal.Description>;
 * ```
 */
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
