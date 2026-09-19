import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";
import { useDrawerContext } from "../DrawerContext";
import { DrawerCloseButton } from "./DrawerCloseButton";

export interface DrawerHeaderProps {
	class?: string;
	children: JSXElement;
}

/**
 * Top region of the drawer. Holds the title, description and any locale
 * select, and adds a close button.
 *
 * @example
 * ```tsx
 * import { Drawer } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Drawer.Header>
 * 		<Drawer.Title>Edit media</Drawer.Title>
 * 		<Drawer.LocaleSelect />
 * 	</Drawer.Header>
 * );
 * ```
 */
export const DrawerHeader: Component<DrawerHeaderProps> = (props) => {
	// ------------------------------
	// State & Hooks
	const { padding } = useDrawerContext();

	// ------------------------------
	// Render
	return (
		<div
			data-drawer-header
			class={classNames(
				"relative mb-4 border-b border-border",
				{
					"mx-4 py-4": padding() === "sm",
					"mx-4 md:mx-6 py-4 md:pt-6": padding() === "md",
				},
				props.class,
			)}
		>
			{props.children}
			{/* Positioned on a wrapper: the button is relative for its own tap target. */}
			<div
				class={classNames("absolute inset-e-0", {
					"top-4": padding() === "sm",
					"top-4 md:top-6": padding() === "md",
				})}
			>
				<DrawerCloseButton />
			</div>
		</div>
	);
};
