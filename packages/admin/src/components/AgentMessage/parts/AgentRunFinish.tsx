import type { AgentMessagePart, AgentRunOutcome } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import T from "@/translations";

type ToolPart = Extract<AgentMessagePart, { type: "tool" }>;

const outcomes = new Set<AgentRunOutcome>([
	"done",
	"nothing_to_report",
	"needs_review",
]);

/** The summary a routine run left when it finished. */
const AgentRunFinish: Component<{ part: ToolPart }> = (props) => {
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
		<div class="rounded-md border border-border bg-card p-4">
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs font-medium uppercase tracking-wide text-subtitle">
					{T()("agent.run.finished")}
				</p>
				<AgentRunStatus status="completed" outcome={outcome()} />
			</div>
			<Show when={summary()}>
				<p class="mt-2 whitespace-pre-wrap break-words text-sm text-title">
					{summary()}
				</p>
			</Show>
		</div>
	);
};

export default AgentRunFinish;
