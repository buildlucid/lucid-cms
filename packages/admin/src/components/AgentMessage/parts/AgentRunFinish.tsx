import { FaSolidFlagCheckered } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import T from "@/translations";
import type { AgentToolPart } from "@/utils/agent-tools";

/** The summary a routine run left when it finished. */
const AgentRunFinish: Component<{ part: AgentToolPart }> = (props) => {
	// ----------------------------------------
	// Memos
	const finish = createMemo(() =>
		props.part.display?.kind === "finish" ? props.part.display : undefined,
	);

	// ----------------------------------------
	// Render
	return (
		<div class="border-s-2 border-border py-0.5 ps-3">
			<div class="flex items-center gap-2">
				<p class="flex items-center gap-1.5 text-xs text-muted">
					<FaSolidFlagCheckered size={10} />
					{T()("agent.run.finished")}
				</p>
				<AgentRunStatus status="completed" outcome={finish()?.outcome} />
			</div>
			<Show when={finish()?.summary}>
				<p class="mt-1 whitespace-pre-wrap wrap-break-words text-sm text-subtitle">
					{finish()?.summary}
				</p>
			</Show>
		</div>
	);
};

export default AgentRunFinish;
