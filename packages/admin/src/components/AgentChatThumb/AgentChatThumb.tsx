import type { Component } from "solid-js";

const AgentChatThumb: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<span
			class="flex h-9 w-7 shrink-0 flex-col justify-center gap-1 rounded border border-border bg-input p-1.5 shadow-xs"
			aria-hidden="true"
		>
			<span class="h-1.5 w-4/5 rounded-full bg-border" />
			<span class="h-1.5 w-1/2 self-end rounded-full bg-primary-medium" />
		</span>
	);
};

export default AgentChatThumb;
