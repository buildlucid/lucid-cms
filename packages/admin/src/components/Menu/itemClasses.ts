import classNames from "classnames";

export type MenuItemVariant = "primary" | "danger";

export interface MenuItemAppearance {
	variant?: MenuItemVariant;
	disabled?: boolean;
	unavailable?: boolean;
	selected?: boolean;
	class?: string;
}

export const menuItemClasses = (props: MenuItemAppearance) =>
	classNames(
		"flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm fill-subtitle outline-none transition-colors duration-200",
		{
			"hover:bg-card-hover hover:text-subtitle data-highlighted:bg-card-hover data-highlighted:text-subtitle":
				props.variant === undefined && !props.disabled,
			"hover:bg-danger-hover hover:text-danger-foreground data-highlighted:bg-danger-hover data-highlighted:text-danger-foreground":
				props.variant === "danger" && !props.disabled,
			"hover:bg-primary hover:text-primary-foreground data-highlighted:bg-primary data-highlighted:text-primary-foreground":
				props.variant === "primary" && !props.disabled,
			"bg-card-hover text-subtitle": props.selected,
			"cursor-not-allowed opacity-50": props.disabled || props.unavailable,
		},
		props.class,
	);
