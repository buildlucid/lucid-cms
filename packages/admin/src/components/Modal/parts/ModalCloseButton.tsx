import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";

export interface ModalCloseButtonProps {
	class?: string;
}

/**
 * Icon button that closes the modal. Modal.Header renders one already, so reach
 * for this only when building a header of your own.
 *
 * @example
 * ```tsx
 * import { Modal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<div class="flex items-center justify-between">
 * 		<Modal.Title>Crop image</Modal.Title>
 * 		<Modal.CloseButton />
 * 	</div>
 * );
 * ```
 */
export const ModalCloseButton: Component<ModalCloseButtonProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Dialog.CloseButton
			data-modal-close-button
			class={classNames(
				"shrink-0 text-body hover:text-title ring-error-base focus-visible:ring-1 focus:outline-hidden h-8 w-8 min-w-8 rounded-full flex justify-center items-center duration-200 transition-colors",
				props.class,
			)}
		>
			<FaSolidXmark class="fill-current" />
		</Dialog.CloseButton>
	);
};
