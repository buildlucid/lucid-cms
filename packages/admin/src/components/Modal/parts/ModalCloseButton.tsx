import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import { TbOutlineX } from "solid-icons/tb";
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
				"relative shrink-0 text-muted hover:text-title hover:bg-card-hover focus-ring size-7 min-w-7 -m-0.5 rounded-md flex justify-center items-center transition-colors after:absolute after:-inset-2 after:content-['']",
				props.class,
			)}
		>
			<TbOutlineX />
		</Dialog.CloseButton>
	);
};
