import type { AgentInteraction } from "@types";
import { type Component, For, Show } from "solid-js";
import JSONPreview from "@/components/JSONPreview/JSONPreview";
import Pill from "@/components/Pill/Pill";
import T from "@/translations";

/** The transcript retains each exact call and its individual decision. */
const AgentApprovalDetails: Component<{
	approvals: NonNullable<AgentInteraction["approvals"]>;
	selected: string[];
	status: AgentInteraction["status"];
}> = (props) => {
	// ----------------------------------------
	// Functions
	const approved = (toolCallId: string) => props.selected.includes(toolCallId);

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-4">
			<For each={props.approvals}>
				{(approval) => (
					<section class="flex flex-col gap-2">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-xs text-subtitle">{approval.title}</span>
							<Show
								when={
									props.status === "answered" || props.status === "cancelled"
								}
							>
								<Pill
									size="xs"
									variant={
										approved(approval.toolCallId)
											? "success-subtle"
											: "danger-subtle"
									}
								>
									{T()(
										approved(approval.toolCallId)
											? "agent.approval.approved"
											: "agent.approval.denied",
									)}
								</Pill>
							</Show>
						</div>
						<code class="text-[11px] text-muted">{approval.toolName}</code>
						<JSONPreview json={approval.input} />
					</section>
				)}
			</For>
		</div>
	);
};

export default AgentApprovalDetails;
