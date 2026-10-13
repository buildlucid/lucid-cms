import type { AgentInteraction } from "@types";
import { type Component, For, Show } from "solid-js";
import JSONPreview from "@/components/JSONPreview/JSONPreview";
import Pill from "@/components/Pill/Pill";
import T, { translateAdminCopy } from "@/translations";

const AgentConfirmationDetails: Component<{
	confirmations: NonNullable<AgentInteraction["confirmations"]>;
	selected: string[];
	status: AgentInteraction["status"];
}> = (props) => {
	// ----------------------------------------
	// Functions
	const confirmed = (toolCallId: string) => props.selected.includes(toolCallId);

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-4">
			<For each={props.confirmations}>
				{(confirmation) => (
					<section class="flex flex-col gap-2">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-xs text-subtitle">
								{translateAdminCopy(confirmation.title)}
							</span>
							<Show
								when={
									props.status === "answered" || props.status === "cancelled"
								}
							>
								<Pill
									size="xs"
									variant={
										confirmed(confirmation.toolCallId)
											? "success-subtle"
											: "danger-subtle"
									}
								>
									{T()(
										confirmed(confirmation.toolCallId)
											? "agent.confirmation.confirmed"
											: "agent.confirmation.denied",
									)}
								</Pill>
							</Show>
						</div>
						<code class="text-[11px] text-muted">{confirmation.toolName}</code>
						<JSONPreview json={confirmation.input} />
					</section>
				)}
			</For>
		</div>
	);
};

export default AgentConfirmationDetails;
