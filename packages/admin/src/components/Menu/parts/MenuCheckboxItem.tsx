import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import { FaSolidCheck } from "solid-icons/fa";
import type { Component, JSXElement } from "solid-js";
import { menuItemClasses } from "@/components/Menu/itemClasses";

export interface MenuCheckboxItemProps {
	checked: boolean;
	onChange: (_checked: boolean) => void;
	disabled?: boolean;
	/** Closes the menu after ticking. It stays open by default. */
	closeOnSelect?: boolean;
	/** What a screen reader reads when the children are not plain text. */
	textValue?: string;
	/** Applied to the item. */
	class?: string;
	children: JSXElement;
}

/** A menu row that toggles, for a list of things to show or hide. */
const MenuCheckboxItem: Component<MenuCheckboxItemProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<KobalteMenu.CheckboxItem
			data-menu-row
			data-menu-checkbox-item
			checked={props.checked}
			onChange={props.onChange}
			disabled={props.disabled}
			//* ticking one of a list usually means ticking another next
			closeOnSelect={props.closeOnSelect === true}
			textValue={props.textValue}
			onClick={(event) => event.stopPropagation()}
			class={menuItemClasses(props)}
		>
			<span class="flex size-4 shrink-0 items-center justify-center rounded border border-border bg-input-base">
				<KobalteMenu.ItemIndicator>
					<FaSolidCheck size={9} class="text-title" />
				</KobalteMenu.ItemIndicator>
			</span>
			<span class="line-clamp-1 flex-1">{props.children}</span>
		</KobalteMenu.CheckboxItem>
	);
};

export default MenuCheckboxItem;
