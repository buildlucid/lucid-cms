import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import type { Component, JSXElement } from "solid-js";

export interface MenuRadioGroupProps {
	value?: string;
	onChange: (_value: string) => void;
	children: JSXElement;
}

/** Groups radio items so only one of them can be chosen. */
const MenuRadioGroup: Component<MenuRadioGroupProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<KobalteMenu.RadioGroup
			data-menu-radio-group
			value={props.value}
			onChange={props.onChange}
		>
			{props.children}
		</KobalteMenu.RadioGroup>
	);
};

export default MenuRadioGroup;
