import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

/** A notice shown in place of the chat box, such as why the chat can't take messages. */
const AgentComposerNotice: Component<{
	/** Marks something the person may need to fix. */
	warning?: boolean;
	title?: string;
	message: string;
	/** Shown beneath the message, such as a link to fix it. */
	action?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<section
			role="status"
			class={classnames(
				"flex flex-col items-start gap-3 rounded-2xl border bg-card p-4",
				props.warning ? "border-warning-low-border" : "border-border",
			)}
		>
			<div>
				<Show when={props.title}>
					{(title) => <h3 class="text-sm font-medium text-title">{title()}</h3>}
				</Show>
				<p class={classnames("text-sm text-body", { "mt-0.5": props.title })}>
					{props.message}
				</p>
			</div>
			{props.action}
		</section>
	);
};

export default AgentComposerNotice;
