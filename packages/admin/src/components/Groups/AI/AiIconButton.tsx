import classnames from "classnames";
import { FaSolidMagicWandSparkles } from "solid-icons/fa";
import type { Component, JSX } from "solid-js";

const AiIconButton: Component<{
	label: string;
	tooltip: string;
	disabled?: boolean;
	disabledClickable?: boolean;
	loading?: boolean;
	quickActionActive?: boolean;
	variant?: "default" | "subtle";
	onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent>;
	class?: string;
}> = (props) => {
	// -------------------------------------
	// Render
	return (
		<button
			type="button"
			class={classnames(
				"ai-action-button group relative flex items-center justify-center rounded-md text-icon-fade fill-icon-fade transition-colors duration-200 hover:text-primary-base hover:fill-primary-base focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60",
				{
					"h-7 w-7": props.variant !== "subtle",
					"h-5 w-5 before:absolute before:-inset-1 before:rounded-md before:content-['']":
						props.variant === "subtle",
					"cursor-not-allowed opacity-60": props.disabled,
				},
				props.class,
			)}
			disabled={(props.disabled && !props.disabledClickable) || props.loading}
			aria-label={props.label}
			aria-disabled={props.disabled ? "true" : undefined}
			aria-busy={props.loading ? "true" : undefined}
			title={props.tooltip}
			onClick={props.onClick}
		>
			<span
				class={classnames(
					"ai-action-button__surface pointer-events-none flex items-center justify-center rounded-md border transition-colors duration-200",
					{
						"h-7 w-7 border-border bg-input-base group-hover:border-primary-muted-border group-hover:bg-primary-muted-bg":
							props.variant !== "subtle",
						"h-5 w-5 border-transparent bg-card-base":
							props.variant === "subtle",
					},
				)}
				data-loading={props.loading ? "true" : undefined}
				data-quick-action-active={props.quickActionActive ? "true" : undefined}
				data-variant={props.variant ?? "default"}
			>
				<FaSolidMagicWandSparkles
					size={props.variant === "subtle" ? 11 : 13}
					aria-hidden="true"
				/>
			</span>
		</button>
	);
};

export default AiIconButton;
