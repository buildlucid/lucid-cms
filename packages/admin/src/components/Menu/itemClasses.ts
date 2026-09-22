import classNames from "classnames";

/** How an item is coloured. */
export type MenuItemVariant = "error" | "primary";

export interface MenuItemAppearance {
	variant?: MenuItemVariant;
	disabled?: boolean;
	/** Dimmed like a disabled item, but still selectable so it can say why. */
	unavailable?: boolean;
	selected?: boolean;
	class?: string;
}

/** Shared by items and the triggers of nested menus, so the two line up. */
export const menuItemClasses = (props: MenuItemAppearance) =>
	classNames(
		"flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm fill-dropdown-contrast outline-none transition-colors duration-200",
		{
			"hover:bg-dropdown-hover hover:text-dropdown-contrast data-highlighted:bg-dropdown-hover data-highlighted:text-dropdown-contrast":
				props.variant === undefined && !props.disabled,
			"hover:bg-error-hover hover:text-error-contrast data-highlighted:bg-error-hover data-highlighted:text-error-contrast":
				props.variant === "error" && !props.disabled,
			"hover:bg-primary-base hover:text-primary-contrast data-highlighted:bg-primary-base data-highlighted:text-primary-contrast":
				props.variant === "primary" && !props.disabled,
			//* the item in effect stays marked whether or not it is hovered
			"bg-dropdown-hover text-dropdown-contrast": props.selected,
			"cursor-not-allowed opacity-50": props.disabled || props.unavailable,
		},
		props.class,
	);
