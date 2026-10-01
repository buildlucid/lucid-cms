import type { Component, JSXElement } from "solid-js";

const AgentCardDetail: Component<{ label: string; children: JSXElement }> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<div class="flex items-center justify-between gap-4">
			<dt class="shrink-0 text-muted">{props.label}</dt>
			<dd class="flex min-w-0 justify-end text-end text-body">
				{props.children}
			</dd>
		</div>
	);
};

export default AgentCardDetail;
