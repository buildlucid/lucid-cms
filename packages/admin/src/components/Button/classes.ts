import classnames from "classnames";
import type {
	ButtonShape,
	ButtonSize,
	ButtonVariant,
} from "@/components/Button/Button";

export const getButtonClasses = (props: {
	variant: ButtonVariant;
	size: ButtonSize;
	shape: ButtonShape;
	permitted?: boolean;
	/** Loading buttons are disabled but keep full opacity, as the pulse overlay already shows they're busy. */
	loading?: boolean;
}) => {
	const square = props.shape !== "standard";

	return classnames(
		"flex items-center justify-center min-w-max text-center font-medium select-none focus-ring pressable rounded-md relative",
		{
			"disabled:cursor-not-allowed": !props.loading,
			//* secondary has disabled colours of its own, which fading as well would muddy
			"disabled:opacity-50": !props.loading && props.variant !== "secondary",
			// Variants
			"bg-primary hover:bg-primary-hover text-primary-foreground":
				props.variant === "primary",
			"bg-secondary hover:bg-secondary-hover text-secondary-foreground disabled:bg-secondary-disabled disabled:text-secondary-disabled-foreground":
				props.variant === "secondary",
			"bg-input border border-border text-subtitle hover:border-body/25 hover:bg-card-hover hover:text-title data-expanded:border-body/25 data-expanded:bg-card-hover data-expanded:text-title":
				props.variant === "outline",
			"bg-danger hover:bg-danger-hover text-danger-foreground":
				props.variant === "danger",
			"bg-input border border-border text-subtitle hover:border-danger-low-border hover:bg-danger-low hover:text-danger-low-foreground":
				props.variant === "danger-outline",
			"text-muted hover:text-title hover:bg-card-hover data-expanded:text-title data-expanded:bg-card-hover":
				props.variant === "ghost",
			"text-muted hover:text-danger-low-foreground hover:bg-danger-low":
				props.variant === "danger-ghost",
			"text-icon hover:text-icon-hover hover:bg-background-hover data-expanded:bg-background-hover":
				props.variant === "toolbar",

			// Shape
			"rounded-full!": props.shape === "circle",

			// Sizes
			"px-2 h-7 text-xs": props.size === "xs" && !square,
			"px-2.5 h-8 text-sm": props.size === "sm" && !square,
			"px-3.5 h-9 text-sm": props.size === "md" && !square,
			"px-5 h-11 text-sm": props.size === "lg" && !square,
			"size-7 p-0 min-w-7!": props.size === "xs" && square,
			"size-8 p-0 min-w-8!": props.size === "sm" && square,
			"size-9 p-0 min-w-9!": props.size === "md" && square,
			"size-11 p-0 min-w-11!": props.size === "lg" && square,

			"opacity-50 cursor-not-allowed": props.permitted === false,
		},
	);
};
