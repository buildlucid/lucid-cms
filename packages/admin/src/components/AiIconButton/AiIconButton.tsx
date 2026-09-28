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
	quickActionOnHover?: boolean;
	onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent>;
	class?: string;
}> = (props) => {
	// -------------------------------------
	// Render
	return (
		<button
			type="button"
			class={classnames(
				"ai-action-button group relative flex h-5 w-5 items-center justify-center rounded-md text-muted fill-muted transition-colors duration-200 hover:text-primary-low-foreground hover:fill-primary-low-foreground focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 before:absolute before:-inset-1 before:rounded-md before:content-['']",
				{
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
				class="ai-action-button__surface pointer-events-none flex h-5 w-5 items-center justify-center rounded-md border border-transparent bg-card transition-colors duration-200"
				data-loading={props.loading ? "true" : undefined}
				data-quick-action-active={props.quickActionActive ? "true" : undefined}
				data-quick-action-on-hover={
					props.quickActionOnHover ? "true" : undefined
				}
			>
				<FaSolidMagicWandSparkles size={11} aria-hidden="true" />
			</span>
		</button>
	);
};

export default AiIconButton;
