import type { AgentRunOutcome } from "@types";
import { FaSolidFlagCheckered } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import T from "@/translations";
import type { AgentToolPart } from "@/utils/agent-chat";

const outcomes = new Set<AgentRunOutcome>([
	"done",
	"nothing_to_report",
	"needs_review",
]);

/** The summary a routine run left when it finished. */
const AgentRunFinish: Component<{ part: AgentToolPart }> = (props) => {
	// ----------------------------------------
	// Memos
	const outcome = createMemo(() => {
		const value = props.part.input.outcome;
		return outcomes.has(value as AgentRunOutcome)
			? (value as AgentRunOutcome)
			: undefined;
	});
	const summary = createMemo(() =>
		typeof props.part.input.summary === "string"
			? props.part.input.summary
			: undefined,
	);

	// ----------------------------------------
	// Render
	return (
		<div class="border-l-2 border-border py-0.5 pl-3">
			<div class="flex items-center gap-2">
				<p class="flex items-center gap-1.5 text-xs text-muted">
					<FaSolidFlagCheckered size={10} />
					{T()("agent.run.finished")}
				</p>
				<AgentRunStatus status="completed" outcome={outcome()} />
			</div>
			<Show when={summary()}>
				<p class="mt-1 whitespace-pre-wrap break-words text-sm text-subtitle">
					{summary()}
				</p>
			</Show>
		</div>
	);
};

export default AgentRunFinish;
