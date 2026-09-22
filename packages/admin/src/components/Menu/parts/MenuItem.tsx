import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import { A } from "@solidjs/router";
import { type Component, type JSXElement, Show } from "solid-js";
import {
	type MenuItemVariant,
	menuItemClasses,
} from "@/components/Menu/itemClasses";

export interface MenuItemProps {
	onSelect?: () => void;
	/** Renders the item as a link. */
	href?: string;
	target?: "_blank" | "_self";
	rel?: string;
	icon?: JSXElement;
	/** Content shown at the end of the item, such as a shortcut. */
	end?: JSXElement;
	variant?: MenuItemVariant;
	disabled?: boolean;
	/** Looks disabled but can still be selected, so `onSelect` can explain why. */
	unavailable?: boolean;
	/** Highlights the item as the current choice. */
	selected?: boolean;
	/** @default true */
	closeOnSelect?: boolean;
	/** Text used for typeahead when the children are not plain text. */
	textValue?: string;
	class?: string;
	children: JSXElement;
}

/** A menu item. */
const MenuItem: Component<MenuItemProps> = (props) => {
	// ----------------------------------------
	// Render
	const body = () => (
		<>
			<Show when={props.icon}>{props.icon}</Show>
			<span class="line-clamp-1 flex-1">{props.children}</span>
			<Show when={props.end}>{props.end}</Show>
		</>
	);

	return (
		<Show
			when={props.href !== undefined}
			fallback={
				<KobalteMenu.Item
					data-menu-row
					data-menu-item
					textValue={props.textValue}
					disabled={props.disabled}
					aria-disabled={props.unavailable || undefined}
					closeOnSelect={
						props.closeOnSelect !== false && props.unavailable !== true
					}
					onSelect={() => props.onSelect?.()}
					onClick={(event) => event.stopPropagation()}
					class={menuItemClasses(props)}
				>
					{body()}
				</KobalteMenu.Item>
			}
		>
			<KobalteMenu.Item
				as={A}
				data-menu-row
				data-menu-item
				href={props.href ?? "/"}
				target={props.target}
				rel={props.rel}
				textValue={props.textValue}
				disabled={props.disabled}
				aria-disabled={props.unavailable || undefined}
				closeOnSelect={
					props.closeOnSelect !== false && props.unavailable !== true
				}
				onSelect={() => props.onSelect?.()}
				onClick={(event: MouseEvent) => {
					event.stopPropagation();
					if (props.disabled || props.unavailable) event.preventDefault();
				}}
				class={menuItemClasses(props)}
			>
				{body()}
			</KobalteMenu.Item>
		</Show>
	);
};

export default MenuItem;
