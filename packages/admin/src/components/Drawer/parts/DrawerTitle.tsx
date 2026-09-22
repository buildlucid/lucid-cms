import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface DrawerTitleProps {
	class?: string;
	children: JSXElement;
}

/** The drawer's title, announced by screen readers. */
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
