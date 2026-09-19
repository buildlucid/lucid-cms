import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface ModalTitleProps {
	class?: string;
	children: JSXElement;
}

/**
 * The modal's heading. Use it instead of your own heading element so screen
 * readers announce the modal by name.
 *
 * @example
 * ```tsx
 * import { Modal } from "@lucidcms/admin/components";
 *
 * return <Modal.Title>Delete user</Modal.Title>;
 * ```
 */
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
