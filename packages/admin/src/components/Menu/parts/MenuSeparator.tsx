import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import classNames from "classnames";
import type { Component } from "solid-js";

export interface MenuSeparatorProps {
	class?: string;
}

/**
 * A break between groups of items. It runs the full width of the panel with
 * more room around it than the hairline between ordinary rows, so the two read
 * as different weights.
 */
const MenuSeparator: Component<MenuSeparatorProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<KobalteMenu.Separator
			data-menu-separator
			//* -mx-1.5 reaches past the panel's own padding to both edges
			class={classNames("-mx-1.5 my-2 h-px border-0 bg-border", props.class)}
		/>
	);
};

export default MenuSeparator;
