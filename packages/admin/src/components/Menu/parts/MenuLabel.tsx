import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface MenuLabelProps {
	class?: string;
	children: JSXElement;
}

/** A heading over a run of items. */
const MenuLabel: Component<MenuLabelProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-menu-label
			class={classNames(
				"px-2 pt-1.5 pb-1 text-xs font-medium text-unfocused",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};

export default MenuLabel;
