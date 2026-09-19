import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface DrawerTitleProps {
	class?: string;
	children: JSXElement;
}

/**
 * The drawer's heading. Use it instead of your own heading element so screen
 * readers announce the drawer by name.
 *
 * @example
 * ```tsx
 * import { Drawer } from "@lucidcms/admin/components";
 *
 * return <Drawer.Title>Edit role</Drawer.Title>;
 * ```
 */
export const DrawerTitle: Component<DrawerTitleProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<Dialog.Title
			data-drawer-title
			class={classNames(
				"pe-16 text-base font-semibold text-title",
				props.class,
			)}
		>
			{props.children}
		</Dialog.Title>
	);
};
