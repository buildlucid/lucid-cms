import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

interface TwoFactorMethodRowProps {
	icon: JSXElement;
	title: string;
	detail: string;
	/** Shows the detail as a warning. */
	warning?: boolean;
	action?: JSXElement;
}

const TwoFactorMethodRow: Component<TwoFactorMethodRowProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="flex items-center justify-between gap-4 rounded-lg border border-border bg-input p-2">
			<div class="flex min-w-0 items-center gap-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-icon">
					{props.icon}
				</span>
				<div class="flex min-w-0 flex-col">
					<span class="text-sm font-medium text-title">{props.title}</span>
					<span
						class={classNames("text-xs", {
							"text-body": !props.warning,
							"text-warning": props.warning,
						})}
					>
						{props.detail}
					</span>
				</div>
			</div>
			<Show when={props.action}>
				<div class="shrink-0">{props.action}</div>
			</Show>
		</div>
	);
};

export default TwoFactorMethodRow;
