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
				"ai-action-button group relative flex items-center justify-center rounded-md text-muted fill-muted transition-colors duration-200 hover:text-primary-low-foreground hover:fill-primary-low-foreground focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
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
						"h-7 w-7 border-border bg-input group-hover:border-primary-low-border group-hover:bg-primary-low":
							props.variant !== "subtle",
						"h-5 w-5 border-transparent bg-card": props.variant === "subtle",
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
