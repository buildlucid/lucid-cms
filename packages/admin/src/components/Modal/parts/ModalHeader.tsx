import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { useModalContext } from "../ModalContext";
import { ModalCloseButton } from "./ModalCloseButton";

export interface ModalHeaderProps {
	/** Sits to the left of the close button. */
	actions?: JSXElement;
	class?: string;
	children: JSXElement;
}

/**
 * Top region of the modal. Holds the title and description, and adds a close
 * button unless the modal is not dismissible.
 *
 * @example
 * ```tsx
 * import { Modal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Modal.Header>
 * 		<Modal.Title>Move media</Modal.Title>
 * 		<Modal.Description>Pick the folder to move into.</Modal.Description>
 * 	</Modal.Header>
 * );
 * ```
 */
export const ModalHeader: Component<ModalHeaderProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { dismissible } = useModalContext();

	// ----------------------------------------
	// Render
	return (
		<div
			data-modal-header
			class={classNames(
				"flex items-start justify-between gap-4 px-4 md:px-6 py-4 md:py-6",
				props.class,
			)}
		>
			<div class="flex min-w-0 flex-col gap-1">{props.children}</div>
			<div class="flex min-w-max items-center gap-2">
				{props.actions}
				<Show when={dismissible()}>
					<ModalCloseButton />
				</Show>
			</div>
		</div>
	);
};
