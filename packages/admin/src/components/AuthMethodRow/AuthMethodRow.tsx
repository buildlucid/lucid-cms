import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

interface AuthMethodRowProps {
	icon: JSXElement;
	title: string;
	/** Shown after the title with a dot between them, such as a status pill. */
	badge?: JSXElement;
	detail: string;
	/** Shows the detail as a warning. */
	warning?: boolean;
	action?: JSXElement;
}

const AuthMethodRow: Component<AuthMethodRowProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="flex items-center justify-between gap-4 rounded-lg border border-border bg-input p-2">
			<div class="flex min-w-0 items-center gap-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-icon">
					{props.icon}
				</span>
				<div class="flex min-w-0 flex-col">
					<span class="flex min-w-0 items-center gap-2">
						<span class="truncate text-sm font-medium text-title">
							{props.title}
						</span>
						<Show when={props.badge}>
							<span class="text-sm text-body" aria-hidden="true">
								·
							</span>
							{props.badge}
						</Show>
					</span>
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
				<div class="flex shrink-0 items-center gap-0.5">{props.action}</div>
			</Show>
		</div>
	);
};

export default AuthMethodRow;
