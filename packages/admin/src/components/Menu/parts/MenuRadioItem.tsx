import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import { FaSolidCheck } from "solid-icons/fa";
import type { Component, JSXElement } from "solid-js";
import { menuItemClasses } from "@/components/Menu/itemClasses";

export interface MenuRadioItemProps {
	value: string;
	disabled?: boolean;
	/** Applied to the item. */
	class?: string;
	children: JSXElement;
}

/** One choice inside a Menu.RadioGroup, ticked when it is the current value. */
const MenuRadioItem: Component<MenuRadioItemProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<KobalteMenu.RadioItem
			data-menu-row
			data-menu-radio-item
			value={props.value}
			disabled={props.disabled}
			class={menuItemClasses(props)}
		>
			<span class="flex-1">{props.children}</span>
			<KobalteMenu.ItemIndicator>
				<FaSolidCheck class="size-3 text-primary-base" />
			</KobalteMenu.ItemIndicator>
		</KobalteMenu.RadioItem>
	);
};

export default MenuRadioItem;
