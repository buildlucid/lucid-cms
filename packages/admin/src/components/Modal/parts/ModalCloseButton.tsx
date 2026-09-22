import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";

export interface ModalCloseButtonProps {
	class?: string;
}

/** A button that closes the modal. Already included in `Modal.Header`. */
export const ModalCloseButton: Component<ModalCloseButtonProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Dialog.CloseButton
			data-modal-close-button
			class={classNames(
				"relative shrink-0 text-body hover:text-title ring-danger focus-visible:ring-1 focus:outline-hidden h-6 w-6 min-w-6 rounded-full flex justify-center items-center duration-200 transition-colors after:absolute after:-inset-2.5 after:content-['']",
				props.class,
			)}
		>
			<FaSolidXmark class="fill-current" />
		</Dialog.CloseButton>
	);
};
