import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import classNames from "classnames";
import type { Component } from "solid-js";

export interface MenuSeparatorProps {
	class?: string;
}

/** A line between groups of items. */
const MenuSeparator: Component<MenuSeparatorProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<KobalteMenu.Separator
			data-menu-separator
			class={classNames("-mx-1.5 my-2 h-px border-0 bg-border", props.class)}
		/>
	);
};

export default MenuSeparator;
