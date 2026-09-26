import { FaSolidCompress } from "solid-icons/fa";
import type { Component } from "solid-js";
import T from "@/translations";

/** Marks where older context was summarised. The messages above it stay in the chat. */
const AgentCompactionDivider: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<p
			title={T()("agent.context.compacted.description")}
			class="flex items-center gap-3 text-xs text-muted"
		>
			<span aria-hidden="true" class="h-px grow bg-border" />
			<span class="flex items-center gap-1.5">
				<FaSolidCompress size={10} aria-hidden="true" />
				{T()("agent.context.compacted")}
			</span>
			<span aria-hidden="true" class="h-px grow bg-border" />
		</p>
	);
};

export default AgentCompactionDivider;
