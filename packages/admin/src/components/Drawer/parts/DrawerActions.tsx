import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface DrawerActionsProps {
	class?: string;
	children: JSXElement;
}

/** Groups the footer's buttons, aligned to the end. */
export const DrawerActions: Component<DrawerActionsProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<div
			data-drawer-actions
			class={classNames(
				"ml-auto flex min-w-max flex-wrap items-center gap-2",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};
