import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import { TbOutlineX } from "solid-icons/tb";
import type { Component } from "solid-js";
import T from "@/translations";

export interface DrawerCloseButtonProps {
	class?: string;
}

/** A button that closes the drawer. Already included in `Drawer.Header`. */
export const DrawerCloseButton: Component<DrawerCloseButtonProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<Dialog.CloseButton
			data-drawer-close-button
			class={classNames(
				"relative flex items-center text-muted hover:text-title hover:bg-card-hover size-7 min-w-7 -m-0.5 rounded-md focus-ring bg-background justify-center transition-colors after:absolute after:-inset-2 after:content-['']",
				props.class,
			)}
		>
			<TbOutlineX class="text-current" />
			<span class="sr-only">{T()("common.back")}</span>
		</Dialog.CloseButton>
	);
};
