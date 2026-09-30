import type { AgentConversation, AgentRoutine } from "@types";
import { FaSolidRepeat } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import Button from "@/components/Button/Button";
import Pill from "@/components/Pill/Pill";
import api from "@/services/api";
import T from "@/translations";
import { getRoutinePause } from "@/utils/agent-access";
import { describeSchedule } from "@/utils/agent-schedule";
import dateHelpers from "@/utils/date-helpers";
import AgentCardDetail from "./AgentCardDetail";
import AgentCardHeader from "./AgentCardHeader";

const recentRuns = 5;

/** The routine behind a chat, with its latest runs in the chat. Selecting a run scrolls to where it starts. */
const AgentRoutineCard: Component<{
	routine: AgentRoutine;
	conversation: AgentConversation;
	onSelectRun: (runId: string) => void;
	onRuns: () => void;
	onOpen: () => void;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const runs = api.agent.useGetRoutineRuns({
		id: () => props.routine.id,
		queryParams: {
			filters: { conversationId: () => props.conversation.id },
			perPage: recentRuns,
		},
	});

	// ----------------------------------------
	// Memos
	const pause = createMemo(() => getRoutinePause(props.routine));
	const chatRuns = createMemo(() => (runs.isSuccess ? runs.data.data : []));

	// ----------------------------------------
	// Render
	return (
		<aside
			aria-labelledby="agent-routine-card-title"
			class="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 animate-fade-in"
		>
			<AgentCardHeader
				id="agent-routine-card-title"
				label={T()("agent.routine.label")}
				title={props.routine.name}
				onClose={props.onClose}
			/>
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
			<dl class="flex flex-col gap-2.5 border-t border-border pt-4 text-xs">
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
			<Show when={chatRuns().length}>
				<section
					aria-labelledby="agent-routine-card-runs"
					class="flex flex-col gap-2 border-t border-border pt-4"
				>
					<h4 id="agent-routine-card-runs" class="text-xs text-muted">
						{T()("agent.routine.chat.runs")}
					</h4>
					<ul class="flex flex-col gap-0.5">
						<For each={chatRuns()}>
							{(run) => (
								<li>
									<button
										type="button"
										class="-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2.5 rounded-md p-1.5 text-start hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-primary"
										onClick={() => props.onSelectRun(run.id)}
									>
										<span
											class="flex h-9 w-7 shrink-0 items-center justify-center rounded border border-border text-muted"
											aria-hidden="true"
										>
											<FaSolidRepeat size={10} />
										</span>
										<span class="min-w-0 grow">
											<time
												datetime={run.createdAt ?? undefined}
												title={dateHelpers.formatFullDate(run.createdAt, {
													includeTime: true,
												})}
												class="block truncate text-xs text-title"
											>
												{dateHelpers.formatTimestamp(run.createdAt)}
											</time>
											<span class="block truncate text-[11px] text-muted">
												{run.summary ?? T()("agent.routine.run.no.summary")}
											</span>
										</span>
										<AgentRunStatus status={run.status} outcome={run.outcome} />
									</button>
								</li>
							)}
						</For>
					</ul>
				</section>
			</Show>
		</aside>
	);
};

export default AgentRoutineCard;
