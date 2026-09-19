import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

/** Space around the body's content. "none" lets content run edge to edge. */
export type ModalBodyPadding = "none" | "md";

export interface ModalBodyProps {
	/** @default "md" */
	padding?: ModalBodyPadding;
	class?: string;
	children: JSXElement;
}

/**
 * Main content region of the modal. Its top padding collapses when it follows
 * a Modal.Header.
 *
 * @example
 * ```tsx
 * import { Modal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Modal.Body>
 * 		<Input id="title" name="title" type="text" value={title()} onChange={setTitle} />
 * 	</Modal.Body>
 * );
 * ```
 */
export const ModalBody: Component<ModalBodyProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-modal-body
			class={classNames(
				{
					// The header already supplies the gap when one is present.
					"px-4 md:px-6 py-4 md:py-6 [[data-modal-header]+&]:pt-0":
						props.padding === undefined || props.padding === "md",
				},
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};
