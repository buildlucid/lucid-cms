import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";
import T from "@/translations";

export interface DrawerCloseButtonProps {
	class?: string;
}

/**
 * Icon button that closes the drawer. Drawer.Header renders one already, so
 * reach for this only when building a header of your own.
 *
 * @example
 * ```tsx
 * import { Drawer } from "@lucidcms/admin/components";
 *
 * return <Drawer.CloseButton />;
 * ```
 */
export const DrawerCloseButton: Component<DrawerCloseButtonProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<Dialog.CloseButton
			data-drawer-close-button
			class={classNames(
				"relative flex items-center text-body hover:text-title w-6 h-6 min-w-6 rounded-full focus:outline-hidden focus-visible:ring-1 ring-primary-base bg-background-base justify-center after:absolute after:-inset-2.5 after:content-['']",
				props.class,
			)}
		>
			<FaSolidXmark class="text-current" />
			<span class="sr-only">{T()("common.back")}</span>
		</Dialog.CloseButton>
	);
};
