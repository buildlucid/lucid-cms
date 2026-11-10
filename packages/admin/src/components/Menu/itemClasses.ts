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
		"relative flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-body outline-none",
		{
			"hover:bg-card-hover hover:text-title data-highlighted:bg-card-hover data-highlighted:text-title":
				props.variant === undefined && !props.disabled,
			"text-danger-low-foreground hover:bg-danger-low data-highlighted:bg-danger-low":
				props.variant === "danger" && !props.disabled,
			"hover:bg-primary-low hover:text-primary-low-foreground data-highlighted:bg-primary-low data-highlighted:text-primary-low-foreground":
				props.variant === "primary" && !props.disabled,
			"bg-card-hover text-title": props.selected,
			"cursor-not-allowed opacity-50": props.disabled || props.unavailable,
		},
		props.class,
	);
