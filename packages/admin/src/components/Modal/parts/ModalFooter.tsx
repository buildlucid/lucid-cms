import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface ModalFooterProps {
	class?: string;
	children: JSXElement;
}

/**
 * Bottom bar of the modal. Children sit on the left, so put status or error
 * messages here and wrap buttons in Modal.Actions to push them right.
 *
 * @example
 * ```tsx
 * import { Button, Modal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Modal.Footer>
 * 		<ErrorMessage theme="basic" message={save.errors()?.message} />
 * 		<Modal.Actions>
 * 			<Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
 * 			<Button type="submit" loading={save.isPending}>Save</Button>
 * 		</Modal.Actions>
 * 	</Modal.Footer>
 * );
 * ```
 */
export const ModalFooter: Component<ModalFooterProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-modal-footer
			class={classNames(
				"flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card-base px-4 md:px-6 py-4 md:py-6",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};
