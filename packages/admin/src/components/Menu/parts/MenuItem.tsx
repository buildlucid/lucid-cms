import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import { A } from "@solidjs/router";
import { type Component, type JSXElement, Show } from "solid-js";
import {
	type MenuItemVariant,
	menuItemClasses,
} from "@/components/Menu/itemClasses";

export interface MenuItemProps {
	/** Runs when the item is chosen, by pointer or by keyboard. */
	onSelect?: () => void;
	/** Turns the item into a link. */
	href?: string;
	target?: "_blank" | "_self";
	rel?: string;
	/** Before the label. */
	icon?: JSXElement;
	/** Against the right edge, for a shortcut, count or state. */
	end?: JSXElement;
	/** Colours the item. Reserve "primary" for the one affirmative action. */
	variant?: MenuItemVariant;
	/** Dims the item and stops it being chosen at all. */
	disabled?: boolean;
	/**
	 * Dims the item but still lets it be chosen, so `onSelect` can explain why
	 * it cannot be used.
	 */
	unavailable?: boolean;
	/** Marks the item as the one currently in effect. */
	selected?: boolean;
	/** Leaves the menu open after choosing. */
	keepOpen?: boolean;
	/** What a screen reader reads when the children are not plain text. */
	textValue?: string;
	/** Applied to the item. */
	class?: string;
	children: JSXElement;
}

/** One choice in a menu. */
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
					closeOnSelect={props.keepOpen !== true && props.unavailable !== true}
					onSelect={() => props.onSelect?.()}
					//* a menu inside a clickable row must not trigger the row as well
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
				closeOnSelect={props.keepOpen !== true && props.unavailable !== true}
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
