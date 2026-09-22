import classnames from "classnames";
import { type Component, createMemo, Show } from "solid-js";

export type ProgressBarVariant =
	| "primary"
	| "primary-subtle"
	| "secondary"
	| "success"
	| "success-subtle"
	| "danger"
	| "danger-subtle"
	| "warning"
	| "warning-subtle";

export type ProgressBarSize = "sm" | "md" | "lg";

export interface ProgressBarProps {
	/** A percentage from 0 to 100. */
	value: number;
	/**
	 * Colour variants use the solid colour. `-subtle` variants use a softer fill.
	 * @default "primary"
	 */
	variant?: ProgressBarVariant;
	/** @default "lg" */
	size?: ProgressBarSize;
	/** Removes the rounded corners. */
	square?: boolean;
	/** Text shown under each end of the bar. */
	labels?: {
		start?: string;
		end?: string;
	};
	class?: string;
}

/**
 * A horizontal bar showing progress as a percentage.
 *
 * @example
 * ```tsx
 * import { ProgressBar } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<ProgressBar
 * 		value={uploaded()}
 * 		labels={{ start: t("common.uploading"), end: `${uploaded()}%` }}
 * 	/>
 * );
 * ```
 */
export const ProgressBar: Component<ProgressBarProps> = (props) => {
	// ----------------------------------------
	// Memos
	const progress = createMemo(() => Math.min(Math.max(props.value, 0), 100));
	const variant = createMemo(() => props.variant ?? "primary");

	// ----------------------------------------
	// Render
	return (
		<div data-progress-bar class={props.class}>
			<div
				class={classnames("w-full overflow-hidden bg-input", {
					"h-1": props.size === "sm",
					"h-2": props.size === "md",
					"h-3": props.size !== "sm" && props.size !== "md",
					"rounded-md": !props.square,
				})}
				role="progressbar"
				aria-valuenow={progress()}
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuetext={`${progress()}% progress`}
				tabIndex={-1}
			>
				<div
					class={classnames("h-full duration-200 transition-all", {
						"rounded-md": !props.square,
						"bg-primary": variant() === "primary",
						"bg-primary-medium": variant() === "primary-subtle",
						"bg-secondary": variant() === "secondary",
						"bg-success": variant() === "success",
						"bg-success-medium": variant() === "success-subtle",
						"bg-danger": variant() === "danger",
						"bg-danger-medium": variant() === "danger-subtle",
						"bg-warning": variant() === "warning",
						"bg-warning-medium": variant() === "warning-subtle",
					})}
					style={{
						width: `${progress()}%`,
					}}
				/>
			</div>
			<Show when={props.labels}>
				<div class="flex justify-between gap-4 mt-2.5">
					<span class="text-sm">{props.labels?.start}</span>
					<span class="text-sm">{props.labels?.end}</span>
				</div>
			</Show>
		</div>
	);
};

export default ProgressBar;
