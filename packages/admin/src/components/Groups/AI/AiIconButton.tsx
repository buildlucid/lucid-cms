import classnames from "classnames";
import { FaSolidMagicWandSparkles } from "solid-icons/fa";
import type { Component, JSX } from "solid-js";

const AiIconButton: Component<{
	label: string;
	tooltip: string;
	disabled?: boolean;
	loading?: boolean;
	onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent>;
	class?: string;
}> = (props) => {
	// -------------------------------------
	// Render
	return (
		<button
			type="button"
			class={classnames(
				"ai-action-button relative flex h-7 w-7 items-center justify-center rounded-md border border-border bg-input-base text-icon-fade fill-icon-fade transition-colors duration-200 hover:border-primary-muted-border hover:bg-primary-muted-bg hover:text-primary-base hover:fill-primary-base focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60",
				props.class,
			)}
			disabled={props.disabled || props.loading}
			aria-label={props.label}
			aria-busy={props.loading ? "true" : undefined}
			title={props.tooltip}
			data-loading={props.loading ? "true" : undefined}
			onClick={props.onClick}
		>
			<FaSolidMagicWandSparkles size={13} aria-hidden="true" />
		</button>
	);
};

export default AiIconButton;
