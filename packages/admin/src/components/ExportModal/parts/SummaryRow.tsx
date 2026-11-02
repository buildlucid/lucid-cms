import { type Component, type JSXElement, Show } from "solid-js";

export const SummaryRow: Component<{
	icon: JSXElement;
	label: string;
	detail?: string;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<li class="flex items-center gap-3 px-4 py-3">
			<span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-input text-icon">
				{props.icon}
			</span>
			<span class="min-w-0 flex-1 truncate text-sm font-medium text-subtitle">
				{props.label}
			</span>
			<Show when={props.detail}>
				<span class="shrink-0 text-xs text-body">{props.detail}</span>
			</Show>
		</li>
	);
};
