import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface MenuLabelProps {
	class?: string;
	children: JSXElement;
}

/** A label for a group of items. */
const MenuLabel: Component<MenuLabelProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-menu-label
			class={classNames(
				"px-2 pt-1.5 pb-1 text-xs font-medium text-muted",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};

export default MenuLabel;
