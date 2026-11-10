import classnames from "classnames";
import { TbOutlineWand } from "solid-icons/tb";
import type { Component, JSX } from "solid-js";
import Tooltip from "@/components/Tooltip/Tooltip";

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
		<Tooltip
			type="button"
			class={classnames(
				"ai-action-button group relative flex h-5 w-5 items-center justify-center rounded-md text-muted transition-colors hover:text-primary-low-foreground focus-ring disabled:cursor-not-allowed disabled:opacity-50 before:absolute before:-inset-1 before:rounded-md before:content-['']",
				{
					"cursor-not-allowed opacity-60": props.disabled,
				},
				props.class,
			)}
			disabled={(props.disabled && !props.disabledClickable) || props.loading}
			aria-label={props.label}
			aria-disabled={props.disabled ? "true" : undefined}
			aria-busy={props.loading ? "true" : undefined}
			content={props.tooltip}
			onClick={props.onClick}
		>
			<span
				class="ai-action-button__surface pointer-events-none flex h-5 w-5 items-center justify-center rounded-md border border-transparent bg-card transition-colors"
				data-loading={props.loading ? "true" : undefined}
				data-quick-action-active={props.quickActionActive ? "true" : undefined}
				data-quick-action-on-hover={
					props.quickActionOnHover ? "true" : undefined
				}
			>
				<TbOutlineWand size={12} aria-hidden="true" />
			</span>
		</Tooltip>
	);
};

export default AiIconButton;
