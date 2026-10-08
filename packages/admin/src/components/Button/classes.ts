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
}) => {
	const square = props.shape !== "standard";

	return classnames(
		"flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus-visible:ring-1 duration-200 transition-colors rounded-md relative disabled:cursor-not-allowed disabled:opacity-80",
		{
			// Variants
			"bg-primary hover:bg-primary-hover text-primary-foreground ring-primary":
				props.variant === "primary",
			"bg-secondary hover:bg-secondary-hover text-secondary-foreground ring-primary":
				props.variant === "secondary",
			"bg-input border border-border hover:border-transparent hover:bg-secondary-hover text-subtitle hover:text-secondary-foreground ring-primary":
				props.variant === "outline",
			"bg-danger hover:bg-danger-hover text-danger-foreground ring-primary":
				props.variant === "danger",
			"bg-input border border-border hover:bg-danger-hover ring-primary text-subtitle hover:text-danger-foreground":
				props.variant === "danger-outline",
			"text-muted hover:text-subtitle hover:bg-background/50 ring-primary":
				props.variant === "ghost",
			"text-muted hover:text-danger-low-foreground hover:bg-danger-low ring-primary":
				props.variant === "danger-ghost",

			// Shape
			"rounded-full!": props.shape === "circle",

			// Sizes
			"px-2 h-7 text-xs": props.size === "xs" && !square,
			"px-3 h-9 text-sm": props.size === "sm" && !square,
			"px-4 py-2 h-10 text-sm": props.size === "md" && !square,
			"px-6 py-3 h-12 text-base": props.size === "lg" && !square,
			"w-7 h-7 p-0 min-w-[28px]!": props.size === "xs" && square,
			"w-9 h-9 p-0 min-w-[36px]!": props.size === "sm" && square,
			"w-10 h-10 p-0 min-w-[40px]!": props.size === "md" && square,
			"w-12 h-12 p-0 min-w-[48px]!": props.size === "lg" && square,

			"opacity-80 cursor-not-allowed": props.permitted === false,
		},
	);
};
