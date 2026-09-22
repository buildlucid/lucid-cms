import classnames from "classnames";
import { type Component, Show } from "solid-js";

export type StatusIndicatorVariant =
	| "primary"
	| "primary-subtle"
	| "success"
	| "success-subtle"
	| "danger"
	| "danger-subtle"
	| "warning"
	| "warning-subtle"
	| "info"
	| "info-subtle"
	| "neutral"
	| "neutral-subtle"
	| "yellow"
	| "yellow-subtle"
	| "green"
	| "green-subtle"
	| "blue"
	| "blue-subtle"
	| "purple"
	| "purple-subtle";

export type StatusIndicatorSize = "xs" | "sm" | "md";

export interface StatusIndicatorProps {
	/** @default "neutral-subtle" */
	variant?: StatusIndicatorVariant;
	/** @default "sm" */
	size?: StatusIndicatorSize;
	/**
	 * Describes the status. Shown on hover and announced to screen readers.
	 * Leave unset when nearby text already describes it.
	 */
	label?: string;
	class?: string;
}

/**
 * A small dot that shows a status, such as whether an environment is in sync.
 *
 * @example
 * ```tsx
 * import { StatusIndicator } from "@lucidcms/admin/components";
 *
 * return <StatusIndicator variant="success-subtle" label="In sync" />;
 * ```
 */
const StatusIndicator: Component<StatusIndicatorProps> = (props) => {
	// ----------------------------------------
	// Functions
	const variant = () => props.variant ?? "neutral-subtle";
	const classes = () =>
		classnames(
			"block shrink-0 rounded-full border",
			{
				"size-1.5": props.size === "xs",
				"size-2.5": props.size === undefined || props.size === "sm",
				"size-3": props.size === "md",

				"border-primary bg-primary": variant() === "primary",
				"border-primary bg-primary-medium": variant() === "primary-subtle",
				"border-success bg-success": variant() === "success",
				"border-success bg-success-medium": variant() === "success-subtle",
				"border-danger bg-danger": variant() === "danger",
				"border-danger bg-danger-medium": variant() === "danger-subtle",
				"border-warning bg-warning": variant() === "warning",
				"border-warning bg-warning-medium": variant() === "warning-subtle",
				"border-info bg-info": variant() === "info",
				"border-info bg-info-medium": variant() === "info-subtle",
				"border-muted bg-muted": variant() === "neutral",
				"border-muted bg-input": variant() === "neutral-subtle",
				"border-yellow bg-yellow": variant() === "yellow",
				"border-yellow bg-yellow-medium": variant() === "yellow-subtle",
				"border-green bg-green": variant() === "green",
				"border-green bg-green-medium": variant() === "green-subtle",
				"border-blue bg-blue": variant() === "blue",
				"border-blue bg-blue-medium": variant() === "blue-subtle",
				"border-purple bg-purple": variant() === "purple",
				"border-purple bg-purple-medium": variant() === "purple-subtle",
			},
			props.class,
		);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.label}
			fallback={
				<span data-status-indicator aria-hidden="true" class={classes()} />
			}
		>
			{(label) => (
				<span
					data-status-indicator
					role="img"
					aria-label={label()}
					title={label()}
					class={classes()}
				/>
			)}
		</Show>
	);
};

export default StatusIndicator;
