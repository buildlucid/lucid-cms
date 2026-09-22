import classnames from "classnames";
import {
	type Component,
	createMemo,
	type JSX,
	type JSXElement,
	splitProps,
} from "solid-js";

/** The `yellow`, `green`, `blue` and `purple` variants match the workflow stage colours. */
export type PillVariant =
	| "primary"
	| "primary-subtle"
	| "secondary"
	| "success"
	| "success-subtle"
	| "danger"
	| "danger-subtle"
	| "warning"
	| "warning-subtle"
	| "info"
	| "info-subtle"
	| "neutral"
	| "outline"
	| "yellow"
	| "yellow-subtle"
	| "green"
	| "green-subtle"
	| "blue"
	| "blue-subtle"
	| "purple"
	| "purple-subtle";

export type PillSize = "xs" | "sm";

interface PillBaseProps {
	/**
	 * Colour variants use the solid colour. `-subtle` variants use a light tint
	 * with a matching border and text.
	 * @default "neutral"
	 */
	variant?: PillVariant;
	/** @default "sm" */
	size?: PillSize;
	/** Shown on hover. */
	tooltip?: string;
	class?: string;
	children: JSXElement;
}

export type PillSpanProps = PillBaseProps &
	Omit<JSX.HTMLAttributes<HTMLSpanElement>, "class" | "children" | "title"> & {
		as?: undefined;
	};

export type PillButtonProps = PillBaseProps &
	Omit<
		JSX.HTMLAttributes<HTMLButtonElement>,
		"class" | "children" | "title"
	> & {
		as: "button";
		disabled?: boolean;
		onClick?: (event: MouseEvent) => void;
		type?: "button" | "submit" | "reset";
	};

export type PillProps = PillSpanProps | PillButtonProps;

/**
 * A small label for a status, tag or count. Use `as="button"` to make it
 * clickable.
 *
 * @example
 * ```tsx
 * import { Pill } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return <Pill variant="success-subtle">{t("common.status.active")}</Pill>;
 * ```
 */
const Pill: Component<PillProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [local, rest] = splitProps(props, [
		"as",
		"variant",
		"size",
		"tooltip",
		"class",
		"children",
	]);

	// ----------------------------------------
	// Memos
	const variant = createMemo(() => local.variant ?? "neutral");
	const interactive = createMemo(() => local.as === "button");
	const classes = createMemo(() =>
		classnames(
			"inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap",
			interactive() &&
				"transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
			local.class,
			{
				// Sizes
				"px-2.5 py-0.5 text-xs leading-4": local.size !== "xs",
				"px-1.5 py-0 text-[11px] leading-4": local.size === "xs",

				// Variants
				"bg-primary text-primary-foreground": variant() === "primary",
				"border border-primary-low-border bg-primary-low text-primary-low-foreground":
					variant() === "primary-subtle",
				"bg-secondary text-secondary-foreground": variant() === "secondary",
				"bg-success text-success-foreground": variant() === "success",
				"border border-success-low-border bg-success-low text-success-low-foreground":
					variant() === "success-subtle",
				"bg-danger text-danger-foreground": variant() === "danger",
				"border border-danger-low-border bg-danger-low text-danger-low-foreground":
					variant() === "danger-subtle",
				"bg-warning text-warning-foreground": variant() === "warning",
				"border border-warning-low-border bg-warning-low text-warning-low-foreground":
					variant() === "warning-subtle",
				"bg-info text-info-foreground": variant() === "info",
				"border border-info-low-border bg-info-low text-info-low-foreground":
					variant() === "info-subtle",
				"bg-input text-subtitle": variant() === "neutral",
				"border border-border bg-input text-body": variant() === "outline",
				"bg-yellow text-yellow-foreground": variant() === "yellow",
				"border border-yellow-low-border bg-yellow-low text-yellow-low-foreground":
					variant() === "yellow-subtle",
				"bg-green text-green-foreground": variant() === "green",
				"border border-green-low-border bg-green-low text-green-low-foreground":
					variant() === "green-subtle",
				"bg-blue text-blue-foreground": variant() === "blue",
				"border border-blue-low-border bg-blue-low text-blue-low-foreground":
					variant() === "blue-subtle",
				"bg-purple text-purple-foreground": variant() === "purple",
				"border border-purple-low-border bg-purple-low text-purple-low-foreground":
					variant() === "purple-subtle",

				// Interactive
				"hover:bg-primary-hover": interactive() && variant() === "primary",
				"hover:border-primary": interactive() && variant() === "primary-subtle",
				"hover:bg-secondary-hover": interactive() && variant() === "secondary",
				"hover:bg-danger-hover": interactive() && variant() === "danger",
				"hover:bg-card-hover hover:text-title":
					interactive() && ["neutral", "outline"].includes(variant()),
			},
		),
	);

	// ----------------------------------------
	// Render
	if (local.as === "button") {
		const buttonProps = rest as Omit<
			PillButtonProps,
			keyof PillBaseProps | "as"
		>;

		return (
			<button
				{...buttonProps}
				data-pill
				type={buttonProps.type ?? "button"}
				class={classes()}
				title={local.tooltip}
			>
				{local.children}
			</button>
		);
	}

	const spanProps = rest as Omit<PillSpanProps, keyof PillBaseProps | "as">;

	return (
		<span {...spanProps} data-pill class={classes()} title={local.tooltip}>
			{local.children}
		</span>
	);
};

export default Pill;
