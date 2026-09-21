import classnames from "classnames";
import {
	type Component,
	createMemo,
	type JSX,
	type JSXElement,
	splitProps,
} from "solid-js";

/**
 * Solid variants read as a state, the subtle ones as a quiet label. The
 * workflow palette matches the stage colours a collection can be configured
 * with, and is drawn from the --lucid-workflow-* theme tokens.
 */
export type PillVariant =
	| "primary"
	| "primary-subtle"
	| "secondary"
	| "danger"
	| "danger-subtle"
	| "warning-subtle"
	| "info-subtle"
	| "neutral"
	| "outline"
	| "workflow-yellow"
	| "workflow-green"
	| "workflow-blue"
	| "workflow-purple";

export type PillSize = "xs" | "sm";

interface PillBaseProps {
	/** Visual style of the pill. @default "neutral" */
	variant?: PillVariant;
	/** Height and text scale of the pill. @default "sm" */
	size?: PillSize;
	/** Shown natively on hover. */
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
 * A small rounded label for a status or a count. Pass as="button" to make it
 * clickable, which adds hover and focus styling.
 *
 * @example
 * ```tsx
 * import { Pill } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return <Pill variant="primary-subtle">{t("common.status.active")}</Pill>;
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
				"transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60",
			local.class,
			{
				// Sizes
				"px-2.5 py-0.5 text-xs leading-4": local.size !== "xs",
				"px-1.5 py-0 text-[11px] leading-4": local.size === "xs",

				// Variants
				"bg-primary-base text-primary-contrast": variant() === "primary",
				"border border-primary-muted-border bg-primary-muted-bg text-primary-muted-contrast":
					variant() === "primary-subtle",
				"bg-secondary-base text-secondary-contrast": variant() === "secondary",
				"bg-error-base text-error-contrast": variant() === "danger",
				"border border-error-base/20 bg-error-base/10 text-error-base":
					variant() === "danger-subtle",
				"border border-warning-base/20 bg-warning-base/10 text-warning-base":
					variant() === "warning-subtle",
				"border border-info-base/20 bg-info-base/10 text-info-base":
					variant() === "info-subtle",
				"bg-input-base text-subtitle": variant() === "neutral",
				"border border-border bg-input-base text-body": variant() === "outline",
				"border border-workflow-yellow-border bg-workflow-yellow-bg text-workflow-yellow-text":
					variant() === "workflow-yellow",
				"border border-workflow-green-border bg-workflow-green-bg text-workflow-green-text":
					variant() === "workflow-green",
				"border border-workflow-blue-border bg-workflow-blue-bg text-workflow-blue-text":
					variant() === "workflow-blue",
				"border border-workflow-purple-border bg-workflow-purple-bg text-workflow-purple-text":
					variant() === "workflow-purple",

				// Interactive
				"hover:bg-primary-hover": interactive() && variant() === "primary",
				"hover:bg-primary-muted-bg/80":
					interactive() && variant() === "primary-subtle",
				"hover:bg-secondary-hover": interactive() && variant() === "secondary",
				"hover:bg-error-hover": interactive() && variant() === "danger",
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
		<span {...spanProps} class={classes()} title={local.tooltip}>
			{local.children}
		</span>
	);
};

export default Pill;
