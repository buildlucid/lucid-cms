import type { Component, JSXElement } from "solid-js";

export const ReleaseOverviewRow: Component<{
	label: string;
	children: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-2 border-t border-border px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4">
			<span class="shrink-0 text-xs text-muted sm:w-28 sm:pt-1.5">
				{props.label}
			</span>
			<div class="flex min-w-0 grow items-center sm:min-h-8">
				{props.children}
			</div>
		</div>
	);
};
