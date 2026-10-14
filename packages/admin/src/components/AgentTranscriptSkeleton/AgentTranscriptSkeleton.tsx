import type { Component } from "solid-js";

/** Shows placeholder messages while chat history loads. */
const AgentTranscriptSkeleton: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<div aria-busy="true" class="flex flex-col gap-6">
			<span class="skeleton block h-11 w-1/2 max-w-sm self-end rounded-2xl rounded-ee-md" />
			<div class="flex flex-col gap-2">
				<span class="skeleton block h-4 w-full" />
				<span class="skeleton block h-4 w-11/12" />
				<span class="skeleton block h-4 w-2/3" />
			</div>
			<span class="skeleton block h-11 w-1/3 max-w-xs self-end rounded-2xl rounded-ee-md" />
			<div class="flex flex-col gap-2">
				<span class="skeleton block h-4 w-full" />
				<span class="skeleton block h-4 w-3/4" />
			</div>
		</div>
	);
};

export default AgentTranscriptSkeleton;
