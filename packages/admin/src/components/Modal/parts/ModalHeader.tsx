import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { useModalContext } from "../ModalContext";
import { ModalCloseButton } from "./ModalCloseButton";

export interface ModalHeaderProps {
	/** Shown before the close button. */
	actions?: JSXElement;
	class?: string;
	children: JSXElement;
}

/**
 * The top of the modal, for the title and description. Includes a close
 * button when the modal is dismissible.
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
