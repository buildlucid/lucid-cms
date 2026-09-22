import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import classNames from "classnames";
import { type Component, type JSX, splitProps } from "solid-js";

export interface MenuTriggerProps
	extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Applied to the trigger. */
	class?: string;
}

/**
 * The button that opens the menu. It carries only the focus treatment, so
 * style it like any other button in your page.
 */
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
