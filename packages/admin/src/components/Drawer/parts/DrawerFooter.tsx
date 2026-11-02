import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";
import { useDrawerContext } from "../DrawerContext";

export interface DrawerFooterProps {
	class?: string;
	children: JSXElement;
}

/** The bottom of the drawer, for messages and `Drawer.Actions`. Stays in view while the rest of the drawer scrolls. */
export const DrawerFooter: Component<DrawerFooterProps> = (props) => {
	// ------------------------------
	// State & Hooks
	const { padding } = useDrawerContext();

	// ------------------------------
	// Render
	return (
		<div
			data-drawer-footer
			class={classNames(
				"sticky bottom-0 z-10 mt-4 md:mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card py-4 md:py-6",
				{
					"px-4": padding() === "sm",
					"px-4 md:px-6": padding() === "md",
				},
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};
