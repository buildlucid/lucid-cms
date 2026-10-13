import type { AgentWidgetPart } from "@types";
import type { Component } from "solid-js";
import AgentToolDetails from "@/components/AgentToolDetails/AgentToolDetails";
import T from "@/translations";

/** Unsupported or malformed saved widgets stay readable without an incompatible UI. */
const AgentWidgetUnavailable: Component<{ widget: AgentWidgetPart }> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-3">
			<p class="text-xs text-muted">{T()("agent.widget.unavailable")}</p>
			<AgentToolDetails
				sections={[{ label: T()("agent.tool.output"), value: props.widget }]}
			/>
		</div>
	);
};

export default AgentWidgetUnavailable;
