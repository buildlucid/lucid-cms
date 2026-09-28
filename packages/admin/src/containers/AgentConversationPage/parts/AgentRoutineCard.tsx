import type { AgentConversation, AgentRoutine } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import Button from "@/components/Button/Button";
import Pill from "@/components/Pill/Pill";
import T from "@/translations";
import { getRoutinePause } from "@/utils/agent-access";
import { describeSchedule } from "@/utils/agent-schedule";
import dateHelpers from "@/utils/date-helpers";
import AgentCardDetail from "./AgentCardDetail";
import AgentCardHeader from "./AgentCardHeader";

const AgentRoutineCard: Component<{
	routine: AgentRoutine;
	conversation: AgentConversation;
	onRuns: () => void;
	onOpen: () => void;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const pause = createMemo(() => getRoutinePause(props.routine));

	// ----------------------------------------
	// Render
	return (
		<aside
			aria-labelledby="agent-routine-card-title"
			class="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 animate-fade-in"
		>
			<AgentCardHeader
				id="agent-routine-card-title"
				label={T()("agent.routine.run")}
				title={props.routine.name}
				onClose={props.onClose}
			/>
			<dl class="flex flex-col gap-2.5 border-t border-border pt-4 text-xs">
				<Show when={props.conversation.latestRun}>
					{(run) => (
						<AgentCardDetail label={T()("agent.routine.this.run")}>
							<AgentRunStatus status={run().status} outcome={run().outcome} />
						</AgentCardDetail>
					)}
				</Show>
				<AgentCardDetail label={T()("agent.routine.started")}>
					<time
						datetime={props.conversation.createdAt ?? undefined}
						title={dateHelpers.formatFullDate(props.conversation.createdAt, {
							includeTime: true,
						})}
					>
						{dateHelpers.formatTimestamp(props.conversation.createdAt)}
					</time>
				</AgentCardDetail>
				<AgentCardDetail label={T()("common.schedule")}>
					{describeSchedule(props.routine.cron)}
				</AgentCardDetail>
				<AgentCardDetail label={T()("agent.routine.next.run")}>
					<Show
						when={!pause().paused && props.routine.nextRunAt}
						fallback={
							<Pill size="xs" variant="warning-subtle" tooltip={pause().reason}>
								{T()("agent.routine.paused")}
							</Pill>
						}
					>
						{(next) => (
							<time
								datetime={next()}
								title={dateHelpers.formatFullDate(next(), {
									includeTime: true,
								})}
							>
								{dateHelpers.formatTimestamp(next())}
							</time>
						)}
					</Show>
				</AgentCardDetail>
			</dl>
			<div class="grid grid-cols-2 gap-2">
				<Button size="sm" variant="secondary" onClick={() => props.onRuns()}>
					{T()("agent.routine.runs.view")}
				</Button>
				<Button size="sm" variant="outline" onClick={() => props.onOpen()}>
					{props.routine.source === "code"
						? T()("common.details")
						: T()("agent.routine.edit")}
				</Button>
			</div>
		</aside>
	);
};

export default AgentRoutineCard;
