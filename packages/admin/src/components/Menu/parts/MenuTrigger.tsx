import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import classNames from "classnames";
import { type Component, type JSX, splitProps } from "solid-js";

export interface MenuTriggerProps
	extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	class?: string;
}

/** The button that opens the menu. */
const MenuTrigger: Component<MenuTriggerProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [local, rest] = splitProps(props, ["class", "children"]);

	// ----------------------------------------
	// Render
	return (
		<KobalteMenu.Trigger
			{...rest}
			data-menu-trigger
			class={classNames("dropdown-trigger", local.class)}
		>
			{local.children}
		</KobalteMenu.Trigger>
	);
};

export default MenuTrigger;
