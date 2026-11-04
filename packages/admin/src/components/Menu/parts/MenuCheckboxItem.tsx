import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import classNames from "classnames";
import { TbOutlineCheck } from "solid-icons/tb";
import { type Component, type JSXElement, Show } from "solid-js";
import { menuItemClasses } from "@/components/Menu/itemClasses";

export interface MenuCheckboxItemProps {
	checked: boolean;
	onChange: (_checked: boolean) => void;
	disabled?: boolean;
	/** @default false */
	closeOnSelect?: boolean;
	/** Text used for typeahead when the children are not plain text. */
	textValue?: string;
	/** Shown at the start like other items' icons, which moves the checkbox to the end. */
	icon?: JSXElement;
	class?: string;
	children: JSXElement;
}

/** A menu item with a checkbox. */
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
			closeOnSelect={props.closeOnSelect === true}
			textValue={props.textValue}
			onClick={(event) => event.stopPropagation()}
			class={menuItemClasses(props)}
		>
			<span
				class={classNames(
					"flex size-4 shrink-0 items-center justify-center rounded border border-border bg-input",
					{ "order-last": props.icon !== undefined },
				)}
			>
				<KobalteMenu.ItemIndicator>
					<TbOutlineCheck size={9} class="text-title" />
				</KobalteMenu.ItemIndicator>
			</span>
			<Show when={props.icon}>{props.icon}</Show>
			<span class="line-clamp-1 flex-1">{props.children}</span>
		</KobalteMenu.CheckboxItem>
	);
};

export default MenuCheckboxItem;
