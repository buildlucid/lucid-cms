import { type Component, createMemo, Show } from "solid-js";
import { toolLabel } from "@/components/AgentMessage/parts/AgentToolCall";
import AgentSidebarCard from "@/components/AgentSidebarCard/AgentSidebarCard";
import JSONPreview from "@/components/JSONPreview/JSONPreview";
import Pill, { type PillVariant } from "@/components/Pill/Pill";
import T from "@/translations";
import type { AgentToolPart } from "@/utils/agent-chat";

const AgentToolPanel: Component<{
	part: AgentToolPart;
	onClose: () => void;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const status = createMemo((): { label: string; variant: PillVariant } => {
		switch (props.part.status) {
			case "pending":
				return { label: T()("agent.tool.status.pending"), variant: "neutral" };
			case "running":
				return {
					label: T()("agent.tool.status.running"),
					variant: "info-subtle",
				};
			case "complete":
				return {
					label: T()("agent.tool.status.complete"),
					variant: "success-subtle",
				};
			case "failed":
				return {
					label: T()("agent.tool.status.failed"),
					variant: "danger-subtle",
				};
			case "skipped":
				return { label: T()("agent.tool.status.skipped"), variant: "neutral" };
		}
	});

	// ----------------------------------------
	// Render
	return (
		<AgentSidebarCard
			title={toolLabel(props.part)}
			onClose={props.onClose}
			class={props.class}
		>
			<div class="-mt-3 flex flex-wrap items-center gap-2">
				<Pill size="xs" variant={status().variant}>
					{status().label}
				</Pill>
				<code class="rounded bg-input px-1.5 py-0.5 text-[11px] text-body">
					{props.part.name}
				</code>
			</div>
			<section class="flex flex-col gap-2">
				<h4 class="text-xs font-medium text-subtitle">
					{T()("agent.tool.input")}
				</h4>
				<JSONPreview json={props.part.input} />
			</section>
			<section class="flex flex-col gap-2">
				<h4 class="text-xs font-medium text-subtitle">
					{T()("agent.tool.output")}
				</h4>
				<Show
					when={props.part.output !== undefined}
					fallback={
						<p class="text-sm text-muted">
							{T()(
								props.part.status === "pending" ||
									props.part.status === "running"
									? "agent.tool.output.waiting"
									: "agent.tool.output.none",
							)}
						</p>
					}
				>
					<JSONPreview json={props.part.output} />
				</Show>
			</section>
		</AgentSidebarCard>
	);
};

export default AgentToolPanel;
