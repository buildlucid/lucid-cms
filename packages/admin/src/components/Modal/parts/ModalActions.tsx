import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface ModalActionsProps {
	class?: string;
	children: JSXElement;
}

/**
 * Right hand button cluster inside Modal.Footer. It always sits against the
 * right edge, whether or not the footer has content on the left.
 *
 * @example
 * ```tsx
 * import { Button, Modal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Modal.Actions>
 * 		<Button variant="outline" onClick={cancel}>Cancel</Button>
 * 		<Button variant="danger" onClick={remove}>Delete</Button>
 * 	</Modal.Actions>
 * );
 * ```
 */
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
